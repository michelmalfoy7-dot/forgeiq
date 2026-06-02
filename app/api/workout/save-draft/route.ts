import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST — sauvegarde l'état courant de la séance (draft) en Supabase
// Appelé automatiquement toutes les 30s + au changement de visibilité
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { workout_id, groups, session_name } = await req.json()
    if (!workout_id) return NextResponse.json({ data: null, error: 'workout_id manquant' }, { status: 400 })

    const { error } = await supabase
      .from('workouts')
      .update({
        draft_state: { groups, session_name, saved_at: new Date().toISOString() },
      })
      .eq('id', workout_id)
      .eq('user_id', user.id)
      .is('completed_at', null) // Ne pas écraser une séance terminée

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    return NextResponse.json({ data: { saved: true }, error: null })
  } catch (err) {
    console.error('save-draft error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET — récupère le draft d'une séance en cours
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const workout_id = searchParams.get('workout_id')
    if (!workout_id) return NextResponse.json({ data: null, error: 'workout_id manquant' }, { status: 400 })

    const { data, error } = await supabase
      .from('workouts')
      .select('draft_state, session_name')
      .eq('id', workout_id)
      .eq('user_id', user.id)
      .is('completed_at', null)
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    return NextResponse.json({ data: data?.draft_state ?? null, error: null })
  } catch (err) {
    console.error('get-draft error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
