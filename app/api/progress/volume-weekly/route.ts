import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { MUSCLE_GROUPS, VOLUME_TARGETS, classifyVolumeStatus, type MuscleVolume } from '@/lib/utils/volume'

export const dynamic = 'force-dynamic'


/**
 * GET /api/progress/volume-weekly
 * Retourne le volume (séries de travail) par groupe musculaire pour la semaine en cours.
 * Lundi–Dimanche (semaine ISO).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Semaine ISO : lundi 00:00 → dimanche 23:59
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=dim, 1=lun...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)
    const weekStart = monday.toISOString().split('T')[0]

    // Requête en deux temps — la jointure imbriquée workout_sets→workouts via Supabase JS
    // ne supporte pas les filtres sur la table parente (user_id, session_date).
    const { data: weekWorkouts } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', user.id)
      .gte('session_date', weekStart)
      .not('completed_at', 'is', null)

    const workoutIds = (weekWorkouts ?? []).map(w => w.id)
    if (workoutIds.length === 0) {
      return NextResponse.json({ data: buildEmptyVolume(), error: null })
    }

    const { data: weekSets } = await supabase
      .from('workout_sets')
      .select('exercise_id, exercises_library(muscle_primary)')
      .in('workout_id', workoutIds)
      .eq('is_warmup', false)
      .neq('reps', 0)

    return NextResponse.json({ data: aggregateVolume(weekSets ?? []), error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

type WorkoutSet = {
  exercise_id: string
  exercises_library: { muscle_primary: string[] } | { muscle_primary: string[] }[] | null
}

function aggregateVolume(sets: WorkoutSet[]): MuscleVolume[] {
  const counts: Record<string, number> = {}

  for (const s of sets) {
    const lib = s.exercises_library
    const muscles: string[] = Array.isArray(lib) ? (lib[0]?.muscle_primary ?? []) : (lib?.muscle_primary ?? [])
    if (muscles.length === 0) continue
    // Attribuer au groupe principal seulement (1er muscle)
    const primaryMuscle = muscles[0]
    const group = MUSCLE_GROUPS[primaryMuscle]
    if (!group) continue
    counts[group] = (counts[group] ?? 0) + 1
  }

  // Construire la liste pour les groupes connus avec cibles
  return Object.entries(VOLUME_TARGETS)
    .map(([muscle, { mev, mav }]) => {
      const s = counts[muscle] ?? 0
      const status = classifyVolumeStatus(s, mev, mav)
      return { muscle, sets: s, mev, mav, status }
    })
    .filter(m => m.sets > 0 || m.mev > 0) // N'affiche que les muscles ciblés
    .sort((a, b) => b.sets - a.sets)
}

function buildEmptyVolume(): MuscleVolume[] {
  return Object.entries(VOLUME_TARGETS).map(([muscle, { mev, mav }]) => ({
    muscle, sets: 0, mev, mav, status: 'low' as const,
  }))
}
