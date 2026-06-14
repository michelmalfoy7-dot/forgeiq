/**
 * /share/[workoutId] — Page publique de partage de séance
 * Design optimisé pour screenshot natif (Instagram, TikTok, WhatsApp…)
 * Accessible sans connexion → bon pour le SEO et le viral loop
 */
import type { Metadata } from 'next'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ShareActions from './ShareActions'

// Service role — lecture des données publiques sans RLS
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

type PageProps = {
  params: Promise<{ workoutId: string }>
}

function fmt(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { workoutId } = await params

  const { data: workout } = await supabaseAdmin
    .from('workouts')
    .select('session_name, total_tonnage_kg, total_sets, user_id')
    .eq('id', workoutId)
    .maybeSingle()

  if (!workout) return { title: 'Séance | ForgeIQ' }

  const { data: sp } = await supabaseAdmin
    .from('social_profiles')
    .select('display_name, username')
    .eq('user_id', workout.user_id)
    .maybeSingle()

  const name = sp?.display_name ?? sp?.username ?? 'Athlète'
  const title = `${name} — ${workout.session_name ?? 'Séance'} | ForgeIQ`
  const desc = workout.total_tonnage_kg
    ? `${fmt(workout.total_tonnage_kg)} soulevés · ${workout.total_sets ?? 0} séries · Rejoins ForgeIQ`
    : 'Séance complétée sur ForgeIQ — Coach IA fitness'

  const ogImageUrl = `${APP_URL}/share/${workoutId}/opengraph-image`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `${APP_URL}/share/${workoutId}`,
      type: 'website',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImageUrl],
    },
  }
}

export default async function ShareWorkoutPage({ params }: PageProps) {
  const { workoutId } = await params

  // Séance
  const { data: workout } = await supabaseAdmin
    .from('workouts')
    .select('session_name, total_tonnage_kg, total_sets, total_reps, completed_at, duration_min, user_id')
    .eq('id', workoutId)
    .not('completed_at', 'is', null)
    .maybeSingle()

  if (!workout) notFound()

  // Profil social de l'auteur
  const { data: sp } = await supabaseAdmin
    .from('social_profiles')
    .select('display_name, username, avatar_url, is_public')
    .eq('user_id', workout.user_id)
    .maybeSingle()

  const isPublic = sp?.is_public ?? false
  const displayName = isPublic ? (sp?.display_name ?? sp?.username ?? 'Athlète') : 'Athlète ForgeIQ'
  const username = isPublic ? sp?.username : null

  // Top sets par exercice (triés par tonnage → compound en premier)
  const { data: sets } = await supabaseAdmin
    .from('workout_sets')
    .select('exercise_name, weight_kg, reps, set_type, is_pr')
    .eq('workout_id', workoutId)
    .neq('set_type', 'warmup')
    .gt('weight_kg', 0)
    .gt('reps', 0)
    .order('set_number', { ascending: true })

  type ExTop = { name: string; kg: number; reps: number; tonnage: number; isPr: boolean }
  const exMap = new Map<string, ExTop>()
  for (const s of sets ?? []) {
    const existing = exMap.get(s.exercise_name)
    const t = (s.weight_kg ?? 0) * (s.reps ?? 0)
    if (!existing) {
      exMap.set(s.exercise_name, { name: s.exercise_name, kg: s.weight_kg ?? 0, reps: s.reps ?? 0, tonnage: t, isPr: s.is_pr ?? false })
    } else {
      const better = (s.weight_kg ?? 0) > existing.kg
      exMap.set(s.exercise_name, {
        name: existing.name,
        kg: better ? (s.weight_kg ?? 0) : existing.kg,
        reps: better ? (s.reps ?? 0) : existing.reps,
        tonnage: existing.tonnage + t,
        isPr: existing.isPr || (s.is_pr ?? false),
      })
    }
  }

  const allExercises = [...exMap.values()].sort((a, b) => b.tonnage - a.tonnage)
  const topExercises = allExercises.slice(0, 5)
  const prCount = allExercises.filter(e => e.isPr).length
  const extraCount = Math.max(0, allExercises.length - 5)

  // Réactions (depuis workout_shares → reactions)
  let reactions: { emoji: string; count: number }[] = []
  let shareUrl = `${APP_URL}/share/${workoutId}`
  try {
    const { data: share } = await supabaseAdmin
      .from('workout_shares')
      .select('id')
      .eq('workout_id', workoutId)
      .eq('is_public', true)
      .maybeSingle()

    if (share) {
      const { data: reactionRows } = await supabaseAdmin
        .from('reactions')
        .select('emoji')
        .eq('share_id', share.id)

      if (reactionRows) {
        const counts: Record<string, number> = {}
        for (const r of reactionRows) {
          counts[r.emoji] = (counts[r.emoji] ?? 0) + 1
        }
        reactions = Object.entries(counts)
          .filter(([, c]) => c > 0)
          .map(([emoji, count]) => ({ emoji, count }))
          .sort((a, b) => b.count - a.count)
      }
    }
  } catch {
    // Réactions indisponibles → on affiche sans
  }

  // Date formatée
  const completedAt = workout.completed_at
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(workout.completed_at))
    : null

  const shareTitle = `${displayName} — ${workout.session_name ?? 'Séance'} | ForgeIQ`
  const shareText = workout.total_tonnage_kg
    ? `${fmt(workout.total_tonnage_kg)} soulevés · ${workout.total_sets ?? 0} séries${prCount > 0 ? ` · ${prCount} PR${prCount > 1 ? 's' : ''}` : ''}`
    : undefined

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--bg)', fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Carte principale — optimisée pour screenshot 9:16 */}
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
      >
        {/* Header dégradé */}
        <div
          className="px-6 pt-6 pb-5 relative"
          style={{
            background: 'linear-gradient(135deg, #0A0C0F 0%, #111827 50%, #0A0F1A 100%)',
          }}
        >
          {/* Logo ForgeIQ watermark */}
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              F
            </div>
            <span
              className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'var(--fiq-accent)' }}
            >
              ForgeIQ
            </span>
          </div>

          {/* Nom de la séance */}
          <h1
            className="text-2xl font-black leading-tight mb-1"
            style={{ color: '#F0F2F5', letterSpacing: '-0.03em' }}
          >
            {workout.session_name ?? 'Séance'}
          </h1>

          {/* Date */}
          {completedAt && (
            <p className="text-xs mb-4" style={{ color: 'var(--fiq-muted)' }}>
              {completedAt}
            </p>
          )}

          {/* Barre accentuée */}
          <div
            className="h-1 w-16 rounded-full mb-5"
            style={{ background: 'var(--fiq-accent)' }}
          />

          {/* Stats principales */}
          <div className="flex gap-6 flex-wrap">
            {workout.total_tonnage_kg != null && (
              <div>
                <p
                  className="text-3xl font-black"
                  style={{ color: 'var(--fiq-accent)', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmt(workout.total_tonnage_kg)}
                </p>
                <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  soulevés
                </p>
              </div>
            )}
            {workout.total_sets != null && (
              <div>
                <p
                  className="text-3xl font-black"
                  style={{ color: '#F0F2F5', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}
                >
                  {workout.total_sets}
                </p>
                <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  séries
                </p>
              </div>
            )}
            {workout.duration_min != null && (
              <div>
                <p
                  className="text-3xl font-black"
                  style={{ color: '#F0F2F5', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}
                >
                  {workout.duration_min}
                </p>
                <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  min
                </p>
              </div>
            )}
            {prCount > 0 && (
              <div>
                <p
                  className="text-3xl font-black"
                  style={{ color: 'var(--fiq-yellow)', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}
                >
                  {prCount} PR{prCount > 1 ? 's' : ''}
                </p>
                <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  records
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Exercices */}
        {topExercises.length > 0 && (
          <div
            className="px-5 py-4 space-y-2"
            style={{ borderTop: '1px solid var(--fiq-border)' }}
          >
            <p
              className="text-[10px] uppercase tracking-widest font-black mb-3"
              style={{ color: 'var(--fiq-muted)' }}
            >
              Top exercices
            </p>
            {topExercises.map((ex, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl"
                style={{
                  background: ex.isPr ? '#F59E0B0D' : 'var(--fiq-faint)',
                  border: `1px solid ${ex.isPr ? '#F59E0B40' : 'transparent'}`,
                }}
              >
                <p className="text-sm truncate flex-1" style={{ color: '#F0F2F5' }}>
                  {ex.name}
                </p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {ex.isPr && (
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded"
                      style={{ color: 'var(--fiq-yellow)', background: '#F59E0B22' }}
                    >
                      PR
                    </span>
                  )}
                  <span
                    className="text-sm font-black"
                    style={{ color: ex.isPr ? 'var(--fiq-yellow)' : 'var(--fiq-accent)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {ex.kg}kg
                  </span>
                  <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                    × {ex.reps}
                  </span>
                </div>
              </div>
            ))}
            {extraCount > 0 && (
              <p className="text-xs text-center pt-1" style={{ color: 'var(--fiq-muted)' }}>
                + {extraCount} autre{extraCount > 1 ? 's' : ''} exercice{extraCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Réactions */}
        {reactions.length > 0 && (
          <div
            className="px-5 py-3 flex items-center gap-3"
            style={{ borderTop: '1px solid var(--fiq-border)' }}
          >
            {reactions.map(r => (
              <div
                key={r.emoji}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
              >
                <span className="text-base">{r.emoji}</span>
                <span className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Auteur + URL */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: '1px solid var(--fiq-border)', background: '#0A0C0F' }}
        >
          <div>
            <p className="font-black text-sm" style={{ color: '#F0F2F5' }}>
              {displayName}
            </p>
            {username && (
              <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                @{username}
              </p>
            )}
          </div>
          <p className="text-xs font-semibold" style={{ color: 'var(--fiq-accent)' }}>
            getforgeiq.com
          </p>
        </div>
      </div>

      {/* Actions + CTA visiteur non connecté */}
      <div className="mt-6 space-y-3 w-full max-w-sm">
        <ShareActions url={shareUrl} title={shareTitle} text={shareText} />

        <Link
          href={`/register${username ? `?ref=${username}` : ''}`}
          className="block w-full py-4 rounded-2xl font-black text-base text-center"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)', letterSpacing: '-0.01em' }}
        >
          Rejoindre ForgeIQ — gratuit →
        </Link>

        <p className="text-xs text-center" style={{ color: 'var(--fiq-muted)' }}>
          Track tes séances · Bats tes records avec l&apos;IA · 4,99€/mois
        </p>

        {username && (
          <Link
            href={`/u/${username}`}
            className="block text-sm font-semibold py-2 text-center"
            style={{ color: 'var(--fiq-muted)' }}
          >
            Voir le profil de {displayName} →
          </Link>
        )}
      </div>
    </div>
  )
}
