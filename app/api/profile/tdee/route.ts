import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildTDEEBreakdown, calcCardioCalories, calcDailyTarget } from '@/lib/utils/tdee'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile/tdee
 * Calcule le TDEE réel depuis les 30 derniers jours de données.
 *
 * Données utilisées :
 *  - profile : poids, taille, âge, genre, séances/semaine, objectif, macros custom
 *  - daily_logs (30j, journées complètes) : steps pour NEAT réel (exclut aujourd'hui + zéros)
 *  - workouts (30j) : tonnage moyen pour calories entraînement musculaire
 *  - workouts cardio (30j) : durée × MET pour calories cardio
 *  - séance du jour + steps hier : pour cible dynamique via calcDailyTarget (SOT)
 *
 * Source unique de vérité (SOT) : targetCalories vient de calcDailyTarget()
 * → garanti identique à la page Nutrition et au Dashboard
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const today         = new Date().toISOString().split('T')[0]
    const yesterday     = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    const [
      { data: profile },
      { data: logs },
      { data: workouts },
      { data: cardioWorkouts },
      { data: yesterdayLog },
      { data: todayWorkout },
    ] = await Promise.all([
      supabase.from('profiles')
        .select('weight_kg, height_cm, age, gender, sessions_per_week, goal, macro_mode, custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g')
        .eq('id', user.id)
        .single(),

      // Journées complètes avec steps > 0 (exclut aujourd'hui partiel + zéros)
      supabase.from('daily_logs')
        .select('steps')
        .eq('user_id', user.id)
        .gte('log_date', thirtyDaysAgo)
        .lt('log_date', today)
        .gt('steps', 0),

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

      // Steps d'hier — fallback si pas assez de données 30j
      supabase.from('daily_logs')
        .select('steps')
        .eq('user_id', user.id)
        .eq('log_date', yesterday)
        .maybeSingle(),

      // Séance complétée aujourd'hui — pour TDEE dynamique du jour
      supabase.from('workouts')
        .select('total_tonnage_kg, total_sets, session_name')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
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

    // Moyenne 30j pour calcDailyTarget (seuil minimal 3 jours)
    const avgSteps30d = logsCount >= 3 ? avgStepsPerDay : null

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

    // Breakdown 30j — pour l'affichage visuel (BMR + steps + training + cardio)
    const breakdown = buildTDEEBreakdown({
      weight_kg, height_cm, age, gender, goal,
      sessionsPerWeek, avgStepsPerDay, avgTonnagePerSession,
      avgCardioCaloriesPerDay, hasEnoughData, logsCount,
    })

    // Source unique de vérité (SOT) — même calcul que Dashboard et Nutrition
    // Garantit que "Profil Auto IA" = "Page Nutrition" = "Dashboard"
    const isRestDay = !todayWorkout
    const dailyTarget = calcDailyTarget({
      weight_kg:         profile?.weight_kg,
      height_cm:         profile?.height_cm,
      age:               profile?.age,
      gender:            profile?.gender,
      goal:              profile?.goal,
      sessions_per_week: profile?.sessions_per_week,
      macro_mode:        profile?.macro_mode,
      custom_calories:   profile?.custom_calories,
      custom_protein_g:  profile?.custom_protein_g,
      custom_carbs_g:    profile?.custom_carbs_g,
      custom_fat_g:      profile?.custom_fat_g,
      avgSteps30d,
      yesterdaySteps:      yesterdayLog?.steps              ?? null,
      todayWorkoutTonnage: todayWorkout?.total_tonnage_kg   ?? null,
      todayWorkoutSets:    todayWorkout?.total_sets          ?? null,
      todayWorkoutName:    todayWorkout?.session_name        ?? null,
      isRestDay,
    })

    // Fusionner : breakdown pour le détail visuel, targetCalories/macros depuis SOT
    const data = {
      ...breakdown,
      // Écrase la cible finale avec la valeur SOT (identique à Nutrition + Dashboard)
      targetCalories: dailyTarget.targetCalories,
      macros:         dailyTarget.macros,
    }

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
