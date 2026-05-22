import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NutritionClient } from '@/components/nutrition/NutritionClient'
import { calcTDEESimple } from '@/lib/utils/tdee'

export const dynamic = 'force-dynamic'

export default async function NutritionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: logs }, { data: profile }] = await Promise.all([
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
  ])

  // Objectifs nutritionnels via Mifflin-St Jeor + multiplicateur d'activité
  const w = (profile?.weight_kg && profile.weight_kg > 30 && profile.weight_kg < 250) ? profile.weight_kg : 75
  const autoMacros = calcTDEESimple({
    weight_kg: w,
    height_cm: profile?.height_cm,
    age: profile?.age,
    gender: profile?.gender,
    goal: profile?.goal,
    sessions_per_week: profile?.sessions_per_week,
  })

  const targets = profile?.macro_mode === 'custom' && profile.custom_protein_g ? {
    calories:  profile.custom_calories  ?? autoMacros.calories,
    protein_g: profile.custom_protein_g,
    carbs_g:   profile.custom_carbs_g   ?? autoMacros.carbs_g,
    fat_g:     profile.custom_fat_g     ?? autoMacros.fat_g,
  } : {
    calories:  autoMacros.calories,
    protein_g: autoMacros.protein_g,
    carbs_g:   autoMacros.carbs_g,
    fat_g:     autoMacros.fat_g,
  }

  return (
    <NutritionClient
      initialLogs={logs ?? []}
      targets={targets}
      today={today}
    />
  )
}
