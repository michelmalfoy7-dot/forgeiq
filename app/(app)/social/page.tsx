import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Search, Trophy, MessageCircle, Users } from 'lucide-react'
import { SocialProfileSetup } from '@/components/social/SocialProfileSetup'
import { FeedList } from '@/components/social/FeedList'
import type { SuggestedAthlete } from '@/components/social/FeedList'
import { NotificationBell } from '@/components/social/NotificationBell'
import type { FeedPost } from '@/components/social/WorkoutPost'
import { buildExercisesMap } from '@/lib/utils/social'
import { ChallengesWidget } from '@/components/social/ChallengesWidget'

export const dynamic = 'force-dynamic'

async function fetchFeedPosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  followingIds: string[],
  followingSet: Set<string>,
  mode: 'discover' | 'following'
): Promise<FeedPost[]> {
  let query = supabase
    .from('workout_shares')
    .select(`
      id, workout_id, user_id, caption, likes_count, comments_count, is_public, created_at,
      workouts ( session_name, total_tonnage_kg, total_sets, completed_at )
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (mode === 'following') {
    const feedIds = [...followingIds, userId]
    if (feedIds.length === 0) return []
    query = query.in('user_id', feedIds)
  }

  const { data: shares } = await query
  if (!shares || shares.length === 0) return []

  const authorIds  = [...new Set(shares.map((s: { user_id: string }) => s.user_id))]
  const workoutIds = shares.map((s: { workout_id: string }) => s.workout_id).filter(Boolean)

  const [{ data: socialProfiles }, { data: authProfiles }, { data: userLikes }, { data: setsData }] = await Promise.all([
    supabase.from('social_profiles').select('user_id, username, display_name, avatar_url').in('user_id', authorIds),
    supabase.from('profiles').select('id, display_name').in('id', authorIds),
    supabase.from('likes').select('workout_share_id').eq('user_id', userId).in('workout_share_id', shares.map((s: { id: string }) => s.id)),
    workoutIds.length > 0
      ? supabase.from('workout_sets').select('workout_id, exercise_name, weight_kg, reps, set_type')
          .in('workout_id', workoutIds).neq('set_type', 'warmup').gt('weight_kg', 0).gt('reps', 0).order('set_number', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const likedIds   = new Set((userLikes ?? []).map((l: { workout_share_id: string }) => l.workout_share_id))
  const socialMap  = new Map((socialProfiles ?? []).map((p: { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }) => [p.user_id, p]))
  const authMap    = new Map((authProfiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]))
  const exMap      = buildExercisesMap(setsData ?? [])

  return shares.map((share) => {
    const social  = socialMap.get(share.user_id)
    const auth    = authMap.get(share.user_id)
    const workout = (share.workouts as unknown) as { session_name: string | null; total_tonnage_kg: number | null; total_sets: number | null; completed_at: string | null } | null
    return {
      id: share.id,
      workout_id: share.workout_id,
      user_id: share.user_id,
      caption: share.caption,
      likes_count: share.likes_count ?? 0,
      comments_count: share.comments_count ?? 0,
      created_at: share.created_at,
      is_liked: likedIds.has(share.id),
      is_mine: share.user_id === userId,
      is_following: followingSet.has(share.user_id),
      exercises: exMap.get(share.workout_id) ?? [],
      author: {
        username: social?.username ?? null,
        display_name: social?.display_name ?? auth?.display_name ?? 'Athlète',
        avatar_url: social?.avatar_url ?? null,
      },
      workout: workout ? {
        session_name: workout.session_name,
        total_tonnage_kg: workout.total_tonnage_kg,
        total_sets: workout.total_sets,
        completed_at: workout.completed_at,
      } : null,
    } satisfies FeedPost
  })
}

export default async function SocialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: socialProfile }, { data: authProfile }] = await Promise.all([
    supabase.from('social_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
  ])

  // IDs suivis (base commune aux deux feeds)
  const { data: followsData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = (followsData ?? []).map((f: { following_id: string }) => f.following_id)
  const followingSet = new Set(followingIds)

  // Fetch en parallèle : discover + following + athlètes suggérés
  const [discoverPosts, followingPosts, suggestedRaw] = await Promise.all([
    fetchFeedPosts(supabase, user.id, followingIds, followingSet, 'discover'),
    fetchFeedPosts(supabase, user.id, followingIds, followingSet, 'following'),
    // Athlètes suggérés : profil public, non suivis, actifs (dernier post < 30j)
    supabase
      .from('social_profiles')
      .select('user_id, username, display_name, avatar_url, followers_count')
      .eq('is_public', true)
      .not('user_id', 'in', `(${[...followingIds, user.id].join(',') || user.id})`)
      .order('followers_count', { ascending: false })
      .limit(10),
  ])

  // Enrichir les suggestions avec le nb de séances partagées récentes
  const suggestedIds = (suggestedRaw.data ?? []).map((p: { user_id: string }) => p.user_id)
  let recentShareCounts: Record<string, number> = {}
  if (suggestedIds.length > 0) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: recentShares } = await supabase
      .from('workout_shares')
      .select('user_id')
      .in('user_id', suggestedIds)
      .gte('created_at', thirtyDaysAgo)
      .eq('is_public', true)
    for (const s of recentShares ?? []) {
      recentShareCounts[s.user_id] = (recentShareCounts[s.user_id] ?? 0) + 1
    }
  }

  const suggestedAthletes: SuggestedAthlete[] = (suggestedRaw.data ?? [])
    .filter(Boolean) // garder même sans activité récente
    .slice(0, 8)
    .map((p: { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null; followers_count: number }) => ({
      user_id: p.user_id,
      username: p.username ?? null,
      display_name: p.display_name ?? 'Athlète',
      avatar_url: p.avatar_url ?? null,
      followers_count: p.followers_count ?? 0,
      recent_shares: recentShareCounts[p.user_id] ?? 0,
    }))

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            Communauté
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
            {discoverPosts.length > 0
              ? `${discoverPosts.length}+ séances partagées`
              : 'Rejoins la communauté ForgeIQ'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/social/clubs"
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-blue)' }}
            title="Clubs"
          >
            <Users className="w-4 h-4" />
          </Link>
          <Link
            href="/social/leaderboard"
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: '#F59E0B' }}
            title="Classement"
          >
            <Trophy className="w-4 h-4" />
          </Link>
          <Link
            href="/social/messages"
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
            title="Messages"
          >
            <MessageCircle className="w-4 h-4" />
          </Link>
          <Link
            href="/social/search"
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
          >
            <Search className="w-4 h-4" />
          </Link>
          <NotificationBell />
        </div>
      </div>

      {/* ── Création du profil social ── */}
      {!socialProfile && (
        <SocialProfileSetup displayName={authProfile?.display_name ?? null} />
      )}

      {/* ── CTA première séance (visible même s'il y a des athlètes suggérés) ── */}
      {discoverPosts.length === 0 && followingPosts.length === 0 && suggestedAthletes.length > 0 && (
        <div className="fiq-card flex items-center gap-4 py-4"
          style={{ background: '#B4FF4A08', borderColor: '#B4FF4A30' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
            style={{ background: '#B4FF4A20' }}>
            🏋️
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
              Partage ta première séance !
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              Termine une séance et partage-la pour apparaître dans le feed.
            </p>
          </div>
          <Link
            href="/workout"
            className="flex-shrink-0 px-4 py-2 rounded-xl font-black text-xs"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            Démarrer
          </Link>
        </div>
      )}

      {/* ── Défis collectifs du mois ── */}
      <ChallengesWidget />

      {/* ── Feed avec onglets (affiché même sans profil en lecture seule) ── */}
      {(discoverPosts.length > 0 || followingPosts.length > 0 || suggestedAthletes.length > 0) && (
        <FeedList
          initialDiscoverPosts={discoverPosts}
          initialFollowingPosts={followingPosts}
          suggestedAthletes={suggestedAthletes}
          followingCount={followingIds.length}
        />
      )}

      {/* ── État vide total (aucun post dans toute la communauté) ── */}
      {discoverPosts.length === 0 && followingPosts.length === 0 && suggestedAthletes.length === 0 && (
        <div className="fiq-card text-center py-12 space-y-4">
          <div className="text-5xl">🏋️</div>
          <div>
            <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>
              Sois le premier à partager !
            </p>
            <p className="text-sm mt-2 px-4" style={{ color: 'var(--fiq-muted)' }}>
              Termine une séance et partage-la — la communauté grandit séance après séance.
            </p>
          </div>
          <Link
            href="/workout"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            Démarrer une séance
          </Link>
        </div>
      )}
    </div>
  )
}
