'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Trash2, Check, Timer, Trophy, Search, X, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Dumbbell, Zap, MessageCircle } from 'lucide-react'
import { FiqDumbbell, FiqPR, FiqStreak, FiqCircuit, FiqCheck, FiqAlert } from '@/components/ui/FiqIcons'
import { Confetti } from '@/components/ui/Confetti'
import { PlateCalculatorModal } from '@/components/workout/PlateCalculatorModal'
import { roundWeight, weightDelta } from '@/lib/utils/numbers'

// ── Types ─────────────────────────────────────────────────────
type SetType = 'work' | 'top_set' | 'backoff' | 'dropset' | 'failure'

type SetRow = {
  id: string
  exercise_id: string
  exercise_name: string
  set_number: number
  weight_kg: string | number   // string pendant la saisie (supporte virgule locale)
  reps: number | ''
  rpe: string | number         // string pendant la saisie
  is_warmup: boolean
  set_type?: SetType           // type de série : travail / drop set / échec
}

/** Normalise virgule → point et parse un poids flottant sans NaN */
function parseWeight(val: string | number): number | string {
  if (val === '' || val === null || val === undefined) return ''
  const normalized = String(val).replace(',', '.')
  // Garder comme string si l'utilisateur est en train de saisir "6." ou "6.8"
  // Number() convertit "6." → 6, donc on préserve la string pour le rendu
  if (normalized.endsWith('.')) return normalized
  const n = parseFloat(normalized)
  return isNaN(n) ? '' : n
}

type Exercise = {
  id: string
  name: string
  name_fr: string
  slug?: string
  muscle_primary: string[]
  equipment: string
  is_bilateral_dumbbell?: boolean
  is_unilateral?: boolean
  aliases?: { alias: string }[]
}

type ExerciseGroup = {
  exercise_id: string
  exercise_name: string
  exercise_equipment?: string
  is_bilateral_dumbbell?: boolean
  is_unilateral?: boolean
  // Toggle × 2 côtés pour exercices unilatéraux (défaut true = on fait les 2 côtés)
  unilateral_both_sides?: boolean
  sets: SetRow[]
  lastSession?: { weight_kg: number; reps: number }[]
  pr?: number
  // Superset : exercices avec le même superset_id sont visuellement liés
  superset_id?: string | null
}

// ── Utils ─────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2) }

function calcTonnage(sets: SetRow[], isBilateral = false) {
  return sets
    .filter((s) => s.weight_kg !== '' && s.reps !== '')
    .reduce((acc, s) => {
      const w = parseFloat(String(s.weight_kg).replace(',', '.')) || 0
      const r = Number(s.reps) || 0
      return acc + w * r * (isBilateral ? 2 : 1)
    }, 0)
}

function calcTonnageGroup(group: ExerciseGroup) {
  const workSets = group.sets.filter((s) => !s.is_warmup)
  const warmSets = group.sets.filter((s) => s.is_warmup)
  // × 2 si haltères bilatéraux OU exercice unilatéral avec toggle "2 côtés" actif
  const isDouble = (group.is_bilateral_dumbbell ?? false) ||
    (group.is_unilateral === true && (group.unilateral_both_sides ?? true))
  return calcTonnage(workSets, isDouble) + calcTonnage(warmSets, isDouble)
}

// ── Helpers circuits ──────────────────────────────────────────
/** Nombre d'exercices partageant le même superset_id */
function getLinkedCount(ssId: string, groups: ExerciseGroup[]): number {
  return groups.filter(g => g.superset_id === ssId).length
}

/**
 * Retourne la lettre du circuit ("A", "B"…) pour un ssId donné.
 * Seuls les groupes avec 3+ exercices liés sont considérés comme circuits.
 */
function getCircuitLetter(ssId: string, groups: ExerciseGroup[]): string {
  const seen: string[] = []
  for (const g of groups) {
    if (g.superset_id && !seen.includes(g.superset_id) && getLinkedCount(g.superset_id, groups) >= 3) {
      seen.push(g.superset_id)
    }
  }
  const idx = seen.indexOf(ssId)
  return String.fromCharCode(65 + Math.max(0, idx))  // A, B, C…
}

/** Position 1-based d'un exercice dans son groupe (superset ou circuit) */
function getPositionInGroup(gIdx: number, groups: ExerciseGroup[]): number {
  const ssId = groups[gIdx].superset_id
  if (!ssId) return 0
  const firstIdx = groups.findIndex(g => g.superset_id === ssId)
  return gIdx - firstIdx + 1
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
  const [muscleFilter, setMuscleFilter] = useState<string>('all')
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
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  // Superset : index du groupe qui attend un exercice partenaire (-1 = mode normal)
  const [supersetTargetIdx, setSupersetTargetIdx] = useState<number | null>(null)
  // Édition nom de séance en ligne
  const [editingName, setEditingName] = useState(false)
  // États partage post-séance
  const [shareCaption, setShareCaption] = useState('')
  const [sharing, setSharing] = useState(false)
  const [sharePosted, setSharePosted] = useState(false)
  const [shareDismissed, setShareDismissed] = useState(false)
  const [shareId, setShareId] = useState<string | null>(null)
  const [sharingCard, setSharingCard] = useState(false)
  // Programme lié à la séance (pour "sauvegarder la routine")
  const [programId, setProgramId]             = useState<string | null>(null)
  const [programName, setProgramName]         = useState<string>('')
  const [showSaveRoutine, setShowSaveRoutine] = useState(false)
  const [savingRoutine, setSavingRoutine]     = useState(false)
  const [routineSaved, setRoutineSaved]       = useState(false)
  // Bilan IA post-séance
  const [aiInsights, setAiInsights] = useState<{
    congrats: string
    insights: { emoji: string; title: string; text: string }[]
    suggestions?: { emoji: string; action: string; detail: string }[]
  } | null>(null)
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Timestamp de début séance — résistant au background
  const workoutStartRef = useRef<number>(Date.now())
  // Timestamp de fin du repos (Date.now() + durée)
  const restEndRef = useRef<number | null>(null)
  const lastPayloadRef = useRef<unknown>(null)
  // Track if initial load is done before trying to restore
  const loadedRef = useRef(false)

  // ── Demande permission notifications au montage ───────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => setNotifPermission(p))
    } else if ('Notification' in window) {
      setNotifPermission(Notification.permission)
    }
  }, [])

  // ── Chrono séance — timestamp-based (résistant au background) ─
  useEffect(() => {
    // Restaurer le timestamp de démarrage depuis localStorage si disponible
    const stored = localStorage.getItem(`forgeiq_start_${workoutId}`)
    workoutStartRef.current = stored ? parseInt(stored, 10) : Date.now()
    if (!stored) localStorage.setItem(`forgeiq_start_${workoutId}`, String(workoutStartRef.current))

    // Calculer elapsed depuis le timestamp réel (pas de compteur)
    const tick = () => setElapsed(Math.floor((Date.now() - workoutStartRef.current) / 1000))
    tick() // mise à jour immédiate
    timerRef.current = setInterval(tick, 1000)

    // Recalculer quand l'app revient au premier plan (visibilité)
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Auto-save serveur toutes les 30s ─────────────────────
  useEffect(() => {
    if (!loadedRef.current || groups.length === 0 || completed) return
    const saveDraft = () => {
      fetch('/api/workout/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout_id: workoutId, groups, session_name: sessionName }),
      }).catch(() => { /* silencieux */ })
    }
    const interval = setInterval(saveDraft, 30000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, sessionName, completed])

  // ── Auto-save Supabase au changement de visibilité ────────
  useEffect(() => {
    const handleVisibility = () => {
      if (!loadedRef.current) return // Ne pas sauvegarder avant le chargement initial
      if (document.visibilityState === 'hidden' && groups.length > 0 && !completed) {
        // LocalStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            groups,
            sessionName,
            savedAt: Date.now(),
          }))
        } catch { /* ignore */ }
        // Serveur (fire-and-forget)
        fetch('/api/workout/save-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workout_id: workoutId, groups, session_name: sessionName }),
        }).catch(() => { /* silencieux */ })
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

      const [{ data: exos }, { data: workout }, { data: aliasRows }] = await Promise.all([
        supabase.from('exercises_library').select('id,name,name_fr,slug,muscle_primary,equipment,is_bilateral_dumbbell,is_unilateral').order('name_fr'),
        supabase.from('workouts').select('session_name, completed_at, program_id').eq('id', workoutId).single(),
        supabase.from('exercise_aliases').select('exercise_id, alias'),
      ])

      // Séance déjà terminée en base → rediriger immédiatement (évite le retour via back button)
      if (workout?.completed_at) {
        router.replace('/dashboard')
        return
      }

      // Grouper les aliases par exercice
      const aliasMap: Record<string, { alias: string }[]> = {}
      for (const a of (aliasRows ?? [])) {
        if (!aliasMap[a.exercise_id]) aliasMap[a.exercise_id] = []
        aliasMap[a.exercise_id].push({ alias: a.alias })
      }

      const library: Exercise[] = (exos ?? []).map(ex => ({
        ...ex,
        aliases: aliasMap[(ex as { id: string }).id] ?? [],
      })) as Exercise[]
      setExercises(library)
      if (workout?.session_name) setSessionName(workout.session_name)

      // Charger le nom du programme si la séance y est liée
      if (workout?.program_id) {
        setProgramId(workout.program_id)
        try {
          const { data: prog } = await supabase
            .from('programs').select('name').eq('id', workout.program_id).single()
          if (prog?.name) setProgramName(prog.name)
        } catch { /* silencieux */ }
      }

      // 1. Essayer de restaurer depuis localStorage d'abord (le plus rapide)
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as { groups: ExerciseGroup[]; sessionName: string; savedAt: number }
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

      // 2. Fallback : restaurer depuis le draft Supabase (autre appareil / cache vidé)
      try {
        const draftRes = await fetch(`/api/workout/save-draft?workout_id=${workoutId}`)
        const { data: draft } = await draftRes.json()
        if (draft?.groups?.length > 0) {
          // Vérifier que le draft n'est pas trop ancien (> 24h) pour éviter
          // de charger un état obsolète après une longue absence
          const draftSavedAt = draft.saved_at ? new Date(draft.saved_at).getTime() : 0
          if (Date.now() - draftSavedAt > 86400000) {
            // Draft trop ancien — ignorer et laisser la séance partir vide
          } else {
            setGroups(draft.groups)
            if (draft.session_name) setSessionName(draft.session_name)
            // Ré-hydrater localStorage pour les prochains accès
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              groups: draft.groups,
              sessionName: draft.session_name,
              savedAt: draftSavedAt || Date.now(),
            }))
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

          // Pour chaque exercice suggéré, on cherche le match en bibliothèque.
          // Si aucun match (ex: machine Hammer Strength non en bibliothèque, nom by_tier
          // résolu différemment), on l'ajoute quand même sans données lastSession/PR.
          // Avant : les exercices sans match étaient silencieusement supprimés → séance incomplète.
          //
          // Normalisation : retire accents, tirets, caractères spéciaux → réduit les faux non-matchs
          const normName = (s: string) =>
            s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-_]/g, ' ')
             .replace(/[^a-z0-9 ]/gi, '').replace(/\s+/g, ' ').trim().toLowerCase()

          const withMatches = suggested.map((s) => ({
            s,
            match: library.find((e) =>
              (s.slug && e.slug && e.slug === s.slug) ||
              normName(e.name_fr ?? '') === normName(s.name) ||
              normName(e.name) === normName(s.name) ||
              (e.aliases ?? []).some(a => normName(a.alias) === normName(s.name))
            ) ?? null,
          }))

          // Récupérer lastSession + PRs pour les exercices trouvés en bibliothèque
          const matchedItems = withMatches.filter((x): x is { s: typeof suggested[0]; match: Exercise } => x.match !== null)
          const matchIds = matchedItems.map((x) => x.match.id)

          const [{ data: allLastSets }, { data: allPRs }] = matchIds.length > 0
            ? await Promise.all([
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
            : [{ data: [] }, { data: [] }]

          const lastSetsByEx: Record<string, { weight_kg: number; reps: number }[]> = {}
          for (const s of allLastSets ?? []) {
            const exId = (s as { exercise_id: string }).exercise_id
            if (!lastSetsByEx[exId]) lastSetsByEx[exId] = []
            if (lastSetsByEx[exId].length < 4) lastSetsByEx[exId].push({ weight_kg: s.weight_kg, reps: s.reps })
          }
          const prByEx: Record<string, number> = {}
          for (const pr of allPRs ?? []) prByEx[pr.exercise_id] = pr.value

          const preloaded: ExerciseGroup[] = withMatches.map(({ s, match }) => {
            if (match) {
              // Exercice trouvé en bibliothèque → données complètes (lastSession, PR)
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
                is_unilateral: match.is_unilateral ?? false,
                unilateral_both_sides: true,
                sets, lastSession, pr,
              }
            } else {
              // Exercice non trouvé en bibliothèque (nom résolu by_tier non indexé) →
              // on l'ajoute quand même avec un ID fictif pour ne pas perdre la séance
              const fallbackId = `suggested-${uid()}`
              const count = s.sets ?? 3
              const initWeight: number | '' = s.weight_kg ?? ''
              const sets: SetRow[] = Array.from({ length: count }, (_, i) => ({
                id: uid(), exercise_id: fallbackId, exercise_name: s.name,
                set_number: i + 1, weight_kg: initWeight, reps: '', rpe: '', is_warmup: false,
              }))
              return {
                exercise_id: fallbackId,
                exercise_name: s.name,
                exercise_equipment: undefined,
                is_bilateral_dumbbell: false,
                is_unilateral: false,
                unilateral_both_sides: true,
                sets, lastSession: [], pr: undefined,
              }
            }
          })

          if (preloaded.length > 0) setGroups(preloaded)
        } catch { /* Silencieux si parsing échoue */ }
      }

      loadedRef.current = true
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId])

  // ── Timer repos — timestamp-based + notification ──────────
  const restVisibilityRef = useRef<(() => void) | null>(null)

  function playGoSound() {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.18)
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    } catch { /* AudioContext indisponible */ }
  }

  function startRest(seconds = restDuration) {
    // Nettoyer le timer précédent
    if (restRef.current) clearInterval(restRef.current)
    if (restVisibilityRef.current) document.removeEventListener('visibilitychange', restVisibilityRef.current)

    setRestDuration(seconds)
    restEndRef.current = Date.now() + seconds * 1000

    const tick = () => {
      if (restEndRef.current === null) return
      const remaining = Math.max(0, Math.round((restEndRef.current - Date.now()) / 1000))
      if (remaining <= 0) {
        if (restRef.current) clearInterval(restRef.current)
        restEndRef.current = null
        setRestTimer(null)
        // ── Signaler la fin du repos ───────────────────────
        playGoSound()
        if ('vibrate' in navigator) navigator.vibrate([300, 100, 300])
        if ('Notification' in window && Notification.permission === 'granted'
            && document.visibilityState !== 'visible') {
          try {
            new Notification('ForgeIQ', {
              body: 'Repos terminé — GO !',
              icon: '/icons/icon-192.png',
              tag: 'rest-timer',
            })
          } catch { /* ignore */ }
        }
      } else {
        setRestTimer(remaining)
      }
    }

    tick()
    restRef.current = setInterval(tick, 500)

    // Visibilitychange — recalcule quand l'app revient au premier plan
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    restVisibilityRef.current = onVisible
  }

  function stopRest() {
    if (restRef.current) clearInterval(restRef.current)
    if (restVisibilityRef.current) {
      document.removeEventListener('visibilitychange', restVisibilityRef.current)
      restVisibilityRef.current = null
    }
    restEndRef.current = null
    setRestTimer(null)
  }

  useEffect(() => () => {
    if (restRef.current) clearInterval(restRef.current)
    if (restVisibilityRef.current) document.removeEventListener('visibilitychange', restVisibilityRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch lastSession + PR pour un exercice ──────────────────
  async function fetchExerciseData(exId: string): Promise<{
    lastSession: { weight_kg: number; reps: number }[]
    pr: number | undefined
  }> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { lastSession: [], pr: undefined }
    const { data: lastSets } = await supabase.from('workout_sets')
      .select('weight_kg, reps, workout_id, workouts!inner(user_id, session_date)')
      .eq('exercise_id', exId).eq('workouts.user_id', user.id)
      .not('is_warmup', 'eq', true).order('created_at', { ascending: false }).limit(6)
    const lastSession = (lastSets ?? []).slice(0, 4).map((s: {weight_kg: number; reps: number}) => ({ weight_kg: s.weight_kg, reps: s.reps }))
    const { data: prData } = await supabase.from('personal_records').select('value')
      .eq('exercise_id', exId).eq('user_id', user.id).eq('record_type', 'top_set').maybeSingle()
    return { lastSession, pr: prData?.value }
  }

  async function addExercise(ex: Exercise) {
    const { lastSession, pr } = await fetchExerciseData(ex.id)

    const firstSet: SetRow = {
      id: uid(), exercise_id: ex.id, exercise_name: ex.name_fr ?? ex.name,
      set_number: 1, weight_kg: lastSession[0]?.weight_kg ?? '', reps: lastSession[0]?.reps ?? '',
      rpe: '', is_warmup: false, set_type: 'work',
    }

    if (supersetTargetIdx !== null) {
      // Mode superset : lier le nouvel exercice au groupe existant
      const targetIdx = supersetTargetIdx
      setGroups((prev) => {
        const target = prev[targetIdx]
        const ssId = target.superset_id ?? uid()
        // Insérer juste après le dernier exercice lié au même superset
        const lastLinkedIdx = prev.reduce((last, g, i) =>
          (g.superset_id === ssId && i > last) ? i : last, targetIdx)
        const newGroup: ExerciseGroup = {
          exercise_id: ex.id,
          exercise_name: ex.name_fr ?? ex.name,
          exercise_equipment: ex.equipment,
          is_bilateral_dumbbell: ex.is_bilateral_dumbbell ?? false,
          is_unilateral: ex.is_unilateral ?? false,
          unilateral_both_sides: true,
          sets: [firstSet], lastSession, pr,
          superset_id: ssId,
        }
        const updated = [...prev]
        updated[targetIdx] = { ...target, superset_id: ssId }
        updated.splice(lastLinkedIdx + 1, 0, newGroup)
        return updated
      })
      setSupersetTargetIdx(null)
    } else {
      setGroups((prev) => [...prev, {
        exercise_id: ex.id,
        exercise_name: ex.name_fr ?? ex.name,
        exercise_equipment: ex.equipment,
        is_bilateral_dumbbell: ex.is_bilateral_dumbbell ?? false,
        is_unilateral: ex.is_unilateral ?? false,
        unilateral_both_sides: true,
        sets: [firstSet], lastSession, pr,
      }])
    }
    setShowSearch(false)
    setSearchQuery('')
  }

  // ── Cycler le type d'une série : travail → drop set → échec → travail ─
  function cycleSetType(groupIdx: number, setId: string) {
    setGroups((prev) => {
      const updated = [...prev]
      updated[groupIdx] = {
        ...updated[groupIdx],
        sets: updated[groupIdx].sets.map((s) => {
          if (s.id !== setId || s.is_warmup) return s
          const order: SetType[] = ['work', 'top_set', 'backoff', 'dropset', 'failure']
          const cur = s.set_type ?? 'work'
          const next = order[(order.indexOf(cur) + 1) % order.length]
          return { ...s, set_type: next }
        }),
      }
      return updated
    })
  }

  // ── Ajouter un drop set (copie du dernier set, type = dropset) ──
  function addDropSet(groupIdx: number) {
    setGroups((prev) => {
      const g = prev[groupIdx]
      const lastWork = [...g.sets].reverse().find(s => !s.is_warmup)
      const newSet: SetRow = {
        id: uid(), exercise_id: g.exercise_id, exercise_name: g.exercise_name,
        set_number: g.sets.filter(s => !s.is_warmup).length + 1,
        weight_kg: lastWork?.weight_kg ?? '', reps: lastWork?.reps ?? '',
        rpe: '', is_warmup: false, set_type: 'dropset',
      }
      const updated = [...prev]
      updated[groupIdx] = { ...g, sets: [...g.sets, newSet] }
      return updated
    })
    startRest()
  }

  // ── Délier un exercice de son superset ─────────────────────
  function removeSuperset(groupIdx: number) {
    setGroups((prev) => {
      const updated = [...prev]
      const ssId = updated[groupIdx].superset_id
      if (!ssId) return updated
      // Délier le groupe courant
      updated[groupIdx] = { ...updated[groupIdx], superset_id: null }
      // Si un seul exercice reste dans le superset, le délier aussi
      const remaining = updated.filter((g, i) => i !== groupIdx && g.superset_id === ssId)
      if (remaining.length === 1) {
        const lastIdx = updated.findIndex((g, i) => i !== groupIdx && g.superset_id === ssId)
        if (lastIdx >= 0) updated[lastIdx] = { ...updated[lastIdx], superset_id: null }
      }
      return updated
    })
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
        sets: updated[groupIdx].sets.map((s) => {
          if (s.id !== setId) return s
          if (key === 'weight_kg') {
            // Stocker en string normalisée (virgule → point) pendant la saisie
            // Ça permet "6." comme état intermédiaire sans perdre le point décimal
            if (value === '') return { ...s, weight_kg: '' }
            const norm = String(value).replace(',', '.')
            return { ...s, weight_kg: norm }
          }
          if (key === 'rpe') {
            if (value === '') return { ...s, rpe: '' }
            const norm = String(value).replace(',', '.')
            return { ...s, rpe: norm }
          }
          if (key === 'reps') {
            return { ...s, reps: value === '' ? '' : parseInt(String(value), 10) }
          }
          return { ...s, [key]: value }
        }),
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

  function toggleUnilateralSides(groupIdx: number) {
    setGroups((prev) => {
      const updated = [...prev]
      const g = updated[groupIdx]
      updated[groupIdx] = { ...g, unilateral_both_sides: !(g.unilateral_both_sides ?? true) }
      return updated
    })
  }

  // ── Déplacer un exercice vers le haut ou le bas ─────────────
  function moveGroup(groupIdx: number, direction: 'up' | 'down') {
    setGroups((prev) => {
      const target = direction === 'up' ? groupIdx - 1 : groupIdx + 1
      if (target < 0 || target >= prev.length) return prev
      const updated = [...prev]
      ;[updated[groupIdx], updated[target]] = [updated[target], updated[groupIdx]]
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
        // Les IDs "suggested-..." sont fictifs (exercice non trouvé en bibliothèque) → null pour éviter la contrainte FK
        exercise_id: s.exercise_id.startsWith('suggested-') ? null : s.exercise_id,
        exercise_name: s.exercise_name,
        set_number: s.set_number,
        weight_kg: parseFloat(String(s.weight_kg).replace(',', '.')) || 0,
        reps: Number(s.reps) || 0,
        rpe: s.rpe !== '' && s.rpe !== null ? parseFloat(String(s.rpe).replace(',', '.')) : null,
        is_warmup: s.is_warmup,
        set_type: s.is_warmup ? 'warmup' : (s.set_type ?? 'work'),
        is_bilateral_dumbbell: g.is_bilateral_dumbbell ?? false,
        is_unilateral: g.is_unilateral ?? false,
        unilateral_both_sides: g.unilateral_both_sides ?? true,
        superset_id: g.superset_id ?? null,
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
        // Nettoyer TOUT le localStorage lié à cette séance
        try {
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(`forgeiq_start_${workoutId}`)
          window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
        } catch { /* ignore */ }
        // Effacer le draft serveur (séance terminée)
        fetch('/api/workout/save-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workout_id: workoutId, groups: [], session_name: sessionName }),
        }).catch(() => { /* silencieux */ })
        setSummary({ tonnage: data.totalTonnage ?? 0, sets: data.totalSets ?? 0, newPRs: data.newPRs ?? [] })
        setCompleted(true)
        if (timerRef.current) clearInterval(timerRef.current)
        stopRest()
        // Lancer le bilan IA en arrière-plan (non bloquant)
        setAiInsightsLoading(true)
        fetch('/api/workout/bilan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workout_id: workoutId }),
        })
          .then(r => r.json())
          .then(({ data: bilan }) => { if (bilan) setAiInsights(bilan) })
          .catch(() => { /* silencieux — bilan optionnel */ })
          .finally(() => setAiInsightsLoading(false))
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
    { value: 'bodyweight', label: 'Corps' },
  ]

  const MUSCLE_FILTERS = [
    { value: 'all', label: 'Tous' },
    { value: 'chest', label: 'Poitrine' },
    { value: 'back', label: 'Dos', keys: ['lats', 'mid_back', 'upper_back', 'lower_back'] },
    { value: 'shoulders', label: 'Épaules', keys: ['front_delt', 'side_delt', 'rear_delt'] },
    { value: 'biceps', label: 'Biceps' },
    { value: 'triceps', label: 'Triceps' },
    { value: 'legs', label: 'Jambes', keys: ['quads', 'hamstrings', 'glutes', 'calves'] },
    { value: 'core', label: 'Abdos', keys: ['abs', 'core', 'obliques'] },
  ]

  // Exercices récemment utilisés (pour les remonter dans les résultats)
  const recentExerciseIds = new Set(groups.map(g => g.exercise_id))

  // Normalisation identique à ExerciseBrowser (accents + tirets)
  const normEx = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-_]/g, ' ').replace(/[^a-z0-9 ]/gi, '').replace(/\s+/g, ' ').trim().toLowerCase()

  const filteredExercises = exercises
    .filter((e) => {
      const rawQ = searchQuery.trim()
      const q = normEx(rawQ)
      const matchQuery = rawQ.length < 1 ||
        normEx(e.name_fr ?? '').includes(q) ||
        normEx(e.name).includes(q) ||
        (e.muscle_primary ?? []).some(m => normEx(m).includes(q)) ||
        (e.aliases ?? []).some(a => normEx(a.alias).includes(q))
      // Filtre équipement
      const matchEquip = equipmentFilter === 'all' || e.equipment === equipmentFilter
      // Filtre groupe musculaire
      const mf = MUSCLE_FILTERS.find(f => f.value === muscleFilter)
      const muscleKeys = mf?.keys ?? (muscleFilter === 'all' ? null : [muscleFilter])
      const matchMuscle = !muscleKeys || (e.muscle_primary ?? []).some(m => muscleKeys.includes(m))
      return matchQuery && matchEquip && matchMuscle
    })
    .sort((a, b) => {
      const rawQ = searchQuery.trim()
      if (rawQ.length < 1) {
        // Sans recherche : exercices déjà dans la séance en bas
        const aRecent = recentExerciseIds.has(a.id) ? 1 : 0
        const bRecent = recentExerciseIds.has(b.id) ? 1 : 0
        return aRecent - bRecent
      }
      const q = normEx(rawQ)
      // Exact match nom_fr > starts with > contains
      const aFr = normEx(a.name_fr ?? '')
      const bFr = normEx(b.name_fr ?? '')
      const aScore = aFr === q ? 0 : aFr.startsWith(q) ? 1 : 2
      const bScore = bFr === q ? 0 : bFr.startsWith(q) ? 1 : 2
      return aScore - bScore
    })

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ── Partage natif mobile ──────────────────────────────────
  async function handleNativeShare() {
    const stats = `${sessionName} · ${summary?.tonnage.toLocaleString('fr-FR')} kg soulevés · ${summary?.sets} séries`
      + (summary && summary.newPRs.length > 0 ? ` · ${summary.newPRs.length} PR${summary.newPRs.length > 1 ? 's' : ''}` : '')
    const caption = shareCaption.trim()
    // Inclure le message utilisateur en tête si présent
    const text = caption ? `${caption}\n\n${stats}` : stats
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ForgeIQ — Ma séance',
          text,
          url: 'https://getforgeiq.com',
        })
      } else {
        await navigator.clipboard.writeText(`${text}\n\nhttps://getforgeiq.com`)
      }
    } catch { /* Annulé par l'utilisateur */ }
  }

  // ── Partage dans le feed ForgeIQ ─────────────────────────
  async function handleShareToFeed() {
    if (sharing) return
    setSharing(true)
    try {
      const res  = await fetch('/api/social/share', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ workout_id: workoutId, caption: shareCaption }),
      })
      const json = await res.json() as { data: { id: string } | null; error: string | null }
      if (!json.error && json.data?.id) {
        setShareId(json.data.id)
        setSharePosted(true)
      }
    } catch { /* Erreur réseau silencieuse */ }
    finally { setSharing(false) }
  }

  // ── Partage carte image PNG (post + natif) ────────────────
  async function handleShareCard(id: string) {
    if (sharingCard) return
    setSharingCard(true)
    const slug = sessionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const fallbackText = [
      `${sessionName} — via ForgeIQ`,
      summary ? `${summary.tonnage.toLocaleString('fr-FR')} kg · ${summary.sets} séries` : '',
      shareCaption.trim(),
      'getforgeiq.com',
    ].filter(Boolean).join('\n')
    try {
      const cardRes = await fetch(`/api/social/card?id=${id}`)
      if (cardRes.ok) {
        const blob = await cardRes.blob()
        const file = new File([blob], `forgeiq-${slug}.png`, { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: fallbackText })
          return
        }
        // Fallback : télécharger l'image
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href = url; a.download = `forgeiq-${slug}.png`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        return
      }
    } catch { /* Fallback texte */ }
    finally   { setSharingCard(false) }
    // Fallback texte
    if (navigator.share) await navigator.share({ text: fallbackText }).catch(() => {})
    else await navigator.clipboard.writeText(fallbackText).catch(() => {})
  }

  // ── Sauvegarder la routine modifiée dans le programme ───────
  async function saveRoutine() {
    if (!programId || savingRoutine) return
    setSavingRoutine(true)
    try {
      const exercisePayload = groups.map(g => ({
        exercise_id: g.exercise_id,
        name_fr:     g.exercise_name,
        set_count:   Math.max(1, g.sets.filter(s => !s.is_warmup).length),
      }))

      const res = await fetch('/api/programs/update-session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout_id: workoutId, exercises: exercisePayload }),
      })
      const json = await res.json() as { data: unknown; error: string | null }
      if (!json.error) {
        setRoutineSaved(true)
        setShowSaveRoutine(false)
        setTimeout(() => setRoutineSaved(false), 3000)
      }
    } catch { /* silencieux */ }
    finally { setSavingRoutine(false) }
  }

  // ── Écran de fin ───────────────────────────────────────────
  if (completed && summary) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        {summary.newPRs.length > 0 && <Confetti active />}
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex justify-center">
            <FiqPR size={52} style={{ color: 'var(--fiq-accent)' }} />
          </div>
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
                <p key={name} className="text-sm flex items-center gap-1.5" style={{ color: 'var(--fiq-text)' }}>
                  <Check className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
                  {name}
                </p>
              ))}
            </div>
          )}

          {/* ── Bilan IA ForgeIQ ── */}
          {(aiInsightsLoading || aiInsights) && (
            <div className="fiq-card text-left space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--fiq-accent)' }}>
                  <Zap className="w-3 h-3" style={{ color: 'var(--bg)' }} />
                </div>
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--fiq-accent)' }}>
                  Analyse ForgeIQ
                </p>
              </div>

              {aiInsightsLoading ? (
                <div className="flex items-center gap-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--fiq-accent)' }} />
                  <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Analyse de ta séance en cours…</p>
                </div>
              ) : aiInsights ? (
                <>
                  <p className="text-base font-black leading-snug" style={{ color: 'var(--fiq-text)' }}>
                    {aiInsights.congrats}
                  </p>

                  {/* Observations */}
                  <div className="space-y-3 pt-1">
                    {aiInsights.insights.map((insight, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-xl shrink-0 mt-0.5">{insight.emoji}</span>
                        <div>
                          <p className="text-sm font-black mb-0.5" style={{ color: 'var(--fiq-text)' }}>
                            {insight.title}
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
                            {insight.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Suggestions — prochaines actions concrètes */}
                  {aiInsights.suggestions && aiInsights.suggestions.length > 0 && (
                    <div className="pt-3 border-t" style={{ borderColor: 'var(--fiq-border)' }}>
                      <p className="text-[10px] uppercase tracking-wider font-bold mb-2.5"
                        style={{ color: 'var(--fiq-muted)' }}>
                        Prochaines actions
                      </p>
                      <div className="space-y-2">
                        {aiInsights.suggestions.map((s, i) => (
                          <div
                            key={i}
                            className="flex gap-2.5 px-3 py-2.5 rounded-xl"
                            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
                          >
                            <span className="text-base shrink-0">{s.emoji}</span>
                            <div>
                              <p className="text-xs font-black mb-0.5" style={{ color: 'var(--fiq-accent)' }}>
                                {s.action}
                              </p>
                              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
                                {s.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA Coach — creuser plus loin */}
                  <a
                    href="/coach"
                    className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black"
                    style={{ border: '1px solid #3D8BFF44', color: '#3D8BFF', background: '#3D8BFF0A' }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Creuser avec le coach →
                  </a>
                </>
              ) : null}
            </div>
          )}

          {/* ── Card partage post-séance ── */}
          {!shareDismissed && !sharePosted && (
            <div
              className="space-y-3 rounded-2xl p-4 text-left"
              style={{ background: '#B4FF4A08', border: '1px solid #B4FF4A30' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>
                  <FiqStreak size={14} style={{ color: 'var(--fiq-orange)', display: 'inline', marginRight: 4 }} />
                  Fais voir ta séance !
                </p>
                <button onClick={() => setShareDismissed(true)} className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                  Passer
                </button>
              </div>

              {/* Mini preview carte ForgeIQ */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: '#0A0C0F', border: '1px solid #1F242E' }}
              >
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black"
                        style={{ background: 'var(--fiq-accent)', color: '#0A0C0F' }}>F</div>
                      <span className="text-[9px] font-black tracking-widest" style={{ color: 'var(--fiq-accent)' }}>FORGEIQ</span>
                    </div>
                  </div>
                  <p className="text-base font-black leading-tight" style={{ color: '#F0F2F5', letterSpacing: '-0.02em' }}>
                    {sessionName}
                  </p>
                  <div className="h-0.5 w-8 rounded-full mt-2 mb-3" style={{ background: 'var(--fiq-accent)' }} />
                  <div className="flex gap-4">
                    <div>
                      <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                        {summary.tonnage >= 1000
                          ? `${(summary.tonnage / 1000).toFixed(1)}t`
                          : `${Math.round(summary.tonnage)} kg`}
                      </p>
                      <p className="text-[9px] uppercase tracking-widest" style={{ color: '#6B7280' }}>soulevés</p>
                    </div>
                    <div>
                      <p className="text-lg font-black fiq-data" style={{ color: '#F0F2F5' }}>{summary.sets}</p>
                      <p className="text-[9px] uppercase tracking-widest" style={{ color: '#6B7280' }}>séries</p>
                    </div>
                    {summary.newPRs.length > 0 && (
                      <div>
                        <p className="text-lg font-black fiq-data flex items-center gap-1" style={{ color: 'var(--fiq-yellow)' }}>
                          <FiqPR size={16} />
                          {summary.newPRs.length}
                        </p>
                        <p className="text-[9px] uppercase tracking-widest" style={{ color: '#6B7280' }}>
                          PR{summary.newPRs.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div className="space-y-1">
                <textarea
                  placeholder="Ressenti, contexte, message…"
                  value={shareCaption}
                  onChange={(e) => setShareCaption(e.target.value.slice(0, 150))}
                  rows={2}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)',
                    color: 'var(--fiq-text)', fontSize: 13, resize: 'none', outline: 'none',
                  }}
                />
                <p className="text-right text-[10px]" style={{ color: shareCaption.length >= 140 ? 'var(--fiq-orange)' : 'var(--fiq-muted)' }}>
                  {shareCaption.length}/150
                </p>
              </div>

              {/* Bouton principal : poster + générer carte */}
              <button
                onClick={handleShareToFeed}
                disabled={sharing}
                className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
              >
                {sharing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication…</>
                  : <><Plus className="w-4 h-4" /> Poster sur ForgeIQ</>
                }
              </button>
            </div>
          )}

          {/* ── Après publication : partage carte image ── */}
          {sharePosted && shareId && (
            <div
              className="rounded-2xl p-4 space-y-3 text-left"
              style={{ background: '#B4FF4A10', border: '1px solid #B4FF4A40' }}
            >
              <div className="flex items-center gap-2">
                <FiqCheck size={22} style={{ color: 'var(--fiq-accent)' }} />
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--fiq-accent)' }}>Live sur ForgeIQ !</p>
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Ta séance est visible dans la communauté</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleShareCard(shareId)}
                  disabled={sharingCard}
                  className="flex-1 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                >
                  {sharingCard
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</>
                    : <>Partager la carte</>
                  }
                </button>
                <a
                  href="/social"
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
                >
                  Voir le feed →
                </a>
              </div>
            </div>
          )}

          {sharePosted && !shareId && (
            <p className="text-xs text-center flex items-center justify-center gap-1" style={{ color: 'var(--fiq-accent)' }}>
              <FiqCheck size={13} /> Publié dans le feed !
            </p>
          )}

          <Button
            className="w-full font-black py-5"
            onClick={() => {
              // Nettoyage défensif final (au cas où le cleanup post-completion aurait échoué)
              try {
                localStorage.removeItem(STORAGE_KEY)
                localStorage.removeItem(`forgeiq_start_${workoutId}`)
                window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
              } catch { /* ignore */ }
              // replace() : le bouton "retour" du navigateur ne reviendra jamais sur /workout/[id]
              router.replace('/dashboard')
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
    <div className="max-w-lg mx-auto" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>

      {/* Toast succès — routine sauvegardée */}
      {routineSaved && (
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
          <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: 'var(--fiq-accent)', fontWeight: 700 }}>
            <FiqCheck size={14} /> Routine sauvegardée dans {programName}
          </span>
        </div>
      )}

      {/* Modal — confirmation sauvegarder la routine */}
      {showSaveRoutine && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowSaveRoutine(false) }}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl p-5 pb-8 space-y-4"
            style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
                  Sauvegarder la routine
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  {programName} · {sessionName}
                </p>
              </div>
              <button onClick={() => setShowSaveRoutine(false)}>
                <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
              </button>
            </div>

            {/* Aperçu des exercices qui seront sauvegardés */}
            <div className="rounded-xl p-3 space-y-1.5"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--fiq-muted)' }}>
                {groups.length} exercice{groups.length > 1 ? 's' : ''} · ordre actuel
              </p>
              {groups.map((g, i) => (
                <div key={g.exercise_id} className="flex items-center gap-2">
                  <span className="text-[10px] w-4 text-right flex-shrink-0" style={{ color: 'var(--fiq-muted)' }}>{i + 1}</span>
                  <span className="text-xs font-semibold flex-1" style={{ color: 'var(--fiq-text)' }}>{g.exercise_name}</span>
                  <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                    {g.sets.filter(s => !s.is_warmup).length} série{g.sets.filter(s => !s.is_warmup).length > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
              La prochaine suggestion de cette séance utilisera cet ordre et ces exercices.
            </p>

            <button
              onClick={saveRoutine}
              disabled={savingRoutine}
              className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)', opacity: savingRoutine ? 0.7 : 1 }}
            >
              {savingRoutine
                ? <><Loader2 className="w-4 h-4 animate-spin" />Sauvegarde…</>
                : <><Check className="w-4 h-4" /> Oui, mettre à jour la routine</>
              }
            </button>
          </div>
        </div>
      )}

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
            ⏸→▶ Séance reprise — continue où tu t&apos;es arrêté
          </span>
        </div>
      )}

      {/* Header sticky */}
      <div
        className="sticky top-0 z-40 px-4 pb-3 pt-safe flex items-center justify-between"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--fiq-border)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div>
          {editingName ? (
            <input
              autoFocus
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setEditingName(false) }}
              className="font-bold text-sm bg-transparent outline-none border-b"
              style={{ color: 'var(--fiq-text)', borderColor: 'var(--fiq-accent)', minWidth: 120, maxWidth: 180 }}
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="font-bold text-sm flex items-center gap-1"
              style={{ color: 'var(--fiq-text)' }}
            >
              {sessionName}
              <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>✎</span>
            </button>
          )}
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
          {/* Bouton sauvegarder la routine — visible seulement si séance liée à un programme */}
          {programId && groups.length > 0 && (
            <button
              onClick={() => setShowSaveRoutine(true)}
              className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
              style={{ color: '#B4FF4A', border: '1px solid #B4FF4A44', background: '#B4FF4A0A' }}
              title={`Sauvegarder dans ${programName}`}
            >
              <Check className="w-3 h-3" />
            </button>
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
            disabled={completing}
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: 'var(--fiq-red)', color: 'white', opacity: completing ? 0.5 : 1 }}
          >
            {completing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Réessayer
          </button>
        </div>
      )}

      {/* Exercices */}
      <div className="px-4 mt-4 space-y-4">
        {groups.length === 0 && (
          <div className="fiq-card text-center py-8">
            <div className="flex justify-center mb-2">
              <FiqDumbbell size={36} style={{ color: 'var(--fiq-muted)' }} />
            </div>
            <p className="font-semibold" style={{ color: 'var(--fiq-text)' }}>Ajoute ton premier exercice</p>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>Clique sur le bouton ci-dessous</p>
          </div>
        )}

        {groups.map((group, gIdx) => {
          const nextGroup = groups[gIdx + 1]
          const ssId = group.superset_id
          const isFirstInGroup = ssId && (gIdx === 0 || groups[gIdx - 1].superset_id !== ssId)
          const isLinkedToNext = ssId && nextGroup?.superset_id === ssId
          const linkedCount = ssId ? getLinkedCount(ssId, groups) : 0
          const isCircuit = linkedCount >= 3
          // Badge de position : "A1", "A2"… pour circuits, sinon undefined
          const circuitLetter = isCircuit && ssId ? getCircuitLetter(ssId, groups) : ''
          const position = ssId ? getPositionInGroup(gIdx, groups) : 0
          const circuitBadge = isCircuit ? `${circuitLetter}${position}` : undefined
          // Couleurs dynamiques
          const groupColor  = isCircuit ? 'var(--fiq-blue)' : 'var(--fiq-orange)'
          const groupBg     = isCircuit ? '#3D8BFF18' : '#FF6B3518'
          const groupBorder = isCircuit ? '#3D8BFF44' : '#FF6B3344'

          return (
            <div key={group.exercise_id + gIdx}>
              {/* Label SUPERSET / CIRCUIT au-dessus du premier exercice */}
              {isFirstInGroup && (
                <div className="flex items-center gap-1.5 mb-1.5 ml-1">
                  {isCircuit ? (
                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--fiq-blue)' }}>
                      <FiqCircuit size={12} /> Circuit {circuitLetter}
                    </span>
                  ) : (
                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--fiq-orange)' }}>
                      <Zap size={12} /> Superset
                    </span>
                  )}
                </div>
              )}

              <ExerciseCard
                group={group}
                onAddSet={() => addSet(gIdx)}
                onAddWarmup={() => addWarmupSet(gIdx)}
                onAddDropSet={() => addDropSet(gIdx)}
                onUpdateSet={(setId, key, value) => updateSet(gIdx, setId, key, value)}
                onRemoveSet={(setId) => removeSet(gIdx, setId)}
                onToggleUnilateral={() => toggleUnilateralSides(gIdx)}
                onCycleSetType={(setId) => cycleSetType(gIdx, setId)}
                onAddToSuperset={() => { setSupersetTargetIdx(gIdx); setShowSearch(true) }}
                onRemoveSuperset={() => removeSuperset(gIdx)}
                onMoveUp={gIdx > 0 ? () => moveGroup(gIdx, 'up') : undefined}
                onMoveDown={gIdx < groups.length - 1 ? () => moveGroup(gIdx, 'down') : undefined}
                circuitBadge={circuitBadge}
                isInCircuit={isCircuit}
              />

              {/* Connecteur entre exercices du même groupe */}
              {isLinkedToNext && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex flex-col items-center gap-0.5">
                    <div style={{ width: 2, height: 10, background: isCircuit ? '#3D8BFF66' : '#FF6B3566', borderRadius: 1 }} />
                    {isCircuit ? (
                      <span className="text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: groupBg, color: 'var(--fiq-blue)', border: `1px solid ${groupBorder}` }}>
                        → {circuitLetter}{position + 1}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: groupBg, color: 'var(--fiq-orange)', border: `1px solid ${groupBorder}` }}>
                        + superset
                      </span>
                    )}
                    <div style={{ width: 2, height: 10, background: isCircuit ? '#3D8BFF66' : '#FF6B3566', borderRadius: 1 }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}

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
            <Timer className="w-4 h-4" style={{ color: restTimer <= 10 ? 'var(--fiq-orange)' : 'var(--fiq-blue)' }} />
            <span className="font-black text-xl fiq-data" style={{ color: restTimer <= 10 ? 'var(--fiq-orange)' : 'var(--fiq-blue)' }}>
              {formatTime(restTimer)}
            </span>
            <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
              {restTimer <= 10
                ? <span className="flex items-center gap-1"><FiqStreak size={11} style={{ color: 'var(--fiq-orange)' }} /> Go bientôt</span>
                : 'repos'}
            </span>
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
            onClick={() => { setShowSearch(false); setSearchQuery(''); setMuscleFilter('all'); setEquipmentFilter('all'); setSupersetTargetIdx(null) }}
          />
          {/* Sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl"
            style={{
              maxHeight: 'calc(92dvh - env(safe-area-inset-bottom))',
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
                <div>
                  <h2 className="font-bold" style={{ color: 'var(--fiq-text)' }}>
                    {supersetTargetIdx !== null
                      ? (() => {
                          const ssId = groups[supersetTargetIdx]?.superset_id
                          const count = ssId ? getLinkedCount(ssId, groups) : 0
                          return count >= 2
                            ? <span className="flex items-center gap-1"><FiqCircuit size={14} /> Ajouter au circuit</span>
                            : <span className="flex items-center gap-1"><Zap size={14} /> Ajouter au superset</span>
                        })()
                      : 'Choisir un exercice'}
                  </h2>
                  {supersetTargetIdx !== null && (
                    <p className="text-xs mt-0.5" style={{
                      color: (() => {
                        const ssId = groups[supersetTargetIdx]?.superset_id
                        const count = ssId ? getLinkedCount(ssId, groups) : 0
                        return count >= 2 ? 'var(--fiq-blue)' : 'var(--fiq-orange)'
                      })(),
                    }}>
                      Lié à : {groups[supersetTargetIdx]?.exercise_name}
                    </p>
                  )}
                </div>
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); setMuscleFilter('all'); setEquipmentFilter('all'); setSupersetTargetIdx(null) }}>
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
              {/* Filtres groupe musculaire */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {MUSCLE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setMuscleFilter(f.value)}
                    style={{
                      flexShrink: 0,
                      padding: '4px 10px',
                      borderRadius: 20,
                      border: muscleFilter === f.value ? 'none' : '1px solid var(--fiq-border)',
                      background: muscleFilter === f.value ? 'var(--fiq-accent)' : 'var(--bg)',
                      color: muscleFilter === f.value ? 'var(--bg)' : 'var(--fiq-muted)',
                      fontSize: 11,
                      fontWeight: muscleFilter === f.value ? 800 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Filtres équipement */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {EQUIPMENT_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setEquipmentFilter(f.value)}
                    style={{
                      flexShrink: 0,
                      padding: '4px 10px',
                      borderRadius: 20,
                      border: equipmentFilter === f.value ? 'none' : '1px solid var(--fiq-border)',
                      background: equipmentFilter === f.value ? '#3D8BFF' : 'var(--bg)',
                      color: equipmentFilter === f.value ? 'white' : 'var(--fiq-muted)',
                      fontSize: 11,
                      fontWeight: equipmentFilter === f.value ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste — padding bas = dégager la bottom nav */}
            <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-1.5"
              style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
              {filteredExercises.length === 0 && (
                <div className="text-center py-8">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--fiq-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Aucun exercice trouvé</p>
                </div>
              )}
              {filteredExercises.slice(0, 80).map((ex) => {
                const alreadyAdded = recentExerciseIds.has(ex.id)
                const equipIcons: Record<string, string> = {
                  barbell: 'BB', dumbbell: 'DB', cable: '~',
                  machine: 'M', bodyweight: 'BW', kettlebell: 'KB', smith: 'SM',
                }
                return (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl"
                    style={{
                      background: alreadyAdded ? 'var(--fiq-faint)' : 'transparent',
                      border: `1px solid ${alreadyAdded ? 'var(--fiq-accent)44' : 'var(--fiq-border)'}`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--fiq-text)' }}>
                        {ex.name_fr ?? ex.name}
                        {alreadyAdded && <span className="ml-1.5 text-xs" style={{ color: 'var(--fiq-accent)' }}>✓</span>}
                      </p>
                      <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--fiq-muted)' }}>
                        <span>{equipIcons[ex.equipment] ?? 'EQ'} · {ex.equipment}</span>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span>{(ex.muscle_primary ?? []).slice(0, 2).join(', ')}</span>
                        {ex.is_bilateral_dumbbell && (
                          <span style={{ color: 'var(--fiq-accent)' }}>· ×2</span>
                        )}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 flex-shrink-0" style={{ color: alreadyAdded ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }} />
                  </button>
                )
              })}
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
              <div className="flex justify-center mb-2">
                <FiqAlert size={28} style={{ color: 'var(--fiq-yellow)' }} />
              </div>
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
              onClick={async () => {
                setShowQuitModal(false)
                // Sauvegarder sur le serveur avant de partir (permet reprise sur autre appareil)
                try {
                  await fetch('/api/workout/save-draft', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workout_id: workoutId, groups, session_name: sessionName }),
                  })
                } catch { /* silencieux */ }
                router.push('/workout')
              }}
              className="w-full py-3 rounded-2xl font-semibold text-sm"
              style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
            >
              ⏸ Mettre en pause
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

// Libellés et couleurs des types de série
const SET_TYPE_CONFIG: Record<SetType, { label: string; color: string; bg: string }> = {
  work:    { label: '',   color: 'var(--fiq-muted)',   bg: 'transparent' },
  top_set: { label: '★',  color: '#F59E0B',            bg: '#F59E0B22' },  // Top set — charge maximale
  backoff: { label: 'B',  color: 'var(--fiq-blue)',    bg: '#3D8BFF22' },  // Back-off — charge réduite, volume
  dropset: { label: '⬇', color: 'var(--fiq-orange)',  bg: '#FF6B3522' },  // Drop set — enchaîné sans repos
  failure: { label: 'X',  color: 'var(--fiq-red)',     bg: '#EF444422' },  // Echec musculaire
}

// ── Composant exercice avec sets ──────────────────────────────
function ExerciseCard({
  group, onAddSet, onAddWarmup, onAddDropSet, onUpdateSet, onRemoveSet, onToggleUnilateral,
  onCycleSetType, onAddToSuperset, onRemoveSuperset, onMoveUp, onMoveDown,
  circuitBadge, isInCircuit,
}: {
  group: ExerciseGroup
  onAddSet: () => void
  onAddWarmup: () => void
  onAddDropSet: () => void
  onUpdateSet: (setId: string, key: keyof SetRow, value: string | boolean | number) => void
  onRemoveSet: (setId: string) => void
  onToggleUnilateral: () => void
  onCycleSetType: (setId: string) => void
  onAddToSuperset: () => void
  onRemoveSuperset: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  /** Badge de position dans le circuit (ex : "A1", "A2") — undefined si pas de circuit */
  circuitBadge?: string
  /** true si l'exercice fait partie d'un circuit (3+ liés) */
  isInCircuit?: boolean
}) {
  const [showHistory, setShowHistory] = useState(true)
  const [showPlateCalc, setShowPlateCalc] = useState(false)
  const tonnage = calcTonnageGroup(group)
  const isBilateral = group.is_bilateral_dumbbell ?? false
  const isUnilateral = group.is_unilateral ?? false
  const bothSides = group.unilateral_both_sides ?? true
  const inSuperset = !!group.superset_id

  // Couleur du groupe : bleu pour circuit, orange pour superset simple
  const groupColor = isInCircuit ? 'var(--fiq-blue)' : 'var(--fiq-orange)'
  const groupBg    = isInCircuit ? '#3D8BFF12' : '#FF6B3512'
  const groupBorder = isInCircuit ? '#3D8BFF30' : '#FF6B3330'

  // Poids le plus lourd parmi les séries de travail (pour pré-remplir le calculateur)
  const topWeight = Math.max(
    0,
    ...group.sets
      .filter(s => !s.is_warmup && s.weight_kg !== '')
      .map(s => parseFloat(String(s.weight_kg).replace(',', '.')) || 0)
  )

  return (
    <div
      className="fiq-card space-y-3"
      style={inSuperset ? { borderLeft: `3px solid ${groupColor}` } : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {circuitBadge && (
              <span
                className="text-[10px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ background: groupBg, color: groupColor, border: `1px solid ${groupBorder}`, letterSpacing: '0.04em' }}
              >
                {circuitBadge}
              </span>
            )}
            <h3 className="font-bold" style={{ color: 'var(--fiq-text)' }}>{group.exercise_name}</h3>
          </div>
          {tonnage > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-accent)' }}>
              {tonnage.toLocaleString('fr-FR')} kg
              {isBilateral && <span style={{ color: 'var(--fiq-muted)', marginLeft: 4 }}>· × 2 haltères</span>}
              {isUnilateral && bothSides && <span style={{ color: 'var(--fiq-muted)', marginLeft: 4 }}>· × 2 côtés</span>}
            </p>
          )}
          {/* Toggle unilatéral — discret, sous le tonnage */}
          {isUnilateral && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleUnilateral() }}
              className="text-[10px] mt-1 px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{
                background: bothSides ? '#B4FF4A18' : 'var(--fiq-faint)',
                color: bothSides ? 'var(--fiq-accent)' : 'var(--fiq-muted)',
                border: `1px solid ${bothSides ? '#B4FF4A44' : 'var(--fiq-border)'}`,
              }}
            >
              <span>{bothSides ? '✓' : '○'}</span>
              <span>{bothSides ? '× 2 côtés' : '× 1 côté (rééducation)'}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {group.pr && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#B4FF4A22', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A44' }}>
              PR {group.pr}kg
            </span>
          )}
          {/* Calculateur de disques */}
          <button
            onClick={() => setShowPlateCalc(true)}
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            title="Calculateur de disques"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
          >
            <Dumbbell className="w-3.5 h-3.5" style={{ color: 'var(--fiq-muted)' }} />
          </button>
          {/* Boutons réordonner ↑↓ */}
          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={!onMoveUp}
              className="flex items-center justify-center w-5 h-4 rounded"
              style={{ color: onMoveUp ? 'var(--fiq-muted)' : 'transparent', background: onMoveUp ? 'var(--fiq-faint)' : 'transparent' }}
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!onMoveDown}
              className="flex items-center justify-center w-5 h-4 rounded"
              style={{ color: onMoveDown ? 'var(--fiq-muted)' : 'transparent', background: onMoveDown ? 'var(--fiq-faint)' : 'transparent' }}
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
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
            const currentW = current && current.weight_kg !== '' ? parseFloat(String(current.weight_kg).replace(',', '.')) : null
            const weightDiff = currentW !== null ? roundWeight(currentW - s.weight_kg) : null
            const repsDiff = current && current.reps !== '' ? Number(current.reps) - s.reps : null
            return (
              <div key={i} className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                  Série {i + 1} : <strong style={{ color: 'var(--fiq-text)' }}>{s.weight_kg}kg × {s.reps}</strong>
                </p>
                {weightDiff !== null && weightDiff !== 0 && (
                  <span className="text-xs font-bold"
                    style={{ color: weightDiff > 0 ? 'var(--fiq-accent)' : 'var(--fiq-orange)' }}>
                    {weightDelta(currentW!, s.weight_kg)}
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

      {/* Indication transparente du multiplicateur × 2 */}
      {isBilateral && group.sets.some(s => s.weight_kg !== '') && (
        <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
          × 2 haltères — tonnage calculé sur les 2 bras
        </p>
      )}
      {isUnilateral && bothSides && group.sets.some(s => s.weight_kg !== '' && s.reps !== '') && (
        <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
          {(() => {
            const topSet = group.sets.filter(s => !s.is_warmup && s.weight_kg !== '' && s.reps !== '')[0]
            if (!topSet) return null
            const w = parseFloat(String(topSet.weight_kg).replace(',', '.'))
            const r = Number(topSet.reps)
            return `Ex: ${w}kg × ${r} reps × 2 côtés = ${w * r * 2} kg tonnage`
          })()}
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
        const parseW = (v: string | number) => parseFloat(String(v).replace(',', '.')) || 0
        const workingSetVolumes = group.sets.filter(x => !x.is_warmup && x.weight_kg !== '' && x.reps !== '').map(x => parseW(x.weight_kg) * Number(x.reps))
        const maxVolume = workingSetVolumes.length > 0 ? Math.max(...workingSetVolumes) : -1
        const isTopSet = !s.is_warmup && s.weight_kg !== '' && s.reps !== '' && maxVolume > 0 &&
          parseW(s.weight_kg) * Number(s.reps) === maxVolume
        const isPR = !s.is_warmup && group.pr && s.weight_kg !== '' && parseW(s.weight_kg) > group.pr
        const setType = s.set_type ?? 'work'
        const typeCfg = SET_TYPE_CONFIG[setType]

        return (
          <div key={s.id} className="grid grid-cols-[40px_1fr_1fr_60px_32px] gap-2 items-center">
            {/* Numéro / badge type — tap pour cycler (sauf échauffement) */}
            <button
              className="flex items-center justify-center h-9 rounded-lg"
              style={{ background: s.is_warmup ? '#F59E0B22' : typeCfg.bg }}
              onClick={() => !s.is_warmup && onCycleSetType(s.id)}
              title={s.is_warmup ? 'Échauffement' : 'Tap pour changer le type'}
            >
              {isPR
                ? <span className="text-xs font-black" style={{ color: 'var(--fiq-accent)' }}>PR</span>
                : s.is_warmup
                  ? <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>C</span>
                  : setType !== 'work'
                    ? <span className="text-xs font-black" style={{ color: typeCfg.color }}>{typeCfg.label}</span>
                    : isTopSet && group.sets.filter(x => !x.is_warmup && x.weight_kg !== '').length > 1
                      ? <span className="text-xs" style={{ color: 'var(--fiq-accent)' }}>★</span>
                      : <span className="text-xs" style={{ color: 'var(--fiq-text)' }}>{s.set_number}</span>
              }
            </button>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="—"
              value={s.weight_kg}
              onChange={(e) => onUpdateSet(s.id, 'weight_kg', e.target.value)}
              className="text-center text-sm h-9"
              style={{
                background: 'var(--surface)',
                borderColor: isPR ? 'var(--fiq-accent)' : setType === 'top_set' ? '#F59E0B44' : setType === 'backoff' ? '#3D8BFF44' : setType === 'dropset' ? '#FF6B3544' : setType === 'failure' ? '#EF444444' : 'var(--fiq-border)',
                color: 'var(--fiq-text)',
              }}
            />
            <Input
              type="text"
              inputMode="numeric"
              placeholder="—"
              value={s.reps}
              onChange={(e) => onUpdateSet(s.id, 'reps', e.target.value)}
              className="text-center text-sm h-9"
              style={{ background: 'var(--surface)', borderColor: 'var(--fiq-border)', color: 'var(--fiq-text)' }}
            />
            <Input
              type="text"
              inputMode="decimal"
              placeholder="—"
              value={s.rpe}
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

      {/* Boutons d'action : série, échauffement, drop set, superset */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={onAddSet} className="flex-1 text-xs"
          style={{ borderColor: 'var(--fiq-border)', color: 'var(--fiq-text)', background: 'transparent' }}>
          <Plus className="w-3.5 h-3.5 mr-1" />+ Série
        </Button>
        <Button size="sm" variant="ghost" onClick={onAddDropSet} className="text-xs"
          style={{ color: 'var(--fiq-orange)' }}>
          ⬇ Drop
        </Button>
        <Button size="sm" variant="ghost" onClick={onAddWarmup} className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          + Chauffe
        </Button>
      </div>

      {/* Superset / Circuit — bouton discret dans le footer */}
      <div className="flex items-center justify-between pt-0.5">
        <button
          onClick={onAddToSuperset}
          className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{ color: groupColor, background: groupBg, border: `1px solid ${groupBorder}` }}
        >
          {isInCircuit ? <FiqCircuit size={11} style={{ display: 'inline' }} /> : <Zap size={11} style={{ display: 'inline' }} />}
          {' '}+ {isInCircuit ? 'au circuit' : 'exercice lié'}
        </button>
        {inSuperset && (
          <button
            onClick={onRemoveSuperset}
            className="text-[11px] px-2 py-1 rounded-lg"
            style={{ color: 'var(--fiq-muted)' }}
          >
            Délier
          </button>
        )}
      </div>

      {/* Calculateur de disques — modal plein écran */}
      {showPlateCalc && (
        <PlateCalculatorModal
          initialWeight={topWeight > 0 ? topWeight : undefined}
          onClose={() => setShowPlateCalc(false)}
        />
      )}
    </div>
  )
}
