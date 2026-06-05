'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Trophy, Flame, Dumbbell, Zap } from 'lucide-react'

type LeaderEntry = {
  rank: number
  user_id: string
  username: string | null
  display_name: string
  avatar_url: string | null
  value: number
  is_me: boolean
}

type TabType = 'tonnage' | 'sessions' | 'prs'

const TABS: { key: TabType; label: string; icon: React.ReactNode; unit: (v: number) => string; color: string }[] = [
  {
    key: 'tonnage',
    label: 'Tonnage',
    icon: <Dumbbell className="w-3.5 h-3.5" />,
    unit: (v) => v > 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`,
    color: 'var(--fiq-accent)',
  },
  {
    key: 'sessions',
    label: 'Séances',
    icon: <Flame className="w-3.5 h-3.5" />,
    unit: (v) => `${v} séance${v > 1 ? 's' : ''}`,
    color: 'var(--fiq-orange)',
  },
  {
    key: 'prs',
    label: 'Records',
    icon: <Zap className="w-3.5 h-3.5" />,
    unit: (v) => `${v} PR${v > 1 ? 's' : ''}`,
    color: '#A855F7',
  },
]

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('tonnage')
  const [data, setData]           = useState<Record<TabType, LeaderEntry[] | null>>({
    tonnage: null, sessions: null, prs: null,
  })
  const [loading, setLoading] = useState(false)

  // Charger un onglet si pas encore chargé
  useEffect(() => {
    if (data[activeTab] !== null) return
    setLoading(true)
    fetch(`/api/social/leaderboard?type=${activeTab}&days=7`)
      .then(r => r.json())
      .then((json: { data: LeaderEntry[] | null }) => {
        setData(prev => ({ ...prev, [activeTab]: json.data ?? [] }))
      })
      .catch(() => setData(prev => ({ ...prev, [activeTab]: [] })))
      .finally(() => setLoading(false))
  }, [activeTab, data])

  const currentTab = TABS.find(t => t.key === activeTab)!
  const entries    = data[activeTab]

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/social"
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            <Trophy className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
            Classement
          </h1>
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Top 10 · 7 derniers jours</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all"
            style={activeTab === tab.key
              ? { background: 'var(--fiq-card)', color: tab.color, boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
              : { color: 'var(--fiq-muted)' }
            }
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Podium — top 3 */}
      {!loading && entries && entries.length >= 3 && (
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
        >
          {/* Fond dégradé subtil */}
          <div
            className="absolute inset-0 opacity-5"
            style={{ background: `radial-gradient(circle at 50% 100%, ${currentTab.color}, transparent 70%)` }}
          />

          <div className="flex items-end justify-center gap-3 relative">
            {/* 2e place */}
            {entries[1] && <PodiumCard entry={entries[1]} tab={currentTab} position={2} />}
            {/* 1re place */}
            {entries[0] && <PodiumCard entry={entries[0]} tab={currentTab} position={1} />}
            {/* 3e place */}
            {entries[2] && <PodiumCard entry={entries[2]} tab={currentTab} position={3} />}
          </div>
        </div>
      )}

      {/* Liste rang 4–10 */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="fiq-card flex items-center gap-3 animate-pulse" style={{ padding: '12px 14px' }}>
              <div className="w-8 h-8 rounded-xl flex-shrink-0" style={{ background: 'var(--fiq-faint)' }} />
              <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'var(--fiq-faint)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded" style={{ background: 'var(--fiq-faint)', width: '50%' }} />
                <div className="h-2.5 rounded" style={{ background: 'var(--fiq-faint)', width: '30%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : entries && entries.length > 0 ? (
        <div className="space-y-2">
          {entries.slice(3).map((entry) => (
            <Link
              key={entry.user_id}
              href={entry.username ? `/u/${entry.username}` : '#'}
              className="fiq-card flex items-center gap-3 transition-opacity active:opacity-70"
              style={{
                padding: '12px 14px',
                ...(entry.is_me ? { border: `1px solid ${currentTab.color}44`, background: `${currentTab.color}08` } : {}),
              }}
            >
              {/* Rang */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
              >
                {entry.rank}
              </div>

              {/* Avatar */}
              <div
                className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
              >
                {entry.avatar_url ? (
                  <Image src={entry.avatar_url} alt={entry.display_name} fill className="object-cover" sizes="40px" />
                ) : (entry.display_name[0] ?? '?').toUpperCase()}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: entry.is_me ? currentTab.color : 'var(--fiq-text)' }}>
                  {entry.display_name}{entry.is_me && ' (toi)'}
                </p>
                {entry.username && (
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>@{entry.username}</p>
                )}
              </div>

              {/* Valeur */}
              <p className="font-black text-base fiq-data flex-shrink-0" style={{ color: currentTab.color }}>
                {currentTab.unit(entry.value)}
              </p>
            </Link>
          ))}
        </div>
      ) : entries !== null && entries.length === 0 ? (
        <div className="fiq-card text-center py-12">
          <div className="flex justify-center mb-3" style={{ color: currentTab.color }}>{currentTab.icon}</div>
          <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Pas encore de données</p>
          <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
            Entraîne-toi cette semaine pour apparaître ici !
          </p>
          <Link
            href="/workout"
            className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-black"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            Commencer une séance →
          </Link>
        </div>
      ) : null}
    </div>
  )
}

// ── Composant carte podium ────────────────────────────────────────────────────

function PodiumCard({
  entry,
  tab,
  position,
}: {
  entry: LeaderEntry
  tab: typeof TABS[number]
  position: 1 | 2 | 3
}) {
  const heights = { 1: 'mt-0', 2: 'mt-6', 3: 'mt-10' } as const
  const sizes   = { 1: 'w-16 h-16 text-xl', 2: 'w-12 h-12 text-base', 3: 'w-12 h-12 text-base' } as const
  const medal   = ['🥇', '🥈', '🥉'][position - 1]

  return (
    <Link
      href={entry.username ? `/u/${entry.username}` : '#'}
      className={`flex flex-col items-center gap-1.5 transition-opacity active:opacity-70 ${heights[position]}`}
      style={{ minWidth: position === 1 ? 100 : 80 }}
    >
      {/* Médaille */}
      <span className="text-2xl">{medal}</span>

      {/* Avatar */}
      <div
        className={`relative ${sizes[position]} rounded-2xl overflow-hidden flex items-center justify-center font-black flex-shrink-0`}
        style={{
          background: 'var(--fiq-accent)',
          color: 'var(--bg)',
          ...(entry.is_me ? { boxShadow: `0 0 0 2px ${tab.color}` } : {}),
        }}
      >
        {entry.avatar_url ? (
          <Image
            src={entry.avatar_url}
            alt={entry.display_name}
            fill
            className="object-cover"
            sizes={position === 1 ? '64px' : '48px'}
          />
        ) : (entry.display_name[0] ?? '?').toUpperCase()}
      </div>

      {/* Nom */}
      <p
        className="text-xs font-black text-center truncate w-full"
        style={{ color: entry.is_me ? tab.color : 'var(--fiq-text)', maxWidth: position === 1 ? 96 : 76 }}
      >
        {entry.display_name}{entry.is_me ? ' (toi)' : ''}
      </p>

      {/* Valeur */}
      <p className="text-sm font-black fiq-data" style={{ color: tab.color }}>
        {tab.unit(entry.value)}
      </p>
    </Link>
  )
}
