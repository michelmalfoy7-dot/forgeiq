import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { WorkoutPost } from '@/components/social/WorkoutPost'
import { FollowButton } from '@/components/social/FollowButton'
import { MessageButton } from '@/components/social/MessageButton'
import { ShareBig5Button } from '@/components/social/ShareBig5Button'
import type { FeedPost } from '@/components/social/WorkoutPost'
import { buildExercisesMap } from '@/lib/utils/social'
import { categorizeBig5 } from '@/lib/utils/big5'
import { ShareWrappedButton } from '@/components/social/ShareWrappedButton'
import { FiqDumbbell, FiqStreak } from '@/components/ui/FiqIcons'
import { WeeklyVolumeChart } from '@/components/social/WeeklyVolumeChart'

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

  // Dates pour les calculs
  const now            = new Date()
  const thirtyDaysAgo  = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
  const sixtyDaysAgo   = new Date(now.getTime() - 60 * 86400000).toISOString().split('T')[0]
  const sevenDaysAgo   = new Date(now.getTime() - 7  * 86400000).toISOString().split('T')[0]
  const fiftySixDaysAgo = new Date(now.getTime() - 56 * 86400000).toISOString().split('T')[0]

  // Récupérer les stats de la cible (avec dates pour progression + streak + 8 semaines)
  const [{ data: workoutStats }, { data: profileStats }] = await Promise.all([
    supabase
      .from('workouts')
      .select('total_tonnage_kg, total_sets, session_date, completed_at')
      .eq('user_id', targetProfile.user_id)
      .not('completed_at', 'is', null)
      .order('session_date', { ascending: false }),
    // Récupérer streak check-in et code referral depuis profiles
    supabase
      .from('profiles')
      .select('checkin_streak, referral_code')
      .eq('id', targetProfile.user_id)
      .maybeSingle(),
  ])

  const totalSessions = (workoutStats ?? []).length
  const totalTonnage  = (workoutStats ?? []).reduce(
    (acc: number, w: { total_tonnage_kg: number | null }) => acc + (w.total_tonnage_kg ?? 0), 0
  )

  // Progression tonnage mensuelle (30j vs 30j précédents)
  const last30Tonnage  = (workoutStats ?? [])
    .filter((w: { session_date: string | null }) => w.session_date && w.session_date >= thirtyDaysAgo)
    .reduce((a: number, w: { total_tonnage_kg: number | null }) => a + (w.total_tonnage_kg ?? 0), 0)
  const prev30Tonnage  = (workoutStats ?? [])
    .filter((w: { session_date: string | null }) => w.session_date && w.session_date >= sixtyDaysAgo && w.session_date < thirtyDaysAgo)
    .reduce((a: number, w: { total_tonnage_kg: number | null }) => a + (w.total_tonnage_kg ?? 0), 0)
  const progressPct = prev30Tonnage > 0
    ? Math.round(((last30Tonnage - prev30Tonnage) / prev30Tonnage) * 100)
    : null

  // Séances cette semaine
  const sessionsThisWeek = (workoutStats ?? [])
    .filter((w: { session_date: string | null }) => w.session_date && w.session_date >= sevenDaysAgo).length

  // Streak — jours consécutifs avec séance (à partir d'aujourd'hui)
  const sessionDates = [...new Set((workoutStats ?? [])
    .map((w: { session_date: string | null }) => w.session_date)
    .filter(Boolean)
  )].sort().reverse() as string[]

  let streak = 0
  let expected = now.toISOString().split('T')[0]
  for (const d of sessionDates) {
    if (d === expected) {
      streak++
      const prev = new Date(expected)
      prev.setDate(prev.getDate() - 1)
      expected = prev.toISOString().split('T')[0]
    } else break
  }

  // ── Volume hebdomadaire (8 dernières semaines) — pour le mini graphique ──
  // On groupe les séances des 56 derniers jours par semaine ISO
  const weeklyVolume: { week: string; tonnage: number }[] = []
  const last56Stats = (workoutStats ?? []).filter(
    (w: { session_date: string | null }) => w.session_date && w.session_date >= fiftySixDaysAgo
  )
  const weekTonnageMap: Record<string, number> = {}
  for (const w of last56Stats) {
    if (!w.session_date) continue
    const d = new Date(w.session_date + 'T12:00:00')
    // Calcul numéro de semaine ISO simple
    const dayOfWeek = (d.getDay() + 6) % 7   // lundi = 0
    const mondayOfWeek = new Date(d)
    mondayOfWeek.setDate(d.getDate() - dayOfWeek)
    const weekKey = mondayOfWeek.toISOString().split('T')[0]
    weekTonnageMap[weekKey] = (weekTonnageMap[weekKey] ?? 0) + (w.total_tonnage_kg ?? 0)
  }
  // Générer les 8 dernières semaines (même si tonnage = 0)
  for (let i = 7; i >= 0; i--) {
    const monday = new Date(now)
    const dayOfWeek = (monday.getDay() + 6) % 7
    monday.setDate(monday.getDate() - dayOfWeek - i * 7)
    const weekKey = monday.toISOString().split('T')[0]
    const label = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(monday)
    weeklyVolume.push({ week: label, tonnage: Math.round(weekTonnageMap[weekKey] ?? 0) })
  }
  const bestWeekTonnage = Math.max(...weeklyVolume.map(w => w.tonnage), 0)

  // ── Achievement badges — visibles sans login (SEO + viral) ──
  const checkinStreak = profileStats?.checkin_streak ?? 0
  const referralCode  = profileStats?.referral_code ?? null

  // PRs count = nombre d'exercices distincts avec record top_set
  // Récupérer TOUS les PRs top_set pour le Big 5 + badges
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
  const totalPRs = (allPRs ?? []).length

  // ── Calcul badges achievement ──
  type Badge = { emoji: string; label: string; value: number | string; color: string }
  const achievementBadges: Badge[] = []

  // 🔥 Streak check-in
  if (checkinStreak >= 5) {
    const tier = checkinStreak >= 100 ? '100j' : checkinStreak >= 30 ? '30j' : checkinStreak >= 10 ? '10j' : '5j'
    achievementBadges.push({ emoji: '🔥', label: `Streak ${tier}`, value: `${checkinStreak}j`, color: '#FF6B35' })
  }
  // 💪 PRs
  if (totalPRs >= 5) {
    const tier = totalPRs >= 50 ? '50 records' : totalPRs >= 20 ? '20 records' : '5 records'
    achievementBadges.push({ emoji: '💪', label: tier, value: totalPRs, color: '#B4FF4A' })
  }
  // 🏆 Séances
  if (totalSessions >= 10) {
    const tier = totalSessions >= 500 ? '500 séances' : totalSessions >= 100 ? '100 séances' : totalSessions >= 50 ? '50 séances' : '10 séances'
    achievementBadges.push({ emoji: '🏆', label: tier, value: totalSessions, color: '#F59E0B' })
  }
  // ⚡ Tonnage lifetime
  if (totalTonnage >= 1000) {
    const t = totalTonnage / 1000
    const tier = t >= 100 ? '100T' : t >= 50 ? '50T' : t >= 10 ? '10T' : '1T'
    achievementBadges.push({ emoji: '⚡', label: `${tier} soulevées`, value: `${t.toFixed(0)}T`, color: '#3D8BFF' })
  }

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
  const workoutIds = (shares ?? []).map((s: { workout_id: string }) => s.workout_id).filter(Boolean)

  const [{ data: userLikes }, { data: setsData }] = await Promise.all([
    shareIds.length > 0
      ? supabase
          .from('likes')
          .select('workout_share_id')
          .eq('user_id', user.id)
          .in('workout_share_id', shareIds)
      : Promise.resolve({ data: [] }),
    workoutIds.length > 0
      ? supabase
          .from('workout_sets')
          .select('workout_id, exercise_name, weight_kg, reps, set_type')
          .in('workout_id', workoutIds)
          .neq('set_type', 'warmup')
          .gt('weight_kg', 0)
          .gt('reps', 0)
          .order('set_number', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const likedIds = new Set((userLikes ?? []).map((l: { workout_share_id: string }) => l.workout_share_id))
  const exercisesByWorkout = buildExercisesMap(setsData ?? [])

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
      is_mine: share.user_id === user.id,
      exercises: exercisesByWorkout.get(share.workout_id),
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
              <Image
                src={targetProfile.avatar_url}
                alt={targetProfile.display_name ?? targetProfile.username}
                width={64}
                height={64}
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

        {/* Compteurs followers/following — cliquables */}
        <div className="flex gap-4">
          <Link href={`/u/${username}/followers`} className="text-center group">
            <p className="text-lg font-black fiq-data group-hover:underline" style={{ color: 'var(--fiq-text)' }}>
              {targetProfile.followers_count ?? 0}
            </p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>abonnés</p>
          </Link>
          <Link href={`/u/${username}/followers?tab=following`} className="text-center group">
            <p className="text-lg font-black fiq-data group-hover:underline" style={{ color: 'var(--fiq-text)' }}>
              {targetProfile.following_count ?? 0}
            </p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>abonnements</p>
          </Link>
        </div>

        {/* Actions : Follow + Message (si pas son propre profil) */}
        {!isOwnProfile && (
          <div className="flex gap-2">
            <div className="flex-1">
              <FollowButton
                targetUserId={targetProfile.user_id}
                initialIsFollowing={isFollowing}
              />
            </div>
            <MessageButton recipientId={targetProfile.user_id} />
          </div>
        )}
      </div>

      {/* Stats performance — 4 métriques */}
      <div className="grid grid-cols-2 gap-3">
        <div className="fiq-card text-center">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Séances</p>
          <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>{totalSessions}</p>
          {sessionsThisWeek > 0 && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{sessionsThisWeek} cette semaine</p>
          )}
        </div>
        <div className="fiq-card text-center">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tonnage total</p>
          <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-blue)' }}>
            {totalTonnage > 1000 ? `${(totalTonnage / 1000).toFixed(1)}t` : `${Math.round(totalTonnage)}kg`}
          </p>
          {progressPct !== null && (
            <p className="text-[10px] mt-0.5 font-bold" style={{ color: progressPct >= 0 ? 'var(--fiq-accent)' : 'var(--fiq-red)' }}>
              {progressPct >= 0 ? '+' : ''}{progressPct}% vs mois préc.
            </p>
          )}
        </div>
        {streak >= 2 && (
          <div className="fiq-card text-center" style={{ background: '#FF6B3510', borderColor: '#FF6B3530' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Streak</p>
            <p className="text-xl font-black fiq-data flex items-center justify-center gap-1.5" style={{ color: 'var(--fiq-orange)' }}>
              <FiqStreak size={20} style={{ color: 'var(--fiq-orange)' }} />{streak}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>jours d&apos;affilée</p>
          </div>
        )}
        {big5Filled.length > 0 && (
          <div className="fiq-card text-center">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Records</p>
            <p className="text-xl font-black fiq-data" style={{ color: '#A855F7' }}>{big5Filled.length}/5</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Big 5</p>
          </div>
        )}
      </div>

      {/* Big 5 — Records par mouvement fondamental */}
      {big5Filled.length > 0 && (
        <div className="fiq-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Records — Big 5</p>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: '#B4FF4A15', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A30' }}>
                  {big5Filled.length}/5
                </span>
              </div>
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
          {/* Bouton partage carte Big5 */}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--fiq-border)' }}>
            <ShareBig5Button
              userId={targetProfile.user_id}
              username={targetProfile.username}
              displayName={targetProfile.display_name ?? targetProfile.username ?? 'athlete'}
            />
          </div>
        </div>
      )}

      {/* ── Achievement badges — visibles sans login (SEO + viral) ── */}
      {achievementBadges.length > 0 && (
        <div className="fiq-card space-y-3">
          <p className="text-[11px] uppercase font-black tracking-widest" style={{ color: 'var(--fiq-muted)' }}>
            Achievements
          </p>
          <div className="flex flex-wrap gap-2">
            {achievementBadges.map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-black"
                style={{
                  background: `${badge.color}14`,
                  border: `1px solid ${badge.color}30`,
                  color: badge.color,
                }}
              >
                <span className="text-base">{badge.emoji}</span>
                <div>
                  <span className="font-black">{badge.value}</span>
                  <span className="text-[10px] ml-1 font-normal opacity-70">{badge.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Volume hebdomadaire (8 semaines) — mini graphique public ── */}
      {totalSessions >= 3 && (
        <WeeklyVolumeChart data={weeklyVolume} bestWeek={bestWeekTonnage} />
      )}

      {/* Bilan annuel Wrapped — visible uniquement sur son propre profil */}
      {isOwnProfile && totalSessions >= 3 && (
        <ShareWrappedButton userId={targetProfile.user_id} />
      )}

      {/* QR code — partager le profil IRL */}
      {targetProfile.username && (
        <div className="fiq-card flex items-center gap-4">
          <Image
            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&bgcolor=161A21&color=B4FF4A&qzone=1&data=${encodeURIComponent(`${APP_URL}/u/${targetProfile.username}`)}`}
            alt="QR code profil"
            width={80}
            height={80}
            className="rounded-xl flex-shrink-0"
            unoptimized
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Profil ForgeIQ</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              Scanne pour ouvrir ce profil · getforgeiq.com/u/{targetProfile.username}
            </p>
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
          <div className="flex justify-center mb-2">
            <FiqDumbbell size={32} style={{ color: 'var(--fiq-muted)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>
            Aucune séance partagée pour l&apos;instant
          </p>
        </div>
      )}

      {/* ── Referral CTA — masqué pour le lancement ── */}
      {false && referralCode && (
        <div
          className="fiq-card text-center space-y-3 py-6"
          style={{ background: '#B4FF4A08', border: '1px solid #B4FF4A25' }}
        >
          <div className="text-3xl">💪</div>
          <div>
            <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>
              Rejoins ForgeIQ gratuitement
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Track tes séances, bats tes records, coache ton IA — comme {targetProfile.display_name ?? targetProfile.username}.
            </p>
          </div>
          <Link
            href={`/register?ref=${referralCode}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            Commencer — 14j Pro offerts →
          </Link>
          <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
            Sans carte bancaire · getforgeiq.com
          </p>
        </div>
      )}
    </div>
  )
}

