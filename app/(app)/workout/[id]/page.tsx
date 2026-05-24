'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Trash2, Check, Timer, Trophy, Search, X, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react'
import { Confetti } from '@/components/ui/Confetti'

// ── Types ─────────────────────────────────────────────────────
type SetRow = {
  id: string
  exercise_id: string
  exercise_name: string
  set_number: number
  weight_kg: number | ''
  reps: number | ''
  rpe: number | ''
  is_warmup: boolean
}

type Exercise = {
  id: string
  name: string
  name_fr: string
  muscle_primary: string[]
  equipment: string
}

type ExerciseGroup = {
  exercise_id: string
  exercise_name: string
  sets: SetRow[]
  lastSession?: { weight_kg: number; reps: number }[]
  pr?: number
}

// ── Utils ─────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2) }

function calcTonnage(sets: SetRow[]) {
  return sets
    .filter((s) => !s.is_warmup && s.weight_kg !== '' && s.reps !== '')
    .reduce((acc, s) => acc + (Number(s.weight_kg) * Number(s.reps)), 0)
}

export default function WorkoutSessionPage() {
  const { id: workoutId } = useParams<{ id: string }>()
  const router = useRouter()

  const [groups, setGroups] = useState<ExerciseGroup[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [restDuration, setRestDuration] = useState(90)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ tonnage: number; sets: number; newPRs: string[] } | null>(null)
  const [sessionName, setSessionName] = useState('Séance')
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Sauvegarde du payload pour retry sans perte de données
  const lastPayloadRef = useRef<unknown>(null)

  // Chrono séance
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // Charger les exercices + infos séance + pré-charger depuis suggestion IA
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [{ data: exos }, { data: workout }] = await Promise.all([
        supabase.from('exercises_library').select('id,name,name_fr,muscle_primary,equipment').order('name'),
        supabase.from('workouts').select('session_name').eq('id', workoutId).single(),
      ])

      const library = exos ?? []
      setExercises(library)
      if (workout?.session_name) setSessionName(workout.session_name)

      const stored = sessionStorage.getItem(`workout-exercises-${workoutId}`)
      if (stored && user) {
        sessionStorage.removeItem(`workout-exercises-${workoutId}`)
        try {
          const suggested: { name: string; sets: number; reps: string; weight_kg: number | null; note: string }[] = JSON.parse(stored)

          // Résoudre les exercices en une seule passe (pas de requête ici)
          const matches = suggested
            .map((s) => ({
              s,
              match: library.find((e) =>
                (e.name_fr ?? '').toLowerCase() === s.name.toLowerCase() ||
                e.name.toLowerCase() === s.name.toLowerCase()
              ),
            }))
            .filter((x): x is { s: typeof suggested[0]; match: Exercise } => x.match !== undefined)

          if (matches.length > 0) {
            const matchIds = matches.map((x) => x.match.id)

            // Batch : 2 requêtes au lieu de 2N
            const [{ data: allLastSets }, { data: allPRs }] = await Promise.all([
              supabase.from('workout_sets')
                .select('weight_kg, reps, exercise_id, workouts!inner(user_id)')
                .in('exercise_id', matchIds)
                .eq('workouts.user_id', user.id)
                .not('is_warmup', 'eq', true)
                .order('created_at', { ascending: false })
                .limit(matchIds.length * 5),
              supabase.from('personal_records')
                .select('exercise_id, value')
                .in('exercise_id', matchIds)
                .eq('user_id', user.id)
                .eq('record_type', 'top_set'),
            ])

            // Grouper par exercise_id (max 4 sets par exercice)
            const lastSetsByEx: Record<string, { weight_kg: number; reps: number }[]> = {}
            for (const s of allLastSets ?? []) {
              const exId = (s as { exercise_id: string }).exercise_id
              if (!lastSetsByEx[exId]) lastSetsByEx[exId] = []
              if (lastSetsByEx[exId].length < 4) lastSetsByEx[exId].push({ weight_kg: s.weight_kg, reps: s.reps })
            }
            const prByEx: Record<string, number> = {}
            for (const pr of allPRs ?? []) prByEx[pr.exercise_id] = pr.value

            const preloaded: ExerciseGroup[] = matches.map(({ s, match }) => {
              const lastSession = lastSetsByEx[match.id] ?? []
              const pr = prByEx[match.id]
              const count = s.sets ?? 3
              const initWeight: number | '' = s.weight_kg ?? lastSession[0]?.weight_kg ?? ''
              const initReps: number | '' = lastSession[0]?.reps ?? ''
              const sets: SetRow[] = Array.from({ length: count }, (_, i) => ({
                id: uid(), exercise_id: match.id, exercise_name: match.name_fr ?? match.name,
                set_number: i + 1, weight_kg: initWeight, reps: initReps, rpe: '', is_warmup: false,
              }))
              return { exercise_id: match.id, exercise_name: match.name_fr ?? match.name, sets, lastSession, pr }
            })

            if (preloaded.length > 0) setGroups(preloaded)
          }
        } catch { /* Silencieux si parsing échoue */ }
      }
    }
    load()
  }, [workoutId])

  // Chrono repos
  function startRest(seconds = restDuration) {
    if (restRef.current) clearInterval(restRef.current)
    setRestDuration(seconds)
    setRestTimer(seconds)
    restRef.current = setInterval(() => {
      setRestTimer((t) => {
        if (t === null || t <= 1) { if (restRef.current) clearInterval(restRef.current); return null }
        return t - 1
      })
    }, 1000)
  }

  function stopRest() {
    if (restRef.current) clearInterval(restRef.current)
    setRestTimer(null)
  }

  useEffect(() => () => { if (restRef.current) clearInterval(restRef.current) }, [])

  async function addExercise(ex: Exercise) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let lastSession: { weight_kg: number; reps: number }[] = []
    let pr: number | undefined

    if (user) {
      const { data: lastSets } = await supabase.from('workout_sets')
        .select('weight_kg, reps, workout_id, workouts!inner(user_id, session_date)')
        .eq('exercise_id', ex.id).eq('workouts.user_id', user.id)
        .not('is_warmup', 'eq', true).order('created_at', { ascending: false }).limit(6)

      lastSession = (lastSets ?? []).slice(0, 4).map((s: {weight_kg: number; reps: number}) => ({ weight_kg: s.weight_kg, reps: s.reps }))
      const { data: prData } = await supabase.from('personal_records').select('value')
        .eq('exercise_id', ex.id).eq('user_id', user.id).eq('record_type', 'top_set').single()
      pr = prData?.value
    }

    const firstSet: SetRow = { id: uid(), exercise_id: ex.id, exercise_name: ex.name_fr ?? ex.name, set_number: 1, weight_kg: lastSession[0]?.weight_kg ?? '', reps: lastSession[0]?.reps ?? '', rpe: '', is_warmup: false }
    setGroups((prev) => [...prev, { exercise_id: ex.id, exercise_name: ex.name_fr ?? ex.name, sets: [firstSet], lastSession, pr }])
    setShowSearch(false)
    setSearchQuery('')
  }

  function addWarmupSet(groupIdx: number) {
    setGroups((prev) => {
      const g = prev[groupIdx]
      const warmup: SetRow = { id: uid(), exercise_id: g.exercise_id, exercise_name: g.exercise_name, set_number: 0, weight_kg: '', reps: '', rpe: '', is_warmup: true }
      const updated = [...prev]
      updated[groupIdx] = { ...g, sets: [warmup, ...g.sets] }
      return updated
    })
  }

  function addSet(groupIdx: number) {
    setGroups((prev) => {
      const g = prev[groupIdx]
      const lastSet = g.sets[g.sets.length - 1]
      const newSet: SetRow = { id: uid(), exercise_id: g.exercise_id, exercise_name: g.exercise_name, set_number: g.sets.length + 1, weight_kg: lastSet?.weight_kg ?? '', reps: lastSet?.reps ?? '', rpe: '', is_warmup: false }
      const updated = [...prev]
      updated[groupIdx] = { ...g, sets: [...g.sets, newSet] }
      return updated
    })
    startRest()
  }

  function updateSet(groupIdx: number, setId: string, key: keyof SetRow, value: string | boolean | number) {
    setGroups((prev) => {
      const updated = [...prev]
      updated[groupIdx] = {
        ...updated[groupIdx],
        sets: updated[groupIdx].sets.map((s) =>
          s.id === setId ? { ...s, [key]: key === 'weight_kg' || key === 'reps' || key === 'rpe' ? (value === '' ? '' : Number(value)) : value } : s
        ),
      }
      return updated
    })
  }

  function removeSet(groupIdx: number, setId: string) {
    setGroups((prev) => {
      const updated = [...prev]
      const filtered = updated[groupIdx].sets.filter((s) => s.id !== setId)
      if (filtered.length === 0) return updated.filter((_, i) => i !== groupIdx)
      updated[groupIdx] = { ...updated[groupIdx], sets: filtered.map((s, i) => ({ ...s, set_number: i + 1 })) }
      return updated
    })
  }

  // ── TERMINER SÉANCE ──────────────────────────────────────────
  const completeWorkout = useCallback(async (retryPayload?: unknown) => {
    setCompleting(true)
    setCompleteError(null)

    const allSets = groups.flatMap((g) => g.sets)
    const payload = retryPayload ?? {
      workout_id: workoutId,
      sets: allSets.map((s) => ({
        exercise_id: s.exercise_id,
        exercise_name: s.exercise_name,
        set_number: s.set_number,
        weight_kg: Number(s.weight_kg) || 0,
        reps: Number(s.reps) || 0,
        rpe: Number(s.rpe) || null,
        is_warmup: s.is_warmup,
      })),
      notes: null,
      rpe_overall: null,
    }

    // Sauvegarder le payload pour retry potentiel
    lastPayloadRef.current = payload

    console.log('[workout/complete] payload:', JSON.stringify(payload).slice(0, 300))

    try {
      const res = await fetch('/api/workout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      console.log('[workout/complete] response:', json)

      if (!res.ok || json.error) {
        const msg = json.error ?? `Erreur HTTP ${res.status}`
        console.error('[workout/complete] error:', msg)
        setCompleteError(msg)
        return
      }

      const { data } = json
      if (data) {
        setSummary({ tonnage: data.totalTonnage ?? 0, sets: data.totalSets ?? 0, newPRs: data.newPRs ?? [] })
        setCompleted(true)
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        setCompleteError('Réponse inattendue du serveur. Réessaie.')
      }
    } catch (err) {
      console.error('[workout/complete] fetch error:', err)
      setCompleteError('Erreur réseau. Vérifie ta connexion et réessaie.')
    } finally {
      setCompleting(false)
    }
  }, [groups, workoutId])

  const totalTonnage = groups.reduce((acc, g) => acc + calcTonnage(g.sets), 0)
  const totalSets = groups.reduce((acc, g) => acc + g.sets.filter((s) => !s.is_warmup).length, 0)
  const filteredExercises = exercises.filter((e) =>
    searchQuery.length < 2 ||
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.name_fr ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ── Écran de fin ───────────────────────────────────────────
  if (completed && summary) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        {summary.newPRs.length > 0 && <Confetti active />}
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="text-5xl">🏆</div>
          <div>
            <h2 className="text-2xl fiq-display" style={{ color: 'var(--fiq-text)' }}>Séance terminée !</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>{formatTime(elapsed)} d&apos;entraînement</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="fiq-card text-center">
              <p className="fiq-label">Tonnage</p>
              <p className="text-2xl fiq-data mt-1" style={{ color: 'var(--fiq-accent)' }}>
                {summary.tonnage.toLocaleString('fr-FR')} kg
              </p>
            </div>
            <div className="fiq-card text-center">
              <p className="fiq-label">Séries</p>
              <p className="text-2xl fiq-data mt-1" style={{ color: 'var(--fiq-text)' }}>{summary.sets}</p>
            </div>
          </div>

          {summary.newPRs.length > 0 && (
            <div className="fiq-card text-left">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
                <p className="font-bold" style={{ color: 'var(--fiq-accent)' }}>
                  {summary.newPRs.length} nouveau{summary.newPRs.length > 1 ? 'x' : ''} PR !
                </p>
              </div>
              {summary.newPRs.map((name) => (
                <p key={name} className="text-sm" style={{ color: 'var(--fiq-text)' }}>🎯 {name}</p>
              ))}
            </div>
          )}

          <Button
            className="w-full font-black py-5"
            onClick={() => {
              router.refresh()
              router.push('/dashboard')
            }}
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            Retour au dashboard
          </Button>
        </div>
      </div>
    )
  }

  // ── Vue principale ─────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto" style={{ paddingBottom: '7rem' }}>
      {/* Header sticky */}
      <div
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--fiq-border)', backdropFilter: 'blur(12px)' }}
      >
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--fiq-text)' }}>{sessionName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{formatTime(elapsed)}</p>
            {/* Timer repos affiché dans le header = toujours visible même avec clavier ouvert */}
            {restTimer !== null && (
              <span
                className="fiq-timer-pulse flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: '#3D8BFF22', color: 'var(--fiq-blue)', border: '1px solid #3D8BFF44' }}
              >
                <Timer className="w-3 h-3" />{formatTime(restTimer)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalTonnage > 0 && (
            <span className="text-sm fiq-data" style={{ color: 'var(--fiq-accent)' }}>
              {totalTonnage.toLocaleString('fr-FR')} kg
            </span>
          )}
          <Button
            size="sm"
            onClick={() => completeWorkout()}
            disabled={completing || groups.length === 0}
            className="font-black text-xs"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)', minWidth: 90 }}
          >
            {completing
              ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Sauvegarde…</>
              : <><Check className="w-3 h-3 mr-1" />Terminer</>
            }
          </Button>
        </div>
      </div>

      {/* Erreur visible si l'API plante */}
      {completeError && (
        <div
          className="mx-4 mt-3 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: '#EF444418', border: '1px solid #EF444444' }}
        >
          <div className="flex items-center gap-2 flex-1">
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-red)' }} />
            <p className="text-sm" style={{ color: 'var(--fiq-red)' }}>{completeError}</p>
          </div>
          <button
            onClick={() => completeWorkout(lastPayloadRef.current)}
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: 'var(--fiq-red)', color: 'white' }}
          >
            <RefreshCw className="w-3 h-3" />Réessayer
          </button>
        </div>
      )}

      {/* Exercices */}
      <div className="px-4 mt-4 space-y-4">
        {groups.length === 0 && (
          <div className="fiq-card text-center py-8">
            <p className="text-3xl mb-2">💪</p>
            <p className="font-semibold" style={{ color: 'var(--fiq-text)' }}>Ajoute ton premier exercice</p>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>Clique sur le bouton ci-dessous</p>
          </div>
        )}

        {groups.map((group, gIdx) => (
          <ExerciseCard
            key={group.exercise_id + gIdx}
            group={group}
            onAddSet={() => addSet(gIdx)}
            onAddWarmup={() => addWarmupSet(gIdx)}
            onUpdateSet={(setId, key, value) => updateSet(gIdx, setId, key, value)}
            onRemoveSet={(setId) => removeSet(gIdx, setId)}
          />
        ))}

        <Button
          variant="outline"
          className="w-full py-4 font-semibold"
          onClick={() => setShowSearch(true)}
          style={{ borderColor: 'var(--fiq-border)', color: 'var(--fiq-text)', background: 'transparent' }}
        >
          <Plus className="w-4 h-4 mr-2" style={{ color: 'var(--fiq-accent)' }} />
          Ajouter un exercice
        </Button>
      </div>

      {/* ── BARRE STICKY BAS : Timer repos + chrono ────────────── */}
      {restTimer !== null && (
        <div
          className="fixed left-0 right-0 z-50 flex items-center justify-between px-4 py-3 gap-3"
          style={{
            bottom: 'calc(4rem + env(safe-area-inset-bottom))',
            background: 'rgba(17,19,24,0.92)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid #3D8BFF44',
          }}
        >
          {/* Chrono repos */}
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4" style={{ color: 'var(--fiq-blue)' }} />
            <span className="font-black text-xl fiq-data" style={{ color: 'var(--fiq-blue)' }}>
              {formatTime(restTimer)}
            </span>
            <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>repos</span>
          </div>

          {/* Durées rapides */}
          <div className="flex items-center gap-1.5">
            {[60, 90, 120, 180].map((d) => (
              <button
                key={d}
                onClick={() => startRest(d)}
                className="text-xs px-2 py-1 rounded-lg font-semibold"
                style={{
                  background: restDuration === d ? 'var(--fiq-blue)' : 'var(--fiq-faint)',
                  color: restDuration === d ? 'white' : 'var(--fiq-muted)',
                  border: '1px solid var(--fiq-border)',
                }}
              >
                {d}s
              </button>
            ))}
            <button
              onClick={stopRest}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Tonnage en cours */}
          {totalTonnage > 0 && (
            <span className="text-xs fiq-data" style={{ color: 'var(--fiq-accent)' }}>
              {Math.round(totalTonnage)} kg
            </span>
          )}
        </div>
      )}

      {/* Modal recherche exercice */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
          <div className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => { setShowSearch(false); setSearchQuery('') }}>
                <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
              </button>
              <h2 className="font-bold" style={{ color: 'var(--fiq-text)' }}>Choisir un exercice</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
              <Input
                autoFocus
                placeholder="Rechercher…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                style={{ background: 'var(--surface)', borderColor: 'var(--fiq-border)', color: 'var(--fiq-text)' }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredExercises.slice(0, 40).map((ex) => (
              <button
                key={ex.id}
                onClick={() => addExercise(ex)}
                className="w-full fiq-card flex items-start gap-3 text-left"
              >
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--fiq-text)' }}>{ex.name_fr ?? ex.name}</p>
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                    {ex.muscle_primary?.slice(0, 2).join(', ')} · {ex.equipment}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Composant exercice avec sets ──────────────────────────────
function ExerciseCard({
  group, onAddSet, onAddWarmup, onUpdateSet, onRemoveSet,
}: {
  group: ExerciseGroup
  onAddSet: () => void
  onAddWarmup: () => void
  onUpdateSet: (setId: string, key: keyof SetRow, value: string | boolean | number) => void
  onRemoveSet: (setId: string) => void
}) {
  const [showHistory, setShowHistory] = useState(false)
  const tonnage = calcTonnage(group.sets)

  return (
    <div className="fiq-card space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold" style={{ color: 'var(--fiq-text)' }}>{group.exercise_name}</h3>
          {tonnage > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-accent)' }}>
              {tonnage.toLocaleString('fr-FR')} kg tonnage
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {group.pr && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#B4FF4A22', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A44' }}>
              PR {group.pr}kg
            </span>
          )}
          {group.lastSession && group.lastSession.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)} style={{ color: 'var(--fiq-muted)' }}>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {showHistory && group.lastSession && group.lastSession.length > 0 && (
        <div className="rounded-lg p-3 space-y-1" style={{ background: 'var(--fiq-faint)' }}>
          <p className="fiq-label mb-2">Dernière séance</p>
          {group.lastSession.map((s, i) => {
            const current = group.sets[i]
            const weightDiff = current && current.weight_kg !== '' ? Number(current.weight_kg) - s.weight_kg : null
            const repsDiff = current && current.reps !== '' ? Number(current.reps) - s.reps : null
            return (
              <div key={i} className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                  Série {i + 1} : <strong style={{ color: 'var(--fiq-text)' }}>{s.weight_kg}kg × {s.reps}</strong>
                </p>
                {weightDiff !== null && weightDiff !== 0 && (
                  <span className="text-xs font-bold"
                    style={{ color: weightDiff > 0 ? 'var(--fiq-accent)' : 'var(--fiq-orange)' }}>
                    {weightDiff > 0 ? '+' : ''}{weightDiff}kg
                  </span>
                )}
                {weightDiff === 0 && repsDiff !== null && repsDiff !== 0 && (
                  <span className="text-xs font-bold"
                    style={{ color: repsDiff > 0 ? 'var(--fiq-accent)' : 'var(--fiq-orange)' }}>
                    {repsDiff > 0 ? '+' : ''}{repsDiff} reps
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-[40px_1fr_1fr_60px_32px] gap-2">
        <span className="fiq-label text-center">#</span>
        <span className="fiq-label text-center">Poids (kg)</span>
        <span className="fiq-label text-center">Reps</span>
        <span className="fiq-label text-center">RPE</span>
        <span />
      </div>

      {group.sets.map((s) => {
        const isTopSet = !s.is_warmup && s.weight_kg !== '' && s.reps !== '' &&
          Number(s.weight_kg) * Number(s.reps) === Math.max(...group.sets.filter(x => !x.is_warmup && x.weight_kg !== '' && x.reps !== '').map(x => Number(x.weight_kg) * Number(x.reps)))
        const isPR = !s.is_warmup && group.pr && s.weight_kg !== '' && Number(s.weight_kg) > group.pr

        return (
          <div key={s.id} className="grid grid-cols-[40px_1fr_1fr_60px_32px] gap-2 items-center">
            <div className="text-center">
              {isPR
                ? <span className="text-xs font-black" style={{ color: 'var(--fiq-accent)' }}>PR</span>
                : isTopSet && group.sets.filter(x => !x.is_warmup && x.weight_kg !== '').length > 1
                  ? <span className="text-xs" style={{ color: 'var(--fiq-accent)' }}>★</span>
                  : <span className="text-xs" style={{ color: s.is_warmup ? 'var(--fiq-muted)' : 'var(--fiq-text)' }}>
                      {s.is_warmup ? 'W' : s.set_number}
                    </span>
              }
            </div>
            <Input type="number" step="0.5" placeholder="—" value={s.weight_kg}
              onChange={(e) => onUpdateSet(s.id, 'weight_kg', e.target.value)}
              className="text-center text-sm h-9"
              style={{ background: 'var(--surface)', borderColor: isPR ? 'var(--fiq-accent)' : 'var(--fiq-border)', color: 'var(--fiq-text)' }}
            />
            <Input type="number" placeholder="—" value={s.reps}
              onChange={(e) => onUpdateSet(s.id, 'reps', e.target.value)}
              className="text-center text-sm h-9"
              style={{ background: 'var(--surface)', borderColor: 'var(--fiq-border)', color: 'var(--fiq-text)' }}
            />
            <Input type="number" min={1} max={10} placeholder="—" value={s.rpe}
              onChange={(e) => onUpdateSet(s.id, 'rpe', e.target.value)}
              className="text-center text-sm h-9"
              style={{ background: 'var(--surface)', borderColor: 'var(--fiq-border)', color: 'var(--fiq-text)' }}
            />
            <button onClick={() => onRemoveSet(s.id)} className="flex items-center justify-center">
              <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--fiq-muted)' }} />
            </button>
          </div>
        )
      })}

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={onAddSet} className="flex-1 text-xs"
          style={{ borderColor: 'var(--fiq-border)', color: 'var(--fiq-text)', background: 'transparent' }}>
          <Plus className="w-3.5 h-3.5 mr-1" />+ Série
        </Button>
        <Button size="sm" variant="ghost" onClick={onAddWarmup} className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          + Échauffement
        </Button>
      </div>
    </div>
  )
}
