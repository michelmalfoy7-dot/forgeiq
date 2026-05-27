import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NutritionClient } from '@/components/nutrition/NutritionClient'
import { calcDailyTarget } from '@/lib/utils/tdee'

export const dynamic = 'force-dynamic'

export default async function NutritionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // Charger logs, profil, steps du jour ET tonnage séance du jour en parallèle
  const [{ data: logs }, { data: profile }, { data: todayLog }, { data: todayWorkout }] = await Promise.all([
    supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('goal, weight_kg, height_cm, age, gender, sessions_per_week, macro_mode, custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g')
      .eq('id', user.id)
      .single(),
    // Steps du check-in du jour pour le TDEE dynamique
    supabase
      .from('daily_logs')
      .select('steps')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .maybeSingle(),
    // Séance complétée aujourd'hui pour le TDEE dynamique
    supabase
      .from('workouts')
      .select('total_tonnage_kg')
      .eq('user_id', user.id)
      .eq('session_date', today)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Source unique de vérité : calcDailyTarget avec données réelles du jour
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
    todaySteps:            todayLog?.steps ?? null,
    todayWorkoutTonnage:   todayWorkout?.total_tonnage_kg ?? null,
  })

  const targets = {
    calories:  dailyTarget.targetCalories,
    protein_g: dailyTarget.macros.protein_g,
    carbs_g:   dailyTarget.macros.carbs_g,
    fat_g:     dailyTarget.macros.fat_g,
  }

  return (
    <NutritionClient
      initialLogs={logs ?? []}
      targets={targets}
      today={today}
    />
  )
}
