import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Supprimer workout_sets en premier (FK child de workouts)
    const { data: userWorkouts } = await supabase
      .from('workouts').select('id').eq('user_id', user.id)
    if (userWorkouts?.length) {
      await supabase.from('workout_sets').delete()
        .in('workout_id', userWorkouts.map(w => w.id))
    }

    // Supprimer les ingrédients de recettes (FK child de nutrition_recipes)
    const { data: userRecipes } = await supabase
      .from('nutrition_recipes').select('id').eq('user_id', user.id)
    if (userRecipes?.length) {
      await supabase.from('recipe_ingredients').delete()
        .in('recipe_id', userRecipes.map(r => r.id))
    }

    // Puis supprimer le reste en parallèle
    await Promise.all([
      supabase.from('workouts').delete().eq('user_id', user.id),
      supabase.from('coach_messages').delete().eq('user_id', user.id),
      supabase.from('coach_memory').delete().eq('user_id', user.id),
      supabase.from('personal_records').delete().eq('user_id', user.id),
      supabase.from('daily_logs').delete().eq('user_id', user.id),
      supabase.from('food_logs').delete().eq('user_id', user.id),
      supabase.from('nutrition_favorites').delete().eq('user_id', user.id),
      supabase.from('nutrition_recipes').delete().eq('user_id', user.id),
      supabase.from('progress_photos').delete().eq('user_id', user.id),
      supabase.from('fasting_sessions').delete().eq('user_id', user.id),
    ])

    // Reset programme actuel
    await supabase.from('profiles').update({
      current_program_id: null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    return NextResponse.json({ data: { reset: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
