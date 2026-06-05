import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/utils/push'

export const dynamic = 'force-dynamic'

// GET — liste des commentaires pour un post
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('share_id')
    if (!shareId) return NextResponse.json({ data: null, error: 'share_id requis' }, { status: 400 })

    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at')
      .eq('workout_share_id', shareId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) return NextResponse.json({ data: [], error: null }) // table absente → vide

    // Enrichir avec les profils sociaux
    const authorIds = [...new Set((comments ?? []).map((c: { user_id: string }) => c.user_id))]
    const { data: socialProfiles } = authorIds.length > 0
      ? await supabase
          .from('social_profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', authorIds)
      : { data: [] }

    const profileMap = new Map((socialProfiles ?? []).map((p: {
      user_id: string; username: string | null; display_name: string | null; avatar_url: string | null
    }) => [p.user_id, p]))

    const enriched = (comments ?? []).map((c: {
      id: string; user_id: string; content: string; created_at: string
    }) => ({
      ...c,
      is_mine: c.user_id === user.id,
      author: profileMap.get(c.user_id) ?? { username: null, display_name: 'Athlète', avatar_url: null },
    }))

    return NextResponse.json({ data: enriched, error: null })
  } catch {
    return NextResponse.json({ data: [], error: null })
  }
}

// POST — ajouter un commentaire
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { share_id?: string; content?: string }

    if (!body.share_id) return NextResponse.json({ data: null, error: 'share_id requis' }, { status: 400 })
    const content = body.content?.trim()
    if (!content || content.length === 0) return NextResponse.json({ data: null, error: 'Commentaire vide' }, { status: 400 })
    if (content.length > 500) return NextResponse.json({ data: null, error: 'Trop long (max 500 caractères)' }, { status: 400 })

    // Insérer le commentaire
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({ workout_share_id: body.share_id, user_id: user.id, content })
      .select('id, user_id, content, created_at')
      .single()

    if (insertError) return NextResponse.json({ data: null, error: insertError.message }, { status: 400 })

    // Incrémenter comments_count (fire-and-forget)
    void (async () => {
      try {
        const { data: share } = await supabase
          .from('workout_shares')
          .select('comments_count')
          .eq('id', body.share_id)
          .maybeSingle()
        if (share) {
          await supabase
            .from('workout_shares')
            .update({ comments_count: Math.max(0, (share.comments_count ?? 0) + 1) })
            .eq('id', body.share_id)
        }
      } catch { /* silencieux */ }
    })()

    // Notification au propriétaire du post (fire-and-forget)
    void (async () => {
      try {
        const { data: share } = await supabase
          .from('workout_shares')
          .select('user_id')
          .eq('id', body.share_id)
          .maybeSingle()
        if (share && share.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id:      share.user_id,
            actor_id:     user.id,
            type:         'comment',
            reference_id: body.share_id,
          })
          void sendPushToUser(share.user_id, {
            title: '💬 ForgeIQ',
            body:  'Quelqu\'un a commenté ta séance !',
            url:   '/social/notifications',
            tag:   'comment',
          })
        }
      } catch { /* silencieux */ }
    })()

    // Profil de l'auteur pour la réponse immédiate
    const { data: myProfile } = await supabase
      .from('social_profiles')
      .select('username, display_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      data: {
        ...comment,
        is_mine: true,
        author: myProfile ?? { username: null, display_name: 'Athlète', avatar_url: null },
      },
      error: null,
    })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE — supprimer son propre commentaire
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { comment_id?: string; share_id?: string }
    if (!body.comment_id) return NextResponse.json({ data: null, error: 'comment_id requis' }, { status: 400 })

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', body.comment_id)
      .eq('user_id', user.id) // RLS : seulement ses propres commentaires

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    // Décrémenter comments_count (fire-and-forget)
    if (body.share_id) {
      void (async () => {
        try {
          const { data: share } = await supabase
            .from('workout_shares')
            .select('comments_count')
            .eq('id', body.share_id)
            .maybeSingle()
          if (share) {
            await supabase
              .from('workout_shares')
              .update({ comments_count: Math.max(0, (share.comments_count ?? 0) - 1) })
              .eq('id', body.share_id)
          }
        } catch { /* silencieux */ }
      })()
    }

    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
