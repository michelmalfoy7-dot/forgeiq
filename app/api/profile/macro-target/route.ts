import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile/macro-target
 * Retourne uniquement les données de profil nécessaires au Meal Planner
 * (objectif, poids, macros custom) — requête légère, pas de calcul TDEE complet.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase
      .from('profiles')
      .select('goal, weight_kg, custom_calories, custom_protein_g, sessions_per_week')
      .eq('id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
