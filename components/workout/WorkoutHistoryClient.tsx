'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Dumbbell, Trophy, Calendar, ArrowLeft, ChevronDown as LoadMore } from 'lucide-react'

const PAGE_SIZE = 20

type WorkoutSet = {
  id: string
  exercise_name: string
  set_number: number
  weight_kg: number
  reps: number
  rpe: number | null
  is_warmup: boolean
}

type Workout = {
  id: string
  session_name: string
  session_date: string
  total_tonnage_kg: number | null
  total_sets: number | null
  completed_at: string | null
  notes: string | null
  program_id: string | null
  workout_sets: WorkoutSet[]
}

type Props = { workouts: Workout[] }

// Groupe les sets par exercice dans une séance
function groupByExercise(sets: WorkoutSet[]): { name: string; sets: WorkoutSet[] }[] {
  const map = new Map<string, WorkoutSet[]>()
  for (const s of sets) {
    const existing = map.get(s.exercise_name) ?? []
    map.set(s.exercise_name, [...existing, s])
  }
  return Array.from(map.entries()).map(([name, sets]) => ({ name, sets }))
}

// Calcule la durée approximative depuis completed_at et session_date
function calcDuration(completedAt: string | null, sessionDate: string): string | null {
  if (!completedAt) return null
  const end = new Date(completedAt).getTime()
  const start = new Date(sessionDate + 'T00:00:00').getTime()
  const diffMin = Math.round((end - start) / 60000)
  if (diffMin < 5 || diffMin > 300) return null
  return diffMin < 60 ? `${diffMin}min` : `${Math.floor(diffMin / 60)}h${diffMin % 60 > 0 ? (diffMin % 60) + 'min' : ''}`
}

// Formate la date en français
function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(new Date(dateStr))
}

// Groupe les séances par mois
function groupByMonth(workouts: Workout[]): { label: string; workouts: Workout[] }[] {
  const map = new Map<string, Workout[]>()
  for (const w of workouts) {
    const key = w.session_date.slice(0, 7) // "2025-05"
    const existing = map.get(key) ?? []
    map.set(key, [...existing, w])
  }
  return Array.from(map.entries()).map(([key, wks]) => ({
    label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
      .format(new Date(key + '-01')),
    workouts: wks,
  }))
}

function WorkoutCard({ workout }: { workout: Workout }) {
  const [open, setOpen] = useState(false)
  const groups = useMemo(() => groupByExercise(
    workout.workout_sets.filter(s => !s.is_warmup).sort((a, b) => a.set_number - b.set_number)
  ), [workout.workout_sets])

  const duration = calcDuration(workout.completed_at, workout.session_date)
  const totalSets = workout.workout_sets.filter(s => !s.is_warmup).length
  const dateFormatted = formatDate(workout.session_date)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--fiq-border)', background: 'var(--fiq-card)' }}>
      {/* Header */}
      <button
        className="w-full p-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm leading-tight" style={{ color: 'var(--fiq-text)' }}>
              {workout.session_name}
            </p>
            <p className="text-[11px] mt-0.5 capitalize" style={{ color: 'var(--fiq-muted)' }}>
              {dateFormatted}
            </p>
          </div>
          {open
            ? <ChevronUp className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--fiq-muted)' }} />
            : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--fiq-muted)' }} />
          }
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {workout.total_tonnage_kg !== null && workout.total_tonnage_kg > 0 && (
            <span className="flex items-center gap-1 text-xs font-black"
              style={{ color: 'var(--fiq-accent)' }}>
              <Dumbbell className="w-3 h-3" />
              {workout.total_tonnage_kg.toLocaleString('fr-FR')} kg
            </span>
          )}
          {totalSets > 0 && (
            <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
              {totalSets} série{totalSets > 1 ? 's' : ''}
            </span>
          )}
          {groups.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
              {groups.length} exercice{groups.length > 1 ? 's' : ''}
            </span>
          )}
          {duration && (
            <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
              ⏱ {duration}
            </span>
          )}
        </div>
      </button>

      {/* Détail exercices */}
      {open && (
        <div style={{ borderTop: '1px solid var(--fiq-border)' }}>
          {groups.length === 0 ? (
            <p className="px-4 py-4 text-xs" style={{ color: 'var(--fiq-muted)' }}>
              Aucun set enregistré pour cette séance.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--fiq-border)' }}>
              {groups.map((g, gi) => {
                // Meilleur set (plus lourd)
                const topSet = [...g.sets].sort((a, b) =>
                  (b.weight_kg * b.reps) - (a.weight_kg * a.reps)
                )[0]

                return (
                  <div key={gi} className="px-4 py-3" style={{ borderColor: 'var(--fiq-border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black" style={{ color: 'var(--fiq-text)' }}>
                        {g.name}
                      </p>
                      {topSet && topSet.weight_kg > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                          style={{ background: '#B4FF4A18', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A33' }}>
                          <Trophy className="w-2.5 h-2.5" />
                          {topSet.weight_kg}kg × {topSet.reps}
                        </span>
                      )}
                    </div>

                    {/* Tableau des sets */}
                    <div className="space-y-0.5">
                      {g.sets.map((s, si) => (
                        <div key={si} className="flex items-center gap-3 text-[11px]"
                          style={{ color: 'var(--fiq-muted)' }}>
                          <span className="w-4 text-center font-semibold"
                            style={{ color: s === topSet ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }}>
                            {si + 1}
                          </span>
                          <span style={{ color: 'var(--fiq-text)' }}>
                            {s.weight_kg > 0 ? `${s.weight_kg} kg` : '—'} × {s.reps > 0 ? s.reps : '—'}
                          </span>
                          {s.rpe !== null && s.rpe > 0 && (
                            <span>RPE {s.rpe}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {workout.notes && (
            <div className="px-4 pb-3">
              <p className="text-[11px] italic" style={{ color: 'var(--fiq-muted)' }}>
                💬 {workout.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function WorkoutHistoryClient({ workouts }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visibleWorkouts = workouts.slice(0, visibleCount)
  const hasMore = visibleCount < workouts.length
  const months = useMemo(() => groupByMonth(visibleWorkouts), [visibleWorkouts])

  if (workouts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-5xl mb-4">🏋️</p>
        <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>
          Aucune séance terminée
        </p>
        <p className="text-sm mt-2 mb-6" style={{ color: 'var(--fiq-muted)' }}>
          Démarre ta première séance et reviens ici !
        </p>
        <Link
          href="/workout"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          <Dumbbell className="w-4 h-4" />
          Commencer une séance
        </Link>
      </div>
    )
  }

  // Statistiques globales
  const totalSessions = workouts.length
  const totalTonnage = workouts.reduce((acc, w) => acc + (w.total_tonnage_kg ?? 0), 0)
  const totalSetsAll = workouts.reduce((acc, w) =>
    acc + w.workout_sets.filter(s => !s.is_warmup).length, 0)

  return (
    <div className="space-y-6">
      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-4 text-center"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
          <p className="text-2xl font-black" style={{ color: 'var(--fiq-accent)' }}>{totalSessions}</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--fiq-muted)' }}>SÉANCES</p>
        </div>
        <div className="rounded-2xl p-4 text-center"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
          <p className="text-2xl font-black" style={{ color: 'var(--fiq-text)' }}>
            {totalTonnage >= 1000
              ? `${(totalTonnage / 1000).toFixed(1)}t`
              : `${Math.round(totalTonnage)}kg`}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--fiq-muted)' }}>TONNAGE</p>
        </div>
        <div className="rounded-2xl p-4 text-center"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
          <p className="text-2xl font-black" style={{ color: 'var(--fiq-text)' }}>{totalSetsAll}</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--fiq-muted)' }}>SÉRIES</p>
        </div>
      </div>

      {/* Bouton retour */}
      <Link
        href="/workout"
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ color: 'var(--fiq-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Nouvelle séance
      </Link>

      {/* Liste par mois */}
      {months.map((month) => (
        <div key={month.label}>
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--fiq-muted)' }} />
            <p className="text-xs font-black uppercase tracking-wider capitalize"
              style={{ color: 'var(--fiq-muted)' }}>
              {month.label}
            </p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}>
              {month.workouts.length} séance{month.workouts.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3">
            {month.workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        </div>
      ))}

      {/* Bouton "Voir plus" */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
          style={{ border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)', background: 'transparent' }}
        >
          <LoadMore className="w-4 h-4" />
          Voir {Math.min(PAGE_SIZE, workouts.length - visibleCount)} séance{Math.min(PAGE_SIZE, workouts.length - visibleCount) > 1 ? 's' : ''} de plus
        </button>
      )}
    </div>
  )
}
