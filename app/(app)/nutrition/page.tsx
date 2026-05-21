import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NutritionClient } from '@/components/nutrition/NutritionClient'

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
      .select('goal, weight_kg, macro_mode, custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g')
      .eq('id', user.id)
      .single(),
  ])

  // Objectifs selon profil (mêmes ratios que le coach)
  const PROTEIN_RATIO: Record<string, { min: number; max: number }> = {
    muscle_gain: { min: 1.8, max: 2.2 },
    strength:    { min: 1.8, max: 2.2 },
    weight_loss: { min: 1.8, max: 2.0 },
    endurance:   { min: 1.2, max: 1.6 },
    general:     { min: 1.4, max: 1.8 },
  }
  const w = (profile?.weight_kg && profile.weight_kg > 30 && profile.weight_kg < 250) ? profile.weight_kg : 75
  const ratio = PROTEIN_RATIO[profile?.goal ?? 'general'] ?? PROTEIN_RATIO['general']

  const targets = profile?.macro_mode === 'custom' && profile.custom_protein_g ? {
    calories:  profile.custom_calories  ?? Math.round(w * 30 + 300),
    protein_g: profile.custom_protein_g,
    carbs_g:   profile.custom_carbs_g   ?? Math.round((w * 30 + 300) * 0.40 / 4),
    fat_g:     profile.custom_fat_g     ?? Math.round((w * 30 + 300) * 0.28 / 9),
  } : {
    calories:  Math.round(w * 30 + 300),
    protein_g: Math.round(w * (ratio.min + ratio.max) / 2),
    carbs_g:   Math.round((w * 30 + 300) * 0.40 / 4),
    fat_g:     Math.round((w * 30 + 300) * 0.28 / 9),
  }

  return (
    <NutritionClient
      initialLogs={logs ?? []}
      targets={targets}
      today={today}
    />
  )
}
