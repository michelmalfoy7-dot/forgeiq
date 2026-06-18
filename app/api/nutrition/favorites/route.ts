import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET : liste des favoris de l'utilisateur (triés par fréquence d'usage)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase
      .from('food_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('use_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ data: data ?? [], error: null })
  } catch {
    return NextResponse.json({ data: [], error: null }) // Graceful si table absente
  }
}

// POST : ajouter ou mettre à jour un favori
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const {
      food_name, food_id = null, brand = null,
      calories_per_100g = null, protein_per_100g = null,
      carbs_per_100g = null, fat_per_100g = null, fiber_per_100g = null,
      default_quantity_g = 100,
    } = body

    if (!food_name) return NextResponse.json({ data: null, error: 'Nom manquant' }, { status: 400 })

    // Chercher si le favori existe déjà (insensible à la casse)
    // On évite onConflict car l'index est une expression (lower(food_name)) — incompatible avec PostgREST upsert
    const { data: existing } = await supabase
      .from('food_favorites')
      .select('id')
      .eq('user_id', user.id)
      .ilike('food_name', food_name)
      .maybeSingle()

    let data, error
    if (existing?.id) {
      // Mise à jour du favori existant
      ;({ data, error } = await supabase
        .from('food_favorites')
        .update({ brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_quantity_g })
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .select()
        .maybeSingle())
    } else {
      // Insertion d'un nouveau favori
      ;({ data, error } = await supabase
        .from('food_favorites')
        .insert({ user_id: user.id, food_name, food_id, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_quantity_g })
        .select()
        .maybeSingle())
    }

    if (error) throw error
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE : supprimer un favori
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ data: null, error: 'ID manquant' }, { status: 400 })

    const { error } = await supabase
      .from('food_favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH : incrémenter use_count + mémoriser la dernière dose utilisée
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { id, last_quantity_g } = await req.json()
    if (!id) return NextResponse.json({ data: null, error: 'ID manquant' }, { status: 400 })

    // Incrémenter le compteur d'utilisation
    await supabase.rpc('increment_favorite_count', { fav_id: id }).maybeSingle()

    // Mémoriser la dose réellement utilisée (mise à jour default_quantity_g)
    const qty = Number(last_quantity_g)
    if (qty > 0) {
      await supabase
        .from('food_favorites')
        .update({ default_quantity_g: qty })
        .eq('id', id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ data: { ok: true }, error: null })
  } catch {
    return NextResponse.json({ data: { ok: true }, error: null }) // Silencieux
  }
}
