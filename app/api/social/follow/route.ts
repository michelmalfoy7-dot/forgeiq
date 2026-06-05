import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/utils/push'

export const dynamic = 'force-dynamic'

// Incrémente/décrémente un compteur sur social_profiles via update direct
async function updateSocialCounter(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  column: 'following_count' | 'followers_count',
  delta: number
) {
  // Lire puis écrire (pas de RPC, compatibilité maximale)
  const { data } = await supabase
    .from('social_profiles')
    .select(column)
    .eq('user_id', userId)
    .maybeSingle()

  if (data) {
    const currentValue = (data as Record<string, number>)[column] ?? 0
    await supabase
      .from('social_profiles')
      .update({ [column]: Math.max(0, currentValue + delta) })
      .eq('user_id', userId)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { target_user_id?: string }

    if (!body.target_user_id) {
      return NextResponse.json({ data: null, error: 'target_user_id requis' }, { status: 400 })
    }

    // Empêcher de se suivre soi-même
    if (body.target_user_id === user.id) {
      return NextResponse.json({ data: null, error: 'Tu ne peux pas te suivre toi-même' }, { status: 400 })
    }

    // Insérer la relation de follow
    const { error: followError } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: body.target_user_id })

    if (followError) {
      // Conflit = déjà suivi
      if (followError.code === '23505') {
        return NextResponse.json({ data: { already_following: true }, error: null })
      }
      return NextResponse.json({ data: null, error: followError.message }, { status: 400 })
    }

    // Mettre à jour les compteurs
    await Promise.allSettled([
      updateSocialCounter(supabase, user.id, 'following_count', 1),
      updateSocialCounter(supabase, body.target_user_id, 'followers_count', 1),
    ])

    // Notification + push au suivi (fire-and-forget)
    void supabase.from('notifications').insert({
      user_id:  body.target_user_id,
      actor_id: user.id,
      type:     'follow',
    })
    void sendPushToUser(body.target_user_id, {
      title: '👤 ForgeIQ',
      body:  'Quelqu\'un te suit maintenant !',
      url:   '/social/notifications',
      tag:   'follow',
    })

    return NextResponse.json({ data: { following: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { target_user_id?: string }

    if (!body.target_user_id) {
      return NextResponse.json({ data: null, error: 'target_user_id requis' }, { status: 400 })
    }

    // Supprimer la relation de follow
    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', body.target_user_id)

    if (deleteError) {
      return NextResponse.json({ data: null, error: deleteError.message }, { status: 400 })
    }

    // Décrémenter les compteurs
    await Promise.allSettled([
      updateSocialCounter(supabase, user.id, 'following_count', -1),
      updateSocialCounter(supabase, body.target_user_id, 'followers_count', -1),
    ])

    return NextResponse.json({ data: { following: false }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
