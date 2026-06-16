import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/utils/push'

export const dynamic = 'force-dynamic'

// GET — liste des utilisateurs qui ont liké un post
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('share_id')
    if (!shareId) return NextResponse.json({ data: null, error: 'share_id requis' }, { status: 400 })

    const { data: likes, error } = await supabase
      .from('likes')
      .select('user_id, created_at')
      .eq('workout_share_id', shareId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    const likerIds = (likes ?? []).map((l: { user_id: string }) => l.user_id)

    if (likerIds.length === 0) return NextResponse.json({ data: [], error: null })

    const [{ data: socialProfiles }, { data: baseProfiles }] = await Promise.all([
      supabase.from('social_profiles').select('user_id, username, display_name, avatar_url').in('user_id', likerIds),
      supabase.from('profiles').select('id, display_name').in('id', likerIds),
    ])

    const socialMap = new Map((socialProfiles ?? []).map((p: { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }) => [p.user_id, p]))
    const baseMap   = new Map((baseProfiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]))

    const likers = likerIds.map((id) => {
      const s = socialMap.get(id)
      const b = baseMap.get(id)
      return {
        user_id:      id,
        username:     s?.username ?? null,
        display_name: s?.display_name ?? b?.display_name ?? 'Athlète',
        avatar_url:   s?.avatar_url ?? null,
      }
    })

    return NextResponse.json({ data: likers, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

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

    // Incrémenter le compteur de likes (fire-and-forget)
    updateLikesCount(supabase, body.share_id, 1).catch(() => null)

    // Notification au propriétaire du post (fire-and-forget, silencieux si table absente)
    createLikeNotification(supabase, user.id, body.share_id).catch(() => null)

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

// ── Helpers notification ──────────────────────────────────────────────────────

async function createLikeNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  shareId: string
) {
  // Trouver le propriétaire du post
  const { data: share } = await supabase
    .from('workout_shares')
    .select('user_id')
    .eq('id', shareId)
    .maybeSingle()

  // Pas de notif si on like son propre post
  if (!share || share.user_id === actorId) return

  await supabase.from('notifications').insert({
    user_id:      share.user_id,
    actor_id:     actorId,
    type:         'like',
    reference_id: shareId,
  })

  // Push notification (fire-and-forget)
  void sendPushToUser(share.user_id, {
    title: '❤️ ForgeIQ',
    body:  'Quelqu\'un a aimé ta séance !',
    url:   '/social/notifications',
    tag:   'like',
  })
}
