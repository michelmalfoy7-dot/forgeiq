import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { display_name, goal, level, equipment, sessions_per_week, age, height_cm } = body

    const { error } = await supabase.from('profiles').update({
      display_name,
      goal,
      level,
      equipment,
      sessions_per_week,
      age,
      height_cm,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data: { updated: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
