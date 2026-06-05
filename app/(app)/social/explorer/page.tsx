import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, UserPlus, TrendingUp, Users, Flame } from 'lucide-react'
import { WorkoutPost } from '@/components/social/WorkoutPost'
import type { FeedPost } from '@/components/social/WorkoutPost'
import { buildExercisesMap } from '@/lib/utils/social'

export const dynamic = 'force-dynamic'

export default async function ExplorerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // IDs des gens déjà suivis (pour ne pas les re-suggérer)
  const { data: followsData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = (followsData ?? []).map((f: { following_id: string }) => f.following_id)
  const excludeIds = [...followingIds, user.id]

  // ── Athlètes suggérés — top followers, non suivis ──────────────────────────
  const { data: suggestedProfiles } = await supabase
    .from('social_profiles')
    .select('user_id, username, display_name, avatar_url, followers_count, following_count')
    .eq('is_public', true)
    .not('user_id', 'in', `(${excludeIds.join(',')})`)
    .order('followers_count', { ascending: false })
    .limit(8)

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  // ── Trending — top likes des 7 derniers jours ────────────────────────────────
  const { data: hotShares } = await supabase
    .from('workout_shares')
    .select(`
      id, workout_id, user_id, caption, likes_count, comments_count, is_public, created_at,
      workouts ( session_name, total_tonnage_kg, total_sets, completed_at )
    `)
    .eq('is_public', true)
    .neq('user_id', user.id)
    .gte('created_at', sevenDaysAgo)
    .order('likes_count', { ascending: false })
    .limit(5)

  // ── Feed global — séances récentes publiques (tous les utilisateurs) ────────
  const { data: trendingShares } = await supabase
    .from('workout_shares')
    .select(`
      id,
      workout_id,
      user_id,
      caption,
      likes_count,
      comments_count,
      is_public,
      created_at,
      workouts (
        session_name,
        total_tonnage_kg,
        total_sets,
        completed_at
      )
    `)
    .eq('is_public', true)
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(15)

  // Profils sociaux des auteurs (trending + récents)
  const allShares = [...(hotShares ?? []), ...(trendingShares ?? [])]
  const authorIds = [...new Set(allShares.map((s: { user_id: string }) => s.user_id))]
  const [{ data: socialProfiles }, { data: authProfiles }, { data: userLikes }] = await Promise.all([
    authorIds.length > 0
      ? supabase
          .from('social_profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', authorIds)
      : Promise.resolve({ data: [] }),
    authorIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', authorIds)
      : Promise.resolve({ data: [] }),
    allShares.length > 0
      ? supabase
          .from('likes')
          .select('workout_share_id')
          .eq('user_id', user.id)
          .in('workout_share_id', allShares.map((s: { id: string }) => s.id))
      : Promise.resolve({ data: [] }),
  ])

  // Exercices pour trending + récents
  const workoutIds = allShares.map((s: { workout_id: string }) => s.workout_id).filter(Boolean)
  const { data: setsData } = workoutIds.length > 0
    ? await supabase
        .from('workout_sets')
        .select('workout_id, exercise_name, weight_kg, reps, set_type')
        .in('workout_id', workoutIds)
        .neq('set_type', 'warmup')
        .gt('weight_kg', 0)
        .gt('reps', 0)
        .order('set_number', { ascending: true })
    : { data: [] }

  const exercisesByWorkout = buildExercisesMap(setsData ?? [])

  const socialMap = new Map((socialProfiles ?? []).map((p: { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }) => [p.user_id, p]))
  const authMap = new Map((authProfiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]))
  const likedIds = new Set((userLikes ?? []).map((l: { workout_share_id: string }) => l.workout_share_id))

  // Helper pour mapper un share → FeedPost
  function mapShare(share: { id: string; workout_id: string; user_id: string; caption: string | null; likes_count: number; comments_count: number; created_at: string; workouts: unknown }): FeedPost {
    const social  = socialMap.get(share.user_id)
    const auth    = authMap.get(share.user_id)
    const workout = share.workouts as { session_name: string | null; total_tonnage_kg: number | null; total_sets: number | null; completed_at: string | null } | null
    return {
      id: share.id, workout_id: share.workout_id, user_id: share.user_id,
      caption: share.caption, likes_count: share.likes_count, comments_count: share.comments_count,
      created_at: share.created_at, is_liked: likedIds.has(share.id), is_mine: share.user_id === user?.id,
      exercises: exercisesByWorkout.get(share.workout_id),
      author: {
        username: social?.username ?? null,
        display_name: social?.display_name ?? auth?.display_name ?? 'Athlète',
        avatar_url: social?.avatar_url ?? null,
      },
      workout: workout ? { session_name: workout.session_name, total_tonnage_kg: workout.total_tonnage_kg, total_sets: workout.total_sets, completed_at: workout.completed_at } : null,
    }
  }

  const hotFeed: FeedPost[] = (hotShares ?? []).map(mapShare)
  const trendingFeed: FeedPost[] = (trendingShares ?? []).map(mapShare)

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/social"
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-70"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            Explorer
          </h1>
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            Découvre la communauté ForgeIQ
          </p>
        </div>
      </div>

      {/* ── Athlètes suggérés ────────────────────────────────────────────────── */}
      {(suggestedProfiles ?? []).length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--fiq-text)', letterSpacing: '0.06em' }}>
              Athlètes à suivre
            </h2>
          </div>

          {/* Scroll horizontal */}
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
            {(suggestedProfiles ?? []).map((profile: {
              user_id: string
              username: string | null
              display_name: string | null
              avatar_url: string | null
              followers_count: number
            }) => {
              const initial = (profile.display_name || profile.username || '?')[0].toUpperCase()
              return (
                <Link
                  key={profile.user_id}
                  href={profile.username ? `/u/${profile.username}` : '#'}
                  className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl transition-opacity active:opacity-70"
                  style={{
                    background: 'var(--fiq-card)',
                    border: '1px solid var(--fiq-border)',
                    width: 100,
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="relative w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center font-black text-xl flex-shrink-0"
                    style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                  >
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.display_name ?? profile.username ?? ''}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      initial
                    )}
                  </div>

                  {/* Nom */}
                  <div className="text-center w-full">
                    <p className="text-xs font-black truncate" style={{ color: 'var(--fiq-text)' }}>
                      {profile.display_name || profile.username}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                      {profile.followers_count ?? 0} abonné{(profile.followers_count ?? 0) > 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Badge suivre */}
                  <div
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-black"
                    style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                  >
                    <UserPlus className="w-3 h-3" />
                    Suivre
                  </div>
                </Link>
              )
            })}

            {/* CTA voir tous */}
            <Link
              href="/social/search"
              className="flex-shrink-0 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-opacity active:opacity-70"
              style={{
                background: 'var(--fiq-faint)',
                border: '1px dashed var(--fiq-border)',
                width: 100,
                minHeight: 140,
              }}
            >
              <Users className="w-6 h-6" style={{ color: 'var(--fiq-muted)' }} />
              <p className="text-[10px] text-center font-semibold" style={{ color: 'var(--fiq-muted)' }}>
                Voir tous
              </p>
            </Link>
          </div>
        </section>
      )}

      {/* ── Feed global — séances récentes ──────────────────────────────────── */}
      {/* ── Trending — top likes cette semaine ── */}
      {hotFeed.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: 'var(--fiq-orange)' }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--fiq-text)', letterSpacing: '0.06em' }}>
              Tendances cette semaine
            </h2>
          </div>
          <div className="space-y-3">
            {hotFeed.map((post) => (
              <WorkoutPost key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* ── Séances récentes ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4" style={{ color: 'var(--fiq-orange)' }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--fiq-text)', letterSpacing: '0.06em' }}>
            Séances récentes
          </h2>
        </div>

        {trendingFeed.length > 0 ? (
          <div className="space-y-3">
            {trendingFeed.map((post) => (
              <WorkoutPost key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="fiq-card text-center py-10">
            <p className="text-3xl mb-3">🌱</p>
            <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>
              La communauté grandit
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Partage ta prochaine séance pour être le premier !
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

