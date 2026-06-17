import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Ingredient = {
  food_name: string
  food_id?: string | null
  quantity_g: number
  calories_per_100g?: number | null
  protein_per_100g?: number | null
  carbs_per_100g?: number | null
  fat_per_100g?: number | null
  fiber_per_100g?: number | null
  sort_order?: number
  // Micronutriments optionnels (présents si l'ingrédient vient de foods_library)
  iron_mg_per_100g?:       number | null
  magnesium_mg_per_100g?:  number | null
  zinc_mg_per_100g?:       number | null
  calcium_mg_per_100g?:    number | null
  potassium_mg_per_100g?:  number | null
  vitamin_c_mg_per_100g?:  number | null
  vitamin_d_mcg_per_100g?: number | null
}

function calcPerServing(ingredients: Ingredient[], servings: number) {
  const total = ingredients.reduce((acc, ing) => {
    const ratio = ing.quantity_g / 100
    const micro = (v: number | null | undefined) => v != null ? v * ratio : null
    const addMicro = (a: number | null, b: number | null) =>
      a != null && b != null ? a + b : (a ?? b)

    return {
      calories:    acc.calories    + (ing.calories_per_100g ?? 0) * ratio,
      protein:     acc.protein     + (ing.protein_per_100g  ?? 0) * ratio,
      carbs:       acc.carbs       + (ing.carbs_per_100g    ?? 0) * ratio,
      fat:         acc.fat         + (ing.fat_per_100g      ?? 0) * ratio,
      fiber:       acc.fiber       + (ing.fiber_per_100g    ?? 0) * ratio,
      // Micros : null si pas de données, sinon somme
      iron_mg:       addMicro(acc.iron_mg,       micro(ing.iron_mg_per_100g)),
      magnesium_mg:  addMicro(acc.magnesium_mg,  micro(ing.magnesium_mg_per_100g)),
      zinc_mg:       addMicro(acc.zinc_mg,        micro(ing.zinc_mg_per_100g)),
      calcium_mg:    addMicro(acc.calcium_mg,     micro(ing.calcium_mg_per_100g)),
      potassium_mg:  addMicro(acc.potassium_mg,   micro(ing.potassium_mg_per_100g)),
      vitamin_c_mg:  addMicro(acc.vitamin_c_mg,   micro(ing.vitamin_c_mg_per_100g)),
      vitamin_d_mcg: addMicro(acc.vitamin_d_mcg,  micro(ing.vitamin_d_mcg_per_100g)),
    }
  }, {
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
    iron_mg: null as number | null, magnesium_mg: null as number | null,
    zinc_mg: null as number | null, calcium_mg: null as number | null,
    potassium_mg: null as number | null, vitamin_c_mg: null as number | null,
    vitamin_d_mcg: null as number | null,
  })

  const s = Math.max(1, servings)
  const r = (v: number | null) => v != null ? Math.round(v / s * 100) / 100 : null
  return {
    calories_per_serving:    Math.round(total.calories / s * 10) / 10,
    protein_per_serving:     Math.round(total.protein  / s * 10) / 10,
    carbs_per_serving:       Math.round(total.carbs    / s * 10) / 10,
    fat_per_serving:         Math.round(total.fat      / s * 10) / 10,
    fiber_per_serving:       Math.round(total.fiber    / s * 10) / 10,
    iron_mg_per_serving:     r(total.iron_mg),
    magnesium_mg_per_serving: r(total.magnesium_mg),
    zinc_mg_per_serving:     r(total.zinc_mg),
    calcium_mg_per_serving:  r(total.calcium_mg),
    potassium_mg_per_serving: r(total.potassium_mg),
    vitamin_c_mg_per_serving: r(total.vitamin_c_mg),
    vitamin_d_mcg_per_serving: r(total.vitamin_d_mcg),
  }
}

// GET : liste des recettes avec leurs ingrédients
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: data ?? [], error: null })
  } catch {
    return NextResponse.json({ data: [], error: null }) // Graceful si table absente
  }
}

// POST : créer ou mettre à jour une recette
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { name, description = null, total_servings = 1, ingredients = [] } = body as {
      name: string
      description?: string
      total_servings?: number
      ingredients: Ingredient[]
    }

    if (!name) return NextResponse.json({ data: null, error: 'Nom de recette manquant' }, { status: 400 })
    if (ingredients.length === 0) return NextResponse.json({ data: null, error: 'Ajoute au moins 1 ingrédient' }, { status: 400 })

    // calcPerServing retourne aussi 7 colonnes micro (Sprint 6) absentes de la table
    // recipes — ne prendre que les 5 macros existantes (voir migration_recipes_micro.sql)
    const allMacros = calcPerServing(ingredients, total_servings)
    const macroFields = {
      calories_per_serving: allMacros.calories_per_serving,
      protein_per_serving:  allMacros.protein_per_serving,
      carbs_per_serving:    allMacros.carbs_per_serving,
      fat_per_serving:      allMacros.fat_per_serving,
      fiber_per_serving:    allMacros.fiber_per_serving,
    }

    // Créer la recette
    const { data: recipe, error: recipeErr } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        name,
        description,
        total_servings,
        ...macroFields,
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (recipeErr) throw recipeErr
    if (!recipe) throw new Error('Recette non créée')

    // Insérer les ingrédients
    const ingrRows = ingredients.map((ing, i) => ({
      recipe_id: recipe.id,
      food_name: ing.food_name,
      food_id: ing.food_id ?? null,
      quantity_g: ing.quantity_g,
      calories_per_100g: ing.calories_per_100g ?? null,
      protein_per_100g: ing.protein_per_100g ?? null,
      carbs_per_100g: ing.carbs_per_100g ?? null,
      fat_per_100g: ing.fat_per_100g ?? null,
      fiber_per_100g: ing.fiber_per_100g ?? null,
      sort_order: ing.sort_order ?? i,
    }))

    const { error: ingrErr } = await supabase.from('recipe_ingredients').insert(ingrRows)
    if (ingrErr) throw ingrErr

    // Retourner la recette complète avec ingrédients
    const { data: full } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .eq('id', recipe.id)
      .maybeSingle()

    return NextResponse.json({ data: full, error: null })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('Recipe create error:', detail)
    return NextResponse.json({ data: null, error: `Erreur serveur: ${detail}` }, { status: 500 })
  }
}

// PATCH : modifier une recette existante (nom, portions, ingrédients)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { id, name, total_servings, ingredients } = body as {
      id: string
      name?: string
      total_servings?: number
      ingredients?: Ingredient[]
    }

    if (!id) return NextResponse.json({ data: null, error: 'ID manquant' }, { status: 400 })

    // Vérifier que la recette appartient bien à cet utilisateur
    const { data: existing, error: fetchErr } = await supabase
      .from('recipes')
      .select('id, total_servings')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchErr || !existing) {
      return NextResponse.json({ data: null, error: 'Recette introuvable' }, { status: 404 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (name !== undefined) updates.name = name.trim()

    const servings = total_servings ?? existing.total_servings ?? 1

    if (total_servings !== undefined) updates.total_servings = servings

    // Recalcul des macros si des ingrédients sont fournis
    if (ingredients !== undefined) {
      if (ingredients.length === 0) {
        return NextResponse.json({ data: null, error: 'Ajoute au moins 1 ingrédient' }, { status: 400 })
      }
      const allMacros = calcPerServing(ingredients, servings)
      updates.calories_per_serving = allMacros.calories_per_serving
      updates.protein_per_serving  = allMacros.protein_per_serving
      updates.carbs_per_serving    = allMacros.carbs_per_serving
      updates.fat_per_serving      = allMacros.fat_per_serving
      updates.fiber_per_serving    = allMacros.fiber_per_serving

      // Remplacer les ingrédients : supprimer les anciens et insérer les nouveaux
      const { error: delErr } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id)
      if (delErr) throw delErr

      const ingrRows = ingredients.map((ing, i) => ({
        recipe_id: id,
        food_name: ing.food_name,
        food_id: ing.food_id ?? null,
        quantity_g: ing.quantity_g,
        calories_per_100g: ing.calories_per_100g ?? null,
        protein_per_100g: ing.protein_per_100g ?? null,
        carbs_per_100g: ing.carbs_per_100g ?? null,
        fat_per_100g: ing.fat_per_100g ?? null,
        fiber_per_100g: ing.fiber_per_100g ?? null,
        sort_order: ing.sort_order ?? i,
      }))

      const { error: ingrErr } = await supabase.from('recipe_ingredients').insert(ingrRows)
      if (ingrErr) throw ingrErr
    } else if (total_servings !== undefined) {
      // Recalcul des macros à partir des ingrédients existants si seules les portions changent
      const { data: existingIngr } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('sort_order', { ascending: true })

      if (existingIngr && existingIngr.length > 0) {
        const allMacros = calcPerServing(existingIngr as Ingredient[], servings)
        updates.calories_per_serving = allMacros.calories_per_serving
        updates.protein_per_serving  = allMacros.protein_per_serving
        updates.carbs_per_serving    = allMacros.carbs_per_serving
        updates.fat_per_serving      = allMacros.fat_per_serving
        updates.fiber_per_serving    = allMacros.fiber_per_serving
      }
    }

    const { error: updateErr } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateErr) throw updateErr

    // Retourner la recette complète mise à jour avec ses ingrédients
    const { data: full } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .eq('id', id)
      .maybeSingle()

    return NextResponse.json({ data: full, error: null })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('Recipe PATCH error:', detail)
    return NextResponse.json({ data: null, error: `Erreur serveur: ${detail}` }, { status: 500 })
  }
}

// DELETE : supprimer une recette (cascade supprime les ingrédients)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ data: null, error: 'ID manquant' }, { status: 400 })

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
