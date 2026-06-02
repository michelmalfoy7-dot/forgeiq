import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Groupes musculaires — mapping clé Supabase → groupe normalisé
const MUSCLE_GROUPS: Record<string, string> = {
  chest:      'Poitrine',
  lats:       'Dos',
  mid_back:   'Dos',
  upper_back: 'Dos',
  lower_back: 'Dos',
  traps:      'Dos',
  front_delt: 'Épaules',
  side_delt:  'Épaules',
  rear_delt:  'Épaules',
  biceps:     'Biceps',
  triceps:    'Triceps',
  forearms:   'Avant-bras',
  quads:      'Jambes',
  hamstrings: 'Jambes',
  glutes:     'Fessiers',
  calves:     'Mollets',
  abs:        'Abdos',
  core:       'Abdos',
  obliques:   'Abdos',
}

// Seuils sets/semaine (science-based — Dr. Mike Israetel / RP)
export const VOLUME_TARGETS: Record<string, { mev: number; mav: number }> = {
  Poitrine:    { mev: 10, mav: 18 },
  Dos:         { mev: 10, mav: 20 },
  Épaules:     { mev: 8,  mav: 16 },
  Biceps:      { mev: 6,  mav: 14 },
  Triceps:     { mev: 6,  mav: 14 },
  'Avant-bras':{ mev: 0,  mav: 10 },
  Jambes:      { mev: 10, mav: 20 },
  Fessiers:    { mev: 6,  mav: 16 },
  Mollets:     { mev: 6,  mav: 14 },
  Abdos:       { mev: 6,  mav: 16 },
}

export type MuscleVolume = {
  muscle: string
  sets: number
  mev: number
  mav: number
  status: 'low' | 'optimal' | 'high'  // sous MEV / dans MEV-MAV / au-delà MAV
}

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

    // Récupérer les sets de travail de la semaine avec le groupe musculaire de l'exercice
    const { data: sets, error } = await supabase
      .from('workout_sets')
      .select('exercise_id, exercises_library!inner(muscle_primary)')
      .eq('workouts.user_id', user.id)
      .eq('is_warmup', false)
      .neq('reps', 0)
      .gte('workouts.session_date', weekStart)
      .not('workouts.completed_at', 'is', null)

    // La jointure via FK imbriquée ne fonctionne pas toujours avec Supabase JS.
    // On passe par une requête plus simple sur workouts de la semaine.
    if (error || !sets) {
      // Fallback : requête en deux temps
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
    }

    return NextResponse.json({ data: aggregateVolume(sets ?? []), error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aggregateVolume(sets: any[]): MuscleVolume[] {
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
      const status: MuscleVolume['status'] = s >= mav ? 'high' : s >= mev ? 'optimal' : 'low'
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
