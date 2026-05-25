'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertBar } from '@/components/ui/AlertBar'
import { Loader2, Plus, Dumbbell, ChevronRight, History, Moon, Bike, Play, Minus, Check } from 'lucide-react'
import Link from 'next/link'

const ACTIVITIES = [
  { name: 'Vélo / Cyclisme',  emoji: '🚴', hasDistance: true  },
  { name: 'Course à pied',    emoji: '🏃', hasDistance: true  },
  { name: 'Natation',         emoji: '🏊', hasDistance: true  },
  { name: 'Randonnée',        emoji: '🥾', hasDistance: true  },
  { name: 'Yoga / Pilates',   emoji: '🧘', hasDistance: false },
  { name: 'Football',         emoji: '⚽', hasDistance: false },
  { name: 'Tennis',           emoji: '🎾', hasDistance: false },
  { name: 'Combat / Boxe',    emoji: '🥊', hasDistance: false },
  { name: 'Stretching',       emoji: '🤸', hasDistance: false },
  { name: 'Autre sport',      emoji: '🏅', hasDistance: false },
]

const EFFORT_LABELS = ['', 'Très facile', 'Facile', 'Modéré', 'Intense', 'Maximal']
const EFFORT_COLORS = ['', 'var(--fiq-accent)', 'var(--fiq-accent)', 'var(--fiq-blue)', 'var(--fiq-orange)', 'var(--fiq-red)']

/** Récupère l'ID de séance en cours depuis localStorage */
function getActiveWorkoutId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('forgeiq_workout_')) {
        const data = JSON.parse(localStorage.getItem(key) ?? '{}')
        if (data?.groups?.length > 0 && Date.now() - (data.savedAt ?? 0) < 86400000) {
          return key.replace('forgeiq_workout_', '')
        }
      }
    }
  } catch { /* ignore */ }
  return null
}

type Exercise = {
  id: string
  name: string
  name_fr: string
  muscle_primary: string[]
  equipment: string
  category: string
}

type SuggestedSession = {
  program_id: string | null
  program_name: string
  session_name: string
  session_index: number
  total_sessions: number
  volume_adjustment: 'reduce' | 'normal' | 'increase'
  adjustment_reason: string
  exercises: { name: string; sets: number; reps: string; weight_kg: number | null; note: string }[]
}

export default function WorkoutPage() {
  const [suggestion, setSuggestion] = useState<SuggestedSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [loggingRest, setLoggingRest] = useState(false)
  const [restLogged, setRestLogged] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  // Cardio form state
  const [cardioActivity, setCardioActivity] = useState<typeof ACTIVITIES[0] | null>(null)
  const [cardioDuration, setCardioDuration] = useState(30)
  const [cardioDistance, setCardioDistance] = useState('')
  const [cardioEffort, setCardioEffort] = useState<1|2|3|4|5>(3)
  const [loggingCardio, setLoggingCardio] = useState(false)
  const [cardioLogged, setCardioLogged] = useState(false)

  const [recentWorkouts, setRecentWorkouts] = useState<{id: string; session_name: string; session_date: string; total_tonnage_kg: number; duration_min?: number; distance_km?: number; workout_type?: string}[]>([])
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setActiveWorkoutId(getActiveWorkoutId())
  }, [])

  useEffect(() => {
    async function load() {
      const [suggRes, supabase] = [fetch('/api/suggest-workout'), createClient()]

      const [suggData, { data: { user } }] = await Promise.all([
        suggRes.then(r => r.json()),
        supabase.auth.getUser(),
      ])

      if (suggData.data) setSuggestion(suggData.data)

      if (user) {
        const { data: workouts } = await supabase
          .from('workouts')
          .select('id, session_name, session_date, total_tonnage_kg, duration_min, distance_km, workout_type')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('session_date', { ascending: false })
          .limit(5)
        setRecentWorkouts(workouts ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function startWorkout(sessionName: string, exercises?: { name: string; sets: number; reps: string; weight_kg: number | null; note: string }[], programId?: string | null) {
    setStarting(true)
    try {
      const res = await fetch('/api/workout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_name: sessionName, program_id: programId ?? null }),
      })
      const { data } = await res.json()
      if (data?.id) {
        // Stocker les exercices suggérés pour les pré-charger dans le logger
        if (exercises && exercises.length > 0) {
          sessionStorage.setItem(`workout-exercises-${data.id}`, JSON.stringify(exercises))
        }
        router.push(`/workout/${data.id}`)
      }
    } finally {
      setStarting(false)
    }
  }

  // Enregistrer un jour de repos (workout complété immédiatement, 0 tonnage)
  async function logRestDay() {
    setLoggingRest(true)
    try {
      const startRes = await fetch('/api/workout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_name: 'Jour de repos', program_id: null }),
      })
      const { data: startData } = await startRes.json()
      if (!startData?.id) return

      await fetch('/api/workout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout_id: startData.id, sets: [], notes: 'Repos', rpe_overall: null }),
      })

      setRestLogged(true)
      setTimeout(() => setRestLogged(false), 3000)
    } finally {
      setLoggingRest(false)
    }
  }

  // Enregistrer une activité cardio directement (sans passer par le logger musculation)
  async function logCardio() {
    if (!cardioActivity || cardioDuration < 1) return
    setLoggingCardio(true)
    try {
      const startRes = await fetch('/api/workout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_name: cardioActivity.name, program_id: null }),
      })
      const { data: startData } = await startRes.json()
      if (!startData?.id) return

      await fetch('/api/workout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: startData.id,
          sets: [],
          notes: null,
          rpe_overall: cardioEffort,
          duration_min: cardioDuration,
          distance_km: cardioDistance ? parseFloat(cardioDistance) : null,
          workout_type: 'cardio',
        }),
      })

      // Rafraîchir l'historique
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: workouts } = await supabase
          .from('workouts')
          .select('id, session_name, session_date, total_tonnage_kg, duration_min, distance_km, workout_type')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('session_date', { ascending: false })
          .limit(5)
        setRecentWorkouts(workouts ?? [])
      }

      setCardioLogged(true)
      setTimeout(() => {
        setCardioLogged(false)
        setShowActivityModal(false)
        setCardioActivity(null)
        setCardioDuration(30)
        setCardioDistance('')
        setCardioEffort(3)
      }, 1500)
    } finally {
      setLoggingCardio(false)
    }
  }

  const volumeColors = {
    reduce: 'var(--fiq-orange)',
    normal: 'var(--fiq-accent)',
    increase: 'var(--fiq-blue)',
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-6">
        <p className="fiq-label">Entraînement</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Séances</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {/* Skeleton branded — même structure que le vrai contenu */}
          <div className="fiq-card space-y-4">
            <div className="space-y-2">
              <div className="fiq-shimmer h-3 w-28 rounded-xl" />
              <div className="fiq-shimmer h-7 w-44 rounded-xl" />
              <div className="fiq-shimmer h-3 w-36 rounded-xl" />
            </div>
            <div className="fiq-shimmer h-14 w-full rounded-2xl" />
          </div>
          <div className="fiq-shimmer h-16 w-full rounded-2xl" />
          <div className="fiq-card space-y-3">
            <div className="fiq-shimmer h-4 w-32 rounded-xl" />
            {[0, 1, 2].map(i => (
              <div key={i} className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--fiq-border)' }}>
                <div className="space-y-1.5">
                  <div className="fiq-shimmer h-4 w-28 rounded-xl" />
                  <div className="fiq-shimmer h-3 w-20 rounded-xl" />
                </div>
                <div className="fiq-shimmer h-5 w-16 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bannière "Séance en cours" si localStorage a une séance active */}
          {activeWorkoutId && (
            <Link
              href={`/workout/${activeWorkoutId}`}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl"
              style={{ background: '#B4FF4A18', border: '1px solid #B4FF4A44' }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--fiq-accent)', flexShrink: 0 }} />
              <div className="flex-1">
                <p className="font-black text-sm" style={{ color: 'var(--fiq-accent)' }}>Séance en cours</p>
                <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Ta progression est sauvegardée — reprends où tu t&apos;es arrêté</p>
              </div>
              <Play className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
            </Link>
          )}

          {/* Card séance suggérée */}
          {suggestion && (
            <div className="fiq-card space-y-4">
              <div>
                <p className="fiq-label">Prochaine séance</p>
                <h2 className="text-xl font-black mt-1" style={{ color: 'var(--fiq-text)' }}>
                  {suggestion.session_name}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  {suggestion.program_name} · Séance {suggestion.session_index + 1}/{suggestion.total_sessions}
                </p>
              </div>

              {suggestion.volume_adjustment !== 'normal' && (
                <div
                  className="rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{
                    color: volumeColors[suggestion.volume_adjustment],
                    background: volumeColors[suggestion.volume_adjustment] + '18',
                    border: `1px solid ${volumeColors[suggestion.volume_adjustment]}44`,
                  }}
                >
                  {suggestion.volume_adjustment === 'reduce' ? '⚠️ Volume réduit' : '⚡ Volume augmenté'} — {suggestion.adjustment_reason}
                </div>
              )}

              <Button
                className="w-full py-5 font-black text-base"
                onClick={() => startWorkout(suggestion.session_name, suggestion.exercises as { name: string; sets: number; reps: string; weight_kg: number | null; note: string }[], suggestion.program_id)}
                disabled={starting}
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
              >
                {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Dumbbell className="w-5 h-5 mr-2" />Démarrer cette séance</>}
              </Button>
            </div>
          )}

          {/* Séance libre */}
          <button
            onClick={() => startWorkout('Séance libre')}
            disabled={starting}
            className="w-full fiq-card flex items-center gap-3 text-left transition-all hover:border-[var(--fiq-accent)]/40"
          >
            <Plus className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--fiq-text)' }}>Séance libre</p>
              <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Choisis tes exercices librement</p>
            </div>
            <ChevronRight className="ml-auto w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          </button>

          {/* Autre activité */}
          <button
            onClick={() => setShowActivityModal(true)}
            disabled={starting}
            className="w-full fiq-card flex items-center gap-3 text-left transition-all"
          >
            <Bike className="w-5 h-5" style={{ color: 'var(--fiq-blue)' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--fiq-text)' }}>Autre activité</p>
              <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Cardio, sport, natation…</p>
            </div>
            <ChevronRight className="ml-auto w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          </button>

          {/* Jour de repos */}
          <button
            onClick={logRestDay}
            disabled={loggingRest || restLogged}
            className="w-full fiq-card flex items-center gap-3 text-left transition-all"
          >
            {loggingRest
              ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
              : <Moon className="w-5 h-5" style={{ color: restLogged ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }} />
            }
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--fiq-text)' }}>
                {restLogged ? '✓ Repos enregistré !' : 'Jour de repos'}
              </p>
              <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                {restLogged ? 'Ta récupération compte aussi' : 'Noter un jour sans entraînement'}
              </p>
            </div>
          </button>

          {/* Modal activités — 2 étapes : choix → formulaire cardio */}
          {showActivityModal && (
            <div
              className="fixed inset-0 z-50 flex items-end"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={e => { if (e.target === e.currentTarget) { setShowActivityModal(false); setCardioActivity(null) } }}
            >
              <div
                className="w-full max-w-lg mx-auto rounded-t-3xl"
                style={{ background: 'var(--surface)', borderTop: '1px solid var(--fiq-border)', maxHeight: 'calc(92dvh - 4rem - env(safe-area-inset-bottom))', overflowY: 'auto', marginBottom: 'calc(4rem + env(safe-area-inset-bottom))', paddingBottom: '24px' }}
              >
                {/* ── Étape 1 : choix de l'activité ── */}
                {!cardioActivity ? (
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>Choisir une activité</h3>
                      <button onClick={() => setShowActivityModal(false)} style={{ color: 'var(--fiq-muted)' }}>✕</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {ACTIVITIES.map(act => (
                        <button
                          key={act.name}
                          onClick={() => setCardioActivity(act)}
                          className="flex items-center gap-2 px-3 py-3 rounded-2xl text-left transition-all"
                          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
                        >
                          <span className="text-2xl">{act.emoji}</span>
                          <span className="font-semibold text-xs leading-tight" style={{ color: 'var(--fiq-text)' }}>{act.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ── Étape 2 : formulaire cardio ── */
                  <div className="p-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCardioActivity(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
                      >
                        ←
                      </button>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-2xl">{cardioActivity.emoji}</span>
                        <h3 className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>{cardioActivity.name}</h3>
                      </div>
                      <button onClick={() => { setShowActivityModal(false); setCardioActivity(null) }} style={{ color: 'var(--fiq-muted)' }}>✕</button>
                    </div>

                    {/* Durée */}
                    <div>
                      <p className="fiq-label mb-3">Durée</p>
                      <div className="flex items-center gap-4 justify-center">
                        <button
                          onClick={() => setCardioDuration(d => Math.max(5, d - 5))}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <div className="text-center min-w-[100px]">
                          <p className="text-4xl font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                            {cardioDuration >= 60
                              ? `${Math.floor(cardioDuration / 60)}h${cardioDuration % 60 > 0 ? String(cardioDuration % 60).padStart(2, '0') : ''}`
                              : cardioDuration}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
                            {cardioDuration >= 60 ? '' : 'minutes'}
                          </p>
                        </div>
                        <button
                          onClick={() => setCardioDuration(d => d + 5)}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      {/* Raccourcis rapides */}
                      <div className="flex gap-2 mt-3 justify-center flex-wrap">
                        {[15, 30, 45, 60, 90].map(d => (
                          <button
                            key={d}
                            onClick={() => setCardioDuration(d)}
                            className="px-3 py-1 rounded-xl text-xs font-bold transition-all"
                            style={{
                              background: cardioDuration === d ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                              color: cardioDuration === d ? 'var(--bg)' : 'var(--fiq-muted)',
                              border: `1px solid ${cardioDuration === d ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                            }}
                          >
                            {d >= 60 ? `${d / 60}h` : `${d}min`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Distance (seulement pour les activités avec distance) */}
                    {cardioActivity.hasDistance && (
                      <div>
                        <p className="fiq-label mb-2">Distance <span style={{ color: 'var(--fiq-muted)', textTransform: 'none', fontSize: '10px' }}>(optionnel)</span></p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={cardioDistance}
                            onChange={e => setCardioDistance(e.target.value)}
                            placeholder="0.0"
                            step="0.1"
                            min="0"
                            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none text-center font-black text-lg"
                            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                          />
                          <span className="font-bold text-sm w-8" style={{ color: 'var(--fiq-muted)' }}>km</span>
                        </div>
                      </div>
                    )}

                    {/* Effort */}
                    <div>
                      <p className="fiq-label mb-2">Intensité</p>
                      <div className="flex gap-2">
                        {([1,2,3,4,5] as const).map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => setCardioEffort(lvl)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all"
                            style={{
                              background: cardioEffort >= lvl ? EFFORT_COLORS[lvl] + '22' : 'var(--fiq-faint)',
                              border: `1px solid ${cardioEffort >= lvl ? EFFORT_COLORS[lvl] : 'var(--fiq-border)'}`,
                              color: cardioEffort >= lvl ? EFFORT_COLORS[lvl] : 'var(--fiq-muted)',
                            }}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-center mt-1.5" style={{ color: EFFORT_COLORS[cardioEffort] }}>
                        {EFFORT_LABELS[cardioEffort]}
                      </p>
                    </div>

                    {/* Bouton enregistrer */}
                    <button
                      onClick={logCardio}
                      disabled={loggingCardio || cardioLogged}
                      className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2"
                      style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                    >
                      {loggingCardio
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : cardioLogged
                        ? <><Check className="w-5 h-5" /> Enregistré !</>
                        : `Enregistrer ${cardioDuration >= 60 ? `${Math.floor(cardioDuration / 60)}h${cardioDuration % 60 > 0 ? String(cardioDuration % 60).padStart(2,'0') : ''}` : `${cardioDuration} min`}`
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Historique récent */}
          {recentWorkouts.length > 0 && (
            <div className="fiq-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
                  <p className="font-semibold text-sm" style={{ color: 'var(--fiq-text)' }}>Séances récentes</p>
                </div>
                <Link href="/workout/history"
                  className="text-xs font-semibold"
                  style={{ color: 'var(--fiq-accent)' }}>
                  Tout voir →
                </Link>
              </div>
              {recentWorkouts.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--fiq-border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fiq-text)' }}>{w.session_name}</p>
                    <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                      {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(w.session_date))}
                    </p>
                  </div>
                  <div className="text-right">
                    {w.workout_type === 'cardio' ? (
                      <span className="text-sm fiq-data" style={{ color: 'var(--fiq-blue)' }}>
                        {w.duration_min != null && (
                          w.duration_min >= 60
                            ? `${Math.floor(w.duration_min / 60)}h${w.duration_min % 60 > 0 ? String(w.duration_min % 60).padStart(2,'0') : ''}`
                            : `${w.duration_min} min`
                        )}
                        {w.distance_km ? ` · ${w.distance_km} km` : ''}
                      </span>
                    ) : w.total_tonnage_kg ? (
                      <span className="text-sm fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                        {w.total_tonnage_kg.toLocaleString('fr-FR')} kg
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
