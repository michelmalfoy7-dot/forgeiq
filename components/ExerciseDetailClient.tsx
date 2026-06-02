'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Dumbbell } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Alias {
  alias: string
  brand: string | null
  alias_type: string
}

interface LastSet {
  weight_kg: number
  reps: number
  set_date: string
  is_pr: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExerciseRow = Record<string, any>

interface Props {
  exercise: ExerciseRow
  aliases: Alias[]
  lastPerformance: LastSet[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFF_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Débutant',        color: '#22C55E' },
  2: { label: 'Facile',          color: '#84CC16' },
  3: { label: 'Intermédiaire',   color: '#EAB308' },
  4: { label: 'Difficile',       color: '#F97316' },
  5: { label: 'Expert',          color: '#EF4444' },
}

const DIFF_COLORS = ['', '#22C55E', '#84CC16', '#EAB308', '#F97316', '#EF4444']

const CAT_COLORS: Record<string, string> = {
  compound:  '#3D8BFF',
  isolation: '#B4FF4A',
  cardio:    '#FF6B35',
  mobility:  '#A855F7',
}

const EQ_LABEL: Record<string, string> = {
  barbell:          'Barre',
  dumbbell:         'Haltères',
  cable:            'Câble',
  machine:          'Machine',
  bodyweight:       'Poids de corps',
  kettlebell:       'Kettlebell',
  band:             'Élastique',
  plate_loaded:     'Plate-Loaded',
  cable_functional: 'Câble fonctionnel',
  hammer_strength:  'Hammer Strength',
  technogym:        'Technogym',
  matrix:           'Matrix',
}

const FORCE_LABEL: Record<string, string> = {
  push:         'Poussée',
  pull:         'Tirage',
  hinge:        'Charnière',
  squat:        'Squat',
  carry:        'Portée',
  rotation:     'Rotation',
  isometric:    'Isométrique',
  static:       'Statique',
}

const BRAND_BADGE: Record<string, { label: string; color: string }> = {
  hammer_strength: { label: 'Hammer Strength', color: '#DC2626' },
  iliac:           { label: 'Iliac',           color: '#7C3AED' },
  gym80:           { label: 'GYM80',           color: '#D97706' },
  technogym:       { label: 'Technogym',       color: '#0284C7' },
  matrix:          { label: 'Matrix',          color: '#16A34A' },
  life_fitness:    { label: 'Life Fitness',    color: '#EA580C' },
  precor:          { label: 'Precor',          color: '#2563EB' },
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: i <= level ? DIFF_COLORS[level] : 'var(--fiq-border)' }}
        />
      ))}
    </div>
  )
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso))
}

// Grouper les sets par date de séance (regrouper par jour)
function groupSetsByDate(sets: LastSet[]) {
  const groups: { date: string; sets: LastSet[] }[] = []
  for (const s of sets) {
    const day = s.set_date.split('T')[0]
    const existing = groups.find(g => g.date === day)
    if (existing) existing.sets.push(s)
    else groups.push({ date: day, sets: [s] })
  }
  return groups
}

// ─── Composant principal ───────────────────────────────────────────────────────
export function ExerciseDetailClient({ exercise, aliases, lastPerformance }: Props) {
  const router = useRouter()

  const diff = DIFF_LABELS[exercise.difficulty as number] ?? DIFF_LABELS[3]
  const catColor = CAT_COLORS[exercise.category as string] ?? 'var(--fiq-muted)'

  // Trouver la marque principale
  const primaryBrand = aliases.find(a => a.alias_type === 'brand' && a.brand && BRAND_BADGE[a.brand])?.brand ?? null
  const brandInfo = primaryBrand ? BRAND_BADGE[primaryBrand] : null

  // PR absolu (meilleur set de tous les temps)
  const pr = lastPerformance.reduce<{ weight_kg: number; reps: number } | null>((best, s) => {
    if (!best) return s
    if (s.weight_kg > best.weight_kg) return s
    if (s.weight_kg === best.weight_kg && s.reps > best.reps) return s
    return best
  }, null)

  const sessionGroups = groupSetsByDate(lastPerformance).slice(0, 3)

  const muscles = (exercise.muscle_primary as string[]) ?? []
  const secondary = (exercise.muscle_secondary as string[]) ?? []

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 px-4 pt-safe pb-3" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--fiq-border)' }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-semibold mb-3"
          style={{ color: 'var(--fiq-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Exercices
        </button>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black leading-tight" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.02em' }}>
              {exercise.name_fr as string}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              {exercise.name as string}
            </p>
          </div>
          <DifficultyDots level={exercise.difficulty as number} />
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">

        {/* ── Méta badges ── */}
        <div className="flex flex-wrap gap-2">
          {/* Catégorie */}
          <span
            className="text-xs font-black px-3 py-1 rounded-full"
            style={{ background: catColor + '22', color: catColor, border: `1px solid ${catColor}44` }}
          >
            {exercise.category === 'compound' ? 'Composé'
              : exercise.category === 'isolation' ? 'Isolation'
              : exercise.category === 'cardio' ? 'Cardio'
              : exercise.category === 'mobility' ? 'Mobilité'
              : exercise.category as string}
          </span>

          {/* Équipement */}
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: 'var(--fiq-card)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
          >
            <Dumbbell className="w-3 h-3 inline mr-1 -mt-0.5" />
            {EQ_LABEL[exercise.equipment as string] ?? (exercise.equipment as string)}
          </span>

          {/* Force type */}
          {exercise.force_type && (
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: 'var(--fiq-card)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
            >
              {FORCE_LABEL[exercise.force_type as string] ?? (exercise.force_type as string)}
            </span>
          )}

          {/* Difficulté */}
          <span
            className="text-xs font-black px-3 py-1 rounded-full"
            style={{ background: diff.color + '22', color: diff.color, border: `1px solid ${diff.color}44` }}
          >
            {diff.label}
          </span>

          {/* Unilatéral */}
          {exercise.is_unilateral && (
            <span
              className="text-xs font-black px-3 py-1 rounded-full"
              style={{ background: '#3D8BFF22', color: '#3D8BFF', border: '1px solid #3D8BFF44' }}
            >
              Unilatéral
            </span>
          )}

          {/* Badge marque */}
          {brandInfo && (
            <span
              className="text-xs font-black px-3 py-1 rounded-full"
              style={{ background: brandInfo.color + '22', color: brandInfo.color, border: `1px solid ${brandInfo.color}44` }}
            >
              {brandInfo.label}
            </span>
          )}
        </div>

        {/* ── Muscles ── */}
        <div className="fiq-card space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--fiq-muted)' }}>
              Muscles principaux
            </p>
            <div className="flex flex-wrap gap-1.5">
              {muscles.map(m => (
                <span
                  key={m}
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: catColor + '22', color: catColor, border: `1px solid ${catColor}44` }}
                >
                  {m.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {secondary.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--fiq-muted)' }}>
                Muscles secondaires
              </p>
              <div className="flex flex-wrap gap-1.5">
                {secondary.map(m => (
                  <span
                    key={m}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--fiq-border)', color: 'var(--fiq-muted)' }}
                  >
                    {m.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── PR & dernières perfs ── */}
        {lastPerformance.length > 0 && (
          <div className="fiq-card space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--fiq-muted)' }}>
              Mes performances
            </p>

            {/* PR absolu */}
            {pr && (
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: '#B4FF4A12', border: '1px solid #B4FF4A33' }}
              >
                <Trophy className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--fiq-accent)' }}>
                    Meilleur set
                  </p>
                  <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                    {pr.weight_kg} kg × {pr.reps}
                  </p>
                </div>
              </div>
            )}

            {/* Dernières séances */}
            {sessionGroups.map(group => (
              <div key={group.date}>
                <p className="text-[10px] font-bold mb-1.5" style={{ color: 'var(--fiq-muted)' }}>
                  {formatDate(group.date + 'T00:00:00')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.sets.map((s, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1.5 rounded-xl text-sm font-black fiq-data"
                      style={{
                        background: s.is_pr ? '#B4FF4A22' : 'var(--fiq-faint)',
                        color: s.is_pr ? 'var(--fiq-accent)' : 'var(--fiq-text)',
                        border: `1px solid ${s.is_pr ? '#B4FF4A44' : 'var(--fiq-border)'}`,
                      }}
                    >
                      {s.weight_kg}kg × {s.reps}
                      {s.is_pr && <span className="ml-1 text-[10px]">🏆</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Instructions ── */}
        {exercise.instructions && (
          <div className="fiq-card space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--fiq-muted)' }}>
              Instructions
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fiq-text)', whiteSpace: 'pre-line' }}>
              {exercise.instructions as string}
            </p>
          </div>
        )}

        {/* ── Tips ── */}
        {exercise.tips && (
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: '#B4FF4A12', borderLeft: '3px solid #B4FF4A' }}
          >
            <p className="text-xs font-black mb-1" style={{ color: 'var(--fiq-accent)' }}>
              💡 Conseil de coach
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fiq-text)', whiteSpace: 'pre-line' }}>
              {exercise.tips as string}
            </p>
          </div>
        )}

        {/* ── Aliases / noms alternatifs ── */}
        {aliases.length > 0 && (
          <div className="fiq-card space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--fiq-muted)' }}>
              Aussi connu sous
            </p>
            <div className="flex flex-wrap gap-1.5">
              {aliases.map((a, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: a.alias_type === 'brand' ? 'var(--fiq-card)' : 'var(--fiq-faint)',
                    color: a.alias_type === 'brand' ? 'var(--fiq-text)' : 'var(--fiq-muted)',
                    border: '1px solid var(--fiq-border)',
                  }}
                >
                  {a.alias}
                  {a.alias_type === 'brand' && a.brand && (
                    <span className="ml-1 text-[9px] opacity-60">{a.brand.replace(/_/g, ' ')}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
