import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/social/card/year?user_id=xxx&year=2026
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId   = searchParams.get('user_id')
    const year     = Number(searchParams.get('year') ?? new Date().getFullYear())

    if (!userId) return new Response('user_id requis', { status: 400 })

    // Profil social
    const { data: profile } = await supabaseAdmin
      .from('social_profiles')
      .select('username, display_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle()

    const username    = profile?.username ?? 'athlete'
    const displayName = profile?.display_name ?? username
    const initial     = displayName[0]?.toUpperCase() ?? 'A'

    // ── Séances de l'année ────────────────────────────────────────────────────
    const yearStart = `${year}-01-01`
    const yearEnd   = `${year}-12-31`

    const { data: workouts } = await supabaseAdmin
      .from('workouts')
      .select('total_tonnage_kg, session_date, total_sets')
      .eq('user_id', userId)
      .gte('session_date', yearStart)
      .lte('session_date', yearEnd)
      .not('completed_at', 'is', null)
      .order('session_date', { ascending: true })

    const totalSessions = (workouts ?? []).length
    const totalTonnage  = (workouts ?? []).reduce((a, w) => a + (w.total_tonnage_kg ?? 0), 0)

    // Meilleur mois (le plus de séances)
    const monthCounts: Record<string, number> = {}
    for (const w of (workouts ?? [])) {
      const m = w.session_date?.slice(0, 7)
      if (m) monthCounts[m] = (monthCounts[m] ?? 0) + 1
    }
    const bestMonthKey = Object.entries(monthCounts).sort(([, a], [, b]) => b - a)[0]?.[0]
    const bestMonthLabel = bestMonthKey
      ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(bestMonthKey + '-15'))
      : null
    const bestMonthCount = bestMonthKey ? monthCounts[bestMonthKey] : 0

    // Streak max
    const dates = [...new Set((workouts ?? []).map(w => w.session_date).filter(Boolean))].sort() as string[]
    let maxStreak = 0
    let curStreak = 0
    let prevDate: string | null = null
    for (const d of dates) {
      if (prevDate) {
        const diff = (new Date(d).getTime() - new Date(prevDate).getTime()) / 86400000
        curStreak = diff === 1 ? curStreak + 1 : 1
      } else {
        curStreak = 1
      }
      maxStreak = Math.max(maxStreak, curStreak)
      prevDate = d
    }

    // PRs battus cette année
    const { count: prsCount } = await supabaseAdmin
      .from('personal_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${year}-01-01T00:00:00Z`)
      .lte('created_at', `${year}-12-31T23:59:59Z`)

    // Exercice signature (le plus fréquent dans workout_sets cette année)
    const workoutIds = (workouts ?? []).map(w => (w as unknown as { id: string }).id).filter(Boolean)
    let topExercise = 'Entraînement'
    if (workoutIds.length > 0) {
      const { data: setsData } = await supabaseAdmin
        .from('workout_sets')
        .select('exercise_name')
        .in('workout_id', workoutIds.slice(0, 200)) // limite pour perf
        .neq('set_type', 'warmup')

      const exCounts: Record<string, number> = {}
      for (const s of (setsData ?? [])) {
        if (s.exercise_name) exCounts[s.exercise_name] = (exCounts[s.exercise_name] ?? 0) + 1
      }
      const topEx = Object.entries(exCounts).sort(([, a], [, b]) => b - a)[0]
      if (topEx) topExercise = topEx[0].slice(0, 24)
    }

    const tonnageDisplay = totalTonnage >= 1000
      ? `${(totalTonnage / 1000).toFixed(1)}t`
      : `${Math.round(totalTonnage)}kg`

    // ── ImageResponse 1080×1350 ────────────────────────────────────────────────
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex', flexDirection: 'column',
            width: '100%', height: '100%',
            background: '#0A0C0F',
            padding: '64px 60px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Header — Logo + année */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '56px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', background: '#B4FF4A', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '24px' }}>F</span>
              </div>
              <span style={{ color: '#B4FF4A', fontSize: '22px', fontWeight: 900, letterSpacing: '5px' }}>FORGEIQ</span>
            </div>
            <div style={{ background: '#B4FF4A22', border: '1px solid #B4FF4A44', borderRadius: '99px', padding: '8px 20px', display: 'flex' }}>
              <span style={{ color: '#B4FF4A', fontWeight: 900, fontSize: '18px', letterSpacing: '2px' }}>{year}</span>
            </div>
          </div>

          {/* Titre + user */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ fontSize: '64px', fontWeight: 900, color: '#F0F2F5', letterSpacing: '-3px', lineHeight: '1' }}>
              Mon bilan
            </div>
            <div style={{ fontSize: '64px', fontWeight: 900, color: '#B4FF4A', letterSpacing: '-3px', lineHeight: '1.1' }}>
              {year}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
              <div style={{ width: '32px', height: '32px', background: '#B4FF4A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '16px' }}>{initial}</span>
              </div>
              <span style={{ fontSize: '18px', color: '#9CA3AF' }}>@{username}</span>
            </div>
          </div>

          {/* Stats grid — 4 métriques */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            {/* Séances */}
            <div style={{ flex: 1, background: '#161A21', border: '1px solid #1F242E', borderRadius: '20px', padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700 }}>Séances</span>
              <span style={{ fontSize: '52px', fontWeight: 900, color: '#B4FF4A', letterSpacing: '-2px', lineHeight: '1.1', marginTop: '8px' }}>
                {totalSessions}
              </span>
            </div>
            {/* Tonnage */}
            <div style={{ flex: 1, background: '#161A21', border: '1px solid #1F242E', borderRadius: '20px', padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700 }}>Tonnage</span>
              <span style={{ fontSize: '52px', fontWeight: 900, color: '#3D8BFF', letterSpacing: '-2px', lineHeight: '1.1', marginTop: '8px' }}>
                {tonnageDisplay}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            {/* Streak max */}
            <div style={{ flex: 1, background: '#FF6B3510', border: '1px solid #FF6B3530', borderRadius: '20px', padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700 }}>Streak max</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '48px', fontWeight: 900, color: '#FF6B35', letterSpacing: '-2px', lineHeight: '1.1' }}>{maxStreak}</span>
                <span style={{ fontSize: '18px', color: '#9CA3AF' }}>jours</span>
              </div>
            </div>
            {/* PRs */}
            <div style={{ flex: 1, background: '#A855F710', border: '1px solid #A855F730', borderRadius: '20px', padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700 }}>Records battus</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '48px', fontWeight: 900, color: '#A855F7', letterSpacing: '-2px', lineHeight: '1.1' }}>{prsCount ?? 0}</span>
                <span style={{ fontSize: '18px', color: '#9CA3AF' }}>PRs</span>
              </div>
            </div>
          </div>

          {/* Exercice signature + meilleur mois */}
          <div style={{ background: '#161A21', border: '1px solid #1F242E', borderRadius: '20px', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700 }}>Exercice signature</span>
                <span style={{ fontSize: '26px', fontWeight: 900, color: '#F0F2F5', marginTop: '4px' }}>{topExercise}</span>
              </div>
              <span style={{ fontSize: '32px' }}>🏋️</span>
            </div>
            {bestMonthLabel && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #1F242E' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700 }}>Meilleur mois</span>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#F59E0B', marginTop: '4px', textTransform: 'capitalize' }}>
                    {bestMonthLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 900, color: '#F59E0B' }}>{bestMonthCount}</span>
                  <span style={{ fontSize: '16px', color: '#9CA3AF' }}>séances</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '28px' }}>
            <span style={{ color: '#374151', fontSize: '16px' }}>getforgeiq.com</span>
            <div style={{ background: '#B4FF4A', padding: '10px 24px', borderRadius: '99px', display: 'flex' }}>
              <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '15px' }}>Build smarter. Lift harder.</span>
            </div>
          </div>
        </div>
      ),
      { width: 1080, height: 1350 }
    )
  } catch (e) {
    console.error('[social/card/year]', e)
    return new Response('Erreur génération carte', { status: 500 })
  }
}
