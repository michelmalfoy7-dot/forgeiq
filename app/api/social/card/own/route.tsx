/**
 * GET /api/social/card/own?workout_id=...&format=square|story
 *
 * Génère la carte image pour la propre séance de l'utilisateur authentifié
 * SANS nécessiter un post public dans le feed.
 * Utilisé pour partager directement depuis l'écran de fin de séance.
 */
import { ImageResponse } from 'next/og'
import { createClient }  from '@/lib/supabase/server'

export const dynamic     = 'force-dynamic'
export const maxDuration = 30

// ── Helpers partagés ──────────────────────────────────────────────────────────

function fmt(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`
}

function abbrev(name: string, maxLen = 30): string {
  if (name.length <= maxLen) return name
  let s = name
    .replace(/\s+Hammer Strength$/i, ' HS')
    .replace(/\s+Technogym$/i,       ' TG')
    .replace(/\s+Life Fitness$/i,     ' LF')
    .replace(/\s+Matrix$/i,           ' MX')
    .replace(/\s+Precor$/i,           '')
    .replace(/ISO Latéral/gi,         'ISO Lat')
    .replace(/Unilatéral/gi,          'Uni')
    .replace(/Couché\s*/gi,           '')
    .replace(/Assis\s*/gi,            '')
    .replace(/\s{2,}/g,               ' ')
    .trim()
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen - 1) + '…'
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workoutId = searchParams.get('workout_id')
    const format    = searchParams.get('format') ?? 'square'
    const isStory   = format === 'story'

    if (!workoutId) return new Response('Missing workout_id', { status: 400 })

    // Auth obligatoire
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    // Fetch séance (uniquement la sienne)
    const { data: workout } = await supabase
      .from('workouts')
      .select('id, session_name, total_tonnage_kg, total_sets')
      .eq('id', workoutId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!workout) return new Response('Not found', { status: 404 })

    // Profil social
    const { data: socialProfile } = await supabase
      .from('social_profiles')
      .select('username, display_name')
      .eq('user_id', user.id)
      .maybeSingle()

    // Sets avec flag PR
    const { data: sets } = await supabase
      .from('workout_sets')
      .select('exercise_name, weight_kg, reps, set_type, is_pr')
      .eq('workout_id', workoutId)
      .neq('set_type', 'warmup')
      .gt('weight_kg', 0)
      .gt('reps', 0)

    // Grouper + tri tonnage décroissant
    type ExerciseStat = {
      maxKg: number; maxReps: number; tonnage: number; isPr: boolean
    }
    const exerciseMap = new Map<string, ExerciseStat>()

    for (const set of sets ?? []) {
      const existing   = exerciseMap.get(set.exercise_name)
      const setTonnage = (set.weight_kg ?? 0) * (set.reps ?? 0)
      if (!existing) {
        exerciseMap.set(set.exercise_name, {
          maxKg:   set.weight_kg ?? 0,
          maxReps: set.reps ?? 0,
          tonnage: setTonnage,
          isPr:    set.is_pr ?? false,
        })
      } else {
        const isBetter = (set.weight_kg ?? 0) > existing.maxKg
        exerciseMap.set(set.exercise_name, {
          maxKg:   isBetter ? (set.weight_kg ?? 0) : existing.maxKg,
          maxReps: isBetter ? (set.reps ?? 0)      : existing.maxReps,
          tonnage: existing.tonnage + setTonnage,
          isPr:    existing.isPr || (set.is_pr ?? false),
        })
      }
    }

    const allExercises = Array.from(exerciseMap.entries())
      .sort(([, a], [, b]) => b.tonnage - a.tonnage)
      .map(([name, data]) => ({
        name, kg: data.maxKg, reps: data.maxReps, isPr: data.isPr,
      }))

    const MAX_SHOWN  = 5
    const exercises  = allExercises.slice(0, MAX_SHOWN)
    const extraCount = Math.max(0, allExercises.length - MAX_SHOWN)
    const prExercises = allExercises.filter(e => e.isPr).slice(0, 3)

    const sessionName = workout.session_name ?? 'Séance'
    const tonnage     = workout.total_tonnage_kg
    const totalSets   = workout.total_sets
    const username    = socialProfile?.username ?? 'forgeiq'
    const displayName = socialProfile?.display_name ?? username
    const initial     = displayName[0].toUpperCase()
    const nameShort   = sessionName.length > 20 ? sessionName.slice(0, 20) + '…' : sessionName

    const W = 1080
    const H = isStory ? 1920 : 1080

    return new ImageResponse(
      isStory
        ? renderStory({ nameShort, tonnage, totalSets, exercises, extraCount, prExercises, username, initial })
        : renderSquare({ nameShort, tonnage, totalSets, exercises, extraCount, prExercises, username, initial }),
      { width: W, height: H }
    )
  } catch (e) {
    console.error('[social/card/own]', e)
    return new Response('Erreur génération carte', { status: 500 })
  }
}

// ── Layouts ───────────────────────────────────────────────────────────────────

interface CardProps {
  nameShort:   string
  tonnage:     number | null
  totalSets:   number | null
  exercises:   { name: string; kg: number; reps: number; isPr: boolean }[]
  extraCount:  number
  prExercises: { name: string; kg: number; reps: number }[]
  username:    string
  initial:     string
}

function renderSquare(p: CardProps) {
  const { nameShort, tonnage, totalSets, exercises, extraCount, prExercises, username, initial } = p
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0A0C0F', padding: '64px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', background: '#B4FF4A', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '24px' }}>F</span>
          </div>
          <span style={{ color: '#B4FF4A', fontSize: '22px', fontWeight: 900, letterSpacing: '6px' }}>FORGEIQ</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#161A21', border: '1px solid #1F242E', borderRadius: '99px', padding: '10px 20px' }}>
          <div style={{ width: '28px', height: '28px', background: '#B4FF4A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '14px' }}>{initial}</span>
          </div>
          <span style={{ color: '#9CA3AF', fontSize: '18px' }}>@{username}</span>
        </div>
      </div>
      {/* Nom */}
      <div style={{ fontSize: '76px', fontWeight: 900, color: '#F0F2F5', letterSpacing: '-3px', lineHeight: '1', marginBottom: '16px' }}>{nameShort}</div>
      <div style={{ width: '72px', height: '5px', background: '#B4FF4A', borderRadius: '99px', marginBottom: '44px' }} />
      {/* Stats */}
      <div style={{ display: 'flex', gap: '52px', marginBottom: '44px' }}>
        {tonnage != null && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '60px', fontWeight: 900, color: '#B4FF4A', letterSpacing: '-2px' }}>{fmt(tonnage)}</span>
            <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '5px', marginTop: '4px' }}>soulevés</span>
          </div>
        )}
        {totalSets != null && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '60px', fontWeight: 900, color: '#F0F2F5', letterSpacing: '-2px' }}>{totalSets}</span>
            <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '5px', marginTop: '4px' }}>séries</span>
          </div>
        )}
        {prExercises.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '60px', fontWeight: 900, color: '#F59E0B', letterSpacing: '-2px' }}>{prExercises.length} PR{prExercises.length > 1 ? 's' : ''}</span>
            <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '5px', marginTop: '4px' }}>records</span>
          </div>
        )}
      </div>
      {/* Exercices */}
      {exercises.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {exercises.map((ex, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', background: ex.isPr ? '#F59E0B12' : '#161A21', borderRadius: '14px', border: `1px solid ${ex.isPr ? '#F59E0B44' : '#1F242E'}` }}>
              <span style={{ color: '#9CA3AF', fontSize: '21px', flex: 1 }}>{abbrev(ex.name)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {ex.isPr && <span style={{ fontSize: '16px', color: '#F59E0B', background: '#F59E0B22', padding: '2px 8px', borderRadius: '6px', fontWeight: 900 }}>PR</span>}
                <span style={{ color: '#F0F2F5', fontWeight: 900, fontSize: '21px' }}>{ex.kg} kg × {ex.reps}</span>
              </div>
            </div>
          ))}
          {extraCount > 0 && (
            <div style={{ padding: '10px 22px', color: '#4B5563', fontSize: '18px', textAlign: 'center' }}>
              + {extraCount} autre{extraCount > 1 ? 's' : ''} exercice{extraCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #1F242E' }}>
        <span style={{ color: '#4B5563', fontSize: '16px' }}>getforgeiq.com</span>
        <div style={{ background: '#B4FF4A', padding: '10px 26px', borderRadius: '99px' }}>
          <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '16px' }}>Build smarter. Lift harder.</span>
        </div>
      </div>
    </div>
  )
}

function renderStory(p: CardProps) {
  const { nameShort, tonnage, totalSets, exercises, extraCount, prExercises, username, initial } = p
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: 'linear-gradient(160deg, #0A0C0F 0%, #111318 50%, #0A0C0F 100%)', padding: '80px 72px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', background: '#B4FF4A', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '30px' }}>F</span>
          </div>
          <span style={{ color: '#B4FF4A', fontSize: '26px', fontWeight: 900, letterSpacing: '7px' }}>FORGEIQ</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#161A2180', border: '1px solid #1F242E', borderRadius: '99px', padding: '12px 22px' }}>
          <div style={{ width: '32px', height: '32px', background: '#B4FF4A', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '16px' }}>{initial}</span>
          </div>
          <span style={{ color: '#9CA3AF', fontSize: '20px' }}>@{username}</span>
        </div>
      </div>
      {/* Nom */}
      <div style={{ fontSize: '100px', fontWeight: 900, color: '#F0F2F5', letterSpacing: '-4px', lineHeight: '0.95', marginBottom: '24px' }}>{nameShort}</div>
      <div style={{ width: '80px', height: '6px', background: '#B4FF4A', borderRadius: '99px', marginBottom: '72px' }} />
      {/* Stats */}
      <div style={{ display: 'flex', gap: '64px', marginBottom: '72px' }}>
        {tonnage != null && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '80px', fontWeight: 900, color: '#B4FF4A', letterSpacing: '-3px' }}>{fmt(tonnage)}</span>
            <span style={{ fontSize: '14px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '6px', marginTop: '6px' }}>soulevés</span>
          </div>
        )}
        {totalSets != null && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '80px', fontWeight: 900, color: '#F0F2F5', letterSpacing: '-3px' }}>{totalSets}</span>
            <span style={{ fontSize: '14px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '6px', marginTop: '6px' }}>séries</span>
          </div>
        )}
      </div>
      {/* Exercices */}
      {exercises.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {exercises.map((ex, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 30px', background: ex.isPr ? '#F59E0B10' : '#161A21', borderRadius: '20px', border: `1px solid ${ex.isPr ? '#F59E0B55' : '#1F242E'}` }}>
              <span style={{ color: '#9CA3AF', fontSize: '26px', flex: 1 }}>{abbrev(ex.name, 26)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {ex.isPr && <span style={{ fontSize: '18px', color: '#F59E0B', background: '#F59E0B22', padding: '4px 12px', borderRadius: '8px', fontWeight: 900 }}>PR</span>}
                <span style={{ color: '#F0F2F5', fontWeight: 900, fontSize: '26px' }}>{ex.kg} kg × {ex.reps}</span>
              </div>
            </div>
          ))}
          {extraCount > 0 && (
            <div style={{ padding: '14px 30px', color: '#4B5563', fontSize: '22px', textAlign: 'center' }}>
              + {extraCount} autre{extraCount > 1 ? 's' : ''} exercice{extraCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
      {/* PRs section */}
      {prExercises.length > 0 && (
        <div style={{ marginTop: '48px', padding: '28px', background: '#F59E0B10', borderRadius: '20px', border: '1px solid #F59E0B33' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '28px' }}>🏆</span>
            <span style={{ color: '#F59E0B', fontWeight: 900, fontSize: '22px' }}>
              {prExercises.length} nouveau{prExercises.length > 1 ? 'x' : ''} record{prExercises.length > 1 ? 's' : ''}
            </span>
          </div>
          {prExercises.map((pr, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#D1D5DB', fontSize: '20px' }}>{abbrev(pr.name, 26)}</span>
              <span style={{ color: '#F59E0B', fontWeight: 900, fontSize: '20px' }}>{pr.kg} kg</span>
            </div>
          ))}
        </div>
      )}
      {/* Spacer */}
      <div style={{ flex: 1 }} />
      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '40px', borderTop: '1px solid #1F242E' }}>
        <span style={{ color: '#4B5563', fontSize: '20px' }}>getforgeiq.com</span>
        <div style={{ background: '#B4FF4A', padding: '14px 32px', borderRadius: '99px' }}>
          <span style={{ color: '#0A0C0F', fontWeight: 900, fontSize: '18px' }}>Build smarter. Lift harder.</span>
        </div>
      </div>
    </div>
  )
}
