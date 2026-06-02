import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { WorkoutPost } from '@/components/social/WorkoutPost'
import { FollowButton } from '@/components/social/FollowButton'
import type { FeedPost } from '@/components/social/WorkoutPost'
import { categorizeBig5 } from '@/lib/utils/big5'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

type PageProps = {
  params: Promise<{ username: string }>
}

// OG dynamique par profil — partageable sur les réseaux sociaux
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio, avatar_url')
    .eq('username', username.toLowerCase())
    .eq('is_public', true)
    .maybeSingle()

  if (!profile) {
    return { title: 'Profil introuvable | ForgeIQ' }
  }

  const name = profile.display_name ?? username
  const title = `${name} (@${username}) | ForgeIQ`
  const description = profile.bio
    ? profile.bio
    : `Découvre les entraînements et records de ${name} sur ForgeIQ.`
  const image = profile.avatar_url ?? '/opengraph-image'
  const url = `${APP_URL}/u/${username}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'profile',
      images: [{ url: image, width: 400, height: 400, alt: name }],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [image],
    },
  }
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

  // Récupérer TOUS les PRs top_set pour le Big 5
  const { data: allPRs } = await supabase
    .from('personal_records')
    .select('value, exercise_name, exercises_library(name_fr, name)')
    .eq('user_id', targetProfile.user_id)
    .eq('record_type', 'top_set')
    .order('value', { ascending: false })

  const big5 = categorizeBig5(
    (allPRs ?? []).map(pr => ({
      value: pr.value,
      exercise_name: pr.exercise_name,
      exercises_library: pr.exercises_library as unknown as { name: string; name_fr: string | null } | null,
    }))
  )
  const big5Filled = big5.filter(b => b.value !== null)

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
      <div className="grid grid-cols-2 gap-3">
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
      </div>

      {/* Big 5 — Records par mouvement fondamental */}
      {big5Filled.length > 0 && (
        <div className="fiq-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Records — Big 5</p>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: '#B4FF4A15', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A30' }}>
                {big5Filled.length}/5
              </span>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--fiq-border)' }}>
            {big5.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: `${cat.color}18` }}>
                  {cat.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.06em' }}>
                    {cat.label}
                  </p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                    {cat.exerciseName ?? cat.sublabel}
                  </p>
                </div>
                {cat.value !== null ? (
                  <p className="text-lg font-black fiq-data flex-shrink-0" style={{ color: cat.color }}>
                    {cat.value}<span className="text-xs font-normal ml-0.5" style={{ color: 'var(--fiq-muted)' }}>kg</span>
                  </p>
                ) : (
                  <p className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--fiq-muted)' }}>—</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
