'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Search, X, GripVertical, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

type Exercise = {
  id: string
  name: string
  name_fr: string | null
  muscle_primary: string[]
  equipment: string
  category: string
  aliases?: { alias: string }[]
}

type Day = {
  id: string
  name: string
  exercises: Exercise[]
}

export type BuilderDay = {
  id: string
  name: string
  exercises: Exercise[]
}

export type BuilderInitialData = {
  programId: string
  name: string
  sessionsPerWeek: number
  days: BuilderDay[]
}

function uid() { return Math.random().toString(36).slice(2) }

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Pectoraux', lats: 'Dorsaux', mid_back: 'Dos moyen', lower_back: 'Bas du dos',
  quads: 'Quadriceps', hamstrings: 'Ischio-jambiers', glutes: 'Fessiers', calves: 'Mollets',
  shoulders: 'Épaules', front_delt: 'Deltoïde antérieur', side_delt: 'Deltoïde latéral',
  rear_delt: 'Deltoïde postérieur', biceps: 'Biceps', triceps: 'Triceps',
  abs: 'Abdominaux', core: 'Gainage', traps: 'Trapèzes', forearms: 'Avant-bras',
}
const EQUIP_LABELS: Record<string, string> = {
  barbell: 'Barre', dumbbell: 'Haltères', machine: 'Machine',
  cable: 'Câble', bodyweight: 'Poids du corps', band: 'Élastique', kettlebell: 'Kettlebell',
}

function ExerciseSearchModal({
  exercises, selected, onAdd, onClose,
}: { exercises: Exercise[]; selected: string[]; onAdd: (ex: Exercise) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [filterEquip, setFilterEquip] = useState('all')

  const filtered = exercises.filter(e => {
    const q = query.toLowerCase()
    const matchQ = !q || e.name.toLowerCase().includes(q) || (e.name_fr ?? '').toLowerCase().includes(q)
      || e.muscle_primary.some(m => m.toLowerCase().includes(q))
      || (e.aliases ?? []).some(a => a.alias.toLowerCase().includes(q))
    const matchE = filterEquip === 'all' || e.equipment === filterEquip
    return matchQ && matchE
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
        <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} /></button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un exercice..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
          />
        </div>
      </div>

      {/* Filter équipement */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
        {['all', 'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'band'].map(v => (
          <button key={v}
            onClick={() => setFilterEquip(v)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
            style={{
              background: filterEquip === v ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
              color: filterEquip === v ? 'var(--bg)' : 'var(--fiq-muted)',
              border: `1px solid ${filterEquip === v ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
            }}>
            {v === 'all' ? 'Tous' : EQUIP_LABELS[v] ?? v}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(ex => {
          const isSelected = selected.includes(ex.id)
          return (
            <button
              key={ex.id}
              onClick={() => !isSelected && onAdd(ex)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{ borderBottom: '1px solid var(--fiq-border)', opacity: isSelected ? 0.4 : 1 }}
            >
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>
                  {ex.name_fr ?? ex.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  {ex.muscle_primary.map(m => MUSCLE_LABELS[m] ?? m).join(', ')} · {EQUIP_LABELS[ex.equipment] ?? ex.equipment}
                </p>
              </div>
              {isSelected
                ? <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Ajouté</span>
                : <Plus className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
              }
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--fiq-muted)' }}>
            Aucun résultat
          </div>
        )}
      </div>
    </div>
  )
}

export function CustomProgramBuilder({ exercises, initialData }: { exercises: Exercise[]; initialData?: BuilderInitialData }) {
  const router = useRouter()
  const isEditing = !!initialData?.programId

  const defaultDays: Day[] = initialData?.days ?? [
    { id: uid(), name: 'Séance 1', exercises: [] },
    { id: uid(), name: 'Séance 2', exercises: [] },
    { id: uid(), name: 'Séance 3', exercises: [] },
  ]

  const [name, setName] = useState(initialData?.name ?? '')
  const [sessionsPerWeek, setSessionsPerWeek] = useState(initialData?.sessionsPerWeek ?? 3)
  const [days, setDays] = useState<Day[]>(defaultDays)
  const [searchForDay, setSearchForDay] = useState<string | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(defaultDays[0]?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateDays(count: number) {
    setSessionsPerWeek(count)
    setDays(prev => {
      if (count > prev.length) {
        const extras = Array.from({ length: count - prev.length }, (_, i) => ({
          id: uid(), name: `Séance ${prev.length + i + 1}`, exercises: [],
        }))
        return [...prev, ...extras]
      }
      return prev.slice(0, count)
    })
  }

  function addExerciseToDay(dayId: string, ex: Exercise) {
    setDays(prev => prev.map(d =>
      d.id === dayId ? { ...d, exercises: [...d.exercises, ex] } : d
    ))
  }

  function removeExerciseFromDay(dayId: string, exId: string) {
    setDays(prev => prev.map(d =>
      d.id === dayId ? { ...d, exercises: d.exercises.filter(e => e.id !== exId) } : d
    ))
  }

  function updateDayName(dayId: string, value: string) {
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, name: value } : d))
  }

  async function saveProgram() {
    if (!name.trim()) { setError('Donne un nom à ton programme.'); return }
    if (days.some(d => !d.name.trim())) { setError('Toutes les séances doivent avoir un nom.'); return }
    setError('')
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        sessions_per_week: sessionsPerWeek,
        days: days.map(d => ({ name: d.name, exercise_ids: d.exercises.map(e => e.id) })),
      }
      const url = isEditing ? `/api/programs/${initialData.programId}` : '/api/programs/create'
      const method = isEditing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const { data, error: apiError } = await res.json()
      if (apiError) { setError(apiError); return }
      if (data?.id || (isEditing && !apiError)) router.push('/programs?tab=mine')
    } finally {
      setSaving(false)
    }
  }

  const activeDay = searchForDay ? days.find(d => d.id === searchForDay) : null

  return (
    <>
      <div className="space-y-5 pb-24">
        {/* Nom du programme */}
        <div className="fiq-card space-y-3">
          <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Informations</p>
          <div>
            <p className="fiq-label mb-1.5">Nom du programme</p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Mon PPL personnalisé"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
            />
          </div>
          <div>
            <p className="fiq-label mb-1.5">Séances par semaine</p>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map(n => (
                <button key={n}
                  onClick={() => updateDays(n)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
                  style={{
                    background: sessionsPerWeek === n ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                    color: sessionsPerWeek === n ? 'var(--bg)' : 'var(--fiq-muted)',
                    border: `1px solid ${sessionsPerWeek === n ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Séances */}
        {days.map((day, idx) => (
          <div key={day.id} className="fiq-card space-y-3">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                  style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
                  {idx + 1}
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm" style={{ color: 'var(--fiq-text)' }}>{day.name}</p>
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                    {day.exercises.length} exercice{day.exercises.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {expandedDay === day.id
                ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
                : <ChevronDown className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
              }
            </button>

            {expandedDay === day.id && (
              <div className="space-y-3">
                {/* Nom de la séance */}
                <input
                  value={day.name}
                  onChange={e => updateDayName(day.id, e.target.value)}
                  placeholder="Nom de la séance"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                />

                {/* Exercices */}
                {day.exercises.map(ex => (
                  <div key={ex.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                    <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-border)' }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>
                        {ex.name_fr ?? ex.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                        {ex.muscle_primary.map(m => MUSCLE_LABELS[m] ?? m).join(', ')}
                      </p>
                    </div>
                    <button onClick={() => removeExerciseFromDay(day.id, ex.id)}>
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
                    </button>
                  </div>
                ))}

                {/* Ajouter exercice */}
                <button
                  onClick={() => setSearchForDay(day.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ border: '1px dashed var(--fiq-border)', color: 'var(--fiq-muted)' }}>
                  <Plus className="w-4 h-4" />
                  Ajouter un exercice
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Erreur */}
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#EF444415', border: '1px solid #EF444430', color: 'var(--fiq-red)' }}>
            {error}
          </div>
        )}
      </div>

      {/* Footer fixe */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 max-w-lg mx-auto">
        <button
          onClick={saveProgram}
          disabled={saving}
          className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          {saving
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : isEditing ? '✓ Enregistrer les modifications' : '✓ Enregistrer le programme'
          }
        </button>
      </div>

      {/* Modal recherche exercice */}
      {searchForDay && activeDay && (
        <ExerciseSearchModal
          exercises={exercises}
          selected={activeDay.exercises.map(e => e.id)}
          onAdd={ex => addExerciseToDay(searchForDay, ex)}
          onClose={() => setSearchForDay(null)}
        />
      )}
    </>
  )
}
