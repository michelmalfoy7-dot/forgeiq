import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q           = searchParams.get('q')?.trim() ?? ''
    const suggestions = searchParams.get('suggestions') === 'true'

    // Mode suggestions : top athlètes non suivis (affiché à l'ouverture de la recherche)
    if (suggestions || q.length < 2) {
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = (followsData ?? []).map((f: { following_id: string }) => f.following_id)
      const excludeIds   = [...followingIds, user.id]

      const { data } = await supabase
        .from('social_profiles')
        .select('user_id, username, display_name, bio, avatar_url, followers_count, following_count')
        .eq('is_public', true)
        .not('user_id', 'in', `(${excludeIds.join(',')})`)
        .order('followers_count', { ascending: false })
        .limit(10)

      const results = (data ?? []).map((p: {
        user_id: string; username: string | null; display_name: string | null
        bio: string | null; avatar_url: string | null; followers_count: number; following_count: number
      }) => ({ ...p, is_following: false }))

      return NextResponse.json({ data: results, error: null })
    }

    // Recherche dans les profils publics par username ou display_name
    const { data, error } = await supabase
      .from('social_profiles')
      .select('user_id, username, display_name, bio, avatar_url, followers_count, following_count')
      .eq('is_public', true)
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq('user_id', user.id)
      .limit(20)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    // Vérifier qui l'utilisateur suit déjà
    const userIds = (data ?? []).map((p: { user_id: string }) => p.user_id)
    let followingSet = new Set<string>()

    if (userIds.length > 0) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', userIds)

      followingSet = new Set((follows ?? []).map((f: { following_id: string }) => f.following_id))
    }

    const results = (data ?? []).map((p: {
      user_id: string
      username: string | null
      display_name: string | null
      bio: string | null
      avatar_url: string | null
      followers_count: number
      following_count: number
    }) => ({
      ...p,
      is_following: followingSet.has(p.user_id),
    }))

    return NextResponse.json({ data: results, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
