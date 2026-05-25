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
}

function calcPerServing(ingredients: Ingredient[], servings: number) {
  const total = ingredients.reduce((acc, ing) => {
    const ratio = ing.quantity_g / 100
    return {
      calories: acc.calories + (ing.calories_per_100g ?? 0) * ratio,
      protein:  acc.protein  + (ing.protein_per_100g  ?? 0) * ratio,
      carbs:    acc.carbs    + (ing.carbs_per_100g    ?? 0) * ratio,
      fat:      acc.fat      + (ing.fat_per_100g      ?? 0) * ratio,
      fiber:    acc.fiber    + (ing.fiber_per_100g    ?? 0) * ratio,
    }
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })

  const s = Math.max(1, servings)
  return {
    calories_per_serving: Math.round(total.calories / s * 10) / 10,
    protein_per_serving:  Math.round(total.protein  / s * 10) / 10,
    carbs_per_serving:    Math.round(total.carbs    / s * 10) / 10,
    fat_per_serving:      Math.round(total.fat      / s * 10) / 10,
    fiber_per_serving:    Math.round(total.fiber    / s * 10) / 10,
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

    const macros = calcPerServing(ingredients, total_servings)

    // Créer la recette
    const { data: recipe, error: recipeErr } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        name,
        description,
        total_servings,
        ...macros,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (recipeErr) throw recipeErr

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
      .single()

    return NextResponse.json({ data: full, error: null })
  } catch (err) {
    console.error('Recipe create error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
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
