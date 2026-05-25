import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST : ajouter un aliment au journal journalier
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const {
      log_date = new Date().toISOString().split('T')[0],
      meal_type = 'snack',
      food_id = null,
      food_name,
      quantity_g = 100,
      calories_per_100g,
      protein_per_100g,
      carbs_per_100g,
      fat_per_100g,
      fiber_per_100g,
      source = 'manual',
      photo_url = null,
      ai_note = null,
    } = body

    if (!food_name) return NextResponse.json({ data: null, error: 'Nom aliment manquant' }, { status: 400 })

    // Validation des inputs numériques
    const qty = Number(quantity_g)
    if (!qty || qty <= 0 || qty > 100000) {
      return NextResponse.json({ data: null, error: 'Quantité invalide' }, { status: 400 })
    }
    // Pas de validation stricte sur les macros car les recettes peuvent avoir des valeurs élevées
    // (ex: 1200 kcal/portion = recipePortions * 100g → 1200 kcal/100g dans le payload)
    if (calories_per_100g != null && (Number(calories_per_100g) < 0 || Number(calories_per_100g) > 50000)) {
      return NextResponse.json({ data: null, error: 'Calories invalides' }, { status: 400 })
    }
    if (protein_per_100g != null && (Number(protein_per_100g) < 0 || Number(protein_per_100g) > 10000)) {
      return NextResponse.json({ data: null, error: 'Protéines invalides' }, { status: 400 })
    }

    // Calculer les macros pour la quantité saisie
    const ratio = qty / 100
    const entry = {
      user_id: user.id,
      log_date,
      meal_type,
      food_id: food_id ?? null,
      food_name,
      quantity_g,
      calories:  calories_per_100g  != null ? Math.round(calories_per_100g  * ratio * 10) / 10 : null,
      protein_g: protein_per_100g   != null ? Math.round(protein_per_100g   * ratio * 10) / 10 : null,
      carbs_g:   carbs_per_100g     != null ? Math.round(carbs_per_100g     * ratio * 10) / 10 : null,
      fat_g:     fat_per_100g       != null ? Math.round(fat_per_100g       * ratio * 10) / 10 : null,
      fiber_g:   fiber_per_100g     != null ? Math.round(fiber_per_100g     * ratio * 10) / 10 : null,
      source,
      photo_url,
      ai_note,
    }

    const { data, error } = await supabase.from('food_logs').insert(entry).select().single()
    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Nutrition log error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE : supprimer une entrée du journal
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ data: null, error: 'ID manquant' }, { status: 400 })

    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // RLS double check

    if (error) throw error
    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET : récupérer le journal du jour
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]

    const { data: logs } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', date)
      .order('created_at', { ascending: true })

    // Totaux agrégés
    const totals = (logs ?? []).reduce(
      (acc, l) => ({
        calories:  acc.calories  + (l.calories  ?? 0),
        protein_g: acc.protein_g + (l.protein_g ?? 0),
        carbs_g:   acc.carbs_g   + (l.carbs_g   ?? 0),
        fat_g:     acc.fat_g     + (l.fat_g     ?? 0),
        fiber_g:   acc.fiber_g   + (l.fiber_g   ?? 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
    )

    return NextResponse.json({ data: { logs: logs ?? [], totals }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
