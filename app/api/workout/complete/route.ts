import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type SetInput = {
  exercise_id: string
  exercise_name: string
  set_number: number
  weight_kg: number
  reps: number
  rpe?: number
  is_warmup?: boolean
  is_bilateral_dumbbell?: boolean
}

export async function POST(request: Request) {
  try {
    const { workout_id, sets, notes, rpe_overall, duration_min, distance_km, workout_type } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Calculer les métriques de la séance
    const workingSets = (sets as SetInput[]).filter((s) => !s.is_warmup)
    // Tonnage × 2 pour les exercices bilatéraux aux haltères (ex: développé haltères = 2 haltères)
    const totalTonnage = workingSets.reduce((acc, s) =>
      acc + s.weight_kg * s.reps * (s.is_bilateral_dumbbell ? 2 : 1), 0)
    const totalSets = workingSets.length
    const totalReps = workingSets.reduce((acc, s) => acc + s.reps, 0)

    // Mettre à jour le workout avec les métriques finales
    const { error: wErr } = await supabase
      .from('workouts')
      .update({
        completed_at: new Date().toISOString(),
        total_tonnage_kg: Math.round(totalTonnage * 10) / 10,
        total_sets: totalSets,
        total_reps: totalReps,
        notes,
        rpe_overall,
        ...(duration_min != null && { duration_min }),
        ...(distance_km != null && { distance_km }),
        ...(workout_type != null && { workout_type }),
      })
      .eq('id', workout_id)
      .eq('user_id', user.id)

    if (wErr) return NextResponse.json({ data: null, error: wErr.message }, { status: 400 })

    // Insérer toutes les séries
    if (sets.length > 0) {
      const { error: sErr } = await supabase
        .from('workout_sets')
        .insert(sets.map((s: SetInput) => ({ ...s, workout_id })))

      if (sErr) return NextResponse.json({ data: null, error: sErr.message }, { status: 400 })
    }

    // Détection des PRs — batch query pour éviter N+1
    const newPRs: string[] = []
    const exerciseGroups = groupByExercise(workingSets)
    const exerciseIds = Object.keys(exerciseGroups)
    const today = new Date().toISOString().split('T')[0]

    // 1 seule requête pour charger tous les PRs existants
    const { data: existingPRsRows } = await supabase
      .from('personal_records')
      .select('exercise_id, record_type, value')
      .eq('user_id', user.id)
      .in('exercise_id', exerciseIds)
      .in('record_type', ['top_set', '1rm_estimated', 'max_weight'])

    // Map lookup: exerciseId → { record_type → value }
    const prMap = new Map<string, Record<string, number>>()
    for (const pr of existingPRsRows ?? []) {
      if (!prMap.has(pr.exercise_id)) prMap.set(pr.exercise_id, {})
      prMap.get(pr.exercise_id)![pr.record_type] = pr.value
    }

    // Calculer les nouveaux PRs et préparer le batch upsert
    const upserts: {
      user_id: string; exercise_id: string; exercise_name: string
      record_type: string; value: number; unit: string
      achieved_date: string; workout_id: string
    }[] = []

    for (const [exerciseId, exSets] of Object.entries(exerciseGroups)) {
      const existing = prMap.get(exerciseId) ?? {}
      const exerciseName = exSets[0].exercise_name

      // Top set (poids le plus lourd soulevé sur cette séance)
      const topSet = exSets.reduce((best, s) =>
        s.weight_kg * s.reps > best.weight_kg * best.reps ? s : best
      )
      const topSetValue = topSet.weight_kg
      if (!existing['top_set'] || topSetValue > existing['top_set']) {
        upserts.push({ user_id: user.id, exercise_id: exerciseId, exercise_name: exerciseName, record_type: 'top_set', value: topSetValue, unit: 'kg', achieved_date: today, workout_id })
        newPRs.push(exerciseName)
      }

      // 1RM estimé (formule Epley)
      const estimatedRM = Math.round((topSet.weight_kg * (1 + topSet.reps / 30)) * 10) / 10
      if (!existing['1rm_estimated'] || estimatedRM > existing['1rm_estimated']) {
        upserts.push({ user_id: user.id, exercise_id: exerciseId, exercise_name: exerciseName, record_type: '1rm_estimated', value: estimatedRM, unit: 'kg', achieved_date: today, workout_id })
      }

      // Max weight absolu (charge la plus lourde, peu importe les reps)
      const maxWeightSet = exSets.reduce((best, s) => s.weight_kg > best.weight_kg ? s : best)
      if (!existing['max_weight'] || maxWeightSet.weight_kg > existing['max_weight']) {
        upserts.push({ user_id: user.id, exercise_id: exerciseId, exercise_name: exerciseName, record_type: 'max_weight', value: maxWeightSet.weight_kg, unit: 'kg', achieved_date: today, workout_id })
      }
    }

    // Upsert batch — 1 requête au lieu de 2N
    if (upserts.length > 0) {
      await supabase.from('personal_records').upsert(upserts, { onConflict: 'user_id,exercise_id,record_type' })
    }

    return NextResponse.json({
      data: { workout_id, totalTonnage, totalSets, newPRs },
      error: null,
    })
  } catch (e) {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

function groupByExercise(sets: SetInput[]): Record<string, SetInput[]> {
  return sets.reduce((acc, s) => {
    if (!s.exercise_id) return acc
    if (!acc[s.exercise_id]) acc[s.exercise_id] = []
    acc[s.exercise_id].push(s)
    return acc
  }, {} as Record<string, SetInput[]>)
}
