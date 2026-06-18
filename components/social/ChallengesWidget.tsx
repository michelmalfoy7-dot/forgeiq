'use client'

import { useEffect, useState } from 'react'

interface Challenge {
  id: string
  title: string
  emoji: string
  current: number
  target: number
  unit: string
  pct: number
}

interface ChallengesData {
  challenges: Challenge[]
  month: string
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

function formatTarget(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1_000) return `${n / 1_000}k`
  return String(n)
}

export function ChallengesWidget() {
  const [data, setData] = useState<ChallengesData | null>(null)

  useEffect(() => {
    fetch('/api/social/challenges')
      .then((r) => r.json())
      .then((d: ChallengesData) => {
        if (d.challenges?.length > 0) setData(d)
      })
      .catch(() => {
        // Silencieux — ne rien afficher si erreur
      })
  }, [])

  if (!data) return null

  return (
    <div className="fiq-card overflow-hidden">
      {/* En-tête */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <span className="text-base">🏆</span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--fiq-accent)', letterSpacing: '0.08em' }}>
            Défis du mois
          </p>
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            {data.month}
          </p>
        </div>
      </div>

      {/* Séparateur */}
      <div style={{ height: '1px', background: 'var(--fiq-border)' }} />

      {/* Liste défis */}
      <div className="divide-y" style={{ borderColor: 'var(--fiq-border)' }}>
        {data.challenges.map((c) => (
          <div key={c.id} className="px-4 py-3 space-y-2">
            {/* Ligne titre + compteur */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{c.emoji}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>
                  {c.title}
                </span>
              </div>
              <span
                className="text-xs font-black tabular-nums"
                style={{ color: c.pct >= 100 ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }}
              >
                {c.pct}%
              </span>
            </div>

            {/* Barre de progression */}
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: '6px', background: 'var(--fiq-faint)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${c.pct}%`,
                  background: c.pct >= 100 ? 'var(--fiq-accent)' : 'var(--fiq-accent)',
                  opacity: c.pct >= 100 ? 1 : 0.7,
                }}
              />
            </div>

            {/* Légende valeur */}
            <p className="text-xs tabular-nums" style={{ color: 'var(--fiq-muted)' }}>
              <span style={{ color: 'var(--fiq-text)', fontWeight: 700 }}>
                {formatNumber(c.current)}
              </span>
              {' / '}
              {formatTarget(c.target)} {c.unit}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
