import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

// Service role pour lire les données publiques sans contrainte RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('id')

    if (!shareId) return new Response('Missing id', { status: 400 })

    // ── Fetch du share (public uniquement) ───────────────────────────────────
    const { data: share } = await supabaseAdmin
      .from('workout_shares')
      .select(`
        id,
        workout_id,
        user_id,
        caption,
        created_at,
        workouts (
          session_name,
          total_tonnage_kg,
          total_sets,
          completed_at
        )
      `)
      .eq('id', shareId)
      .eq('is_public', true)
      .maybeSingle()

    if (!share) return new Response('Not found', { status: 404 })

    // ── Profil social de l'auteur ────────────────────────────────────────────
    const { data: socialProfile } = await supabaseAdmin
      .from('social_profiles')
      .select('username, display_name')
      .eq('user_id', share.user_id)
      .maybeSingle()

    // ── Top sets des exercices ────────────────────────────────────────────────
    const { data: sets } = await supabaseAdmin
      .from('workout_sets')
      .select('exercise_name, weight_kg, reps, set_type, set_number')
      .eq('workout_id', share.workout_id)
      .neq('set_type', 'warmup')
      .gt('weight_kg', 0)
      .gt('reps', 0)
      .order('set_number', { ascending: true })

    // Grouper par exercice — meilleur set, ordre d'apparition
    const exerciseMap = new Map<string, { maxKg: number; maxReps: number; order: number }>()
    for (const set of sets ?? []) {
      const existing = exerciseMap.get(set.exercise_name)
      if (!existing) {
        exerciseMap.set(set.exercise_name, {
          maxKg: set.weight_kg,
          maxReps: set.reps,
          order: exerciseMap.size,
        })
      } else {
        const isBetter =
          set.weight_kg > existing.maxKg ||
          (set.weight_kg === existing.maxKg && set.reps > existing.maxReps)
        if (isBetter) {
          exerciseMap.set(set.exercise_name, {
            maxKg: set.weight_kg,
            maxReps: set.reps,
            order: existing.order,
          })
        }
      }
    }

    const exercises = Array.from(exerciseMap.entries())
      .sort(([, a], [, b]) => a.order - b.order)
      .slice(0, 5)
      .map(([name, data]) => ({ name, kg: data.maxKg, reps: data.maxReps }))

    const workout = share.workouts as unknown as {
      session_name: string | null
      total_tonnage_kg: number | null
      total_sets: number | null
    } | null

    const sessionName  = workout?.session_name ?? 'Séance'
    const tonnage      = workout?.total_tonnage_kg
    const totalSets    = workout?.total_sets
    const username     = socialProfile?.username ?? 'forgeiq'
    const displayName  = socialProfile?.display_name ?? username

    function fmt(kg: number): string {
      return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`
    }

    const nameShort = sessionName.length > 18 ? sessionName.slice(0, 18) + '…' : sessionName
    const initial   = (displayName)[0].toUpperCase()

    // ── ImageResponse 1080×1080 ───────────────────────────────────────────────
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: '#0A0C0F',
            padding: '64px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* ── Header : logo + @username ───────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '52px' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', background: '#B4FF4A', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '24px' }}>F</span>
              </div>
              <span style={{ color: '#B4FF4A', fontSize: '22px', fontWeight: 900, letterSpacing: '6px' }}>FORGEIQ</span>
            </div>
            {/* Badge auteur */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#161A21', border: '1px solid #1F242E', borderRadius: '99px', padding: '10px 20px' }}>
              <div style={{ width: '28px', height: '28px', background: '#B4FF4A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '14px' }}>{initial}</span>
              </div>
              <span style={{ color: '#9CA3AF', fontSize: '18px' }}>@{username}</span>
            </div>
          </div>

          {/* ── Nom de la séance ─────────────────────────────────────────────── */}
          <div style={{ fontSize: '80px', fontWeight: 900, color: '#F0F2F5', letterSpacing: '-3px', lineHeight: '1', marginBottom: '20px' }}>
            {nameShort}
          </div>

          {/* Barre accent */}
          <div style={{ width: '72px', height: '5px', background: '#B4FF4A', borderRadius: '99px', marginBottom: '52px' }} />

          {/* ── Stats ───────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '56px', marginBottom: '52px' }}>
            {tonnage != null && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '64px', fontWeight: 900, color: '#B4FF4A', letterSpacing: '-2px' }}>
                  {fmt(tonnage)}
                </span>
                <span style={{ fontSize: '13px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '5px', marginTop: '4px' }}>
                  soulevés
                </span>
              </div>
            )}
            {totalSets != null && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '64px', fontWeight: 900, color: '#F0F2F5', letterSpacing: '-2px' }}>
                  {totalSets}
                </span>
                <span style={{ fontSize: '13px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '5px', marginTop: '4px' }}>
                  séries
                </span>
              </div>
            )}
          </div>

          {/* ── Exercices ───────────────────────────────────────────────────── */}
          {exercises.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {exercises.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    background: '#161A21',
                    borderRadius: '16px',
                    border: '1px solid #1F242E',
                  }}
                >
                  <span style={{ color: '#9CA3AF', fontSize: '22px', flex: 1 }}>
                    {ex.name.length > 28 ? ex.name.slice(0, 28) + '…' : ex.name}
                  </span>
                  <span style={{ color: '#F0F2F5', fontWeight: 900, fontSize: '22px' }}>
                    {ex.kg} kg × {ex.reps}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', paddingTop: '28px', borderTop: '1px solid #1F242E' }}>
            <span style={{ color: '#4B5563', fontSize: '16px' }}>getforgeiq.com</span>
            <div style={{ background: '#B4FF4A', padding: '10px 26px', borderRadius: '99px', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '16px' }}>
                Build smarter. Lift harder.
              </span>
            </div>
          </div>
        </div>
      ),
      { width: 1080, height: 1080 }
    )
  } catch (e) {
    console.error('[social/card]', e)
    return new Response('Erreur génération carte', { status: 500 })
  }
}
