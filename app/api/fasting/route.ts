import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/fasting
 * Retourne la session active + historique 14j + streak courant.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const today        = new Date().toISOString().split('T')[0]
    const fourteenAgo  = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]

    const [{ data: active }, { data: history }] = await Promise.all([
      // Session active = end_time IS NULL
      supabase.from('fasting_sessions')
        .select('id, start_time, end_time, target_hours, log_date')
        .eq('user_id', user.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Historique terminé sur 14 jours — pour streak + récap
      supabase.from('fasting_sessions')
        .select('log_date, start_time, end_time, target_hours')
        .eq('user_id', user.id)
        .gte('log_date', fourteenAgo)
        .not('end_time', 'is', null)
        .order('log_date', { ascending: false }),
    ])

    // ── Calcul streak — jours consécutifs avec jeûne complété ──
    const completedDates = new Set((history ?? []).map(s => s.log_date))
    let streak = 0
    const d = new Date()
    // Commencer depuis hier (aujourd'hui peut ne pas encore être terminé)
    d.setDate(d.getDate() - 1)
    while (completedDates.has(d.toISOString().split('T')[0])) {
      streak++
      d.setDate(d.getDate() - 1)
    }
    // Si aujourd'hui a une session terminée → compte aussi
    if (completedDates.has(today)) streak++

    return NextResponse.json({ data: { active, history: history ?? [], streak }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/fasting
 * Démarre un nouveau jeûne. Body : { target_hours: number }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { target_hours = 16 } = await req.json()
    if (target_hours < 1 || target_hours > 48) {
      return NextResponse.json({ data: null, error: 'Durée invalide (1–48h)' }, { status: 400 })
    }

    // Vérifier qu'aucune session n'est déjà active
    const { data: existing } = await supabase.from('fasting_sessions')
      .select('id').eq('user_id', user.id).is('end_time', null)
      .limit(1).maybeSingle()

    if (existing) {
      return NextResponse.json({ data: null, error: 'Un jeûne est déjà en cours' }, { status: 409 })
    }

    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase.from('fasting_sessions').insert({
      user_id: user.id,
      start_time: new Date().toISOString(),
      target_hours,
      log_date: today,
    }).select().single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PATCH /api/fasting
 * Termine le jeûne actif. Body : { id: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { id } = await req.json()

    const { data, error } = await supabase.from('fasting_sessions')
      .update({ end_time: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('end_time', null)
      .select().single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/fasting
 * Annule (supprime) une session. Body : { id: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { id } = await req.json()

    const { error } = await supabase.from('fasting_sessions')
      .delete().eq('id', id).eq('user_id', user.id)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
