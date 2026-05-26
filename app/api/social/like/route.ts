import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Mise à jour directe du compteur likes via lecture + écriture
async function updateLikesCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shareId: string,
  delta: number
) {
  const { data: share } = await supabase
    .from('workout_shares')
    .select('likes_count')
    .eq('id', shareId)
    .maybeSingle()

  if (share) {
    await supabase
      .from('workout_shares')
      .update({ likes_count: Math.max(0, (share.likes_count ?? 0) + delta) })
      .eq('id', shareId)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { share_id?: string }

    if (!body.share_id) {
      return NextResponse.json({ data: null, error: 'share_id requis' }, { status: 400 })
    }

    // Insérer le like
    const { error: likeError } = await supabase
      .from('likes')
      .insert({ user_id: user.id, workout_share_id: body.share_id })

    if (likeError) {
      // Conflit = déjà liké
      if (likeError.code === '23505') {
        return NextResponse.json({ data: { already_liked: true }, error: null })
      }
      return NextResponse.json({ data: null, error: likeError.message }, { status: 400 })
    }

    // Incrémenter le compteur de likes (fire-and-forget, non bloquant pour la réponse)
    updateLikesCount(supabase, body.share_id, 1).catch(() => null)

    return NextResponse.json({ data: { liked: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { share_id?: string }

    if (!body.share_id) {
      return NextResponse.json({ data: null, error: 'share_id requis' }, { status: 400 })
    }

    // Supprimer le like
    const { error: deleteError } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('workout_share_id', body.share_id)

    if (deleteError) {
      return NextResponse.json({ data: null, error: deleteError.message }, { status: 400 })
    }

    // Décrémenter le compteur de likes (fire-and-forget)
    updateLikesCount(supabase, body.share_id, -1).catch(() => null)

    return NextResponse.json({ data: { liked: false }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
