import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET → retourne water_ml du jour + objectif
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]

    const [{ data: log }, { data: profile }] = await Promise.all([
      supabase.from('daily_logs')
        .select('water_ml')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle(),
      supabase.from('profiles')
        .select('water_goal_ml')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    return NextResponse.json({
      data: {
        water_ml: log?.water_ml ?? 0,
        goal_ml: profile?.water_goal_ml ?? 2500,
      },
      error: null,
    })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST { add_ml: number } → incrémente le compteur d'eau du jour
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { add_ml } = await req.json() as { add_ml: number }
    if (typeof add_ml !== 'number') {
      return NextResponse.json({ data: null, error: 'add_ml requis' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Lire la valeur actuelle
    const { data: current } = await supabase
      .from('daily_logs')
      .select('water_ml')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .maybeSingle()

    const currentMl = current?.water_ml ?? 0
    const newMl = Math.max(0, currentMl + add_ml)

    // Upsert uniquement le champ water_ml (n'écrase pas les autres colonnes)
    const { error } = await supabase
      .from('daily_logs')
      .upsert(
        { user_id: user.id, log_date: today, water_ml: newMl },
        { onConflict: 'user_id,log_date' }
      )

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    return NextResponse.json({ data: { water_ml: newMl }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
