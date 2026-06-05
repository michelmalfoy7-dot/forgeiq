import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/social/followers?username=xxx&type=followers|following
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')?.toLowerCase()
    const type     = searchParams.get('type') === 'following' ? 'following' : 'followers'

    if (!username) {
      return NextResponse.json({ data: null, error: 'username requis' }, { status: 400 })
    }

    // Résoudre l'user_id cible depuis le username
    const { data: targetProfile } = await supabase
      .from('social_profiles')
      .select('user_id')
      .eq('username', username)
      .maybeSingle()

    if (!targetProfile) {
      return NextResponse.json({ data: null, error: 'Profil introuvable' }, { status: 404 })
    }

    const targetUserId = targetProfile.user_id

    let profileIds: string[] = []

    if (type === 'followers') {
      // Qui suit ce profil → follower_id des follows où following_id = targetUserId
      const { data: followsData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(100)

      profileIds = (followsData ?? []).map((f: { follower_id: string }) => f.follower_id)
    } else {
      // Ce profil suit qui → following_id des follows où follower_id = targetUserId
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(100)

      profileIds = (followsData ?? []).map((f: { following_id: string }) => f.following_id)
    }

    if (profileIds.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Récupérer les profils sociaux
    const { data: profiles } = await supabase
      .from('social_profiles')
      .select('user_id, username, display_name, avatar_url, followers_count, bio')
      .in('user_id', profileIds)

    // Vérifier qui l'utilisateur connecté suit parmi cette liste
    const { data: myFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', profileIds)

    const myFollowingSet = new Set((myFollows ?? []).map((f: { following_id: string }) => f.following_id))

    // Trier dans l'ordre original (follows)
    const profileMap = new Map((profiles ?? []).map((p: {
      user_id: string
      username: string | null
      display_name: string | null
      avatar_url: string | null
      followers_count: number
      bio: string | null
    }) => [p.user_id, p]))

    const result = profileIds
      .map(id => profileMap.get(id))
      .filter(Boolean)
      .map(p => ({
        user_id: p!.user_id,
        username: p!.username,
        display_name: p!.display_name,
        avatar_url: p!.avatar_url,
        followers_count: p!.followers_count,
        bio: p!.bio,
        is_following: myFollowingSet.has(p!.user_id),
        is_me: p!.user_id === user.id,
      }))

    return NextResponse.json({ data: result, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
