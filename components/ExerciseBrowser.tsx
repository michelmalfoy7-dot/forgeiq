'use client'

import { useState, useMemo } from 'react'
import { Search, X, ChevronDown, Dumbbell } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Exercise {
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
}

interface Props {
  exercises: Exercise[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MUSCLE_GROUPS = [
  { id: 'all',          label: 'Tout',          emoji: '💪' },
  { id: 'chest',        label: 'Pectoraux',     emoji: '🫀' },
  { id: 'lats',         label: 'Dorsaux',       emoji: '🔙' },
  { id: 'mid_back',     label: 'Dos milieu',    emoji: '🟫' },
  { id: 'upper_back',   label: 'Dos haut',      emoji: '🔝' },
  { id: 'front_delt',   label: 'Épaules av.',   emoji: '⬆️' },
  { id: 'side_delt',    label: 'Épaules lat.',  emoji: '↔️' },
  { id: 'rear_delt',    label: 'Épaules arr.',  emoji: '⬇️' },
  { id: 'shoulders',    label: 'Épaules',       emoji: '🦾' },
  { id: 'biceps',       label: 'Biceps',        emoji: '💪' },
  { id: 'triceps',      label: 'Triceps',       emoji: '💪' },
  { id: 'forearms',     label: 'Avant-bras',    emoji: '🤜' },
  { id: 'quads',        label: 'Quadriceps',    emoji: '🦵' },
  { id: 'hamstrings',   label: 'Ischio',        emoji: '🦵' },
  { id: 'glutes',       label: 'Fessiers',      emoji: '🍑' },
  { id: 'calves',       label: 'Mollets',       emoji: '🦶' },
  { id: 'hip_abductors',label: 'Abducteurs',    emoji: '↔️' },
  { id: 'hip_flexors',  label: 'Fléch. hanche', emoji: '🦿' },
  { id: 'abs',          label: 'Abdos',         emoji: '⬛' },
  { id: 'core',         label: 'Core',          emoji: '🎯' },
  { id: 'obliques',     label: 'Obliques',      emoji: '↗️' },
  { id: 'traps',        label: 'Trapèzes',      emoji: '🔺' },
  { id: 'lower_back',   label: 'Bas du dos',    emoji: '🟩' },
  { id: 'cardio',       label: 'Cardio',        emoji: '❤️' },
]

const EQUIPMENT_OPTIONS = [
  { id: 'all',        label: 'Tout' },
  { id: 'barbell',    label: 'Barre' },
  { id: 'dumbbell',   label: 'Haltères' },
  { id: 'cable',      label: 'Câble' },
  { id: 'machine',    label: 'Machine' },
  { id: 'bodyweight', label: 'Poids corps' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'band',       label: 'Élastique' },
]

const CATEGORY_OPTIONS = [
  { id: 'all',       label: 'Tout', color: 'var(--fiq-muted)' },
  { id: 'compound',  label: 'Composé', color: '#3D8BFF' },
  { id: 'isolation', label: 'Isolation', color: '#B4FF4A' },
  { id: 'cardio',    label: 'Cardio', color: '#FF6B35' },
  { id: 'mobility',  label: 'Mobilité', color: '#A855F7' },
]

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Débutant',   color: '#22C55E' },
  2: { label: 'Facile',     color: '#84CC16' },
  3: { label: 'Intermédiaire', color: '#EAB308' },
  4: { label: 'Difficile',  color: '#F97316' },
  5: { label: 'Expert',     color: '#EF4444' },
}

const EQUIPMENT_LABEL: Record<string, string> = {
  barbell:    'Barre',
  dumbbell:   'Haltères',
  cable:      'Câble',
  machine:    'Machine',
  bodyweight: 'Poids corps',
  kettlebell: 'Kettlebell',
  band:       'Élastique',
}

// ─── Composant ExerciseCard ────────────────────────────────────────────────────
function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false)
  const diff = DIFFICULTY_LABELS[exercise.difficulty] ?? DIFFICULTY_LABELS[3]
  const catColor = CATEGORY_OPTIONS.find(c => c.id === exercise.category)?.color ?? 'var(--fiq-muted)'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
    >
      {/* Header — toujours visible */}
      <button
        className="w-full text-left p-4"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Nom français */}
            <p
              className="font-black text-sm leading-tight"
              style={{ color: 'var(--fiq-text)', letterSpacing: '-0.01em' }}
            >
              {exercise.name_fr}
            </p>
            {/* Nom anglais */}
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              {exercise.name}
            </p>

            {/* Badges muscles principaux */}
            <div className="flex flex-wrap gap-1 mt-2">
              {exercise.muscle_primary.slice(0, 3).map(m => (
                <span
                  key={m}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: catColor + '22', color: catColor }}
                >
                  {m.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            {/* Difficulté */}
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: diff.color + '22', color: diff.color }}
            >
              {diff.label}
            </span>
            {/* Equipment */}
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--fiq-border)', color: 'var(--fiq-muted)' }}
            >
              {EQUIPMENT_LABEL[exercise.equipment] ?? exercise.equipment}
            </span>
            {/* Chevron */}
            <ChevronDown
              className="w-4 h-4 mt-1 transition-transform"
              style={{
                color: 'var(--fiq-muted)',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </div>
        </div>
      </button>

      {/* Détail — visible si ouvert */}
      {open && (
        <div
          className="px-4 pb-4 pt-1 border-t"
          style={{ borderColor: 'var(--fiq-border)' }}
        >
          {/* Instructions */}
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--fiq-text)' }}>
            {exercise.instructions}
          </p>

          {/* Tips */}
          {exercise.tips && (
            <div
              className="rounded-xl px-3 py-2 mb-3"
              style={{ background: '#B4FF4A12', borderLeft: '3px solid #B4FF4A' }}
            >
              <p className="text-[11px] font-bold mb-0.5" style={{ color: '#B4FF4A' }}>
                💡 Conseil
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
                {exercise.tips}
              </p>
            </div>
          )}

          {/* Muscles secondaires */}
          {exercise.muscle_secondary.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--fiq-muted)' }}>
                Muscles secondaires
              </p>
              <div className="flex flex-wrap gap-1">
                {exercise.muscle_secondary.map(m => (
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
      )}
    </div>
  )
}

// ─── Composant principal ───────────────────────────────────────────────────────
export function ExerciseBrowser({ exercises }: Props) {
  const [search, setSearch]         = useState('')
  const [muscle, setMuscle]         = useState('all')
  const [equipment, setEquipment]   = useState('all')
  const [category, setCategory]     = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Comptage des exercices par muscle (pour les badges)
  const muscleCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    exercises.forEach(ex => {
      ex.muscle_primary.forEach(m => {
        counts[m] = (counts[m] ?? 0) + 1
      })
    })
    return counts
  }, [exercises])

  // Filtrage
  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      // Recherche texte
      if (search) {
        const q = search.toLowerCase()
        const hit =
          ex.name.toLowerCase().includes(q) ||
          ex.name_fr.toLowerCase().includes(q) ||
          ex.muscle_primary.some(m => m.includes(q)) ||
          ex.muscle_secondary.some(m => m.includes(q))
        if (!hit) return false
      }
      // Filtre muscle
      if (muscle !== 'all') {
        const inPrimary   = ex.muscle_primary.includes(muscle)
        const inSecondary = ex.muscle_secondary.includes(muscle)
        if (!inPrimary && !inSecondary) return false
      }
      // Filtre equipment
      if (equipment !== 'all' && ex.equipment !== equipment) return false
      // Filtre category
      if (category !== 'all' && ex.category !== category) return false
      return true
    })
  }, [exercises, search, muscle, equipment, category])

  // Nombre de filtres actifs
  const activeFilters = [
    muscle !== 'all',
    equipment !== 'all',
    category !== 'all',
  ].filter(Boolean).length

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>
      {/* ── Header fixe ── */}
      <div
        className="sticky top-0 z-10 pt-4 pb-3 px-4"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--fiq-border)' }}
      >
        {/* Titre + compteur */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1
              className="text-xl font-black leading-none"
              style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}
            >
              Exercices
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              <span style={{ color: 'var(--fiq-accent)', fontWeight: 800 }}>{filtered.length}</span>
              {' '}/ {exercises.length} exercices
            </p>
          </div>

          {/* Bouton filtres */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{
              background: activeFilters > 0 ? '#B4FF4A22' : 'var(--fiq-card)',
              border: `1px solid ${activeFilters > 0 ? '#B4FF4A44' : 'var(--fiq-border)'}`,
              color: activeFilters > 0 ? '#B4FF4A' : 'var(--fiq-muted)',
            }}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Filtres{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--fiq-muted)' }}
          />
          <input
            type="text"
            placeholder="Rechercher un exercice..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--fiq-card)',
              border: '1px solid var(--fiq-border)',
              color: 'var(--fiq-text)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
            </button>
          )}
        </div>

        {/* Filtres dépliables */}
        {showFilters && (
          <div className="mt-3 space-y-3">
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
                      border: `1px solid ${category === opt.id ? opt.color + '66' : 'var(--fiq-border)'}`,
                      color: category === opt.id ? opt.color : 'var(--fiq-muted)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

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
                      background: equipment === opt.id ? '#3D8BFF33' : 'var(--fiq-card)',
                      border: `1px solid ${equipment === opt.id ? '#3D8BFF66' : 'var(--fiq-border)'}`,
                      color: equipment === opt.id ? '#3D8BFF' : 'var(--fiq-muted)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset */}
            {activeFilters > 0 && (
              <button
                onClick={() => { setMuscle('all'); setEquipment('all'); setCategory('all') }}
                className="text-xs font-bold"
                style={{ color: '#EF4444' }}
              >
                ✕ Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Sélecteur de muscle (chips horizontaux) ── */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {MUSCLE_GROUPS.map(mg => {
            const count = mg.id === 'all'
              ? exercises.length
              : muscleCounts[mg.id] ?? 0
            if (count === 0 && mg.id !== 'all') return null
            const isActive = muscle === mg.id
            return (
              <button
                key={mg.id}
                onClick={() => setMuscle(mg.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all"
                style={{
                  background: isActive ? '#B4FF4A' : 'var(--fiq-card)',
                  border: `1px solid ${isActive ? '#B4FF4A' : 'var(--fiq-border)'}`,
                  color: isActive ? 'var(--bg)' : 'var(--fiq-muted)',
                }}
              >
                <span>{mg.emoji}</span>
                <span>{mg.label}</span>
                <span
                  className="font-black text-[10px]"
                  style={{ opacity: isActive ? 0.7 : 0.5 }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Liste ── */}
      <div className="px-4 pb-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>
              Aucun exercice trouvé
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Essaie de modifier tes filtres
            </p>
            <button
              onClick={() => { setSearch(''); setMuscle('all'); setEquipment('all'); setCategory('all') }}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'var(--fiq-card)', color: 'var(--fiq-accent)', border: '1px solid var(--fiq-border)' }}
            >
              Tout réinitialiser
            </button>
          </div>
        ) : (
          filtered.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))
        )}
      </div>
    </div>
  )
}
