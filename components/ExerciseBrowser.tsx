'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, X, Dumbbell, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExerciseAlias {
  alias: string
  brand: string | null
  alias_type: string
}

export interface Exercise {
  id: string
  name: string
  name_fr: string
  slug: string
  muscle_primary: string[]
  muscle_secondary: string[]
  equipment: string
  category: string
  force_type: string
  difficulty: number
  instructions: string
  tips: string
  is_unilateral?: boolean
  aliases?: ExerciseAlias[]
}

interface Props {
  exercises: Exercise[]
}

// ─── Normalisation texte pour la recherche ─────────────────────────────────────
// Supprime accents, tirets, espaces multiples → chaîne minuscule simple
function normalizeStr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // supprimer diacritiques
    .replace(/[-_]/g, ' ')              // tiret/underscore → espace
    .replace(/[^a-z0-9 ]/gi, '')        // supprimer ponctuation
    .replace(/\s+/g, ' ')               // espaces multiples → 1
    .trim()
    .toLowerCase()
}

// Priorité de match : 0 = meilleur, 99 = aucun match
function scoreExercise(ex: Exercise, query: string): number {
  if (!query) return 0
  const q = normalizeStr(query)
  if (!q) return 0

  const nameFr   = normalizeStr(ex.name_fr)
  const nameEn   = normalizeStr(ex.name)
  const muscles  = [...ex.muscle_primary, ...ex.muscle_secondary].map(normalizeStr)
  const aliases  = (ex.aliases ?? []).map(a => normalizeStr(a.alias))

  // Exact match nom FR
  if (nameFr === q)                                    return 1
  // Exact match nom EN
  if (nameEn === q)                                    return 2
  // Exact match alias
  if (aliases.some(a => a === q))                      return 3
  // Commence par query (nom FR)
  if (nameFr.startsWith(q))                            return 4
  // Commence par query (alias)
  if (aliases.some(a => a.startsWith(q)))              return 5
  // Contient (nom FR)
  if (nameFr.includes(q))                              return 6
  // Contient (alias)
  if (aliases.some(a => a.includes(q)))                return 7
  // Contient (nom EN)
  if (nameEn.includes(q))                              return 8
  // Contient (muscles)
  if (muscles.some(m => m.includes(q)))                return 9
  // Chaque mot du query dans le nom
  const words = q.split(' ').filter(Boolean)
  if (words.every(w => nameFr.includes(w) || nameEn.includes(w) || aliases.some(a => a.includes(w)))) return 10

  return 99 // pas de match
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MUSCLE_GROUPS = [
  { id: 'all',           label: 'Tout',           emoji: '⚡' },
  { id: 'chest',         label: 'Pectoraux',      emoji: '🫀' },
  { id: 'latissimus',    label: 'Dorsaux',        emoji: '🏋️' },
  { id: 'mid_back',      label: 'Dos milieu',     emoji: '↔' },
  { id: 'upper_back',    label: 'Dos haut',       emoji: '🔺' },
  { id: 'front_delt',    label: 'Ép. avant',      emoji: '⬆' },
  { id: 'lateral_delt',  label: 'Ép. lat.',       emoji: '↔' },
  { id: 'rear_delt',     label: 'Ép. arr.',       emoji: '⬇' },
  { id: 'biceps',        label: 'Biceps',         emoji: '💪' },
  { id: 'triceps',       label: 'Triceps',        emoji: '💪' },
  { id: 'forearms',      label: 'Avant-bras',     emoji: '🤜' },
  { id: 'quads',         label: 'Quadriceps',     emoji: '🦵' },
  { id: 'hamstrings',    label: 'Ischio',         emoji: '🦵' },
  { id: 'glutes',        label: 'Fessiers',       emoji: '🍑' },
  { id: 'calves',        label: 'Mollets',        emoji: '🦶' },
  { id: 'abs',           label: 'Abdos',          emoji: '⬛' },
  { id: 'core',          label: 'Core',           emoji: '🎯' },
  { id: 'lower_back',    label: 'Bas du dos',     emoji: '🟩' },
  { id: 'traps',         label: 'Trapèzes',       emoji: '▲' },
  { id: 'hip_abductors', label: 'Abducteurs',     emoji: '↔' },
  { id: 'cardio',        label: 'Cardio',         emoji: '❤️' },
]

const EQUIPMENT_OPTIONS = [
  { id: 'all',              label: 'Tout',              color: 'var(--fiq-muted)' },
  { id: 'barbell',          label: 'Barre',             color: '#EF4444' },
  { id: 'dumbbell',         label: 'Haltères',          color: '#F59E0B' },
  { id: 'cable',            label: 'Câble',             color: '#3D8BFF' },
  { id: 'machine',          label: 'Machine',           color: '#A855F7' },
  { id: 'plate_loaded',     label: 'Plate-Loaded',      color: '#EC4899' },
  { id: 'bodyweight',       label: 'Corps',             color: '#22C55E' },
  { id: 'kettlebell',       label: 'Kettlebell',        color: '#F97316' },
  { id: 'band',             label: 'Élastique',         color: '#14B8A6' },
  { id: 'cable_functional', label: 'Fonctionnel',       color: '#6366F1' },
  { id: 'hammer_strength',  label: 'Hammer S.',         color: '#DC2626' },
]

const CATEGORY_OPTIONS = [
  { id: 'all',       label: 'Tout',     color: 'var(--fiq-muted)' },
  { id: 'compound',  label: 'Composé',  color: '#3D8BFF' },
  { id: 'isolation', label: 'Isolation',color: '#B4FF4A' },
  { id: 'cardio',    label: 'Cardio',   color: '#FF6B35' },
  { id: 'mobility',  label: 'Mobilité', color: '#A855F7' },
]

const EQUIPMENT_LABEL: Record<string, string> = {
  barbell:          'Barre',
  dumbbell:         'Haltères',
  cable:            'Câble',
  machine:          'Machine',
  bodyweight:       'Corps',
  kettlebell:       'Kettlebell',
  band:             'Élastique',
  plate_loaded:     'Plate-Loaded',
  cable_functional: 'Fonctionnel',
  hammer_strength:  'Hammer S.',
  technogym:        'Technogym',
  matrix:           'Matrix',
}

const BRAND_BADGE: Record<string, { label: string; color: string }> = {
  hammer_strength: { label: 'HS',         color: '#DC2626' },
  iliac:           { label: 'Iliac',      color: '#7C3AED' },
  gym80:           { label: 'GYM80',      color: '#D97706' },
  technogym:       { label: 'Technogym',  color: '#0284C7' },
  matrix:          { label: 'Matrix',     color: '#16A34A' },
  life_fitness:    { label: 'LifeFit',    color: '#EA580C' },
  precor:          { label: 'Precor',     color: '#2563EB' },
}

// ─── Difficulté en points colorés ─────────────────────────────────────────────
const DIFF_COLORS = ['', '#22C55E', '#84CC16', '#EAB308', '#F97316', '#EF4444']

function DifficultyDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: i <= level ? DIFF_COLORS[level] : 'var(--fiq-border)' }}
        />
      ))}
    </div>
  )
}

// ─── Badge marque (gym) ────────────────────────────────────────────────────────
function BrandBadge({ exercise }: { exercise: Exercise }) {
  // Chercher si l'exercice a un alias de type brand
  const brand = exercise.aliases?.find(a => a.alias_type === 'brand' && a.brand && BRAND_BADGE[a.brand])?.brand
  if (!brand || !BRAND_BADGE[brand]) return null
  const { label, color } = BRAND_BADGE[brand]
  return (
    <span
      className="text-[9px] font-black px-1.5 py-0.5 rounded-md"
      style={{ background: color + '22', color, border: `1px solid ${color}44`, letterSpacing: '0.04em' }}
    >
      {label}
    </span>
  )
}

// ─── ExerciseCard ──────────────────────────────────────────────────────────────
function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const catColor = CATEGORY_OPTIONS.find(c => c.id === exercise.category)?.color ?? 'var(--fiq-muted)'
  const eqColor  = EQUIPMENT_OPTIONS.find(e => e.id === exercise.equipment)?.color ?? 'var(--fiq-muted)'
  const eqLabel  = EQUIPMENT_LABEL[exercise.equipment] ?? exercise.equipment

  return (
    <Link
      href={`/exercises/${exercise.slug}`}
      className="flex items-center gap-3 rounded-2xl p-4 transition-all active:scale-[0.98]"
      style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
    >
      {/* Info principale */}
      <div className="flex-1 min-w-0">
        {/* Ligne 1 : nom FR + badge marque */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-black text-sm leading-tight" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.01em' }}>
            {exercise.name_fr}
          </p>
          <BrandBadge exercise={exercise} />
          {exercise.is_unilateral && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-md"
              style={{ background: '#3D8BFF22', color: '#3D8BFF', border: '1px solid #3D8BFF44' }}
            >
              1 bras
            </span>
          )}
        </div>

        {/* Ligne 2 : nom EN (discret) */}
        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--fiq-muted)' }}>
          {exercise.name}
        </p>

        {/* Ligne 3 : muscles + équipement */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {exercise.muscle_primary.slice(0, 2).map(m => (
            <span
              key={m}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: catColor + '22', color: catColor }}
            >
              {m.replace(/_/g, ' ')}
            </span>
          ))}
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: eqColor + '18', color: eqColor }}
          >
            {eqLabel}
          </span>
        </div>
      </div>

      {/* Méta droite */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <DifficultyDots level={exercise.difficulty} />
        <ChevronRight className="w-4 h-4 mt-0.5" style={{ color: 'var(--fiq-border)' }} />
      </div>
    </Link>
  )
}

// ─── ExerciseBrowser principal ─────────────────────────────────────────────────
export function ExerciseBrowser({ exercises }: Props) {
  const [search, setSearch]       = useState('')
  const [muscle, setMuscle]       = useState('all')
  const [equipment, setEquipment] = useState('all')
  const [category, setCategory]   = useState('all')
  const [showMore, setShowMore]   = useState(false) // filtres supplémentaires

  const resetFilters = useCallback(() => {
    setMuscle('all'); setEquipment('all'); setCategory('all')
  }, [])

  // Comptage exercices par muscle (pour badges de comptage)
  const muscleCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    exercises.forEach(ex => {
      ex.muscle_primary.forEach(m => { counts[m] = (counts[m] ?? 0) + 1 })
    })
    return counts
  }, [exercises])

  // Filtrage + scoring
  const filtered = useMemo(() => {
    const q = normalizeStr(search)
    const results: { ex: Exercise; score: number }[] = []

    for (const ex of exercises) {
      // Filtres statiques
      if (muscle !== 'all' && !ex.muscle_primary.includes(muscle) && !ex.muscle_secondary.includes(muscle)) continue
      if (equipment !== 'all' && ex.equipment !== equipment) continue
      if (category !== 'all' && ex.category !== category) continue

      // Score de recherche
      const score = scoreExercise(ex, q)
      if (score === 99) continue // aucun match

      results.push({ ex, score })
    }

    // Trier : score croissant (meilleur en premier), puis alphabétique FR
    results.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      return a.ex.name_fr.localeCompare(b.ex.name_fr, 'fr')
    })

    return results.map(r => r.ex)
  }, [exercises, search, muscle, equipment, category])

  const activeFilters = [muscle !== 'all', equipment !== 'all', category !== 'all'].filter(Boolean).length

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>

      {/* ── Header sticky ── */}
      <div
        className="sticky top-0 z-10 pt-safe px-4 pb-2"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--fiq-border)' }}
      >
        {/* Titre */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black leading-none" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
              Exercices
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              <span style={{ color: 'var(--fiq-accent)', fontWeight: 800 }}>{filtered.length}</span>
              {' '}/ {exercises.length}
            </p>
          </div>

          {/* Bouton filtres supplémentaires */}
          <button
            onClick={() => setShowMore(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{
              background: activeFilters > 0 ? '#B4FF4A22' : 'var(--fiq-card)',
              border: `1px solid ${activeFilters > 0 ? '#B4FF4A66' : 'var(--fiq-border)'}`,
              color: activeFilters > 0 ? '#B4FF4A' : 'var(--fiq-muted)',
            }}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            {activeFilters > 0 ? `Filtres (${activeFilters})` : 'Filtres'}
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          <input
            type="search"
            placeholder="rdl, iliac, pec deck, hammer chest…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
            </button>
          )}
        </div>

        {/* Filtres dépliables */}
        {showMore && (
          <div className="mt-3 space-y-3 pb-2">
            {/* Équipement */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--fiq-muted)' }}>
                Équipement
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {EQUIPMENT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setEquipment(opt.id)}
                    className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                    style={{
                      background: equipment === opt.id ? opt.color + '33' : 'var(--fiq-card)',
                      border: `1px solid ${equipment === opt.id ? opt.color : 'var(--fiq-border)'}`,
                      color: equipment === opt.id ? opt.color : 'var(--fiq-muted)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catégorie */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--fiq-muted)' }}>
                Catégorie
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {CATEGORY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setCategory(opt.id)}
                    className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                    style={{
                      background: category === opt.id ? opt.color + '33' : 'var(--fiq-card)',
                      border: `1px solid ${category === opt.id ? opt.color : 'var(--fiq-border)'}`,
                      color: category === opt.id ? opt.color : 'var(--fiq-muted)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {activeFilters > 0 && (
              <button onClick={resetFilters} className="text-xs font-bold" style={{ color: 'var(--fiq-red)' }}>
                ✕ Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Chips muscle (horizontaux permanents) ── */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {MUSCLE_GROUPS.map(mg => {
            const count = mg.id === 'all' ? exercises.length : (muscleCounts[mg.id] ?? 0)
            if (count === 0 && mg.id !== 'all') return null
            const isActive = muscle === mg.id
            return (
              <button
                key={mg.id}
                onClick={() => setMuscle(isActive ? 'all' : mg.id)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all"
                style={{
                  background: isActive ? 'var(--fiq-accent)' : 'var(--fiq-card)',
                  border: `1px solid ${isActive ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                  color: isActive ? 'var(--bg)' : 'var(--fiq-muted)',
                }}
              >
                <span>{mg.emoji}</span>
                <span>{mg.label}</span>
                {mg.id !== 'all' && (
                  <span className="font-black text-[9px]" style={{ opacity: 0.6 }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Liste exercices ── */}
      <div className="px-4 pb-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>Aucun exercice trouvé</p>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Essaie &quot;rdl&quot;, &quot;pec deck&quot;, &quot;iliac&quot; ou &quot;hammer chest&quot;
            </p>
            <button
              onClick={() => { setSearch(''); resetFilters() }}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'var(--fiq-card)', color: 'var(--fiq-accent)', border: '1px solid var(--fiq-border)' }}
            >
              Tout réinitialiser
            </button>
          </div>
        ) : (
          filtered.map(ex => <ExerciseCard key={ex.id} exercise={ex} />)
        )}
      </div>
    </div>
  )
}
