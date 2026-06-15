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
      // Micros directs (recettes, aliments avec données déjà calculées)
      iron_mg_direct       = null,
      magnesium_mg_direct  = null,
      zinc_mg_direct       = null,
      calcium_mg_direct    = null,
      potassium_mg_direct  = null,
      vitamin_c_mg_direct  = null,
      vitamin_d_mcg_direct = null,
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
    const entry: Record<string, unknown> = {
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

    // Micros directs (recettes) — priorité sur foods_library
    if (iron_mg_direct != null || magnesium_mg_direct != null || zinc_mg_direct != null
      || calcium_mg_direct != null || potassium_mg_direct != null
      || vitamin_c_mg_direct != null || vitamin_d_mcg_direct != null) {
      entry.iron_mg       = iron_mg_direct       != null ? Math.round(iron_mg_direct       * 1000) / 1000 : null
      entry.magnesium_mg  = magnesium_mg_direct  != null ? Math.round(magnesium_mg_direct  * 10)   / 10   : null
      entry.zinc_mg       = zinc_mg_direct       != null ? Math.round(zinc_mg_direct       * 1000) / 1000 : null
      entry.calcium_mg    = calcium_mg_direct    != null ? Math.round(calcium_mg_direct    * 10)   / 10   : null
      entry.potassium_mg  = potassium_mg_direct  != null ? Math.round(potassium_mg_direct  * 10)   / 10   : null
      entry.vitamin_c_mg  = vitamin_c_mg_direct  != null ? Math.round(vitamin_c_mg_direct  * 100)  / 100  : null
      entry.vitamin_d_mcg = vitamin_d_mcg_direct != null ? Math.round(vitamin_d_mcg_direct * 100)  / 100  : null
    }

    // Récupérer les micronutriments depuis foods_library si food_id connu
    if (food_id) {
      const { data: lib } = await supabase
        .from('foods_library')
        .select('iron_mg,magnesium_mg,zinc_mg,calcium_mg,vitamin_d_mcg,potassium_mg,vitamin_c_mg,sodium_mg')
        .eq('id', food_id)
        .maybeSingle()

      if (lib) {
        const r = ratio
        entry.iron_mg       = lib.iron_mg       != null ? Math.round(lib.iron_mg       * r * 1000) / 1000 : null
        entry.magnesium_mg  = lib.magnesium_mg  != null ? Math.round(lib.magnesium_mg  * r * 10)   / 10   : null
        entry.zinc_mg       = lib.zinc_mg       != null ? Math.round(lib.zinc_mg       * r * 1000) / 1000 : null
        entry.calcium_mg    = lib.calcium_mg    != null ? Math.round(lib.calcium_mg    * r * 10)   / 10   : null
        entry.vitamin_d_mcg = lib.vitamin_d_mcg != null ? Math.round(lib.vitamin_d_mcg * r * 100)  / 100  : null
        entry.potassium_mg  = lib.potassium_mg  != null ? Math.round(lib.potassium_mg  * r * 10)   / 10   : null
        entry.vitamin_c_mg  = lib.vitamin_c_mg  != null ? Math.round(lib.vitamin_c_mg  * r * 100)  / 100  : null
        // Sodium — présent dans foods_library (OpenFoodFacts) et food_logs (colonne ajoutée Sprint 14)
        entry.sodium_mg     = lib.sodium_mg     != null ? Math.round(lib.sodium_mg     * r * 10)   / 10   : null
      }
    }

    const { data, error } = await supabase.from('food_logs').insert(entry).select().single()
    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Nutrition log error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH : modifier un log existant (quantité et/ou repas)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { id, quantity_g, meal_type } = await req.json()
    if (!id) return NextResponse.json({ data: null, error: 'ID manquant' }, { status: 400 })

    const qty = Number(quantity_g)
    if (!qty || qty <= 0 || qty > 100000) {
      return NextResponse.json({ data: null, error: 'Quantité invalide' }, { status: 400 })
    }

    // Récupérer le log existant pour recalculer les macros proportionnellement
    const { data: existing, error: fetchErr } = await supabase
      .from('food_logs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchErr || !existing) {
      return NextResponse.json({ data: null, error: 'Log introuvable' }, { status: 404 })
    }

    // Recalcul proportionnel depuis la quantité précédente → nouvelle quantité
    const prevQty = Number(existing.quantity_g) || 100
    const ratio = qty / prevQty

    const updates: Record<string, unknown> = { quantity_g: qty }

    // Macros principales — recalcul proportionnel
    if (existing.calories  != null) updates.calories  = Math.round(existing.calories  * ratio * 10) / 10
    if (existing.protein_g != null) updates.protein_g = Math.round(existing.protein_g * ratio * 10) / 10
    if (existing.carbs_g   != null) updates.carbs_g   = Math.round(existing.carbs_g   * ratio * 10) / 10
    if (existing.fat_g     != null) updates.fat_g     = Math.round(existing.fat_g     * ratio * 10) / 10
    if (existing.fiber_g   != null) updates.fiber_g   = Math.round(existing.fiber_g   * ratio * 10) / 10

    // Micronutriments — recalcul proportionnel
    if (existing.iron_mg       != null) updates.iron_mg       = Math.round(existing.iron_mg       * ratio * 1000) / 1000
    if (existing.magnesium_mg  != null) updates.magnesium_mg  = Math.round(existing.magnesium_mg  * ratio * 10)   / 10
    if (existing.zinc_mg       != null) updates.zinc_mg       = Math.round(existing.zinc_mg       * ratio * 1000) / 1000
    if (existing.calcium_mg    != null) updates.calcium_mg    = Math.round(existing.calcium_mg    * ratio * 10)   / 10
    if (existing.potassium_mg  != null) updates.potassium_mg  = Math.round(existing.potassium_mg  * ratio * 10)   / 10
    if (existing.vitamin_c_mg  != null) updates.vitamin_c_mg  = Math.round(existing.vitamin_c_mg  * ratio * 100)  / 100
    if (existing.vitamin_d_mcg != null) updates.vitamin_d_mcg = Math.round(existing.vitamin_d_mcg * ratio * 100)  / 100
    if (existing.sodium_mg     != null) updates.sodium_mg     = Math.round(existing.sodium_mg     * ratio * 10)   / 10

    // Mise à jour du meal_type si fourni
    if (meal_type) updates.meal_type = meal_type

    const { data, error } = await supabase
      .from('food_logs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Nutrition log PATCH error:', err)
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
