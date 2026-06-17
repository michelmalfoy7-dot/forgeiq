'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Dumbbell, Calendar, Clock, CheckCircle, X, ChevronRight, Filter, Eye, Sparkles, Users, Globe, Lock, TrendingUp, Copy, Pencil } from 'lucide-react'
import Link from 'next/link'

type TierKey = 'premium' | 'standard' | 'home'

type ExerciseTierOption = {
  slug: string
  name_fr: string
}

type ProgramExercise = {
  slug?: string
  name_fr?: string
  slot?: string
  by_tier?: Record<TierKey, ExerciseTierOption>
  by_feature?: Record<string, ExerciseTierOption>
  sets: number
  reps: string
  rest_sec?: number
  note?: string
}

type ProgramDay = {
  name: string
  focus?: string
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
  is_public?: boolean
  adopted_count?: number
  community_published_at?: string | null
}

type CommunityProgram = Program & {
  author_name: string
  author_username: string | null
  is_mine: boolean
}

function getExerciseName(
  ex: ProgramExercise,
  tier: TierKey | null,
  gymFeatures?: string[] | null
): string {
  if (ex.by_feature && gymFeatures && gymFeatures.length > 0) {
    for (const feature of gymFeatures) {
      const match = ex.by_feature[feature]
      if (match?.name_fr) return match.name_fr
    }
  }
  if (ex.by_tier) {
    const key = tier ?? 'standard'
    return ex.by_tier[key]?.name_fr ?? ex.by_tier.standard?.name_fr ?? 'Exercice'
  }
  return ex.name_fr ?? 'Exercice'
}

function getDayName(day: string | ProgramDay): string {
  return typeof day === 'string' ? day : day.name
}

type Props = {
  programs: Program[]
  userPrograms: Program[]
  currentProgramId: string | null
  userGoal: string | null
  userLevel: string | null
  userEquipment: string | null
  gymTier?: TierKey | null
  gymName?: string | null
  gymEmoji?: string | null
  gymFeatures?: string[] | null
  isPro?: boolean
  generationsLeft?: number
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

function Badge({ label, color = 'accent' }: { label: string; color?: 'accent' | 'blue' | 'orange' | 'muted' | 'purple' }) {
  const styles = {
    accent: { bg: '#B4FF4A22', color: 'var(--fiq-accent)', border: '#B4FF4A44' },
    blue: { bg: '#3D8BFF22', color: 'var(--fiq-blue)', border: '#3D8BFF44' },
    orange: { bg: '#FF6B3522', color: 'var(--fiq-orange)', border: '#FF6B3544' },
    muted: { bg: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: 'var(--fiq-border)' },
    purple: { bg: '#A855F722', color: '#A855F7', border: '#A855F744' },
  }[color]
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: styles.bg, color: styles.color, border: `1px solid ${styles.border}` }}>
      {label}
    </span>
  )
}

function AdoptModal({ program, onClose, onConfirm, loading, gymTier, gymName, gymEmoji, gymFeatures }: {
  program: Program; onClose: () => void; onConfirm: () => void; loading: boolean
  gymTier: TierKey | null; gymName: string | null; gymEmoji: string | null
  gymFeatures: string[] | null
}) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:pb-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 space-y-4 sm:mb-0"
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)', marginBottom: 'calc(4rem + env(safe-area-inset-bottom))', maxHeight: '85vh', overflowY: 'auto' }}
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

        {gymName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: '#B4FF4A10', border: '1px solid #B4FF4A30', color: 'var(--fiq-accent)' }}>
            <span>{gymEmoji ?? '🏋️'}</span>
            <span>Exercices adaptés pour {gymName}</span>
          </div>
        )}

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--fiq-border)' }}>
          <div className="px-3 pt-3 pb-2" style={{ background: 'var(--fiq-faint)' }}>
            <p className="fiq-label">Structure des séances</p>
          </div>
          {program.structure.days.map((day, i) => {
            const name = getDayName(day)
            const exercises = typeof day === 'string' ? [] : (day.exercises ?? [])
            const focus = typeof day === 'string' ? null : (day as ProgramDay).focus ?? null
            const isExpanded = expandedDay === i
            return (
              <div key={i} style={{ borderTop: '1px solid var(--fiq-border)' }}>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                  style={{ background: isExpanded ? '#B4FF4A08' : 'transparent' }}
                  onClick={() => setExpandedDay(isExpanded ? null : i)}
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                    style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>{name}</span>
                    {focus && <span className="text-[10px] ml-2" style={{ color: 'var(--fiq-muted)' }}>{focus}</span>}
                  </div>
                  {exercises.length > 0 && (
                    <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                      {isExpanded ? '▲' : `${exercises.length} ex.`}
                    </span>
                  )}
                </button>
                {isExpanded && exercises.length > 0 && (
                  <div className="px-3 pb-3 space-y-1.5" style={{ background: '#B4FF4A05' }}>
                    {exercises.map((ex, j) => {
                      const exName = getExerciseName(ex, gymTier, gymFeatures)
                      return (
                        <div key={j} className="flex items-start gap-2">
                          <span className="text-[10px] mt-0.5 font-black w-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }}>
                            {j + 1}.
                          </span>
                          <div className="flex-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--fiq-text)' }}>{exName}</span>
                            <span className="text-[10px] ml-1.5" style={{ color: 'var(--fiq-muted)' }}>
                              {ex.sets}×{ex.reps}{ex.rest_sec && ` · ${ex.rest_sec}s`}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
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

function ProgramCard({
  p, isCurrent, onAdopt, onFork, forkLoading, gymTier, gymFeatures, showAuthor, authorName, authorUsername, isPublished, onTogglePublish, publishLoading, showEdit,
}: {
  p: Program
  isCurrent: boolean
  onAdopt: (p: Program) => void
  onFork?: (p: Program) => void
  forkLoading?: boolean
  gymTier: TierKey | null
  gymFeatures: string[] | null
  showAuthor?: boolean
  authorName?: string
  authorUsername?: string | null
  isPublished?: boolean
  onTogglePublish?: (p: Program, publish: boolean) => void
  publishLoading?: boolean
  showEdit?: boolean
}) {
  return (
    <div
      className="fiq-card space-y-3"
      style={isCurrent ? { borderColor: 'var(--fiq-accent)' } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black" style={{ color: 'var(--fiq-text)' }}>{p.name}</p>
            {isCurrent && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
                EN COURS
              </span>
            )}
            {FEMALE_SLUGS.has(p.slug) && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: '#FF6B9D22', color: '#FF6B9D', border: '1px solid #FF6B9D44' }}>
                ♀ FEMME
              </span>
            )}
            {p.is_custom && <Badge label="CUSTOM" color="blue" />}
          </div>
          {showAuthor && authorName && (
            <p className="text-[11px] mt-0.5 font-semibold" style={{ color: 'var(--fiq-muted)' }}>
              par {authorUsername ? (
                <Link href={`/u/${authorUsername}`} style={{ color: 'var(--fiq-blue)' }}>@{authorUsername}</Link>
              ) : authorName}
            </p>
          )}
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
            {p.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--fiq-muted)' }}>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {p.sessions_per_week}×/sem
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {p.duration_weeks} sem.
        </span>
        {(p.adopted_count ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {p.adopted_count} adoptions
          </span>
        )}
        <div className="flex flex-wrap gap-1 ml-auto">
          {p.level.map(l => <Badge key={l} label={LEVEL_LABELS[l] ?? l} color="muted" />)}
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {p.structure.days.map((day, i) => (
          <span key={i}
            className="text-[10px] px-2 py-1 rounded-lg font-semibold"
            style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}>
            J{i + 1} · {getDayName(day)}
          </span>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link
          href={`/programs/${p.slug}`}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
          <Eye className="w-4 h-4" />
          Détail
        </Link>

        {/* Bouton éditer — mes programmes seulement */}
        {showEdit && (
          <Link
            href={`/programs/custom?edit=${p.id}`}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}>
            <Pencil className="w-4 h-4" />
            Éditer
          </Link>
        )}

        {/* Bouton publier/dépublier sur "Mes programmes" */}
        {onTogglePublish && (
          <button
            onClick={() => onTogglePublish(p, !isPublished)}
            disabled={publishLoading}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-sm"
            style={{
              background: isPublished ? '#A855F722' : 'var(--fiq-faint)',
              border: `1px solid ${isPublished ? '#A855F744' : 'var(--fiq-border)'}`,
              color: isPublished ? '#A855F7' : 'var(--fiq-muted)',
            }}>
            {isPublished ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {publishLoading ? '...' : isPublished ? 'Public' : 'Publier'}
          </button>
        )}

        {/* Bouton fork — communauté seulement */}
        {onFork && !isCurrent && (
          <button
            onClick={() => onFork(p)}
            disabled={forkLoading}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: '#3D8BFF18', border: '1px solid #3D8BFF44', color: 'var(--fiq-blue)' }}>
            <Copy className="w-4 h-4" />
            {forkLoading ? '...' : 'Copier'}
          </button>
        )}

        {isCurrent ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl py-2.5"
            style={{ background: '#B4FF4A15', border: '1px solid #B4FF4A44', color: 'var(--fiq-accent)' }}>
            <CheckCircle className="w-4 h-4" />
            Programme actif
          </div>
        ) : (
          <button
            onClick={() => onAdopt(p)}
            className="flex-1 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}>
            <Dumbbell className="w-4 h-4" />
            Adopter
            <ChevronRight className="w-4 h-4 ml-auto" style={{ color: 'var(--fiq-muted)' }} />
          </button>
        )}
      </div>
    </div>
  )
}

export function ProgramsClient({
  programs, userPrograms, currentProgramId, userGoal, userLevel, userEquipment,
  gymTier = null, gymName = null, gymEmoji = null, gymFeatures = null,
  isPro = false, generationsLeft = 0,
}: Props) {
  const router = useRouter()
  // Ouvre directement l'onglet "mine" si ?tab=mine dans l'URL (ex: après édition)
  const [tab, setTab] = useState<'forgeiq' | 'community' | 'mine'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab')
      if (p === 'mine' || p === 'community') return p
    }
    return 'forgeiq'
  })
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterGoal, setFilterGoal] = useState<string>('all')
  const [filterSessions, setFilterSessions] = useState<string>('all')
  const [filterEquipment, setFilterEquipment] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [adoptTarget, setAdoptTarget] = useState<Program | null>(null)
  const [adopting, setAdopting] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(currentProgramId)
  const [communityPrograms, setCommunityPrograms] = useState<CommunityProgram[]>([])
  const [communityLoading, setCommunityLoading] = useState(false)
  const [communitySort, setCommunitySort] = useState<'popular' | 'recent'>('popular')
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishedIds, setPublishedIds] = useState<Set<string>>(
    new Set(userPrograms.filter(p => p.is_public).map(p => p.id))
  )
  const [forkingId, setForkingId] = useState<string | null>(null)
  const [forkToast, setForkToast] = useState<string | null>(null)
  // Message d'erreur affiché sous forme de toast rouge (adopt / fork / publish)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  /** Affiche un toast d'erreur pendant 4 secondes puis le masque */
  function showError(msg: string) {
    setErrorToast(msg)
    setTimeout(() => setErrorToast(null), 4000)
  }

  const fetchCommunity = useCallback(async (sort: 'popular' | 'recent') => {
    setCommunityLoading(true)
    try {
      const res = await fetch(`/api/programs/community?sort=${sort}`)
      const json = await res.json() as { data: CommunityProgram[] | null }
      if (json.data) setCommunityPrograms(json.data)
    } finally {
      setCommunityLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'community') void fetchCommunity(communitySort)
  }, [tab, communitySort, fetchCommunity])

  const applyFilters = (list: Program[]) => list.filter(p => {
    if (filterLevel !== 'all' && !p.level.includes(filterLevel)) return false
    if (filterGoal !== 'all' && !p.goal.includes(filterGoal)) return false
    if (filterSessions !== 'all' && String(p.sessions_per_week) !== filterSessions) return false
    if (filterEquipment !== 'all' && !p.equipment.includes(filterEquipment)) return false
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
        // Mettre à jour le compteur local pour les programmes communauté
        setCommunityPrograms(prev => prev.map(p =>
          p.id === adoptTarget.id ? { ...p, adopted_count: (p.adopted_count ?? 0) + 1 } : p
        ))
      } else {
        // Feedback d'erreur si l'API retourne un statut non-ok (ex: 403 Pro requis)
        const json = await res.json().catch(() => ({})) as { error?: string }
        showError(json.error ?? 'Impossible d\'adopter ce programme. Réessaie.')
        setAdoptTarget(null)
      }
    } catch {
      showError('Erreur réseau — vérifie ta connexion et réessaie.')
      setAdoptTarget(null)
    } finally {
      setAdopting(false)
    }
  }

  async function forkProgram(p: Program) {
    setForkingId(p.id)
    try {
      const res = await fetch('/api/programs/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: p.id }),
      })
      const json = await res.json() as { data: { id: string; name: string } | null; error: string | null }
      if (json.data) {
        setSuccessId(json.data.id)
        setForkToast(json.data.name)
        setTimeout(() => setForkToast(null), 4000)
        router.refresh()
      } else {
        // Feedback d'erreur si le fork échoue côté API
        showError(json.error ?? 'Impossible de copier ce programme. Réessaie.')
      }
    } catch {
      showError('Erreur réseau — vérifie ta connexion et réessaie.')
    } finally {
      setForkingId(null)
    }
  }

  async function togglePublish(p: Program, publish: boolean) {
    setPublishingId(p.id)
    try {
      const res = await fetch('/api/programs/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: p.id, publish }),
      })
      if (res.ok) {
        setPublishedIds(prev => {
          const next = new Set(prev)
          if (publish) next.add(p.id)
          else next.delete(p.id)
          return next
        })
        // Rafraîchir la communauté si on vient de publier
        if (publish && tab === 'community') void fetchCommunity(communitySort)
      }
    } finally {
      setPublishingId(null)
    }
  }

  const activeFilters = [filterLevel, filterGoal, filterSessions, filterEquipment].filter(f => f !== 'all').length

  const TABS = [
    { key: 'forgeiq' as const, label: 'ForgeIQ', count: programs.length },
    { key: 'community' as const, label: 'Communauté', count: null },
    { key: 'mine' as const, label: 'Mes programmes', count: userPrograms.length },
  ]

  return (
    <>
      {/* Bandeau salle */}
      {gymName ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4 text-sm font-semibold"
          style={{ background: '#B4FF4A10', border: '1px solid #B4FF4A30', color: 'var(--fiq-accent)' }}>
          <span className="text-base">{gymEmoji ?? '🏋️'}</span>
          <span className="flex-1">Exercices adaptés pour <strong>{gymName}</strong></span>
          <Link href="/profile" className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: '#B4FF4A22', color: 'var(--fiq-accent)' }}>
            Changer
          </Link>
        </div>
      ) : (
        <Link href="/profile" className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4 text-sm"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
          <span className="text-base">🏋️</span>
          <span className="flex-1">Configure ta salle pour des exercices adaptés</span>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        </Link>
      )}

      {/* Générateur IA */}
      {isPro ? (
        <Link href="/programs/generate"
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-4"
          style={{ background: '#B4FF4A10', border: '1px solid #B4FF4A40' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--fiq-accent)' }}>
            <Sparkles className="w-4 h-4" style={{ color: 'var(--bg)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm" style={{ color: 'var(--fiq-accent)' }}>Générer mon programme IA</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              Sur mesure · PRs · Salle · {generationsLeft}/3 restantes ce mois
            </p>
          </div>
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
        </Link>
      ) : (
        <Link href="/pricing"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
            <Sparkles className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'var(--fiq-text)' }}>Programme IA personnalisé</p>
            <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
              Disponible en Pro · Adapté à tes PRs et ta salle
            </p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: '#B4FF4A22', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A44' }}>
            PRO
          </span>
        </Link>
      )}

      {/* Onglets */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5"
            style={{
              background: tab === t.key ? 'var(--fiq-card)' : 'transparent',
              color: tab === t.key ? 'var(--fiq-text)' : 'var(--fiq-muted)',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {t.key === 'community' && <Users className="w-3 h-3" />}
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className="text-[9px] font-black px-1 py-0.5 rounded-full"
                style={{ background: tab === t.key ? 'var(--fiq-accent)' : 'var(--fiq-border)', color: tab === t.key ? 'var(--bg)' : 'var(--fiq-muted)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ ONGLET FORGEIQ ═══ */}
      {tab === 'forgeiq' && (
        <>
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

          {showFilters && <FilterPanel {...{ filterLevel, setFilterLevel, filterGoal, setFilterGoal, filterSessions, setFilterSessions, filterEquipment, setFilterEquipment }} />}

          <p className="text-xs mb-3" style={{ color: 'var(--fiq-muted)' }}>
            {applyFilters(programs).length} programme{applyFilters(programs).length > 1 ? 's' : ''}
          </p>

          <div className="space-y-3">
            {applyFilters(programs).map(p => (
              <ProgramCard key={p.id} p={p} isCurrent={successId === p.id}
                onAdopt={setAdoptTarget} gymTier={gymTier ?? null} gymFeatures={gymFeatures ?? null} />
            ))}
            {applyFilters(programs).length === 0 && <EmptyFilters />}
          </div>
        </>
      )}

      {/* ═══ ONGLET COMMUNAUTÉ ═══ */}
      {tab === 'community' && (
        <>
          {/* Sort + CTA publier */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-1 flex-1 p-1 rounded-lg" style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
              {(['popular', 'recent'] as const).map(s => (
                <button key={s} onClick={() => setCommunitySort(s)}
                  className="flex-1 py-1.5 rounded-md text-xs font-black flex items-center justify-center gap-1 transition-all"
                  style={{
                    background: communitySort === s ? 'var(--fiq-card)' : 'transparent',
                    color: communitySort === s ? 'var(--fiq-text)' : 'var(--fiq-muted)',
                  }}>
                  {s === 'popular' ? <><TrendingUp className="w-3 h-3" />Populaire</> : <>🕐 Récent</>}
                </button>
              ))}
            </div>
            <Link href="/programs/custom"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs flex-shrink-0"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
              <Plus className="w-3.5 h-3.5" />
              Publier le mien
            </Link>
          </div>

          {communityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="fiq-card h-32 animate-pulse" style={{ background: 'var(--fiq-faint)' }} />
              ))}
            </div>
          ) : communityPrograms.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🌍</p>
              <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>Sois le premier à partager !</p>
              <p className="text-sm mt-2 mb-5" style={{ color: 'var(--fiq-muted)' }}>
                Crée un programme custom et publie-le pour la communauté.
              </p>
              <Link href="/programs/custom"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
                <Plus className="w-4 h-4" />
                Créer et publier
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {communityPrograms.map(p => (
                <ProgramCard key={p.id} p={p} isCurrent={successId === p.id}
                  onAdopt={setAdoptTarget} gymTier={gymTier ?? null} gymFeatures={gymFeatures ?? null}
                  showAuthor authorName={p.author_name} authorUsername={p.author_username}
                  onFork={p.is_mine ? undefined : forkProgram}
                  forkLoading={forkingId === p.id} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ ONGLET MES PROGRAMMES ═══ */}
      {tab === 'mine' && (
        <>
          <div className="flex gap-3 mb-4">
            <Link href="/programs/custom"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
              <Plus className="w-4 h-4" />
              Nouveau programme
            </Link>
          </div>

          {userPrograms.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📝</p>
              <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>Aucun programme custom</p>
              <p className="text-sm mt-2 mb-5" style={{ color: 'var(--fiq-muted)' }}>
                Crée ton propre programme et partage-le avec la communauté.
              </p>
              <Link href="/programs/custom"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
                <Plus className="w-4 h-4" />
                Créer
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4 text-xs"
                style={{ background: '#A855F710', border: '1px solid #A855F730', color: '#A855F7' }}>
                <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Publie ton programme pour qu&apos;il apparaisse dans l&apos;onglet Communauté.</span>
              </div>
              <div className="space-y-3">
                {userPrograms.map(p => (
                  <ProgramCard key={p.id} p={p} isCurrent={successId === p.id}
                    onAdopt={setAdoptTarget} gymTier={gymTier ?? null} gymFeatures={gymFeatures ?? null}
                    isPublished={publishedIds.has(p.id)}
                    onTogglePublish={togglePublish}
                    publishLoading={publishingId === p.id}
                    showEdit />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Toast fork réussi */}
      {forkToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-lg"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-accent)', color: 'var(--fiq-text)', whiteSpace: 'nowrap' }}>
          <Copy className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
          <span><strong style={{ color: 'var(--fiq-accent)' }}>{forkToast}</strong> copié dans Mes programmes !</span>
        </div>
      )}

      {/* Toast erreur adopt / fork / publish */}
      {errorToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-lg"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-red)', color: 'var(--fiq-text)', whiteSpace: 'nowrap', maxWidth: '90vw' }}>
          <X className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-red)' }} />
          <span style={{ color: 'var(--fiq-red)' }}>{errorToast}</span>
        </div>
      )}

      {/* Modal adoption */}
      {adoptTarget && (
        <AdoptModal
          program={adoptTarget}
          onClose={() => setAdoptTarget(null)}
          onConfirm={adoptProgram}
          loading={adopting}
          gymTier={gymTier ?? null}
          gymName={gymName ?? null}
          gymEmoji={gymEmoji ?? null}
          gymFeatures={gymFeatures ?? null}
        />
      )}
    </>
  )
}

function FilterPanel({
  filterLevel, setFilterLevel, filterGoal, setFilterGoal,
  filterSessions, setFilterSessions, filterEquipment, setFilterEquipment,
}: {
  filterLevel: string; setFilterLevel: (v: string) => void
  filterGoal: string; setFilterGoal: (v: string) => void
  filterSessions: string; setFilterSessions: (v: string) => void
  filterEquipment: string; setFilterEquipment: (v: string) => void
}) {
  const btn = (active: boolean) => ({
    background: active ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
    color: active ? 'var(--bg)' : 'var(--fiq-muted)',
    border: `1px solid ${active ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
  })
  return (
    <div className="fiq-card space-y-3 mb-4">
      <div>
        <p className="fiq-label mb-2">Niveau</p>
        <div className="flex flex-wrap gap-2">
          {['all', 'beginner', 'intermediate', 'advanced'].map(v => (
            <button key={v} onClick={() => setFilterLevel(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={btn(filterLevel === v)}>
              {v === 'all' ? 'Tous' : LEVEL_LABELS[v]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="fiq-label mb-2">Objectif</p>
        <div className="flex flex-wrap gap-2">
          {['all', 'muscle_gain', 'strength', 'weight_loss', 'endurance', 'general'].map(v => (
            <button key={v} onClick={() => setFilterGoal(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={btn(filterGoal === v)}>
              {v === 'all' ? 'Tous' : GOAL_LABELS[v]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="fiq-label mb-2">Séances/semaine</p>
        <div className="flex flex-wrap gap-2">
          {['all', '3', '4', '5', '6'].map(v => (
            <button key={v} onClick={() => setFilterSessions(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={btn(filterSessions === v)}>
              {v === 'all' ? 'Toutes' : `${v}×`}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="fiq-label mb-2">Équipement</p>
        <div className="flex flex-wrap gap-2">
          {(['all', 'full_gym', 'home_basic', 'home_advanced', 'bodyweight'] as const).map(v => (
            <button key={v} onClick={() => setFilterEquipment(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={btn(filterEquipment === v)}>
              {v === 'all' ? 'Tout' : EQUIP_LABELS[v] ?? v}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyFilters() {
  return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">🔍</p>
      <p className="font-semibold" style={{ color: 'var(--fiq-text)' }}>Aucun programme trouvé</p>
      <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
        Essaie d&apos;ajuster les filtres ou{' '}
        <Link href="/programs/custom" style={{ color: 'var(--fiq-accent)' }}>crée le tien</Link>
      </p>
    </div>
  )
}
