import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST : copier les logs de J-1 vers target_date
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    // Supporte deux formes :
    //   { target_date } → source = J-1 (ancien comportement, rétro-compatible)
    //   { date, sourceDate } → copie explicite d'un jour vers un autre (navigation jour passé)
    const target_date: string | undefined = body.target_date ?? body.date
    const explicit_source: string | undefined = body.sourceDate

    if (!target_date) return NextResponse.json({ data: null, error: 'Date cible manquante' }, { status: 400 })

    // Calculer la date source : soit fournie explicitement, soit J-1 par rapport à target_date
    let sourceDate: string
    if (explicit_source) {
      sourceDate = explicit_source
    } else {
      const targetD = new Date(target_date + 'T12:00:00')
      targetD.setDate(targetD.getDate() - 1)
      sourceDate = targetD.toISOString().split('T')[0]
    }

    // Récupérer les logs de la veille
    const { data: sourceLogs, error: fetchErr } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', sourceDate)
      .order('created_at', { ascending: true })

    if (fetchErr) throw fetchErr
    if (!sourceLogs || sourceLogs.length === 0) {
      return NextResponse.json({ data: { created: [], count: 0 }, error: null })
    }

    // Dupliquer chaque log pour target_date (sans les champs auto-générés)
    const newLogs = sourceLogs.map(log => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, updated_at, ...rest } = log as Record<string, unknown>
      return { ...rest, log_date: target_date, user_id: user.id }
    })

    const { data: created, error: insertErr } = await supabase
      .from('food_logs')
      .insert(newLogs)
      .select()

    if (insertErr) throw insertErr

    return NextResponse.json({ data: { created: created ?? [], count: created?.length ?? 0 }, error: null })
  } catch (err) {
    console.error('Nutrition log copy error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
