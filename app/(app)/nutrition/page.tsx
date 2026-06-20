import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NutritionClient } from '@/components/nutrition/NutritionClient'
import { calcDailyTarget } from '@/lib/utils/tdee'
import { PLAN_SELECT, isRealProUser } from '@/lib/utils/plan'

export const dynamic = 'force-dynamic'

export default async function NutritionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today          = new Date().toISOString().split('T')[0]
  const yesterday      = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const thirtyDaysAgo  = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  // Charger logs, profil, steps, séance du jour + moyenne steps 30j en parallèle
  const [
    { data: logs },
    { data: profile },
    { data: todayLog },
    { data: yesterdayLog },
    { data: todayWorkout },
    { data: steps30dLogs },
  ] = await Promise.all([
    supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('goal, weight_kg, height_cm, age, gender, sessions_per_week, macro_mode, custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g, water_goal_ml, subscription_status, subscription_plan, is_admin, referral_pro_until')
      .eq('id', user.id)
      .single(),
    // Steps + eau du jour
    supabase
      .from('daily_logs')
      .select('steps, water_ml')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .maybeSingle(),
    // Steps d'hier — fallback si pas assez de données 30j
    supabase
      .from('daily_logs')
      .select('steps')
      .eq('user_id', user.id)
      .eq('log_date', yesterday)
      .maybeSingle(),
    // Séance complétée aujourd'hui — tonnage + séries + nom pour TDEE précis
    supabase
      .from('workouts')
      .select('total_tonnage_kg, total_sets, session_name')
      .eq('user_id', user.id)
      .eq('session_date', today)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Moyenne steps 30j (journées COMPLÈTES = exclut aujourd'hui + zéros)
    // Source stable — évite le biais des steps partiels du matin
    supabase
      .from('daily_logs')
      .select('steps')
      .eq('user_id', user.id)
      .gte('log_date', thirtyDaysAgo)
      .lt('log_date', today)
      .gt('steps', 0),
  ])

  // Calcul moyenne 30j (minimum 3 jours de données pour être significatif)
  const avgSteps30d = (steps30dLogs ?? []).length >= 3
    ? Math.round((steps30dLogs ?? []).reduce((acc, l) => acc + (l.steps ?? 0), 0) / (steps30dLogs ?? []).length)
    : null

  // Source unique de vérité : calcDailyTarget avec données réelles du jour
  // Steps : moy 30j (stable) > hier (complet) > aujourd'hui (partiel)
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
    todaySteps:          todayLog?.steps                  ?? null,
    yesterdaySteps:      yesterdayLog?.steps              ?? null,
    todayWorkoutTonnage: todayWorkout?.total_tonnage_kg   ?? null,
    todayWorkoutSets:    todayWorkout?.total_sets          ?? null,
    todayWorkoutName:    todayWorkout?.session_name        ?? null,
    isRestDay,
  })

  const targets = {
    calories:  dailyTarget.targetCalories,
    protein_g: dailyTarget.macros.protein_g,
    carbs_g:   dailyTarget.macros.carbs_g,
    fat_g:     dailyTarget.macros.fat_g,
  }

  // Statut Pro — requête minimale séparée pour éviter l'échec silencieux
  // si une colonne du SELECT principal n'existe pas en production
  const { data: planRow } = await supabase
    .from('profiles')
    .select(PLAN_SELECT)
    .eq('id', user.id)
    .maybeSingle()

  const isPro = isRealProUser(planRow)

  return (
    <NutritionClient
      initialLogs={logs ?? []}
      targets={targets}
      today={today}
      initialWaterMl={todayLog?.water_ml ?? 0}
      waterGoalMl={profile?.water_goal_ml ?? 2500}
      isRestDay={isRestDay}
      workoutKcal={dailyTarget.workoutKcal > 0 ? dailyTarget.workoutKcal : undefined}
      isPro={isPro}
    />
  )
}
