import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Heart, Dumbbell, Clock, Trophy, Share2 } from 'lucide-react'
import { FollowButton } from '@/components/social/FollowButton'
import { PostLikeButton } from '@/components/social/PostLikeButton'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

type PageProps = { params: Promise<{ shareId: string }> }

// OG dynamique — la carte PNG générée devient l'image de prévisualisation
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params
  const supabase = await createClient()

  const { data: share } = await supabase
    .from('workout_shares')
    .select('caption, created_at, workouts(session_name, total_tonnage_kg, total_sets)')
    .eq('id', shareId)
    .eq('is_public', true)
    .maybeSingle()

  if (!share) return { title: 'Séance introuvable | ForgeIQ' }

  const workout = share.workouts as unknown as { session_name: string | null; total_tonnage_kg: number | null; total_sets: number | null } | null
  const name    = workout?.session_name ?? 'Séance'
  const tonnage = workout?.total_tonnage_kg
    ? workout.total_tonnage_kg >= 1000
      ? `${(workout.total_tonnage_kg / 1000).toFixed(1)}t`
      : `${Math.round(workout.total_tonnage_kg)} kg`
    : null

  const title       = `${name} | ForgeIQ`
  const description = share.caption ?? (tonnage ? `${tonnage} soulevés · ${workout?.total_sets ?? 0} séries` : 'Séance ForgeIQ')
  const ogImage     = `${APP_URL}/api/social/card?id=${shareId}`

  return {
    title,
    description,
    openGraph: {
      title, description,
      images: [{ url: ogImage, width: 1080, height: 1080, alt: name }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  }
}

function formatRelativeDate(dateString: string): string {
  const diffMs  = Date.now() - new Date(dateString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH   = Math.floor(diffMin / 60)
  const diffD   = Math.floor(diffH / 24)
  if (diffMin < 1)  return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin}m`
  if (diffH < 24)   return `il y a ${diffH}h`
  if (diffD === 1)  return 'hier'
  if (diffD < 7)    return `il y a ${diffD}j`
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(dateString))
}

export default async function PostDetailPage({ params }: PageProps) {
  const { shareId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Charger le share
  const { data: share } = await supabase
    .from('workout_shares')
    .select(`
      id, workout_id, user_id, caption, likes_count, comments_count, created_at, is_public,
      workouts (
        session_name, total_tonnage_kg, total_sets, total_reps, duration_min, completed_at, notes
      )
    `)
    .eq('id', shareId)
    .eq('is_public', true)
    .maybeSingle()

  if (!share) notFound()

  const workout = share.workouts as unknown as {
    session_name: string | null
    total_tonnage_kg: number | null
    total_sets: number | null
    total_reps: number | null
    duration_min: number | null
    completed_at: string | null
    notes: string | null
  } | null

  // Tous les exercices avec leurs sets (détail complet)
  const { data: sets } = await supabase
    .from('workout_sets')
    .select('exercise_name, weight_kg, reps, set_type, is_warmup, set_number')
    .eq('workout_id', share.workout_id)
    .order('set_number', { ascending: true })

  // Grouper par exercice (ordre d'apparition)
  type ExGroup = { name: string; sets: { weight_kg: number; reps: number; set_type: string | null; is_warmup: boolean }[] }
  const exerciseMap = new Map<string, ExGroup>()
  for (const set of sets ?? []) {
    if (!exerciseMap.has(set.exercise_name)) {
      exerciseMap.set(set.exercise_name, { name: set.exercise_name, sets: [] })
    }
    exerciseMap.get(set.exercise_name)!.sets.push({
      weight_kg: set.weight_kg,
      reps:      set.reps,
      set_type:  set.set_type,
      is_warmup: set.is_warmup,
    })
  }
  const exercises = Array.from(exerciseMap.values())

  // Profil social de l'auteur
  const [{ data: socialProfile }, { data: authProfile }] = await Promise.all([
    supabase.from('social_profiles').select('username, display_name, avatar_url, followers_count').eq('user_id', share.user_id).maybeSingle(),
    supabase.from('profiles').select('display_name').eq('id', share.user_id).maybeSingle(),
  ])

  const displayName = socialProfile?.display_name ?? authProfile?.display_name ?? 'Athlète'
  const username    = socialProfile?.username ?? null
  const avatarUrl   = socialProfile?.avatar_url ?? null
  const initial     = displayName[0].toUpperCase()
  const isOwnPost   = share.user_id === user.id

  // Like de l'utilisateur courant
  const { data: likeData } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('workout_share_id', shareId)
    .maybeSingle()

  const isLiked = !!likeData

  // Follow state
  let isFollowing = false
  if (!isOwnPost) {
    const { data: followData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', share.user_id)
      .maybeSingle()
    isFollowing = !!followData
  }

  // Helpers
  function fmtTonnage(kg: number) {
    return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`
  }
  function setTypeLabel(t: string | null): string {
    if (t === 'top_set') return '★'
    if (t === 'backoff')  return 'B'
    if (t === 'dropset')  return 'D'
    if (t === 'failure')  return 'X'
    return ''
  }
  function setTypeColor(t: string | null): string {
    if (t === 'top_set') return 'var(--fiq-accent)'
    if (t === 'backoff')  return 'var(--fiq-blue)'
    if (t === 'dropset')  return 'var(--fiq-orange)'
    if (t === 'failure')  return 'var(--fiq-red)'
    return 'var(--fiq-muted)'
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/social"
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-70"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <p className="font-black text-lg" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.02em' }}>
          {workout?.session_name ?? 'Séance'}
        </p>
      </div>

      {/* ── Carte séance hero ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0E1117 0%, #161A21 60%, #0A0F1A 100%)', border: '1px solid var(--fiq-border)' }}
      >
        <div className="relative px-5 pt-5 pb-4">
          {/* Watermark */}
          <div className="absolute top-4 right-4 flex items-center gap-1 opacity-40">
            <Dumbbell className="w-3 h-3" style={{ color: 'var(--fiq-accent)' }} />
            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: 'var(--fiq-accent)' }}>ForgeIQ</span>
          </div>

          <p className="text-xl font-black pr-16" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.02em' }}>
            {workout?.session_name ?? 'Séance'}
          </p>

          {/* Stats principales */}
          <div className="flex gap-6 mt-3">
            {workout?.total_tonnage_kg != null && (
              <div>
                <p className="text-2xl font-black fiq-data" style={{ color: 'var(--fiq-accent)', letterSpacing: '-0.03em' }}>
                  {fmtTonnage(workout.total_tonnage_kg)}
                </p>
                <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--fiq-muted)' }}>soulevés</p>
              </div>
            )}
            {workout?.total_sets != null && (
              <div>
                <p className="text-2xl font-black fiq-data" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
                  {workout.total_sets}
                </p>
                <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--fiq-muted)' }}>séries</p>
              </div>
            )}
            {workout?.total_reps != null && (
              <div>
                <p className="text-2xl font-black fiq-data" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
                  {workout.total_reps}
                </p>
                <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--fiq-muted)' }}>reps</p>
              </div>
            )}
            {workout?.duration_min != null && (
              <div>
                <p className="text-2xl font-black fiq-data" style={{ color: 'var(--fiq-muted)', letterSpacing: '-0.03em' }}>
                  {workout.duration_min}
                </p>
                <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--fiq-muted)' }}>min</p>
              </div>
            )}
          </div>

          <div className="mt-3 h-0.5 rounded-full w-12" style={{ background: 'var(--fiq-accent)' }} />
        </div>

        {/* Date */}
        <div className="px-5 pb-4 flex items-center gap-1.5" style={{ borderTop: '1px solid var(--fiq-border)' }}>
          <Clock className="w-3 h-3 mt-3" style={{ color: 'var(--fiq-muted)' }} />
          <p className="text-xs mt-3" style={{ color: 'var(--fiq-muted)' }}>
            {formatRelativeDate(share.created_at)}
          </p>
        </div>
      </div>

      {/* ── Auteur ── */}
      <div className="fiq-card flex items-center gap-3">
        <Link href={username ? `/u/${username}` : '#'} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
            style={{ background: 'var(--fiq-accent)' }}>
            {avatarUrl ? (
              <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="44px" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-sm font-black" style={{ color: 'var(--bg)' }}>
                {initial}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm truncate" style={{ color: 'var(--fiq-text)' }}>{displayName}</p>
            {username && <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>@{username}</p>}
            {socialProfile?.followers_count != null && (
              <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                {socialProfile.followers_count} abonné{socialProfile.followers_count > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </Link>
        {!isOwnPost && (
          <div className="flex-shrink-0">
            <FollowButton targetUserId={share.user_id} initialIsFollowing={isFollowing} />
          </div>
        )}
      </div>

      {/* Caption */}
      {share.caption && (
        <div className="fiq-card">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fiq-text)' }}>
            {share.caption}
          </p>
        </div>
      )}

      {/* ── Exercices détaillés ── */}
      {exercises.length > 0 && (
        <div className="fiq-card space-y-0 overflow-hidden" style={{ padding: 0 }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
            <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>
              Exercices · {exercises.length}
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--fiq-border)' }}>
            {exercises.map((ex) => {
              const workSets = ex.sets.filter(s => !s.is_warmup)
              const warmSets = ex.sets.filter(s => s.is_warmup)
              const topSet   = workSets.reduce((best, s) =>
                s.weight_kg > (best?.weight_kg ?? 0) ? s : best
              , workSets[0])
              return (
                <div key={ex.name} className="px-4 py-3 space-y-2">
                  {/* Nom + meilleur set */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black truncate flex-1" style={{ color: 'var(--fiq-text)' }}>
                      {ex.name}
                    </p>
                    {topSet && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Trophy className="w-3 h-3" style={{ color: 'var(--fiq-accent)' }} />
                        <span className="text-xs font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                          {topSet.weight_kg} kg × {topSet.reps}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Séries */}
                  <div className="flex flex-wrap gap-1.5">
                    {warmSets.map((s, i) => (
                      <span key={`w-${i}`}
                        className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
                        style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)', opacity: 0.6 }}
                      >
                        E · {s.weight_kg}×{s.reps}
                      </span>
                    ))}
                    {workSets.map((s, i) => {
                      const label = setTypeLabel(s.set_type)
                      const color = setTypeColor(s.set_type)
                      return (
                        <span key={`s-${i}`}
                          className="text-[10px] px-2 py-0.5 rounded-md font-bold"
                          style={{ background: 'var(--fiq-faint)', color, border: `1px solid ${color}44` }}
                        >
                          {label ? `${label} ` : ''}{s.weight_kg}×{s.reps}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {workout?.notes && (
        <div className="fiq-card">
          <p className="text-xs font-bold mb-1" style={{ color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Notes
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fiq-text)' }}>{workout.notes}</p>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <PostLikeButton
          shareId={shareId}
          initialLiked={isLiked}
          initialCount={share.likes_count}
        />
        <a
          href={`/api/social/card?id=${shareId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          <Share2 className="w-4 h-4" />
          Carte image
        </a>
      </div>
    </div>
  )
}
