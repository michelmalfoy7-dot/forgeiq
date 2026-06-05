'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, ChevronDown, ChevronUp, CheckCircle, Dumbbell, Timer, ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type TierKey = 'premium' | 'standard' | 'home'

type ProgramExercise = {
  slot?: string
  by_feature?: Record<string, { slug: string; name_fr: string }>
  by_tier?: Record<TierKey, { slug: string; name_fr: string }>
  sets: number
  reps: string
  rest_sec?: number
  note?: string
  _resolved_name?: string
}

type ProgramDay = {
  name: string
  focus?: string
  exercises?: ProgramExercise[]
}

type GeneratedProgram = {
  id: string
  name: string
  slug: string
  description: string
  sessions_per_week: number
  duration_weeks: number
  structure: { days: ProgramDay[] }
}

type Step = 'form' | 'generating' | 'result'

type Props = {
  gymTier: TierKey | null
  gymFeatures: string[] | null
  gymName: string | null
  generationsLeft: number
}

// ── Options questionnaire ─────────────────────────────────────────────────────

const SESSIONS_OPTIONS = [
  { value: 3, label: '3×', sub: '3 jours' },
  { value: 4, label: '4×', sub: '4 jours' },
  { value: 5, label: '5×', sub: '5 jours' },
  { value: 6, label: '6×', sub: '6 jours' },
]

const DURATION_OPTIONS = [
  { value: 45,  label: '45 min', sub: 'Compact' },
  { value: 60,  label: '1h',     sub: 'Standard' },
  { value: 75,  label: '1h15',   sub: 'Confortable' },
  { value: 90,  label: '1h30+',  sub: 'Long' },
]

const PRIORITY_OPTIONS = [
  { value: 'none',       label: '⚖️ Équilibré',   sub: 'Aucune priorité' },
  { value: 'chest',      label: '💪 Pectoraux',    sub: 'Développer le buste' },
  { value: 'back',       label: '🏋️ Dos',          sub: 'Élargir le dos' },
  { value: 'shoulders',  label: '🔺 Épaules',      sub: 'Élargir la silhouette' },
  { value: 'legs',       label: '🦵 Jambes',        sub: 'Quads · Ischios' },
  { value: 'glutes',     label: '🍑 Fessiers',      sub: 'Hip thrust · RDL' },
  { value: 'arms',       label: '💪 Bras',          sub: 'Biceps · Triceps' },
]

const LOADING_STEPS = [
  { label: 'Analyse de ton profil', delay: 0 },
  { label: 'Lecture de tes PRs', delay: 1200 },
  { label: 'Construction du programme', delay: 2500 },
  { label: 'Adaptation à ta salle', delay: 4000 },
  { label: 'Finalisation', delay: 5500 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getExerciseName(ex: ProgramExercise, tier: TierKey | null, features: string[] | null): string {
  if (ex._resolved_name) return ex._resolved_name
  if (ex.by_feature && features && features.length > 0) {
    for (const f of features) {
      const match = ex.by_feature[f]
      if (match?.name_fr) return match.name_fr
    }
  }
  if (ex.by_tier) {
    const key = tier ?? 'standard'
    return ex.by_tier[key]?.name_fr ?? ex.by_tier.standard?.name_fr ?? 'Exercice'
  }
  return ex._resolved_name ?? 'Exercice'
}

function formatRest(sec?: number): string {
  if (!sec) return ''
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}min${s}s` : `${m}min`
}

// ── Composant DayCard pour le résultat ────────────────────────────────────────

function DayCard({ day, index, gymTier, gymFeatures }: {
  day: ProgramDay
  index: number
  gymTier: TierKey | null
  gymFeatures: string[] | null
}) {
  const [open, setOpen] = useState(index === 0)
  const exercises = day.exercises ?? []

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--fiq-border)', background: 'var(--fiq-card)' }}>
      <button
        onClick={() => exercises.length > 0 && setOpen(!open)}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>{day.name}</p>
          {day.focus && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--fiq-accent)' }}>
              {day.focus}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {exercises.length > 0 && (
            <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
              {exercises.length} ex.
            </span>
          )}
          {open
            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />}
        </div>
      </button>

      {open && exercises.length > 0 && (
        <div style={{ borderTop: '1px solid var(--fiq-border)' }}>
          {exercises.map((ex, ei) => (
            <div key={ei} className="px-4 py-3 flex items-start gap-3"
              style={{
                borderBottom: ei < exercises.length - 1 ? '1px solid var(--fiq-border)' : undefined,
                background: ei % 2 === 0 ? 'transparent' : 'var(--fiq-faint)',
              }}>
              <span className="text-[11px] font-black w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}>
                {ei + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black leading-tight" style={{ color: 'var(--fiq-text)' }}>
                  {getExerciseName(ex, gymTier, gymFeatures)}
                </p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] font-black"
                    style={{ color: 'var(--fiq-accent)' }}>
                    <Dumbbell className="w-3 h-3" />
                    {ex.sets} × {ex.reps}
                  </span>
                  {ex.rest_sec && ex.rest_sec > 0 && (
                    <span className="flex items-center gap-1 text-[11px]"
                      style={{ color: 'var(--fiq-muted)' }}>
                      <Timer className="w-3 h-3" />
                      {formatRest(ex.rest_sec)}
                    </span>
                  )}
                </div>
                {ex.note && (
                  <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
                    💡 {ex.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function GenerateProgramClient({ gymTier, gymFeatures, gymName, generationsLeft }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState<string | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const [adopting, setAdopting] = useState(false)

  // Formulaire
  const [sessionsPerWeek, setSessionsPerWeek] = useState(4)
  const [sessionDuration, setSessionDuration] = useState(60)
  const [musclePriority, setMusclePriority] = useState('none')

  // Résultat
  const [generated, setGenerated] = useState<GeneratedProgram | null>(null)
  const [rationale, setRationale] = useState<string>('')

  // ── Génération ────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setError(null)
    setStep('generating')
    setLoadingStep(0)

    // Anime les étapes de chargement
    LOADING_STEPS.forEach((s, i) => {
      if (i === 0) return
      setTimeout(() => setLoadingStep(i), s.delay)
    })

    try {
      const res = await fetch('/api/programs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessions_per_week: sessionsPerWeek,
          session_duration:  sessionDuration,
          muscle_priority:   musclePriority,
        }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        setError(json.error ?? 'Erreur de génération.')
        setStep('form')
        return
      }

      setGenerated(json.data.program)
      setRationale(json.data.rationale)
      setStep('result')
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
      setStep('form')
    }
  }

  // ── Adoption ──────────────────────────────────────────────────────────────

  async function handleAdopt() {
    if (!generated) return
    setAdopting(true)
    try {
      await fetch('/api/programs/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: generated.id }),
      })
      router.push('/programs')
      router.refresh()
    } finally {
      setAdopting(false)
    }
  }

  // ── Rendu : formulaire ────────────────────────────────────────────────────

  if (step === 'form') {
    return (
      <div className="space-y-6">
        {/* Compteur */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: '#B4FF4A10', border: '1px solid #B4FF4A30' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--fiq-accent)' }}>
              Générations ce mois
            </span>
          </div>
          <span className="text-sm font-black" style={{ color: 'var(--fiq-accent)' }}>
            {3 - generationsLeft}/3
          </span>
        </div>

        {/* Salle active */}
        {gymName && (
          <div className="flex items-center gap-2 text-xs px-1" style={{ color: 'var(--fiq-muted)' }}>
            <span>🏋️</span>
            <span>Exercices adaptés pour <strong style={{ color: 'var(--fiq-text)' }}>{gymName}</strong></span>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{ background: '#EF444415', border: '1px solid #EF444430', color: 'var(--fiq-red)' }}>
            {error}
          </div>
        )}

        {/* Q1 — Jours/semaine */}
        <div>
          <p className="fiq-label mb-3">Combien de jours par semaine ?</p>
          <div className="grid grid-cols-4 gap-2">
            {SESSIONS_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setSessionsPerWeek(o.value)}
                className="flex flex-col items-center py-3 rounded-xl transition-all"
                style={{
                  background:  sessionsPerWeek === o.value ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                  color:       sessionsPerWeek === o.value ? 'var(--bg)' : 'var(--fiq-text)',
                  border:      `1px solid ${sessionsPerWeek === o.value ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                }}>
                <span className="text-lg font-black">{o.label}</span>
                <span className="text-[10px] mt-0.5 opacity-70">{o.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Q2 — Durée */}
        <div>
          <p className="fiq-label mb-3">Durée max par séance ?</p>
          <div className="grid grid-cols-4 gap-2">
            {DURATION_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setSessionDuration(o.value)}
                className="flex flex-col items-center py-3 rounded-xl transition-all"
                style={{
                  background:  sessionDuration === o.value ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                  color:       sessionDuration === o.value ? 'var(--bg)' : 'var(--fiq-text)',
                  border:      `1px solid ${sessionDuration === o.value ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                }}>
                <span className="text-base font-black">{o.label}</span>
                <span className="text-[10px] mt-0.5 opacity-70">{o.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Q3 — Priorité musculaire */}
        <div>
          <p className="fiq-label mb-3">Un muscle à prioriser ?</p>
          <div className="grid grid-cols-2 gap-2">
            {PRIORITY_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setMusclePriority(o.value)}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-all"
                style={{
                  background:  musclePriority === o.value ? '#B4FF4A18' : 'var(--fiq-faint)',
                  border:      `1px solid ${musclePriority === o.value ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                }}>
                <span className="text-lg flex-shrink-0">{o.label.split(' ')[0]}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: musclePriority === o.value ? 'var(--fiq-accent)' : 'var(--fiq-text)' }}>
                    {o.label.split(' ').slice(1).join(' ')}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>{o.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleGenerate}
          disabled={generationsLeft <= 0}
          className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3"
          style={{
            background: generationsLeft > 0 ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
            color:      generationsLeft > 0 ? 'var(--bg)' : 'var(--fiq-muted)',
          }}>
          <Zap className="w-5 h-5" />
          {generationsLeft > 0 ? 'Générer mon programme' : 'Quota mensuel atteint'}
        </button>

        {generationsLeft <= 0 && (
          <p className="text-center text-xs" style={{ color: 'var(--fiq-muted)' }}>
            Renouvellement le 1er du mois prochain
          </p>
        )}
      </div>
    )
  }

  // ── Rendu : chargement ────────────────────────────────────────────────────

  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-8">
        {/* Icône animée */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: '#B4FF4A15', border: '2px solid var(--fiq-accent)' }}>
            <Sparkles className="w-9 h-9 animate-pulse" style={{ color: 'var(--fiq-accent)' }} />
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>
            Génération en cours...
          </p>
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
            Analyse de tes données et construction du programme
          </p>
        </div>

        {/* Étapes */}
        <div className="w-full space-y-2.5">
          {LOADING_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{
                background: i <= loadingStep ? '#B4FF4A08' : 'transparent',
                border:     `1px solid ${i <= loadingStep ? '#B4FF4A30' : 'transparent'}`,
                opacity:    i > loadingStep + 1 ? 0.3 : 1,
                transition: 'all 0.4s ease',
              }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                {i < loadingStep ? (
                  <CheckCircle className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
                ) : i === loadingStep ? (
                  <div className="w-3 h-3 rounded-full animate-ping"
                    style={{ background: 'var(--fiq-accent)' }} />
                ) : (
                  <div className="w-3 h-3 rounded-full"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }} />
                )}
              </div>
              <p className="text-sm font-semibold"
                style={{ color: i <= loadingStep ? 'var(--fiq-text)' : 'var(--fiq-muted)' }}>
                {s.label}
                {i === loadingStep && '...'}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Rendu : résultat ──────────────────────────────────────────────────────

  if (step === 'result' && generated) {
    const days = generated.structure?.days ?? []

    return (
      <div className="space-y-5">
        {/* Header programme */}
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-accent)' }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--fiq-accent)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--bg)' }} />
            </div>
            <div>
              <p className="font-black text-base leading-tight" style={{ color: 'var(--fiq-text)' }}>
                {generated.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                {generated.sessions_per_week} séances/semaine · {generated.duration_weeks} semaines
              </p>
            </div>
          </div>
        </div>

        {/* Rationale — le "waou" */}
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">💬</span>
            <p className="fiq-label">Pourquoi ce programme ?</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fiq-text)' }}>
            {rationale}
          </p>
        </div>

        {/* Salle */}
        {gymName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: '#B4FF4A10', border: '1px solid #B4FF4A30', color: 'var(--fiq-accent)' }}>
            🏋️ Exercices adaptés pour <strong>{gymName}</strong>
          </div>
        )}

        {/* Boutons */}
        <button
          onClick={handleAdopt}
          disabled={adopting}
          className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          <CheckCircle className="w-5 h-5" />
          {adopting ? 'Adoption en cours...' : 'Adopter ce programme ✓'}
        </button>

        <button
          onClick={() => { setStep('form'); setGenerated(null) }}
          className="w-full py-3 rounded-2xl font-semibold text-sm"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
          ↺ Régénérer (utilise une génération)
        </button>

        {/* Structure des séances */}
        <div>
          <p className="fiq-label mb-3">Structure du programme</p>
          <div className="space-y-3">
            {days.map((day, i) => (
              <DayCard
                key={i}
                day={day}
                index={i}
                gymTier={gymTier}
                gymFeatures={gymFeatures}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}
