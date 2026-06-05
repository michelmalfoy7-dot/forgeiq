// ── Utilitaires partagés — module social ─────────────────────────────────────

export type ExerciseInPost = {
  name: string
  top_set_kg: number
  top_set_reps: number
  set_count: number
}

type RawSet = {
  workout_id: string
  exercise_name: string
  weight_kg: number
  reps: number
  set_type: string | null
}

/**
 * Groupe les sets bruts par workout_id puis par exercice.
 * Retourne, pour chaque workout, la liste des exercices avec :
 *  - le meilleur set (poids max, reps max à égalité)
 *  - le nombre de séries
 *  - l'ordre d'apparition dans la séance
 */
export function buildExercisesMap(sets: RawSet[]): Map<string, ExerciseInPost[]> {
  const workoutExMap = new Map<string, Map<string, { maxKg: number; maxReps: number; count: number; order: number }>>()

  for (const set of sets) {
    if (!workoutExMap.has(set.workout_id)) workoutExMap.set(set.workout_id, new Map())
    const exMap = workoutExMap.get(set.workout_id)!
    const existing = exMap.get(set.exercise_name)

    if (!existing) {
      exMap.set(set.exercise_name, {
        maxKg: set.weight_kg,
        maxReps: set.reps,
        count: 1,
        order: exMap.size,
      })
    } else {
      const isBetter =
        set.weight_kg > existing.maxKg ||
        (set.weight_kg === existing.maxKg && set.reps > existing.maxReps)
      exMap.set(set.exercise_name, {
        maxKg: isBetter ? set.weight_kg : existing.maxKg,
        maxReps: isBetter ? set.reps : existing.maxReps,
        count: existing.count + 1,
        order: existing.order,
      })
    }
  }

  const result = new Map<string, ExerciseInPost[]>()
  for (const [workoutId, exMap] of workoutExMap.entries()) {
    result.set(
      workoutId,
      Array.from(exMap.entries())
        .sort(([, a], [, b]) => a.order - b.order)
        .map(([name, data]) => ({
          name,
          top_set_kg: data.maxKg,
          top_set_reps: data.maxReps,
          set_count: data.count,
        }))
    )
  }
  return result
}
