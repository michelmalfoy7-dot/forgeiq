import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Zap, Star, Target } from 'lucide-react'
import { FiqDumbbell } from '@/components/ui/FiqIcons'
import { ExerciseProgressionChart } from '@/components/exercises/ExerciseProgressionChart'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

type Props = { params: Promise<{ slug: string }> }

// ── Labels ──────────────────────────────────────────────────────────────────────
const MUSCLE_LABEL: Record<string, string> = {
  chest:          'Pectoraux',
  lats:           'Grand dorsal',
  latissimus:     'Grand dorsal',
  mid_back:       'Dos moyen',
  upper_back:     'Dos supérieur',
  lower_back:     'Bas du dos',
  front_delt:     'Delt antérieur',
  lateral_delt:   'Delt médian',
  rear_delt:      'Delt postérieur',
  shoulders:      'Épaules',
  biceps:         'Biceps',
  triceps:        'Triceps',
  forearms:       'Avant-bras',
  quads:          'Quadriceps',
  hamstrings:     'Ischio-jambiers',
  glutes:         'Fessiers',
  calves:         'Mollets',
  abs:            'Abdominaux',
  core:           'Core',
  hip_abductors:  'Abducteurs',
  hip_flexors:    'Fléchisseurs de hanche',
  traps:          'Trapèzes',
  cardio:         'Cardio',
}

const EQUIPMENT_LABEL: Record<string, string> = {
  barbell:    'Barre',
  dumbbell:   'Haltères',
  machine:    'Machine',
  cable:      'Câble',
  bodyweight: 'Poids du corps',
  band:       'Élastique',
  kettlebell: 'Kettlebell',
}

const EQUIPMENT_COLOR: Record<string, string> = {
  barbell:    '#EF4444',
  dumbbell:   '#F59E0B',
  machine:    '#A855F7',
  cable:      '#3D8BFF',
  bodyweight: '#22C55E',
  band:       '#14B8A6',
  kettlebell: '#F97316',
}

const CATEGORY_LABEL: Record<string, string> = {
  compound:  'Polyarticulaire',
  isolation: 'Isolation',
  cardio:    'Cardio',
  mobility:  'Mobilité',
}

const FORCE_LABEL: Record<string, string> = {
  push:  'Poussée',
  pull:  'Tirage',
  legs:  'Jambes',
  core:  'Gainage',
  carry: 'Portage',
}

const FORCE_EMOJI: Record<string, string> = {
  push:  '⬆',
  pull:  '⬇',
  legs:  '▽',
  core:  '◎',
  carry: '◈',
}

const DIFF_COLORS = ['', '#22C55E', '#84CC16', '#EAB308', '#F97316', '#EF4444']
const DIFF_LABEL  = ['', 'Débutant', 'Facile', 'Intermédiaire', 'Difficile', 'Expert']

// ── Metadata dynamique ──────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: ex } = await supabase
    .from('exercises_library')
    .select('name, name_fr, muscle_primary, equipment')
    .eq('slug', slug)
    .maybeSingle()

  if (!ex) return { title: 'Exercice — ForgeIQ' }

  const name    = ex.name_fr ?? ex.name
  const muscles = (ex.muscle_primary ?? []).map((m: string) => MUSCLE_LABEL[m] ?? m).join(', ')
  const equip   = EQUIPMENT_LABEL[ex.equipment] ?? ex.equipment

  return {
    title: `${name} — Technique & instructions`,
    description: `Guide complet pour ${name} : technique, muscles travaillés (${muscles}), équipement ${equip}. Instructions détaillées sur ForgeIQ.`,
    alternates: { canonical: `${APP_URL}/exercises/${slug}` },
    openGraph: {
      title: `${name} — ForgeIQ`,
      description: `Muscles ciblés : ${muscles}. Technique, instructions et conseils.`,
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  }
}

// ── Page principale ─────────────────────────────────────────────────────────────
export default async function ExerciseDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Charger l'exercice
  const { data: ex } = await supabase
    .from('exercises_library')
    .select('id, name, name_fr, slug, muscle_primary, muscle_secondary, equipment, category, force_type, difficulty, instructions, tips, video_url')
    .eq('slug', slug)
    .maybeSingle()

  if (!ex) notFound()

  // Calcul de la date limite 52 semaines (1 an)
  const oneYearAgo = new Date(Date.now() - 364 * 86400000).toISOString()

  // Charger PRs + historique + top sets progression + sets 52 semaines (stats) en parallèle
  const [{ data: prs }, { data: rawSets }, { data: topSetsRaw }, { data: statSetsRaw }] = await Promise.all([
    supabase
      .from('personal_records')
      .select('record_type, value, achieved_date')
      .eq('user_id', user.id)
      .eq('exercise_id', ex.id)
      .in('record_type', ['top_set', '1rm_estimated']),

    supabase
      .from('workout_sets')
      .select('set_number, weight_kg, reps, is_warmup, workout_id, workouts(completed_at, session_name)')
      .eq('exercise_id', ex.id)
      .eq('user_id', user.id)
      .eq('is_warmup', false)
      .order('workout_id', { ascending: false })
      .limit(30),

    // Top sets des 52 dernières semaines (1 an) pour le graphique de progression
    supabase
      .from('workout_sets')
      .select('weight_kg, reps, created_at, workouts(completed_at)')
      .eq('exercise_id', ex.id)
      .in('set_type', ['top_set', 'work'])
      .not('workouts', 'is', null)
      .gte('created_at', oneYearAgo)
      .order('created_at', { ascending: true })
      .limit(200),

    // Tous les working sets 52 semaines pour les statistiques globales
    supabase
      .from('workout_sets')
      .select('workout_id, weight_kg, reps, created_at, workouts(completed_at)')
      .eq('exercise_id', ex.id)
      .eq('user_id', user.id)
      .eq('is_warmup', false)
      .not('workouts', 'is', null)
      .gte('created_at', oneYearAgo)
      .limit(2000),
  ])

  // Grouper les sets par séance → max 3 dernières séances
  type RawSet = {
    set_number: number
    weight_kg: number | null
    reps: number | null
    is_warmup: boolean
    workout_id: string
    workouts: { completed_at: string | null; session_name: string | null } | null
  }

  const sessionMap = new Map<string, { date: string | null; name: string | null; sets: RawSet[] }>()
  for (const s of (rawSets ?? []) as unknown as RawSet[]) {
    if (!s.workout_id) continue
    if (!sessionMap.has(s.workout_id)) {
      const w = s.workouts as { completed_at: string | null; session_name: string | null } | null
      sessionMap.set(s.workout_id, { date: w?.completed_at ?? null, name: w?.session_name ?? null, sets: [] })
    }
    sessionMap.get(s.workout_id)!.sets.push(s)
  }

  const recentSessions = [...sessionMap.values()]
    .filter(s => s.date)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
    .slice(0, 3)

  const prTopSet = prs?.find(p => p.record_type === 'top_set')
  const pr1RM    = prs?.find(p => p.record_type === '1rm_estimated')

  // Préparer les données du graphique de progression
  type TopSetRaw = {
    weight_kg: number | null
    reps: number | null
    created_at: string
    workouts: { completed_at: string | null } | null
  }
  const progressionData = (topSetsRaw ?? [] as TopSetRaw[]).reduce<{ date: string; poids: number }[]>((acc, s) => {
    const raw = s as unknown as TopSetRaw
    const dateStr = (raw.workouts?.completed_at ?? raw.created_at)
    if (!raw.weight_kg || !dateStr) return acc
    // Sur 52 semaines : format MMM AA (ex: "Jan 25") — plus lisible sur un axe long
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(new Date(dateStr))
    acc.push({ date: label, poids: raw.weight_kg })
    return acc
  }, [])

  // ── Calcul statistiques globales 52 semaines ────────────────────────────────────
  type StatSet = {
    workout_id: string | null
    weight_kg: number | null
    reps: number | null
    created_at: string
    workouts: { completed_at: string | null } | null
  }

  const statSets = (statSetsRaw ?? []) as unknown as StatSet[]

  // 1. Volume total (weight × reps, tous les working sets)
  const totalVolume = statSets.reduce((sum, s) => {
    if (!s.weight_kg || !s.reps) return sum
    return sum + s.weight_kg * s.reps
  }, 0)

  // 2. Fréquence 30 derniers jours (séances distinctes par workout_id)
  const thirtyDaysAgo = Date.now() - 30 * 86400000
  const workoutIds30d = new Set<string>()
  for (const s of statSets) {
    if (!s.workout_id) continue
    const dateMs = new Date(s.workouts?.completed_at ?? s.created_at).getTime()
    if (dateMs >= thirtyDaysAgo) workoutIds30d.add(s.workout_id)
  }
  const freqMonthly = workoutIds30d.size

  // 3. Meilleure séance — tonnage max en une seule séance (SUM weight×reps par workout_id)
  const tonnageByWorkout = new Map<string, number>()
  for (const s of statSets) {
    if (!s.workout_id || !s.weight_kg || !s.reps) continue
    tonnageByWorkout.set(s.workout_id, (tonnageByWorkout.get(s.workout_id) ?? 0) + s.weight_kg * s.reps)
  }
  const bestSession = tonnageByWorkout.size > 0
    ? Math.max(...tonnageByWorkout.values())
    : 0

  // 4. Streak — semaines ISO consécutives avec au moins 1 set (depuis aujourd'hui vers le passé)
  const getISOWeek = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const day = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
  }

  const weeksWithSets = new Set<string>()
  for (const s of statSets) {
    const dateStr = s.workouts?.completed_at ?? s.created_at
    weeksWithSets.add(getISOWeek(new Date(dateStr)))
  }

  // Compter les semaines consécutives depuis la semaine courante vers le passé
  let streak = 0
  const now = new Date()
  let checkDate = new Date(now)
  // Si la semaine courante n'a pas de set, commencer à la semaine précédente
  const currentWeek = getISOWeek(now)
  if (!weeksWithSets.has(currentWeek)) {
    checkDate.setDate(checkDate.getDate() - 7)
  }
  for (let i = 0; i < 52; i++) {
    const week = getISOWeek(checkDate)
    if (!weeksWithSets.has(week)) break
    streak++
    checkDate.setDate(checkDate.getDate() - 7)
  }

  // Formatage des nombres pour l'affichage
  const fmtVolume = (v: number): string => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} M`
    if (v >= 1_000) return `${Math.round(v / 1_000)} k`
    return String(Math.round(v))
  }

  const hasStats = totalVolume > 0 || freqMonthly > 0 || bestSession > 0 || streak > 0

  const name      = ex.name_fr ?? ex.name
  const eqColor   = EQUIPMENT_COLOR[ex.equipment] ?? 'var(--fiq-muted)'
  const eqLabel   = EQUIPMENT_LABEL[ex.equipment] ?? ex.equipment
  const diffColor = DIFF_COLORS[ex.difficulty ?? 0] ?? 'var(--fiq-muted)'

  function fmtDate(iso: string | null) {
    if (!iso) return ''
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

      {/* Retour */}
      <div className="pt-2">
        <Link
          href="/exercises"
          className="text-xs font-semibold flex items-center gap-1"
          style={{ color: 'var(--fiq-muted)' }}
        >
          ← Exercices
        </Link>
      </div>

      {/* ── Header ── */}
      <div className="fiq-card space-y-3">
        <div>
          <h1 className="text-2xl font-black leading-tight" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            {name}
          </h1>
          {ex.name_fr && ex.name !== ex.name_fr && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{ex.name}</p>
          )}
        </div>

        {/* Vidéo démo — affichée uniquement si video_url défini */}
        {ex.video_url && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={ex.video_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full rounded-2xl"
            style={{ maxHeight: '200px', objectFit: 'cover', background: 'var(--fiq-faint)' }}
          />
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: eqColor + '20', color: eqColor, border: `1px solid ${eqColor}44` }}
          >
            {eqLabel}
          </span>
          {ex.category && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: '#3D8BFF20', color: '#3D8BFF', border: '1px solid #3D8BFF44' }}
            >
              {CATEGORY_LABEL[ex.category] ?? ex.category}
            </span>
          )}
          {ex.force_type && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: '#B4FF4A15', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A30' }}
            >
              {FORCE_EMOJI[ex.force_type]} {FORCE_LABEL[ex.force_type] ?? ex.force_type}
            </span>
          )}
          {ex.difficulty && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
              style={{ background: diffColor + '20', color: diffColor, border: `1px solid ${diffColor}44` }}
            >
              <span className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: i <= ex.difficulty ? diffColor : diffColor + '30' }}
                  />
                ))}
              </span>
              {DIFF_LABEL[ex.difficulty]}
            </span>
          )}
        </div>
      </div>

      {/* ── Muscles ciblés ── */}
      {((ex.muscle_primary ?? []).length > 0 || (ex.muscle_secondary ?? []).length > 0) && (
        <div className="fiq-card space-y-3">
          <p className="text-xs font-black uppercase" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
            Muscles ciblés
          </p>
          {(ex.muscle_primary ?? []).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--fiq-muted)' }}>Principaux</p>
              <div className="flex flex-wrap gap-2">
                {(ex.muscle_primary as string[]).map((m) => (
                  <span
                    key={m}
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: '#B4FF4A20', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A40' }}
                  >
                    {MUSCLE_LABEL[m] ?? m}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(ex.muscle_secondary ?? []).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--fiq-muted)' }}>Secondaires</p>
              <div className="flex flex-wrap gap-2">
                {(ex.muscle_secondary as string[]).map((m) => (
                  <span
                    key={m}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
                  >
                    {MUSCLE_LABEL[m] ?? m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Instructions ── */}
      {ex.instructions && (
        <div className="fiq-card space-y-3">
          <p className="text-xs font-black uppercase" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
            Technique
          </p>
          <ol className="space-y-2.5 list-none">
            {ex.instructions
              .split(/\.\s+/)
              .map((s: string) => s.trim())
              .filter(Boolean)
              .map((step: string, i: number) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                    style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--fiq-text)' }}>
                    {step.endsWith('.') ? step : step + '.'}
                  </p>
                </li>
              ))}
          </ol>
        </div>
      )}

      {/* ── Conseil pro ── */}
      {ex.tips && (
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: '#B4FF4A08', border: '1px solid #B4FF4A25' }}
        >
          <p className="text-xs font-black uppercase flex items-center gap-1.5" style={{ color: 'var(--fiq-accent)', letterSpacing: '0.08em' }}>
            <Zap className="w-3.5 h-3.5" /> Conseil pro
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fiq-text)' }}>
            {ex.tips}
          </p>
        </div>
      )}

      {/* ── Mes performances ── */}
      {(prTopSet || pr1RM || recentSessions.length > 0) && (
        <div className="fiq-card space-y-4">
          <p className="text-xs font-black uppercase" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
            Mes performances
          </p>

          {/* PRs */}
          {(prTopSet || pr1RM) && (
            <div className="grid grid-cols-2 gap-3">
              {prTopSet && (
                <div
                  className="rounded-xl p-3 text-center"
                  style={{ background: '#B4FF4A10', border: '1px solid #B4FF4A25' }}
                >
                  <p className="text-[10px] font-black uppercase mb-1 flex items-center justify-center gap-1" style={{ color: 'var(--fiq-accent)', letterSpacing: '0.08em' }}>
                    <Star className="w-3 h-3" /> Top Set
                  </p>
                  <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                    {prTopSet.value}
                    <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--fiq-muted)' }}>kg</span>
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                    {fmtDate(prTopSet.achieved_date)}
                  </p>
                </div>
              )}
              {pr1RM && (
                <div
                  className="rounded-xl p-3 text-center"
                  style={{ background: '#3D8BFF10', border: '1px solid #3D8BFF25' }}
                >
                  <p className="text-[10px] font-black uppercase mb-1 flex items-center justify-center gap-1" style={{ color: '#3D8BFF', letterSpacing: '0.08em' }}>
                    <Target className="w-3 h-3" /> 1RM estimé
                  </p>
                  <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                    {Math.round(Number(pr1RM.value))}
                    <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--fiq-muted)' }}>kg</span>
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                    {fmtDate(pr1RM.achieved_date)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Historique */}
          {recentSessions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--fiq-muted)' }}>
                Dernières séances
              </p>
              {recentSessions.map((session, si) => (
                <div
                  key={si}
                  className="rounded-xl p-3 space-y-2"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold" style={{ color: 'var(--fiq-text)' }}>
                      {session.name ?? 'Séance libre'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                      {fmtDate(session.date)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {session.sets
                      .sort((a, b) => a.set_number - b.set_number)
                      .map((s, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                          style={{
                            background: 'var(--bg)',
                            color: 'var(--fiq-text)',
                            border: '1px solid var(--fiq-border)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {s.weight_kg ?? '—'}kg × {s.reps ?? '—'}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Graphique progression top sets — 52 semaines ── */}
      {progressionData.length >= 3 && (
        <ExerciseProgressionChart data={progressionData} />
      )}

      {/* ── Statistiques globales 52 semaines ── */}
      {hasStats && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase px-1" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
            Statistiques
          </p>
          <div className="grid grid-cols-2 gap-2">
            {/* Volume total */}
            <div className="fiq-card p-3 space-y-1">
              <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-text)', lineHeight: 1 }}>
                {fmtVolume(totalVolume)}{' '}
                <span className="text-xs font-normal" style={{ color: 'var(--fiq-muted)' }}>kg</span>
              </p>
              <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
                Volume total
              </p>
            </div>

            {/* Fréquence 30j */}
            <div className="fiq-card p-3 space-y-1">
              <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-text)', lineHeight: 1 }}>
                {freqMonthly}
                <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--fiq-muted)' }}>×/mois</span>
              </p>
              <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
                Fréquence 30j
              </p>
            </div>

            {/* Meilleure séance */}
            <div className="fiq-card p-3 space-y-1">
              <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-text)', lineHeight: 1 }}>
                {fmtVolume(bestSession)}{' '}
                <span className="text-xs font-normal" style={{ color: 'var(--fiq-muted)' }}>kg</span>
              </p>
              <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
                Meilleure séance
              </p>
            </div>

            {/* Streak semaines */}
            <div className="fiq-card p-3 space-y-1">
              <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-text)', lineHeight: 1 }}>
                {streak}
                <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--fiq-muted)' }}>sem.</span>
              </p>
              <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
                Streak actuel
              </p>
            </div>
          </div>
        </div>
      )}

      {/* État vide */}
      {!prTopSet && !pr1RM && recentSessions.length === 0 && (
        <div className="fiq-card text-center py-6">
          <div className="flex justify-center mb-2">
            <FiqDumbbell size={32} style={{ color: 'var(--fiq-muted)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--fiq-muted)' }}>
            Aucune donnée encore
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
            Lance une séance avec cet exercice pour voir tes stats ici.
          </p>
        </div>
      )}
    </div>
  )
}
