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
}

export async function POST(request: Request) {
  try {
    const { workout_id, sets, notes, rpe_overall } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Calculer les métriques de la séance
    const workingSets = (sets as SetInput[]).filter((s) => !s.is_warmup)
    const totalTonnage = workingSets.reduce((acc, s) => acc + s.weight_kg * s.reps, 0)
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

    // Détection des PRs — top set par exercice (poids × 1 rép max estimé)
    const newPRs: string[] = []
    const exerciseGroups = groupByExercise(workingSets)

    for (const [exerciseId, exSets] of Object.entries(exerciseGroups)) {
      const topSet = exSets.reduce((best, s) =>
        s.weight_kg * s.reps > best.weight_kg * best.reps ? s : best
      )

      const topSetValue = topSet.weight_kg
      const estimatedRM = topSet.weight_kg * (1 + topSet.reps / 30) // Formule Epley

      // Vérifier le PR top set existant
      const { data: existingPR } = await supabase
        .from('personal_records')
        .select('value')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .eq('record_type', 'top_set')
        .single()

      if (!existingPR || topSetValue > existingPR.value) {
        await supabase
          .from('personal_records')
          .upsert({
            user_id: user.id,
            exercise_id: exerciseId,
            exercise_name: exSets[0].exercise_name,
            record_type: 'top_set',
            value: topSetValue,
            unit: 'kg',
            achieved_date: new Date().toISOString().split('T')[0],
            workout_id,
          }, { onConflict: 'user_id,exercise_id,record_type' })

        newPRs.push(exSets[0].exercise_name)
      }

      // Vérifier le PR 1RM estimé
      const { data: existing1RM } = await supabase
        .from('personal_records')
        .select('value')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .eq('record_type', '1rm_estimated')
        .single()

      if (!existing1RM || estimatedRM > existing1RM.value) {
        await supabase
          .from('personal_records')
          .upsert({
            user_id: user.id,
            exercise_id: exerciseId,
            exercise_name: exSets[0].exercise_name,
            record_type: '1rm_estimated',
            value: Math.round(estimatedRM * 10) / 10,
            unit: 'kg',
            achieved_date: new Date().toISOString().split('T')[0],
            workout_id,
          }, { onConflict: 'user_id,exercise_id,record_type' })
      }
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
