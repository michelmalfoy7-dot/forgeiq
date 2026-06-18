import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Objectifs fixes mensuels
const TARGETS = {
  volume:     10_000_000, // kg
  workouts:   1_000,      // séances
  regularity: 100,        // users avec ≥ 3 séances
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Borne début du mois courant (UTC)
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

    // 1. Volume collectif — SUM(weight_kg * reps) sur workout_sets du mois
    // On passe par les workouts complétés ce mois pour filtrer correctement
    const { data: workoutsThisMonth } = await supabase
      .from('workouts')
      .select('id')
      .eq('status', 'completed')
      .gte('completed_at', monthStart)

    const workoutIds = (workoutsThisMonth ?? []).map((w: { id: string }) => w.id)

    let volumeKg = 0
    let workoutsCount = workoutIds.length

    if (workoutIds.length > 0) {
      // Récupérer les sets de travail (exclure échauffements)
      const { data: setsData } = await supabase
        .from('workout_sets')
        .select('weight_kg, reps')
        .in('workout_id', workoutIds)
        .neq('set_type', 'warmup')
        .gt('weight_kg', 0)
        .gt('reps', 0)

      for (const s of setsData ?? []) {
        volumeKg += (s.weight_kg ?? 0) * (s.reps ?? 0)
      }
    }

    // 3. Régularité — users avec ≥ 3 séances ce mois
    let regularUsers = 0
    if (workoutIds.length > 0) {
      // Compter les séances par user_id
      const { data: userWorkouts } = await supabase
        .from('workouts')
        .select('user_id')
        .eq('status', 'completed')
        .gte('completed_at', monthStart)

      const countByUser = new Map<string, number>()
      for (const w of userWorkouts ?? []) {
        countByUser.set(w.user_id, (countByUser.get(w.user_id) ?? 0) + 1)
      }
      for (const count of countByUser.values()) {
        if (count >= 3) regularUsers++
      }
    }

    const clamp = (n: number, max: number) => Math.min(Math.round((n / max) * 100), 100)

    const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
      .format(now)
      .replace(/^\w/, (c) => c.toUpperCase())

    const challenges = [
      {
        id: 'volume',
        title: 'Volume collectif',
        emoji: '🏋️',
        current: Math.round(volumeKg),
        target: TARGETS.volume,
        unit: 'kg',
        pct: clamp(volumeKg, TARGETS.volume),
      },
      {
        id: 'workouts',
        title: 'Séances complètes',
        emoji: '🔥',
        current: workoutsCount,
        target: TARGETS.workouts,
        unit: 'séances',
        pct: clamp(workoutsCount, TARGETS.workouts),
      },
      {
        id: 'regularity',
        title: 'Athlètes réguliers',
        emoji: '📅',
        current: regularUsers,
        target: TARGETS.regularity,
        unit: 'users',
        pct: clamp(regularUsers, TARGETS.regularity),
      },
    ]

    return NextResponse.json({ challenges, month: monthName })
  } catch {
    return NextResponse.json({ challenges: [], month: '' })
  }
}
