import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { workout_id?: string; caption?: string }

    if (!body.workout_id) {
      return NextResponse.json({ data: null, error: 'workout_id requis' }, { status: 400 })
    }

    // Vérifier que le workout appartient bien à l'utilisateur connecté
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select('id, session_name')
      .eq('id', body.workout_id)
      .eq('user_id', user.id)
      .single()

    if (workoutError || !workout) {
      return NextResponse.json({ data: null, error: 'Séance introuvable ou accès refusé' }, { status: 404 })
    }

    // Insérer le partage dans workout_shares
    const { data: share, error: shareError } = await supabase
      .from('workout_shares')
      .insert({
        workout_id: body.workout_id,
        user_id: user.id,
        caption: body.caption?.trim() || null,
        is_public: true,
      })
      .select('id')
      .single()

    if (shareError) {
      return NextResponse.json({ data: null, error: shareError.message }, { status: 400 })
    }

    return NextResponse.json({ data: { id: share.id }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH — modifier la caption d'un post
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { share_id?: string; caption?: string }
    if (!body.share_id) return NextResponse.json({ data: null, error: 'share_id requis' }, { status: 400 })

    const { error } = await supabase
      .from('workout_shares')
      .update({ caption: body.caption?.trim() || null })
      .eq('id', body.share_id)
      .eq('user_id', user.id) // RLS : seulement son propre post

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    return NextResponse.json({ data: { ok: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE — supprimer un post du feed
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { share_id?: string }
    if (!body.share_id) return NextResponse.json({ data: null, error: 'share_id requis' }, { status: 400 })

    const { error } = await supabase
      .from('workout_shares')
      .delete()
      .eq('id', body.share_id)
      .eq('user_id', user.id) // RLS : seulement son propre post

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    return NextResponse.json({ data: { ok: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
