'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trophy, Dumbbell, Flame, Zap, Clock,
  Users, X, ChevronDown, ChevronUp,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type ChallengeType = 'tonnage_weekly' | 'streak_weekly' | 'sessions_monthly' | 'tonnage_monthly'

type Challenge = {
  id: string
  created_by: string
  title: string
  type: ChallengeType
  target_value: number | null
  start_date: string
  end_date: string
  is_public: boolean
  created_at: string
  is_joined: boolean
  is_mine: boolean
  my_value: number
  participant_count: number
}

type LeaderEntry = {
  rank: number
  user_id: string
  username: string | null
  display_name: string
  avatar_url: string | null
  value: number
  is_me: boolean
}

// ── Métadonnées des types de défi ─────────────────────────────────────────────

type ChallengeMeta = {
  label: string
  icon: React.ReactNode
  color: string
  unit: (v: number) => string
  emoji: string
}

const CHALLENGE_META: Record<ChallengeType, ChallengeMeta> = {
  tonnage_weekly: {
    label: 'Tonnage hebdo',
    icon: <Dumbbell className="w-4 h-4" />,
    color: 'var(--fiq-accent)',
    unit: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)}kg`,
    emoji: '🏋️',
  },
  streak_weekly: {
    label: 'Jours actifs',
    icon: <Flame className="w-4 h-4" />,
    color: 'var(--fiq-orange)',
    unit: (v) => `${v}j`,
    emoji: '🔥',
  },
  sessions_monthly: {
    label: 'Séances du mois',
    icon: <Zap className="w-4 h-4" />,
    color: '#A855F7',
    unit: (v) => `${v} séance${v > 1 ? 's' : ''}`,
    emoji: '⚡',
  },
  tonnage_monthly: {
    label: 'Tonnage mensuel',
    icon: <Dumbbell className="w-4 h-4" />,
    color: 'var(--fiq-blue)',
    unit: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)}kg`,
    emoji: '💪',
  },
}

const DURATION_OPTIONS = [
  { label: '7 jours',  days: 7  },
  { label: '14 jours', days: 14 },
  { label: '30 jours', days: 30 },
]

const RANK_MEDALS = ['🥇', '🥈', '🥉']

const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysLeft(endDate: string): number {
  const diff = new Date(endDate + 'T23:59:59').getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

function isEnded(endDate: string): boolean {
  return new Date(endDate + 'T23:59:59') < new Date()
}

// ── Leaderboard row ───────────────────────────────────────────────────────────

function LeaderRow({
  entry, meta, showWinner,
}: {
  entry: LeaderEntry
  meta: ChallengeMeta
  showWinner: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: entry.is_me ? `${meta.color}18` : 'transparent',
        border: `1px solid ${entry.is_me ? `${meta.color}44` : 'transparent'}`,
      }}
    >
      <span
        className="w-7 text-center text-sm font-bold flex-shrink-0"
        style={{ color: entry.rank <= 3 ? '#F59E0B' : 'var(--fiq-muted)' }}
      >
        {RANK_MEDALS[entry.rank - 1] ?? `#${entry.rank}`}
      </span>

      {entry.avatar_url ? (
        <Image
          src={entry.avatar_url}
          alt={entry.display_name}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{ background: `${meta.color}33`, color: meta.color }}
        >
          {entry.display_name[0]?.toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: entry.is_me ? meta.color : 'var(--fiq-text)' }}
        >
          {entry.display_name}{entry.is_me ? ' (toi)' : ''}
        </p>
        {entry.username && (
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>@{entry.username}</p>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-black tabular-nums" style={{ color: meta.color }}>
          {meta.unit(entry.value)}
        </p>
        {showWinner && entry.rank === 1 && (
          <p className="text-xs" style={{ color: '#F59E0B' }}>Gagnant</p>
        )}
      </div>
    </div>
  )
}

// ── Challenge card ────────────────────────────────────────────────────────────

function ChallengeCard({
  challenge,
  onJoined,
}: {
  challenge: Challenge
  onJoined: (id: string, newValue: number) => void
}) {
  const meta    = CHALLENGE_META[challenge.type]
  const left    = daysLeft(challenge.end_date)
  const ended   = isEnded(challenge.end_date)

  const [expanded,    setExpanded]    = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [lbLoading,   setLbLoading]   = useState(false)
  const [joining,     setJoining]     = useState(false)

  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true)
    try {
      const r    = await fetch(`/api/challenges/${challenge.id}/leaderboard`)
      const json = await r.json() as { data?: { entries: LeaderEntry[] } }
      setLeaderboard(json.data?.entries ?? [])
    } finally {
      setLbLoading(false)
    }
  }, [challenge.id])

  function toggle() {
    if (!expanded && leaderboard.length === 0) void loadLeaderboard()
    setExpanded(p => !p)
  }

  async function handleJoin() {
    setJoining(true)
    try {
      const r    = await fetch(`/api/challenges/${challenge.id}/join`, { method: 'POST' })
      const json = await r.json() as { data?: { current_value: number }; error?: string }
      if (!json.error) {
        onJoined(challenge.id, json.data?.current_value ?? 0)
        // Rafraîchir le classement visible
        if (expanded) void loadLeaderboard()
        else { setExpanded(true); void loadLeaderboard() }
      }
    } finally {
      setJoining(false)
    }
  }

  const myEntry     = leaderboard.find(e => e.is_me)
  const iAmWinner   = ended && myEntry?.rank === 1

  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 16,
        border: `1px solid ${iAmWinner ? '#F59E0B44' : 'var(--fiq-border)'}`,
        background: 'var(--fiq-card)',
      }}
    >
      {/* En-tête */}
      <div className="flex items-start gap-3 p-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${meta.color}22` }}
        >
          <span style={{ color: meta.color }}>{meta.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="text-sm font-black tracking-tight"
              style={{ color: 'var(--fiq-text)' }}
            >
              {challenge.title}
            </h3>
            {iAmWinner && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: '#F59E0B22', color: '#F59E0B', border: '1px solid #F59E0B44' }}
              >
                🏆 Gagnant
              </span>
            )}
          </div>

          <p className="text-xs mt-0.5" style={{ color: meta.color }}>
            {meta.emoji} {meta.label}
          </p>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--fiq-muted)' }}
            >
              <Users className="w-3 h-3" />
              {challenge.participant_count} participant{challenge.participant_count > 1 ? 's' : ''}
            </span>

            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: ended ? 'var(--fiq-muted)' : left <= 2 ? 'var(--fiq-red)' : 'var(--fiq-muted)' }}
            >
              <Clock className="w-3 h-3" />
              {ended ? 'Terminé' : `${left}j restant${left > 1 ? 's' : ''}`}
            </span>

            {challenge.is_joined && (
              <span className="text-xs font-black tabular-nums" style={{ color: meta.color }}>
                {meta.unit(challenge.my_value)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!challenge.is_joined && !ended && (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="px-3 py-1.5 rounded-lg text-xs font-black transition-opacity disabled:opacity-50"
              style={{
                background: meta.color,
                color: meta.color === 'var(--fiq-accent)' ? 'var(--bg)' : '#fff',
              }}
            >
              {joining ? '…' : 'Rejoindre'}
            </button>
          )}
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--fiq-muted)' }}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Classement dépliable */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--fiq-border)' }}>
          {lbLoading ? (
            <div className="flex justify-center py-6">
              <div
                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${meta.color} transparent transparent transparent` }}
              />
            </div>
          ) : leaderboard.length === 0 ? (
            <p
              className="text-center text-xs py-6"
              style={{ color: 'var(--fiq-muted)' }}
            >
              Aucun participant encore
            </p>
          ) : (
            <div className="p-2 flex flex-col gap-0.5">
              {leaderboard.map(entry => (
                <LeaderRow
                  key={entry.user_id}
                  entry={entry}
                  meta={meta}
                  showWinner={ended}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal création ─────────────────────────────────────────────────────────────

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [title,    setTitle]    = useState('')
  const [type,     setType]     = useState<ChallengeType>('tonnage_weekly')
  const [duration, setDuration] = useState(7)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const today   = new Date().toISOString().split('T')[0]
  const endDate = new Date(Date.now() + duration * 86_400_000).toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/challenges', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:      title.trim(),
          type,
          start_date: today,
          end_date:   endDate,
          is_public:  true,
        }),
      })
      const json = await r.json() as { error?: string }
      if (json.error) { setError(json.error); return }
      onClose()
      onCreated()
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black" style={{ color: 'var(--fiq-text)' }}>
            Nouveau défi
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--fiq-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Titre */}
          <div>
            <label
              className="text-xs font-bold uppercase tracking-widest mb-1.5 block"
              style={{ color: 'var(--fiq-muted)' }}
            >
              Titre
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex. Qui soulève le plus cette semaine ?"
              maxLength={60}
              required
              className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
              style={{
                background: 'var(--fiq-faint)',
                color: 'var(--fiq-text)',
                border: '1px solid var(--fiq-border)',
              }}
            />
          </div>

          {/* Type */}
          <div>
            <label
              className="text-xs font-bold uppercase tracking-widest mb-1.5 block"
              style={{ color: 'var(--fiq-muted)' }}
            >
              Type de défi
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(CHALLENGE_META) as [ChallengeType, ChallengeMeta][]).map(([key, m]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all"
                  style={{
                    background: type === key ? `${m.color}22` : 'var(--fiq-faint)',
                    border: `1px solid ${type === key ? m.color : 'var(--fiq-border)'}`,
                    color: type === key ? m.color : 'var(--fiq-muted)',
                  }}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Durée */}
          <div>
            <label
              className="text-xs font-bold uppercase tracking-widest mb-1.5 block"
              style={{ color: 'var(--fiq-muted)' }}
            >
              Durée
            </label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setDuration(opt.days)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: duration === opt.days ? 'var(--fiq-accent)22' : 'var(--fiq-faint)',
                    border: `1px solid ${duration === opt.days ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                    color: duration === opt.days ? 'var(--fiq-accent)' : 'var(--fiq-muted)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--fiq-muted)' }}>
              Du {fmt.format(new Date(today + 'T12:00:00'))} au {fmt.format(new Date(endDate + 'T12:00:00'))}
            </p>
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: 'var(--fiq-red)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full py-3 rounded-xl text-sm font-black transition-opacity disabled:opacity-50"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            {loading ? 'Création…' : 'Créer le défi'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function ChallengesClient() {
  const [challenges,  setChallenges]  = useState<Challenge[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)

  const loadChallenges = useCallback(async () => {
    setLoading(true)
    try {
      const r    = await fetch('/api/challenges')
      const json = await r.json() as { data?: Challenge[] }
      setChallenges(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadChallenges() }, [loadChallenges])

  // Mise à jour optimiste après rejoindre
  function handleJoined(id: string, newValue: number) {
    setChallenges(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, is_joined: true, my_value: newValue, participant_count: c.participant_count + 1 }
          : c
      )
    )
  }

  const active = challenges.filter(c => !isEnded(c.end_date))
  const ended  = challenges.filter(c => isEnded(c.end_date))

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-safe-top pb-3 flex items-center gap-3"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--fiq-border)' }}
      >
        <Link
          href="/social"
          className="p-2 -ml-2 rounded-xl"
          style={{ color: 'var(--fiq-muted)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
          <h1
            className="text-base font-black tracking-tight"
            style={{ color: 'var(--fiq-text)' }}
          >
            Défis
          </h1>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau
        </button>
      </div>

      {/* Contenu */}
      <div className="px-4 pt-4 flex flex-col gap-3 max-w-[480px] mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--fiq-accent) transparent transparent transparent' }}
            />
          </div>
        ) : challenges.length === 0 ? (
          /* État vide */
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--fiq-accent)22' }}
            >
              <Trophy className="w-8 h-8" style={{ color: 'var(--fiq-accent)' }} />
            </div>
            <div>
              <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>
                Aucun défi en cours
              </p>
              <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--fiq-muted)' }}>
                Lance un défi à tes amis pour pimenter l&apos;entraînement
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-black"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              Créer mon premier défi
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <p
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--fiq-muted)' }}
                >
                  En cours · {active.length}
                </p>
                {active.map(c => (
                  <ChallengeCard key={c.id} challenge={c} onJoined={handleJoined} />
                ))}
              </>
            )}

            {ended.length > 0 && (
              <>
                <p
                  className="text-xs font-bold uppercase tracking-widest mt-2"
                  style={{ color: 'var(--fiq-muted)' }}
                >
                  Terminés · {ended.length}
                </p>
                {ended.map(c => (
                  <ChallengeCard key={c.id} challenge={c} onJoined={handleJoined} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={loadChallenges}
        />
      )}
    </div>
  )
}
