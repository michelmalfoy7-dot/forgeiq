'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Dumbbell, Trophy, Calendar, ArrowLeft, ChevronDown as LoadMore, List, ChevronLeft, ChevronRight, Share2, Loader2, CheckCircle2, X } from 'lucide-react'

const PAGE_SIZE = 20
const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

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

type ShareState = 'idle' | 'inputting' | 'loading' | 'done'

function WorkoutCard({ workout }: { workout: Workout }) {
  const [open, setOpen] = useState(false)
  const groups = useMemo(() => groupByExercise(
    workout.workout_sets.filter(s => !s.is_warmup).sort((a, b) => a.set_number - b.set_number)
  ), [workout.workout_sets])

  const duration = calcDuration(workout.completed_at, workout.session_date)
  const totalSets = workout.workout_sets.filter(s => !s.is_warmup).length
  const dateFormatted = formatDate(workout.session_date)

  // État partage
  const [shareState, setShareState] = useState<ShareState>('idle')
  const [caption, setCaption]       = useState('')
  const [shareId, setShareId]       = useState<string | null>(null)

  async function handleShare() {
    setShareState('loading')
    try {
      const res = await fetch('/api/social/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout_id: workout.id, caption: caption.trim() || null }),
      })
      const json = await res.json() as { data: { id: string } | null; error: string | null }
      if (json.data?.id) {
        setShareId(json.data.id)
        setShareState('done')
      } else {
        // Erreur — retour à inputting pour laisser retenter
        setShareState('inputting')
        alert(json.error ?? 'Erreur lors du partage')
      }
    } catch {
      setShareState('inputting')
    }
  }

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

          {/* ── Bloc partage ─────────────────────────────────────────────── */}
          <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--fiq-border)' }}>

            {/* État : partagé avec succès */}
            {shareState === 'done' && shareId && (
              <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl"
                style={{ background: '#B4FF4A10', border: '1px solid #B4FF4A30' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--fiq-accent)' }}>
                    Publié sur le feed !
                  </span>
                </div>
                <Link
                  href={`/social/post/${shareId}`}
                  className="text-xs font-black px-2.5 py-1 rounded-lg"
                  style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                >
                  Voir →
                </Link>
              </div>
            )}

            {/* État : saisie caption */}
            {shareState === 'inputting' && (
              <div className="space-y-2">
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Ajoute une note (optionnel)… 💪"
                  rows={2}
                  maxLength={280}
                  className="w-full text-sm outline-none resize-none"
                  style={{
                    background: 'var(--fiq-faint)',
                    border: '1px solid var(--fiq-border)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    color: 'var(--fiq-text)',
                  }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShareState('idle'); setCaption('') }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black"
                    style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                    Annuler
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black"
                    style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Publier
                  </button>
                </div>
              </div>
            )}

            {/* État : chargement */}
            {shareState === 'loading' && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fiq-accent)' }} />
                <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Publication en cours…</span>
              </div>
            )}

            {/* État : idle — bouton Partager */}
            {shareState === 'idle' && (
              <button
                onClick={() => setShareState('inputting')}
                className="flex items-center gap-2 text-xs font-black px-3 py-2 rounded-xl transition-opacity active:opacity-70"
                style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
              >
                <Share2 className="w-3.5 h-3.5" />
                Partager cette séance
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Vue calendrier ────────────────────────────────────────────────────────────
function CalendarView({ workouts }: Props) {
  const today = new Date()
  const [year, setYear]         = useState(today.getFullYear())
  const [month, setMonth]       = useState(today.getMonth())       // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Map session_date → workouts
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, Workout[]>()
    for (const w of workouts) {
      const existing = map.get(w.session_date) ?? []
      map.set(w.session_date, [...existing, w])
    }
    return map
  }, [workouts])

  // Construire la grille du mois (lundi en premier)
  const firstDow   = (new Date(year, month, 1).getDay() + 6) % 7  // 0=lun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr   = today.toISOString().split('T')[0]
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month, 1))

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  // Séances du jour sélectionné
  const selectedWorkouts = selectedDate ? (workoutsByDate.get(selectedDate) ?? []) : []

  // Streak actuelle (jours consécutifs avec au moins 1 séance, jusqu'à aujourd'hui)
  const streak = useMemo(() => {
    let count = 0
    const d = new Date(today)
    while (true) {
      const str = d.toISOString().split('T')[0]
      if (!workoutsByDate.has(str)) break
      count++
      d.setDate(d.getDate() - 1)
    }
    return count
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutsByDate])

  // Séances dans le mois courant
  const sessionsThisMonth = useMemo(() => {
    let count = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const str = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (workoutsByDate.has(str)) count++
    }
    return count
  }, [workoutsByDate, year, month, daysInMonth])

  return (
    <div className="space-y-4">
      {/* En-tête navigation mois */}
      <div className="fiq-card">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
          >
            <ChevronLeft className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          </button>
          <div className="text-center">
            <p className="font-black text-sm capitalize" style={{ color: 'var(--fiq-text)' }}>
              {monthLabel}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              {sessionsThisMonth} séance{sessionsThisMonth !== 1 ? 's' : ''}
              {streak > 1 && (
                <span style={{ color: 'var(--fiq-accent)' }}> · 🔥 {streak}j consécutifs</span>
              )}
            </p>
          </div>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
          >
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          </button>
        </div>

        {/* Labels jours */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="text-center text-[10px] py-1 font-bold"
              style={{ color: 'var(--fiq-muted)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grille jours */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />

            const pad    = String(day).padStart(2, '0')
            const mPad   = String(month + 1).padStart(2, '0')
            const dateStr = `${year}-${mPad}-${pad}`
            const dayWorkouts = workoutsByDate.get(dateStr) ?? []
            const hasWorkout = dayWorkouts.length > 0
            const isToday    = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const isFuture   = dateStr > todayStr

            return (
              <button
                key={i}
                onClick={() => {
                  if (!hasWorkout) return
                  setSelectedDate(isSelected ? null : dateStr)
                }}
                className="relative flex flex-col items-center justify-center rounded-xl py-2"
                style={{
                  cursor: hasWorkout ? 'pointer' : 'default',
                  background: isSelected
                    ? 'var(--fiq-accent)'
                    : isToday
                    ? 'rgba(180,255,74,0.1)'
                    : hasWorkout
                    ? 'rgba(180,255,74,0.05)'
                    : 'transparent',
                  border: isSelected
                    ? '1.5px solid var(--fiq-accent)'
                    : isToday
                    ? '1.5px solid rgba(180,255,74,0.4)'
                    : '1.5px solid transparent',
                  opacity: isFuture ? 0.3 : 1,
                }}
              >
                <span
                  className="text-xs font-black leading-none"
                  style={{
                    color: isSelected
                      ? '#0A0C0F'
                      : hasWorkout
                      ? 'var(--fiq-text)'
                      : 'var(--fiq-muted)',
                  }}
                >
                  {day}
                </span>

                {/* Point vert sous le numéro si séance */}
                {hasWorkout && !isSelected && (
                  <span
                    className="mt-1 rounded-full"
                    style={{ width: 4, height: 4, background: 'var(--fiq-accent)' }}
                  />
                )}
                {/* Check si sélectionné */}
                {isSelected && (
                  <span className="text-[9px] leading-none mt-0.5" style={{ color: '#0A0C0F' }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(180,255,74,0.05)', border: '1.5px solid rgba(180,255,74,0.4)' }} />
          <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>Aujourd'hui</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(180,255,74,0.05)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--fiq-accent)' }} />
          </div>
          <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>Séance</span>
        </div>
      </div>

      {/* Détail séance sélectionnée */}
      {selectedWorkouts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-wider px-1"
            style={{ color: 'var(--fiq-muted)' }}>
            {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
              .format(new Date(selectedDate! + 'T12:00:00'))}
          </p>
          {selectedWorkouts.map(w => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      )}
    </div>
  )
}

export function WorkoutHistoryClient({ workouts }: Props) {
  const [view, setView]             = useState<'list' | 'calendar'>('list')
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

      {/* Bouton retour + toggle vue */}
      <div className="flex items-center justify-between">
        <Link
          href="/workout"
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--fiq-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Nouvelle séance
        </Link>

        {/* Toggle Liste / Calendrier */}
        <div className="flex items-center rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--fiq-border)', background: 'var(--fiq-faint)' }}>
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black transition-colors"
            style={{
              background: view === 'list' ? 'var(--fiq-accent)' : 'transparent',
              color: view === 'list' ? '#0A0C0F' : 'var(--fiq-muted)',
            }}
          >
            <List className="w-3.5 h-3.5" />
            Liste
          </button>
          <button
            onClick={() => setView('calendar')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black transition-colors"
            style={{
              background: view === 'calendar' ? 'var(--fiq-accent)' : 'transparent',
              color: view === 'calendar' ? '#0A0C0F' : 'var(--fiq-muted)',
            }}
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendrier
          </button>
        </div>
      </div>

      {/* Vue calendrier */}
      {view === 'calendar' && <CalendarView workouts={workouts} />}

      {/* Liste par mois */}
      {view === 'list' && (<>
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
      </>)}
    </div>
  )
}
