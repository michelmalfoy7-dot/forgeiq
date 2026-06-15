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
      steps_goal, target_weight_kg, include_warmup_in_tonnage, gym_id, timezone,
    } = body

    // Valider la timezone si fournie (Intl.DateTimeFormat lève une exception si invalide)
    if (timezone) {
      try { Intl.DateTimeFormat(undefined, { timeZone: timezone }) }
      catch { return NextResponse.json({ data: null, error: 'Timezone invalide' }, { status: 400 }) }
    }

    // Validation des bornes numériques
    const bounds: Record<string, [number, number]> = {
      age: [10, 120],
      height_cm: [100, 250],
      weight_kg: [20, 300],
      target_weight_kg: [20, 300],
      sessions_per_week: [1, 14],
      steps_goal: [1000, 50000],
    }
    const numericFields: Record<string, number | null | undefined> = {
      age, height_cm, weight_kg, target_weight_kg, sessions_per_week, steps_goal,
    }
    for (const [field, [min, max]] of Object.entries(bounds)) {
      const val = numericFields[field]
      if (val != null) {
        const n = Number(val)
        if (isNaN(n) || n < min || n > max) {
          return NextResponse.json({ data: null, error: `Valeur invalide: ${field}` }, { status: 400 })
        }
      }
    }

    // Sanitizer display_name côté serveur (même si l'UI limite à 50)
    const sanitizedDisplayName = typeof display_name === 'string'
      ? display_name.trim().slice(0, 50) || null
      : display_name ?? undefined

    const { error } = await supabase.from('profiles').update({
      display_name: sanitizedDisplayName,
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
      include_warmup_in_tonnage: include_warmup_in_tonnage ?? undefined,
      gym_id: gym_id !== undefined ? (gym_id || null) : undefined,
      timezone: timezone ?? undefined,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data: { updated: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
