'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Dumbbell, Calendar, Clock, CheckCircle, X, ChevronRight, Filter } from 'lucide-react'
import Link from 'next/link'

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
  structure: { days: string[] }
  is_custom: boolean
}

type Props = {
  programs: Program[]
  currentProgramId: string | null
  userGoal: string | null
  userLevel: string | null
  userEquipment: string | null
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

function Badge({ label, color = 'accent' }: { label: string; color?: 'accent' | 'blue' | 'orange' | 'muted' }) {
  const styles = {
    accent: { bg: '#B4FF4A22', color: 'var(--fiq-accent)', border: '#B4FF4A44' },
    blue: { bg: '#3D8BFF22', color: 'var(--fiq-blue)', border: '#3D8BFF44' },
    orange: { bg: '#FF6B3522', color: 'var(--fiq-orange)', border: '#FF6B3544' },
    muted: { bg: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: 'var(--fiq-border)' },
  }[color]
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: styles.bg, color: styles.color, border: `1px solid ${styles.border}` }}>
      {label}
    </span>
  )
}

function AdoptModal({ program, onClose, onConfirm, loading }: {
  program: Program; onClose: () => void; onConfirm: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>{program.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              {program.sessions_per_week} séances/semaine · {program.duration_weeks} semaines
            </p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
          </button>
        </div>

        <div className="rounded-xl p-3 space-y-1"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
          <p className="fiq-label mb-2">Structure des séances</p>
          {program.structure.days.map((day, i) => (
            <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fiq-text)' }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
                {i + 1}
              </span>
              {day}
            </div>
          ))}
        </div>

        <div className="text-xs px-3 py-2 rounded-lg"
          style={{ background: '#FF6B3510', border: '1px solid #FF6B3530', color: 'var(--fiq-orange)' }}>
          ⚠️ Remplacera ton programme actuel en cours.
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose}
            className="py-3 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="py-3 rounded-xl font-black text-sm"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
            {loading ? 'En cours...' : 'Adopter ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProgramsClient({ programs, currentProgramId, userGoal, userLevel, userEquipment }: Props) {
  const router = useRouter()
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterGoal, setFilterGoal] = useState<string>('all')
  const [filterSessions, setFilterSessions] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [adoptTarget, setAdoptTarget] = useState<Program | null>(null)
  const [adopting, setAdopting] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(currentProgramId)

  const filtered = programs.filter(p => {
    if (filterLevel !== 'all' && !p.level.includes(filterLevel)) return false
    if (filterGoal !== 'all' && !p.goal.includes(filterGoal)) return false
    if (filterSessions !== 'all' && String(p.sessions_per_week) !== filterSessions) return false
    return true
  })

  async function adoptProgram() {
    if (!adoptTarget) return
    setAdopting(true)
    try {
      const res = await fetch('/api/programs/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: adoptTarget.id }),
      })
      if (res.ok) {
        setSuccessId(adoptTarget.id)
        setAdoptTarget(null)
        router.refresh()
      }
    } finally {
      setAdopting(false)
    }
  }

  const activeFilters = [filterLevel, filterGoal, filterSessions].filter(f => f !== 'all').length

  return (
    <>
      {/* Bouton custom + filtres */}
      <div className="flex gap-3 mb-4">
        <Link href="/programs/custom"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm flex-shrink-0"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          <Plus className="w-4 h-4" />
          Créer
        </Link>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{
            background: showFilters ? 'var(--fiq-faint)' : 'var(--fiq-card)',
            border: `1px solid ${activeFilters > 0 ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
            color: activeFilters > 0 ? 'var(--fiq-accent)' : 'var(--fiq-muted)',
          }}>
          <Filter className="w-4 h-4" />
          Filtres{activeFilters > 0 ? ` (${activeFilters})` : ''}
        </button>
      </div>

      {/* Filtres déroulants */}
      {showFilters && (
        <div className="fiq-card space-y-3 mb-4">
          <div>
            <p className="fiq-label mb-2">Niveau</p>
            <div className="flex flex-wrap gap-2">
              {['all', 'beginner', 'intermediate', 'advanced'].map(v => (
                <button key={v}
                  onClick={() => setFilterLevel(v)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: filterLevel === v ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                    color: filterLevel === v ? 'var(--bg)' : 'var(--fiq-muted)',
                    border: `1px solid ${filterLevel === v ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                  }}>
                  {v === 'all' ? 'Tous' : LEVEL_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="fiq-label mb-2">Objectif</p>
            <div className="flex flex-wrap gap-2">
              {['all', 'muscle_gain', 'strength', 'weight_loss', 'endurance', 'general'].map(v => (
                <button key={v}
                  onClick={() => setFilterGoal(v)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: filterGoal === v ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                    color: filterGoal === v ? 'var(--bg)' : 'var(--fiq-muted)',
                    border: `1px solid ${filterGoal === v ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                  }}>
                  {v === 'all' ? 'Tous' : GOAL_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="fiq-label mb-2">Séances/semaine</p>
            <div className="flex flex-wrap gap-2">
              {['all', '3', '4', '5', '6'].map(v => (
                <button key={v}
                  onClick={() => setFilterSessions(v)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: filterSessions === v ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                    color: filterSessions === v ? 'var(--bg)' : 'var(--fiq-muted)',
                    border: `1px solid ${filterSessions === v ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                  }}>
                  {v === 'all' ? 'Toutes' : `${v}×`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compteur résultats */}
      <p className="text-xs mb-3" style={{ color: 'var(--fiq-muted)' }}>
        {filtered.length} programme{filtered.length > 1 ? 's' : ''}
      </p>

      {/* Cards programmes */}
      <div className="space-y-3">
        {filtered.map(p => {
          const isCurrent = successId === p.id
          return (
            <div
              key={p.id}
              className="fiq-card space-y-3"
              style={isCurrent ? { borderColor: 'var(--fiq-accent)' } : undefined}
            >
              {/* En-tête */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black" style={{ color: 'var(--fiq-text)' }}>{p.name}</p>
                    {isCurrent && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
                        EN COURS
                      </span>
                    )}
                    {p.is_custom && (
                      <Badge label="CUSTOM" color="blue" />
                    )}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
                    {p.description}
                  </p>
                </div>
              </div>

              {/* Méta */}
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--fiq-muted)' }}>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {p.sessions_per_week}×/sem
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {p.duration_weeks} sem.
                </span>
                <div className="flex flex-wrap gap-1 ml-auto">
                  {p.level.map(l => <Badge key={l} label={LEVEL_LABELS[l] ?? l} color="muted" />)}
                </div>
              </div>

              {/* Preview jours */}
              <div className="flex gap-1.5 flex-wrap">
                {p.structure.days.map((day, i) => (
                  <span key={i}
                    className="text-[10px] px-2 py-1 rounded-lg font-semibold"
                    style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}>
                    J{i + 1} · {day}
                  </span>
                ))}
              </div>

              {/* Bouton */}
              {isCurrent ? (
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--fiq-accent)' }}>
                  <CheckCircle className="w-4 h-4" />
                  Programme actif
                </div>
              ) : (
                <button
                  onClick={() => setAdoptTarget(p)}
                  className="w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}>
                  <Dumbbell className="w-4 h-4" />
                  Adopter ce programme
                  <ChevronRight className="w-4 h-4 ml-auto" style={{ color: 'var(--fiq-muted)' }} />
                </button>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold" style={{ color: 'var(--fiq-text)' }}>Aucun programme trouvé</p>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Essaie d&apos;ajuster les filtres ou{' '}
              <Link href="/programs/custom" style={{ color: 'var(--fiq-accent)' }}>crée le tien</Link>
            </p>
          </div>
        )}
      </div>

      {/* Modal adoption */}
      {adoptTarget && (
        <AdoptModal
          program={adoptTarget}
          onClose={() => setAdoptTarget(null)}
          onConfirm={adoptProgram}
          loading={adopting}
        />
      )}
    </>
  )
}
