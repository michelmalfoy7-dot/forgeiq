/**
 * OG image dynamique pour /share/[workoutId] — 1200×630
 * Auto-découverte par Next.js App Router pour les meta tags openGraph + twitter
 */
import { ImageResponse } from 'next/og'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'Séance partagée sur ForgeIQ'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function fmt(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`
}

function abbrev(name: string, maxLen = 30): string {
  if (name.length <= maxLen) return name
  const s = name
    .replace(/\s+Hammer Strength$/i, ' HS')
    .replace(/\s+Technogym$/i, ' TG')
    .replace(/\s+Life Fitness$/i, ' LF')
    .replace(/\s+Matrix$/i, ' MX')
    .replace(/ISO Latéral/gi, 'ISO Lat')
    .replace(/Unilatéral/gi, 'Uni')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return s.length <= maxLen ? s : s.slice(0, maxLen - 1) + '…'
}

export default async function Image({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await params

  const { data: workout } = await supabaseAdmin
    .from('workouts')
    .select('session_name, total_tonnage_kg, total_sets, duration_min, completed_at, user_id')
    .eq('id', workoutId)
    .not('completed_at', 'is', null)
    .maybeSingle()

  if (!workout) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0A0C0F', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
          <span style={{ color: '#B4FF4A', fontSize: 48, fontWeight: 900 }}>ForgeIQ</span>
        </div>
      ),
      { ...size }
    )
  }

  const { data: sp } = await supabaseAdmin
    .from('social_profiles')
    .select('display_name, username, is_public')
    .eq('user_id', workout.user_id)
    .maybeSingle()

  const isPublic = sp?.is_public ?? false
  const displayName = isPublic ? (sp?.display_name ?? sp?.username ?? 'Athlète') : 'Athlète ForgeIQ'
  const username = isPublic ? sp?.username : null
  const initial = displayName[0].toUpperCase()

  const { data: sets } = await supabaseAdmin
    .from('workout_sets')
    .select('exercise_name, weight_kg, reps, is_pr, set_type')
    .eq('workout_id', workoutId)
    .neq('set_type', 'warmup')
    .gt('weight_kg', 0)
    .gt('reps', 0)
    .order('set_number', { ascending: true })

  type ExStat = { maxKg: number; maxReps: number; tonnage: number; isPr: boolean }
  const exerciseMap = new Map<string, ExStat>()
  for (const s of sets ?? []) {
    const existing = exerciseMap.get(s.exercise_name)
    const t = (s.weight_kg ?? 0) * (s.reps ?? 0)
    if (!existing) {
      exerciseMap.set(s.exercise_name, {
        maxKg: s.weight_kg ?? 0,
        maxReps: s.reps ?? 0,
        tonnage: t,
        isPr: s.is_pr ?? false,
      })
    } else {
      const better = (s.weight_kg ?? 0) > existing.maxKg
      exerciseMap.set(s.exercise_name, {
        maxKg: better ? (s.weight_kg ?? 0) : existing.maxKg,
        maxReps: better ? (s.reps ?? 0) : existing.maxReps,
        tonnage: existing.tonnage + t,
        isPr: existing.isPr || (s.is_pr ?? false),
      })
    }
  }

  const allExercises = Array.from(exerciseMap.entries())
    .sort(([, a], [, b]) => b.tonnage - a.tonnage)
    .map(([name, d]) => ({ name, kg: d.maxKg, reps: d.maxReps, isPr: d.isPr }))

  const exercises = allExercises.slice(0, 4)
  const prCount = allExercises.filter(e => e.isPr).length

  const dateStr = workout.completed_at
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(workout.completed_at))
    : null

  // Réactions via workout_shares (table optionnelle — graceful fallback)
  let reactions: { emoji: string; count: number }[] = []
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
    // Réactions indisponibles → on affiche la carte sans
  }

  const sessionName = workout.session_name ?? 'Séance'
  const nameShort = sessionName.length > 24 ? sessionName.slice(0, 24) + '…' : sessionName

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#0A0C0F',
          padding: '48px 60px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow décoratif top-left */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            left: -120,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #B4FF4A14 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Header : Logo ForgeIQ + identité utilisateur */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '38px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                background: '#B4FF4A',
                borderRadius: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '21px' }}>F</span>
            </div>
            <span style={{ color: '#B4FF4A', fontSize: '19px', fontWeight: 900, letterSpacing: '5px' }}>FORGEIQ</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#161A21',
              border: '1px solid #1F242E',
              borderRadius: '99px',
              padding: '9px 18px',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                background: '#B4FF4A',
                borderRadius: '7px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '12px' }}>{initial}</span>
            </div>
            <span style={{ color: '#9CA3AF', fontSize: '16px' }}>
              {username ? `@${username}` : displayName}
            </span>
            {dateStr && (
              <span style={{ color: '#4B5563', fontSize: '14px' }}>· {dateStr}</span>
            )}
          </div>
        </div>

        {/* Nom de la séance */}
        <div
          style={{
            fontSize: '68px',
            fontWeight: 900,
            color: '#F0F2F5',
            letterSpacing: '-3px',
            lineHeight: '1',
            marginBottom: '12px',
          }}
        >
          {nameShort}
        </div>
        <div style={{ width: '60px', height: '4px', background: '#B4FF4A', borderRadius: '99px', marginBottom: '26px' }} />

        {/* Stats clés */}
        <div style={{ display: 'flex', gap: '44px', alignItems: 'flex-end', marginBottom: '22px' }}>
          {workout.total_tonnage_kg != null && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '50px', fontWeight: 900, color: '#B4FF4A', letterSpacing: '-2px' }}>
                {fmt(workout.total_tonnage_kg)}
              </span>
              <span style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '5px', marginTop: '2px' }}>
                soulevés
              </span>
            </div>
          )}
          {workout.total_sets != null && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '50px', fontWeight: 900, color: '#F0F2F5', letterSpacing: '-2px' }}>
                {workout.total_sets}
              </span>
              <span style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '5px', marginTop: '2px' }}>
                séries
              </span>
            </div>
          )}
          {workout.duration_min != null && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '50px', fontWeight: 900, color: '#F0F2F5', letterSpacing: '-2px' }}>
                {workout.duration_min}
              </span>
              <span style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '5px', marginTop: '2px' }}>
                min
              </span>
            </div>
          )}
          {prCount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '50px', fontWeight: 900, color: '#F59E0B', letterSpacing: '-2px' }}>
                {prCount} PR{prCount > 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '5px', marginTop: '2px' }}>
                records
              </span>
            </div>
          )}
          {reactions.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '8px 16px',
                background: '#161A21',
                borderRadius: '12px',
                border: '1px solid #1F242E',
                marginBottom: '8px',
              }}
            >
              {reactions.map((r) => (
                <div key={r.emoji} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '20px' }}>{r.emoji}</span>
                  <span style={{ color: '#9CA3AF', fontWeight: 700, fontSize: '17px' }}>{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top exercices */}
        {exercises.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
            {exercises.map((ex, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 16px',
                  background: ex.isPr ? '#F59E0B0D' : '#161A21',
                  borderRadius: '10px',
                  border: `1px solid ${ex.isPr ? '#F59E0B40' : '#1F242E'}`,
                }}
              >
                <span style={{ color: '#9CA3AF', fontSize: '18px', flex: 1 }}>{abbrev(ex.name)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {ex.isPr && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#F59E0B',
                        background: '#F59E0B22',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 900,
                      }}
                    >
                      PR
                    </span>
                  )}
                  <span style={{ color: '#F0F2F5', fontWeight: 900, fontSize: '18px' }}>
                    {ex.kg} kg × {ex.reps}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid #1F242E',
          }}
        >
          <span style={{ color: '#4B5563', fontSize: '14px' }}>getforgeiq.com</span>
          <div
            style={{
              background: '#B4FF4A',
              padding: '8px 20px',
              borderRadius: '99px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '13px' }}>
              Build smarter. Lift harder.
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
