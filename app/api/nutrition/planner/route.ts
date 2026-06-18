import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET ?week_start=YYYY-MM-DD  → entrées de la semaine (7 jours)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('week_start')
    if (!weekStart) return NextResponse.json({ data: null, error: 'week_start requis' }, { status: 400 })

    const end = new Date(weekStart + 'T12:00:00')
    end.setDate(end.getDate() + 6)
    const weekEnd = end.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .gte('plan_date', weekStart)
      .lte('plan_date', weekEnd)
      .order('plan_date')
      .order('created_at')

    // Table absente → réponse gracieuse
    if (error) return NextResponse.json({ data: [], error: null })

    return NextResponse.json({ data: data ?? [], error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — ajouter un aliment au plan
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as {
      plan_date: string
      meal_type: string
      food_name: string
      food_id?: string | null
      quantity_g: number
      calories?: number | null
      protein_g?: number | null
      carbs_g?: number | null
      fat_g?: number | null
    }

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        user_id:    user.id,
        plan_date:  body.plan_date,
        meal_type:  body.meal_type,
        food_name:  body.food_name,
        food_id:    body.food_id ?? null,
        quantity_g: body.quantity_g ?? 100,
        calories:   body.calories ?? null,
        protein_g:  body.protein_g ?? null,
        carbs_g:    body.carbs_g ?? null,
        fat_g:      body.fat_g ?? null,
      })
      .select('*')
      .maybeSingle()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ data: null, error: 'Entrée non créée' }, { status: 400 })

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH ?id=xxx — modifier la quantité d'une entrée
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ data: null, error: 'id requis' }, { status: 400 })

    const body = await request.json() as { quantity_g: number; calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number }

    const { data, error } = await supabase
      .from('meal_plans')
      .update({
        quantity_g: body.quantity_g,
        calories:   body.calories ?? null,
        protein_g:  body.protein_g ?? null,
        carbs_g:    body.carbs_g ?? null,
        fat_g:      body.fat_g ?? null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ data: null, error: 'Entrée introuvable' }, { status: 404 })

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE ?id=xxx
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ data: null, error: 'id requis' }, { status: 400 })

    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    return NextResponse.json({ data: { id }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
