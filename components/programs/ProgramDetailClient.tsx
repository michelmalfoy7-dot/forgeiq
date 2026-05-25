'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar, Clock, Dumbbell, CheckCircle, ChevronDown, ChevronUp,
  Target, Zap, Timer
} from 'lucide-react'

type ProgramExercise = {
  slug: string
  name_fr: string
  sets: number
  reps: string
  rest_sec?: number
  note?: string
}

type ProgramDay = {
  name: string
  exercises?: ProgramExercise[]
}

type Program = {
  id: string
  name: string
  slug: string
  description: string
  level: string[]
  goal: string[]
  equipment: string[]
  sessions_per_week: number
  duration_weeks: number
  structure: { days: (string | ProgramDay)[] }
  is_custom: boolean
}

type Props = {
  program: Program
  currentProgramId: string | null
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé',
}
const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Perte de poids', muscle_gain: 'Prise de masse', strength: 'Force',
  endurance: 'Endurance', general: 'Général',
}
const EQUIP_LABELS: Record<string, string> = {
  full_gym: 'Salle complète', home_basic: 'Maison basique',
  home_advanced: 'Maison avancé', bodyweight: 'Poids du corps',
}
const FEMALE_SLUGS = new Set([
  'galbe-fessiers', 'full-body-femme-debutante', 'tonification-seche-femme',
  'strong-woman', 'mobilite-bien-etre',
])

function getDayName(day: string | ProgramDay): string {
  return typeof day === 'string' ? day : day.name
}

function getDayExercises(day: string | ProgramDay): ProgramExercise[] {
  if (typeof day === 'string') return []
  return day.exercises ?? []
}

// Formate le temps de repos
function formatRest(sec?: number): string {
  if (!sec) return '—'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}min${s}s` : `${m}min`
}

function Badge({ label, color = 'muted' }: { label: string; color?: 'accent' | 'blue' | 'orange' | 'muted' | 'pink' }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    accent: { bg: '#B4FF4A22', color: 'var(--fiq-accent)', border: '#B4FF4A44' },
    blue: { bg: '#3D8BFF22', color: 'var(--fiq-blue)', border: '#3D8BFF44' },
    orange: { bg: '#FF6B3522', color: 'var(--fiq-orange)', border: '#FF6B3544' },
    muted: { bg: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: 'var(--fiq-border)' },
    pink: { bg: '#FF6B9D22', color: '#FF6B9D', border: '#FF6B9D44' },
  }
  const s = styles[color]
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {label}
    </span>
  )
}

function DayCard({ day, index, total }: { day: string | ProgramDay; index: number; total: number }) {
  const [open, setOpen] = useState(index === 0) // Premier jour ouvert par défaut
  const name = getDayName(day)
  const exercises = getDayExercises(day)
  const hasExercises = exercises.length > 0

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--fiq-border)', background: 'var(--fiq-card)' }}>
      {/* Header de la séance */}
      <button
        onClick={() => hasExercises && setOpen(!open)}
        className="w-full p-4 flex items-center gap-3 text-left"
        style={{ cursor: hasExercises ? 'pointer' : 'default' }}
      >
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          {index + 1}
        </span>
        <div className="flex-1">
          <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>{name}</p>
          {hasExercises && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              {exercises.length} exercice{exercises.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
          style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}>
          Jour {index + 1}/{total}
        </span>
        {hasExercises && (
          open
            ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-muted)' }} />
            : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-muted)' }} />
        )}
      </button>

      {/* Liste des exercices */}
      {open && hasExercises && (
        <div style={{ borderTop: '1px solid var(--fiq-border)' }}>
          {exercises.map((ex, ei) => (
            <div
              key={ei}
              className="px-4 py-3 flex items-start gap-3"
              style={{
                borderBottom: ei < exercises.length - 1 ? '1px solid var(--fiq-border)' : undefined,
                background: ei % 2 === 0 ? 'transparent' : 'var(--fiq-faint)',
              }}
            >
              {/* Numéro exercice */}
              <span className="text-[11px] font-black w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}>
                {ei + 1}
              </span>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black leading-tight" style={{ color: 'var(--fiq-text)' }}>
                  {ex.name_fr}
                </p>

                {/* Sets × Reps · Repos */}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] font-black"
                    style={{ color: 'var(--fiq-accent)' }}>
                    <Dumbbell className="w-3 h-3" />
                    {ex.sets} × {ex.reps}
                  </span>
                  {ex.rest_sec !== undefined && ex.rest_sec > 0 && (
                    <span className="flex items-center gap-1 text-[11px]"
                      style={{ color: 'var(--fiq-muted)' }}>
                      <Timer className="w-3 h-3" />
                      {formatRest(ex.rest_sec)}
                    </span>
                  )}
                </div>

                {/* Note coaching */}
                {ex.note && (
                  <p className="text-[11px] mt-1.5 leading-relaxed"
                    style={{ color: 'var(--fiq-muted)' }}>
                    💡 {ex.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Séance sans exercices détaillés */}
      {!hasExercises && (
        <div className="px-4 pb-4">
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            {name.toLowerCase().includes('cardio') || name.toLowerCase().includes('liss')
              ? '🚴 Séance cardio — enregistre via "Autre activité" dans la section Séances'
              : 'Exercices générés par le coach IA selon ton niveau'}
          </p>
        </div>
      )}
    </div>
  )
}

export function ProgramDetailClient({ program, currentProgramId }: Props) {
  const router = useRouter()
  const [adopting, setAdopting] = useState(false)
  const [adopted, setAdopted] = useState(currentProgramId === program.id)

  const isFemale = FEMALE_SLUGS.has(program.slug)
  const days = program.structure?.days ?? []

  // Compte total d'exercices
  const totalExercises = days.reduce((acc, day) => {
    return acc + (typeof day === 'string' ? 0 : (day.exercises?.length ?? 0))
  }, 0)

  async function adoptProgram() {
    setAdopting(true)
    try {
      const res = await fetch('/api/programs/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: program.id }),
      })
      if (res.ok) {
        setAdopted(true)
        router.refresh()
      }
    } finally {
      setAdopting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Description */}
      <div className="rounded-2xl p-4 space-y-4"
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {isFemale && <Badge label="♀ FEMME" color="pink" />}
          {program.level.map(l => <Badge key={l} label={LEVEL_LABELS[l] ?? l} color="muted" />)}
          {program.goal.map(g => <Badge key={g} label={GOAL_LABELS[g] ?? g} color="blue" />)}
          {program.equipment.map(e => <Badge key={e} label={EQUIP_LABELS[e] ?? e} color="orange" />)}
        </div>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
          {program.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center rounded-xl py-3"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
            <p className="text-lg font-black" style={{ color: 'var(--fiq-text)' }}>
              {program.sessions_per_week}×
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>par semaine</p>
          </div>
          <div className="text-center rounded-xl py-3"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
            <p className="text-lg font-black" style={{ color: 'var(--fiq-text)' }}>
              {program.duration_weeks}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>semaines</p>
          </div>
          <div className="text-center rounded-xl py-3"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
            <p className="text-lg font-black" style={{ color: 'var(--fiq-text)' }}>
              {totalExercises > 0 ? totalExercises : days.length}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              {totalExercises > 0 ? 'exercices' : 'séances'}
            </p>
          </div>
        </div>
      </div>

      {/* Bouton adopter */}
      {adopted ? (
        <div className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm"
          style={{ background: '#B4FF4A15', border: '1px solid #B4FF4A44', color: 'var(--fiq-accent)' }}>
          <CheckCircle className="w-5 h-5" />
          Programme actif
        </div>
      ) : (
        <button
          onClick={adoptProgram}
          disabled={adopting}
          className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          <Zap className="w-5 h-5" />
          {adopting ? 'Adoption en cours...' : 'Adopter ce programme'}
        </button>
      )}

      {/* Séances */}
      <div>
        <p className="fiq-label mb-3">Structure du programme</p>
        <div className="space-y-3">
          {days.map((day, i) => (
            <DayCard key={i} day={day} index={i} total={days.length} />
          ))}
        </div>
      </div>
    </div>
  )
}
