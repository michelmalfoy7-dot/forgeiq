import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { categorizeBig5 } from '@/lib/utils/big5'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId   = searchParams.get('user_id')
    const username = searchParams.get('username')

    if (!userId && !username) {
      return new Response('user_id ou username requis', { status: 400 })
    }

    // Résoudre user_id depuis username si nécessaire
    let resolvedUserId = userId
    let resolvedUsername = username
    let resolvedDisplayName = username

    if (!resolvedUserId && username) {
      const { data: profile } = await supabaseAdmin
        .from('social_profiles')
        .select('user_id, display_name')
        .eq('username', username.toLowerCase())
        .maybeSingle()
      if (!profile) return new Response('Utilisateur introuvable', { status: 404 })
      resolvedUserId    = profile.user_id
      resolvedDisplayName = profile.display_name ?? username
    }

    if (resolvedUserId && !resolvedUsername) {
      const { data: sp } = await supabaseAdmin
        .from('social_profiles')
        .select('username, display_name')
        .eq('user_id', resolvedUserId)
        .maybeSingle()
      resolvedUsername    = sp?.username ?? 'forgeiq'
      resolvedDisplayName = sp?.display_name ?? resolvedUsername
    }

    // PRs top_set de l'utilisateur
    const { data: prs } = await supabaseAdmin
      .from('personal_records')
      .select('value, exercise_name, exercises_library(name_fr, name)')
      .eq('user_id', resolvedUserId!)
      .eq('record_type', 'top_set')
      .order('value', { ascending: false })

    const big5 = categorizeBig5(
      (prs ?? []).map((pr: { value: number; exercise_name: string; exercises_library: unknown }) => ({
        value: pr.value,
        exercise_name: pr.exercise_name,
        exercises_library: pr.exercises_library as { name: string; name_fr: string | null } | null,
      }))
    )

    const filled  = big5.filter(b => b.value !== null)
    const initial = (resolvedDisplayName ?? 'A')[0].toUpperCase()

    // Couleurs CSS → valeurs hex pour satori (pas de CSS vars)
    function resolveColor(cssVar: string): string {
      const map: Record<string, string> = {
        'var(--fiq-accent)':  '#B4FF4A',
        'var(--fiq-orange)':  '#FF6B35',
        'var(--fiq-blue)':    '#3D8BFF',
        'var(--fiq-red)':     '#EF4444',
        'var(--fiq-yellow)':  '#F59E0B',
        '#A855F7':            '#A855F7',
        '#F59E0B':            '#F59E0B',
      }
      return map[cssVar] ?? '#B4FF4A'
    }

    // ── ImageResponse 1080×1350 (4:5 — Instagram + TikTok cover) ─────────────
    return new ImageResponse(
      (
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            width:          '100%',
            height:         '100%',
            background:     '#0A0C0F',
            padding:        '72px 64px',
            fontFamily:     'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* ── Header : Logo + @username ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', background: '#B4FF4A', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '26px' }}>F</span>
              </div>
              <span style={{ color: '#B4FF4A', fontSize: '24px', fontWeight: 900, letterSpacing: '6px' }}>FORGEIQ</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#161A21', border: '1px solid #1F242E', borderRadius: '99px', padding: '10px 22px' }}>
              <div style={{ width: '28px', height: '28px', background: '#B4FF4A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '14px' }}>{initial}</span>
              </div>
              <span style={{ color: '#9CA3AF', fontSize: '18px' }}>@{resolvedUsername}</span>
            </div>
          </div>

          {/* ── Titre ── */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ fontSize: '72px', fontWeight: 900, color: '#F0F2F5', letterSpacing: '-3px', lineHeight: '1' }}>
              Mes Records
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
              <div style={{ width: '64px', height: '4px', background: '#B4FF4A', borderRadius: '99px' }} />
              <span style={{ fontSize: '16px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '4px' }}>Big 5</span>
            </div>
          </div>

          {/* ── Big 5 PRs ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {big5.map((cat) => {
              const color = resolveColor(cat.color)
              const hasValue = cat.value !== null
              return (
                <div
                  key={cat.id}
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    gap:           '20px',
                    padding:       '20px 24px',
                    background:    hasValue ? `${color}12` : '#161A21',
                    borderRadius:  '20px',
                    border:        `1px solid ${hasValue ? `${color}35` : '#1F242E'}`,
                  }}
                >
                  {/* Emoji */}
                  <div
                    style={{
                      width: '52px', height: '52px', borderRadius: '14px',
                      background: `${color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '26px', flexShrink: 0,
                    }}
                  >
                    {cat.emoji}
                  </div>

                  {/* Label + exercice */}
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '15px', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '3px' }}>
                      {cat.label}
                    </span>
                    <span style={{ fontSize: '17px', color: hasValue ? '#F0F2F5' : '#374151', marginTop: '4px' }}>
                      {hasValue
                        ? (cat.exerciseName ?? cat.sublabel).slice(0, 32)
                        : '—'
                      }
                    </span>
                  </div>

                  {/* Valeur */}
                  {hasValue ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontSize: '44px', fontWeight: 900, color, letterSpacing: '-2px' }}>
                        {cat.value}
                      </span>
                      <span style={{ fontSize: '18px', color: '#6B7280', marginBottom: '4px' }}>kg</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '28px', color: '#374151', flexShrink: 0 }}>—</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Footer ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '48px', paddingTop: '28px', borderTop: '1px solid #1F242E' }}>
            <span style={{ color: '#4B5563', fontSize: '17px' }}>getforgeiq.com</span>
            {filled.length > 0 && (
              <div style={{ background: '#B4FF4A', padding: '10px 28px', borderRadius: '99px', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '16px' }}>
                  Build smarter. Lift harder.
                </span>
              </div>
            )}
          </div>
        </div>
      ),
      { width: 1080, height: 1350 }
    )
  } catch (e) {
    console.error('[social/card/big5]', e)
    return new Response('Erreur génération carte', { status: 500 })
  }
}
