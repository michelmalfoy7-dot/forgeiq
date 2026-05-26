'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Trash2, Check, Timer, Trophy, Search, X, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Dumbbell } from 'lucide-react'
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
  slug?: string
  muscle_primary: string[]
  equipment: string
  is_bilateral_dumbbell?: boolean
}

type ExerciseGroup = {
  exercise_id: string
  exercise_name: string
  exercise_equipment?: string
  is_bilateral_dumbbell?: boolean
  sets: SetRow[]
  lastSession?: { weight_kg: number; reps: number }[]
  pr?: number
}

// ── Utils ─────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2) }

function calcTonnage(sets: SetRow[], isBilateral = false) {
  return sets
    .filter((s) => s.weight_kg !== '' && s.reps !== '')
    .reduce((acc, s) => acc + (Number(s.weight_kg) * Number(s.reps) * (isBilateral ? 2 : 1)), 0)
}

function calcTonnageGroup(group: ExerciseGroup) {
  const workSets = group.sets.filter((s) => !s.is_warmup)
  const warmSets = group.sets.filter((s) => s.is_warmup)
  const isBilateral = group.is_bilateral_dumbbell ?? false
  return calcTonnage(workSets, isBilateral) + calcTonnage(warmSets, isBilateral)
}

export default function WorkoutSessionPage() {
  const { id: workoutId } = useParams<{ id: string }>()
  const router = useRouter()

  // Clé localStorage pour cette séance
  const STORAGE_KEY = `forgeiq_workout_${workoutId}`

  const [groups, setGroups] = useState<ExerciseGroup[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all')
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [restDuration, setRestDuration] = useState(90)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ tonnage: number; sets: number; newPRs: string[] } | null>(null)
  const [sessionName, setSessionName] = useState('Séance')
  const [elapsed, setElapsed] = useState(0)
  const [showQuitModal, setShowQuitModal] = useState(false)
  const [restoredFromStorage, setRestoredFromStorage] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPayloadRef = useRef<unknown>(null)
  // Track if initial load is done before trying to restore
  const loadedRef = useRef(false)

  // Chrono séance
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // ── Auto-save localStorage à chaque modification ──────────
  useEffect(() => {
    if (!loadedRef.current) return // Ne pas sauvegarder avant le chargement initial
    if (groups.length === 0) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          groups,
          sessionName,
          savedAt: Date.now(),
        }))
      } catch { /* quota exceeded */ }
    }, 800)
    return () => clearTimeout(timer)
  }, [groups, sessionName, STORAGE_KEY])

  // ── beforeunload : avertissement si séance en cours ───────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (groups.length > 0 && !completed) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [groups.length, completed])

  // ── Auto-save Supabase au changement de visibilité ────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && groups.length > 0) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            groups,
            sessionName,
            savedAt: Date.now(),
          }))
        } catch { /* ignore */ }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [groups, sessionName, STORAGE_KEY])

  // ── Charger les exercices + infos séance ──────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [{ data: exos }, { data: workout }] = await Promise.all([
        supabase.from('exercises_library').select('id,name,name_fr,slug,muscle_primary,equipment,is_bilateral_dumbbell').order('name_fr'),
        supabase.from('workouts').select('session_name').eq('id', workoutId).single(),
      ])

      const library: Exercise[] = (exos ?? []) as Exercise[]
      setExercises(library)
      if (workout?.session_name) setSessionName(workout.session_name)

      // Essayer de restaurer depuis localStorage d'abord
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as { groups: ExerciseGroup[]; sessionName: string; savedAt: number }
          // Données valides et récentes (< 24h)
          if (parsed.groups?.length > 0 && Date.now() - parsed.savedAt < 86400000) {
            setGroups(parsed.groups)
            if (parsed.sessionName) setSessionName(parsed.sessionName)
            loadedRef.current = true
            setRestoredFromStorage(true)
            setTimeout(() => setRestoredFromStorage(false), 4000)
            return
          }
        }
      } catch { /* ignore */ }

      // Sinon pré-charger depuis suggestion IA (sessionStorage)
      const stored = sessionStorage.getItem(`workout-exercises-${workoutId}`)
      if (stored && user) {
        sessionStorage.removeItem(`workout-exercises-${workoutId}`)
        try {
          const suggested: { name: string; slug?: string; sets: number; reps: string; weight_kg: number | null; note: string }[] = JSON.parse(stored)

          const matches = suggested
            .map((s) => ({
              s,
              // Priorité au slug (fiable même avec corruption UTF-8 dans name_fr)
              match: library.find((e) =>
                (s.slug && e.slug && e.slug === s.slug) ||
                (e.name_fr ?? '').toLowerCase() === s.name.toLowerCase() ||
                e.name.toLowerCase() === s.name.toLowerCase()
              ),
            }))
            .filter((x): x is { s: typeof suggested[0]; match: Exercise } => x.match !== undefined)

          if (matches.length > 0) {
            const matchIds = matches.map((x) => x.match.id)

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
              return {
                exercise_id: match.id,
                exercise_name: match.name_fr ?? match.name,
                exercise_equipment: match.equipment,
                is_bilateral_dumbbell: match.is_bilateral_dumbbell ?? false,
                sets, lastSession, pr,
              }
            })

            if (preloaded.length > 0) setGroups(preloaded)
          }
        } catch { /* Silencieux si parsing échoue */ }
      }

      loadedRef.current = true
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const firstSet: SetRow = {
      id: uid(), exercise_id: ex.id, exercise_name: ex.name_fr ?? ex.name,
      set_number: 1, weight_kg: lastSession[0]?.weight_kg ?? '', reps: lastSession[0]?.reps ?? '',
      rpe: '', is_warmup: false,
    }
    setGroups((prev) => [...prev, {
      exercise_id: ex.id,
      exercise_name: ex.name_fr ?? ex.name,
      exercise_equipment: ex.equipment,
      is_bilateral_dumbbell: ex.is_bilateral_dumbbell ?? false,
      sets: [firstSet], lastSession, pr,
    }])
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

    const payload = retryPayload ?? {
      workout_id: workoutId,
      // Inclure is_bilateral_dumbbell par groupe pour le calcul correct du tonnage
      sets: groups.flatMap((g) => g.sets.map((s) => ({
        exercise_id: s.exercise_id,
        exercise_name: s.exercise_name,
        set_number: s.set_number,
        weight_kg: Number(s.weight_kg) || 0,
        reps: Number(s.reps) || 0,
        rpe: Number(s.rpe) || null,
        is_warmup: s.is_warmup,
        is_bilateral_dumbbell: g.is_bilateral_dumbbell ?? false,
      }))),
      notes: null,
      rpe_overall: null,
    }

    lastPayloadRef.current = payload

    try {
      const res = await fetch('/api/workout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        setCompleteError(json.error ?? `Erreur HTTP ${res.status}`)
        return
      }

      const { data } = json
      if (data) {
        // Nettoyer localStorage après succès
        try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
        setSummary({ tonnage: data.totalTonnage ?? 0, sets: data.totalSets ?? 0, newPRs: data.newPRs ?? [] })
        setCompleted(true)
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        setCompleteError('Réponse inattendue du serveur. Réessaie.')
      }
    } catch (err) {
      setCompleteError('Erreur réseau. Vérifie ta connexion et réessaie.')
      console.error('[workout/complete] fetch error:', err)
    } finally {
      setCompleting(false)
    }
  }, [groups, workoutId, STORAGE_KEY])

  // Tonnage total séance (travail + échauffement)
  const totalTonnage = groups.reduce((acc, g) => acc + calcTonnageGroup(g), 0)
  const totalSets = groups.reduce((acc, g) => acc + g.sets.filter((s) => !s.is_warmup).length, 0)

  // Filtres équipement pour la recherche
  const EQUIPMENT_FILTERS = [
    { value: 'all', label: 'Tous' },
    { value: 'barbell', label: 'Barre' },
    { value: 'dumbbell', label: 'Haltères' },
    { value: 'cable', label: 'Câble' },
    { value: 'machine', label: 'Machine' },
    { value: 'smith', label: 'Smith' },
    { value: 'bodyweight', label: 'Corps' },
    { value: 'kettlebell', label: 'Kettlebell' },
  ]

  const filteredExercises = exercises.filter((e) => {
    const matchQuery = searchQuery.length < 2 ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.name_fr ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchEquip = equipmentFilter === 'all' || e.equipment === equipmentFilter
    return matchQuery && matchEquip
  })

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

      {/* Toast de restauration */}
      {restoredFromStorage && (
        <div
          className="fixed top-4 left-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg"
          style={{
            transform: 'translateX(-50%)',
            background: '#B4FF4A22',
            border: '1px solid #B4FF4A55',
            backdropFilter: 'blur(12px)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--fiq-accent)', fontWeight: 700 }}>
            ✓ Séance restaurée automatiquement
          </span>
        </div>
      )}

      {/* Header sticky */}
      <div
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--fiq-border)', backdropFilter: 'blur(12px)' }}
      >
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--fiq-text)' }}>{sessionName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{formatTime(elapsed)}</p>
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
          {/* Bouton quitter (si séance en cours) */}
          {groups.length > 0 && (
            <button
              onClick={() => setShowQuitModal(true)}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
            >
              Quitter
            </button>
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

      {/* ── Timer repos sticky bas ────────────────────────────── */}
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
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4" style={{ color: 'var(--fiq-blue)' }} />
            <span className="font-black text-xl fiq-data" style={{ color: 'var(--fiq-blue)' }}>
              {formatTime(restTimer)}
            </span>
            <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>repos</span>
          </div>
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
          {totalTonnage > 0 && (
            <span className="text-xs fiq-data" style={{ color: 'var(--fiq-accent)' }}>
              {Math.round(totalTonnage)} kg
            </span>
          )}
        </div>
      )}

      {/* ── BOTTOM SHEET : Recherche exercice ─────────────────── */}
      {showSearch && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => { setShowSearch(false); setSearchQuery('') }}
          />
          {/* Sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl"
            style={{
              maxHeight: 'calc(88dvh - 4rem - env(safe-area-inset-bottom))',
              background: 'var(--surface)',
              borderTop: '1px solid var(--fiq-border)',
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--fiq-border)' }} />
            </div>

            {/* Header */}
            <div className="px-4 pb-3 space-y-3" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold" style={{ color: 'var(--fiq-text)' }}>Choisir un exercice</h2>
                <button onClick={() => { setShowSearch(false); setSearchQuery('') }}>
                  <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
                <input
                  autoFocus
                  placeholder="Rechercher…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: 36,
                    paddingRight: 12,
                    paddingTop: 10,
                    paddingBottom: 10,
                    background: 'var(--bg)',
                    border: '1px solid var(--fiq-border)',
                    borderRadius: 12,
                    color: 'var(--fiq-text)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
              {/* Filtres équipement */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {EQUIPMENT_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setEquipmentFilter(f.value)}
                    style={{
                      flexShrink: 0,
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: equipmentFilter === f.value ? 'none' : '1px solid var(--fiq-border)',
                      background: equipmentFilter === f.value ? 'var(--fiq-accent)' : 'var(--bg)',
                      color: equipmentFilter === f.value ? 'var(--bg)' : 'var(--fiq-muted)',
                      fontSize: 12,
                      fontWeight: equipmentFilter === f.value ? 800 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ paddingBottom: '1rem' }}>
              {filteredExercises.length === 0 && (
                <div className="text-center py-8">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--fiq-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Aucun exercice trouvé</p>
                </div>
              )}
              {filteredExercises.slice(0, 60).map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="w-full fiq-card flex items-start gap-3 text-left"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--fiq-text)' }}>{ex.name_fr ?? ex.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                      {ex.muscle_primary?.slice(0, 2).join(', ')} · {ex.equipment}
                      {ex.is_bilateral_dumbbell && (
                        <span style={{ color: 'var(--fiq-accent)', marginLeft: 4 }}>× 2</span>
                      )}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--fiq-accent)' }} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Modal : Quitter la séance ──────────────────────────── */}
      {showQuitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)' }}
          >
            <div className="text-center">
              <p className="text-2xl mb-2">⚠️</p>
              <h3 className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>Séance en cours !</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
                Ta progression est sauvegardée automatiquement. Tu pourras la reprendre plus tard.
              </p>
            </div>
            <button
              onClick={() => setShowQuitModal(false)}
              className="w-full py-3 rounded-2xl font-black text-sm"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              Continuer la séance
            </button>
            <button
              onClick={() => {
                setShowQuitModal(false)
                // La séance reste dans localStorage pour reprendre plus tard
                router.push('/workout')
              }}
              className="w-full py-3 rounded-2xl font-semibold text-sm"
              style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
            >
              Mettre en pause
            </button>
            <button
              onClick={async () => {
                setShowQuitModal(false)
                // Supprimer la sauvegarde locale + marquer comme abandonné
                try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
                await fetch(`/api/workout/abandon`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ workout_id: workoutId }),
                }).catch(() => null)
                router.push('/workout')
              }}
              className="w-full text-sm text-center"
              style={{ color: 'var(--fiq-red)', opacity: 0.7 }}
            >
              Abandonner la séance
            </button>
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
  const [showHistory, setShowHistory] = useState(true)
  const tonnage = calcTonnageGroup(group)
  const isBilateral = group.is_bilateral_dumbbell ?? false

  return (
    <div className="fiq-card space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold" style={{ color: 'var(--fiq-text)' }}>{group.exercise_name}</h3>
          {tonnage > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-accent)' }}>
              {tonnage.toLocaleString('fr-FR')} kg
              {isBilateral && <span style={{ color: 'var(--fiq-muted)', marginLeft: 4 }}>· × 2 haltères</span>}
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

      {/* Indication tonnage × 2 si haltères bilatéraux */}
      {isBilateral && group.sets.some(s => s.weight_kg !== '') && (
        <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
          × 2 haltères — tonnage calculé sur les 2 côtés
        </p>
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
