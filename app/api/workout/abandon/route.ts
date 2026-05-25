import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Marque une séance comme abandonnée (supprime la ligne ou la laisse sans completed_at)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { workout_id } = await req.json()
    if (!workout_id) return NextResponse.json({ data: null, error: 'workout_id manquant' }, { status: 400 })

    // Supprimer la séance non terminée (pas de completed_at) — RLS protège l'isolation
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workout_id)
      .eq('user_id', user.id)
      .is('completed_at', null) // Only delete if not already completed

    if (error) throw error

    return NextResponse.json({ data: { abandoned: true }, error: null })
  } catch (err) {
    console.error('Workout abandon error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
