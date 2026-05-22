import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const {
      display_name, goal, level, equipment, sessions_per_week, age, height_cm, gender, weight_kg,
      macro_mode, custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g,
      steps_goal, target_weight_kg,
    } = body

    const { error } = await supabase.from('profiles').update({
      display_name,
      goal,
      level,
      equipment,
      sessions_per_week,
      age,
      height_cm,
      gender: gender ?? undefined,
      weight_kg: weight_kg ?? undefined,
      macro_mode: macro_mode ?? undefined,
      custom_calories: custom_calories ?? undefined,
      custom_protein_g: custom_protein_g ?? undefined,
      custom_carbs_g: custom_carbs_g ?? undefined,
      custom_fat_g: custom_fat_g ?? undefined,
      steps_goal: steps_goal != null ? Number(steps_goal) : undefined,
      target_weight_kg: target_weight_kg != null ? Number(target_weight_kg) : undefined,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data: { updated: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
