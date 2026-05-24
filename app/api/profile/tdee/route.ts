import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildTDEEBreakdown, calcCardioCalories } from '@/lib/utils/tdee'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile/tdee
 * Calcule le TDEE réel depuis les 30 derniers jours de données.
 *
 * Données utilisées :
 *  - profile : poids, taille, âge, genre, séances/semaine, objectif
 *  - daily_logs (30j) : steps pour NEAT réel
 *  - workouts (30j) : tonnage moyen pour calories entraînement musculaire
 *  - workouts cardio (30j) : durée × MET pour calories cardio
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    const [
      { data: profile },
      { data: logs },
      { data: workouts },
      { data: cardioWorkouts },
    ] = await Promise.all([
      supabase.from('profiles')
        .select('weight_kg, height_cm, age, gender, sessions_per_week, goal')
        .eq('id', user.id)
        .single(),

      // Uniquement les jours avec steps renseignés (≠ null)
      supabase.from('daily_logs')
        .select('steps')
        .eq('user_id', user.id)
        .gte('log_date', thirtyDaysAgo)
        .not('steps', 'is', null),

      // Séances de musculation (avec tonnage)
      supabase.from('workouts')
        .select('total_tonnage_kg')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .gte('session_date', thirtyDaysAgo),

      // Séances cardio : tonnage = 0, exclut les non-activités
      supabase.from('workouts')
        .select('session_name, started_at, completed_at')
        .eq('user_id', user.id)
        .eq('total_tonnage_kg', 0)
        .neq('session_name', 'Jour de repos')
        .neq('session_name', 'Séance libre')
        .not('completed_at', 'is', null)
        .gte('session_date', thirtyDaysAgo),
    ])

    // Valeurs avec fallbacks prudents
    const weight_kg        = profile?.weight_kg ?? 75
    const height_cm        = profile?.height_cm ?? 175
    const age              = profile?.age ?? 30
    const gender           = profile?.gender ?? 'male'
    const sessionsPerWeek  = profile?.sessions_per_week ?? 3
    const goal             = profile?.goal ?? 'general'

    // ≥ 7 jours de logs avec steps = données suffisantes pour NEAT réel
    const logsCount = logs?.length ?? 0
    const hasEnoughData = logsCount >= 7

    const avgStepsPerDay = hasEnoughData && logsCount > 0
      ? Math.round(logs!.reduce((acc, l) => acc + (l.steps ?? 0), 0) / logsCount)
      : 0

    // Tonnage moyen par séance musculaire (30 derniers jours)
    const avgTonnagePerSession = workouts?.length
      ? workouts.reduce((acc, w) => acc + (w.total_tonnage_kg ?? 0), 0) / workouts.length
      : 5000 // séance légère par défaut si aucun historique

    // Calories cardio totales sur 30 jours → lissées en calories/jour
    const totalCardioCalories = (cardioWorkouts ?? []).reduce((acc, session) => {
      if (!session.started_at || !session.completed_at) return acc
      const startMs = new Date(session.started_at as string).getTime()
      const endMs = new Date(session.completed_at as string).getTime()
      const durationMin = (endMs - startMs) / 60000
      // Ignore les sessions avec durée invalide (< 1 min ou > 300 min)
      if (durationMin < 1 || durationMin > 300) return acc
      return acc + calcCardioCalories(session.session_name as string, durationMin, weight_kg)
    }, 0)

    const avgCardioCaloriesPerDay = totalCardioCalories / 30

    const breakdown = buildTDEEBreakdown({
      weight_kg, height_cm, age, gender, goal,
      sessionsPerWeek, avgStepsPerDay, avgTonnagePerSession,
      avgCardioCaloriesPerDay, hasEnoughData, logsCount,
    })

    return NextResponse.json({ data: breakdown, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
