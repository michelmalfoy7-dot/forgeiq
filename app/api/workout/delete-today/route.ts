import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Supprime une séance loggée aujourd'hui (repos, cardio, ou séance vide)
// Condition de sécurité : appartient à l'user ET date = aujourd'hui ET 0 séries réelles
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { workout_id } = await req.json()
    if (!workout_id) return NextResponse.json({ data: null, error: 'workout_id manquant' }, { status: 400 })

    const today = new Date().toISOString().split('T')[0]

    // Vérifier que le workout appartient à l'user, est daté d'aujourd'hui
    // et n'a pas de séries muscu réelles (total_sets = 0 ou null = sûr à supprimer)
    const { data: workout } = await supabase
      .from('workouts')
      .select('id, session_date, total_sets, workout_type')
      .eq('id', workout_id)
      .eq('user_id', user.id)
      .eq('session_date', today)
      .single()

    if (!workout) {
      return NextResponse.json({ data: null, error: 'Séance introuvable ou non modifiable' }, { status: 404 })
    }

    // Sécurité : ne pas supprimer une séance muscu avec des vraies séries
    const hasSets = (workout.total_sets ?? 0) > 0 && workout.workout_type !== 'cardio'
    if (hasSets) {
      return NextResponse.json({ data: null, error: 'Impossible de supprimer une séance avec des séries enregistrées' }, { status: 403 })
    }

    // Supprimer les workout_sets associés (au cas où) puis le workout
    await supabase.from('workout_sets').delete().eq('workout_id', workout_id)
    const { error } = await supabase.from('workouts').delete().eq('id', workout_id).eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch (err) {
    console.error('delete-today error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
