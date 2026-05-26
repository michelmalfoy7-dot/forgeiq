import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { WorkoutPost } from '@/components/social/WorkoutPost'
import { FollowButton } from '@/components/social/FollowButton'
import type { FeedPost } from '@/components/social/WorkoutPost'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ username: string }>
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Chercher le profil social public par username
  const { data: targetProfile } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .eq('is_public', true)
    .maybeSingle()

  // Profil inexistant ou privé → 404 élégant
  if (!targetProfile) {
    notFound()
  }

  const isOwnProfile = targetProfile.user_id === user.id

  // Vérifier si l'utilisateur connecté suit ce profil
  let isFollowing = false
  if (!isOwnProfile) {
    const { data: followData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetProfile.user_id)
      .maybeSingle()
    isFollowing = !!followData
  }

  // Récupérer les stats de la cible
  const { data: workoutStats } = await supabase
    .from('workouts')
    .select('total_tonnage_kg, total_sets')
    .eq('user_id', targetProfile.user_id)
    .not('completed_at', 'is', null)

  const totalSessions = (workoutStats ?? []).length
  const totalTonnage = (workoutStats ?? []).reduce(
    (acc: number, w: { total_tonnage_kg: number | null }) => acc + (w.total_tonnage_kg ?? 0),
    0
  )

  // Récupérer le meilleur PR
  const { data: bestPR } = await supabase
    .from('personal_records')
    .select('value, exercises_library(name_fr, name)')
    .eq('user_id', targetProfile.user_id)
    .eq('record_type', 'top_set')
    .order('value', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Récupérer les séances partagées de cet utilisateur
  const { data: shares } = await supabase
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
    .eq('user_id', targetProfile.user_id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20)

  // Vérifier les likes de l'utilisateur connecté
  const shareIds = (shares ?? []).map((s: { id: string }) => s.id)
  const { data: userLikes } = shareIds.length > 0
    ? await supabase
        .from('likes')
        .select('workout_share_id')
        .eq('user_id', user.id)
        .in('workout_share_id', shareIds)
    : { data: [] }

  const likedIds = new Set((userLikes ?? []).map((l: { workout_share_id: string }) => l.workout_share_id))

  const feed: FeedPost[] = (shares ?? []).map((share) => {
    const workout = (share.workouts as unknown) as {
      session_name: string | null
      total_tonnage_kg: number | null
      total_sets: number | null
      completed_at: string | null
    } | null

    return {
      id: share.id,
      workout_id: share.workout_id,
      user_id: share.user_id,
      caption: share.caption,
      likes_count: share.likes_count,
      comments_count: share.comments_count,
      created_at: share.created_at,
      is_liked: likedIds.has(share.id),
      author: {
        username: targetProfile.username,
        display_name: targetProfile.display_name ?? targetProfile.username ?? 'Athlète',
        avatar_url: targetProfile.avatar_url ?? null,
      },
      workout: workout
        ? {
            session_name: workout.session_name,
            total_tonnage_kg: workout.total_tonnage_kg,
            total_sets: workout.total_sets,
            completed_at: workout.completed_at,
          }
        : null,
    } satisfies FeedPost
  })

  // Initiale pour l'avatar
  const avatarInitial = (targetProfile.display_name || targetProfile.username || '?')[0].toUpperCase()

  const prExercise = bestPR
    ? ((bestPR.exercises_library as unknown) as { name_fr: string | null; name: string } | null)
    : null

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Profil header */}
      <div className="fiq-card space-y-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            {targetProfile.avatar_url ? (
              // eslint-disable-next-line @next/next-eslint/no-img-element
              <img
                src={targetProfile.avatar_url}
                alt={targetProfile.display_name ?? targetProfile.username}
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              avatarInitial
            )}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.02em' }}>
              {targetProfile.display_name || targetProfile.username}
            </p>
            {targetProfile.username && (
              <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>@{targetProfile.username}</p>
            )}
            {targetProfile.bio && (
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
                {targetProfile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Compteurs followers/following */}
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
              {targetProfile.followers_count ?? 0}
            </p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>abonnés</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
              {targetProfile.following_count ?? 0}
            </p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>abonnements</p>
          </div>
        </div>

        {/* Bouton Follow (si pas son propre profil) */}
        {!isOwnProfile && (
          <FollowButton
            targetUserId={targetProfile.user_id}
            initialIsFollowing={isFollowing}
          />
        )}
      </div>

      {/* Stats performance */}
      <div className="grid grid-cols-3 gap-3">
        <div className="fiq-card text-center">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Séances
          </p>
          <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
            {totalSessions}
          </p>
        </div>
        <div className="fiq-card text-center">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tonnage
          </p>
          <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-blue)' }}>
            {totalTonnage > 1000
              ? `${(totalTonnage / 1000).toFixed(1)}t`
              : `${Math.round(totalTonnage)}kg`}
          </p>
        </div>
        <div className="fiq-card text-center">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Meilleur PR
          </p>
          <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
            {bestPR ? `${bestPR.value}kg` : '—'}
          </p>
          {prExercise && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              {prExercise.name_fr ?? prExercise.name}
            </p>
          )}
        </div>
      </div>

      {/* Séances partagées */}
      {feed.length > 0 ? (
        <div className="space-y-3">
          <p className="font-bold text-sm" style={{ color: 'var(--fiq-text)' }}>
            Séances partagées
          </p>
          {feed.map((post) => (
            <WorkoutPost key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="fiq-card text-center py-8">
          <p className="text-2xl mb-2">🏋️</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>
            Aucune séance partagée pour l&apos;instant
          </p>
        </div>
      )}
    </div>
  )
}
