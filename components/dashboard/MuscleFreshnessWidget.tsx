'use client'

import { useState, useEffect } from 'react'

type FreshnessStatus = 'fresh' | 'moderate' | 'fatigued'

const MUSCLES: { key: string; label: string; emoji: string }[] = [
  { key: 'chest',      label: 'Poitrine', emoji: '💪' },
  { key: 'back',       label: 'Dos',      emoji: '🔙' },
  { key: 'shoulders',  label: 'Épaules',  emoji: '🔝' },
  { key: 'quadriceps', label: 'Quadris',  emoji: '🦵' },
  { key: 'hamstrings', label: 'Ischios',  emoji: '🦵' },
  { key: 'glutes',     label: 'Fessiers', emoji: '🍑' },
  { key: 'biceps',     label: 'Biceps',   emoji: '💪' },
  { key: 'triceps',    label: 'Triceps',  emoji: '💪' },
  { key: 'core',       label: 'Core',     emoji: '⚡' },
]

const STATUS_CONFIG: Record<FreshnessStatus | 'unknown', { color: string; bg: string; label: string }> = {
  fresh:    { color: '#22c55e', bg: '#22c55e18', label: 'Frais' },
  moderate: { color: '#F59E0B', bg: '#F59E0B18', label: '2j' },
  fatigued: { color: '#EF4444', bg: '#EF444418', label: 'Fatigué' },
  unknown:  { color: 'var(--fiq-muted)', bg: 'var(--fiq-faint)', label: '—' },
}

export function MuscleFreshnessWidget() {
  const [freshness, setFreshness] = useState<Record<string, FreshnessStatus> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/workout/muscle-freshness')
      .then(r => r.json() as Promise<{ data: { muscleFreshness: Record<string, FreshnessStatus> } | null }>)
      .then(json => {
        if (json.data?.muscleFreshness) setFreshness(json.data.muscleFreshness)
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  // N'afficher que si au moins 1 muscle a des données
  if (!loading && (!freshness || Object.keys(freshness).length === 0)) return null

  return (
    <div className="fiq-card space-y-3">
      <p className="fiq-label">Récupération musculaire</p>
      <div className="grid grid-cols-3 gap-2">
        {MUSCLES.map(m => {
          const status = freshness?.[m.key] as FreshnessStatus | undefined
          const cfg = STATUS_CONFIG[status ?? 'unknown']
          return (
            <div
              key={m.key}
              className="rounded-xl p-2 text-center"
              style={{ background: loading ? 'var(--fiq-faint)' : cfg.bg }}
            >
              {loading ? (
                <div className="h-8 rounded animate-pulse" style={{ background: 'var(--fiq-border)' }} />
              ) : (
                <>
                  <div className="text-base mb-0.5">{m.emoji}</div>
                  <p className="text-[10px] font-semibold leading-tight" style={{ color: 'var(--fiq-muted)' }}>
                    {m.label}
                  </p>
                  <p className="text-[10px] font-black mt-0.5" style={{ color: cfg.color }}>
                    {cfg.label}
                  </p>
                </>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
        Vert = &gt;72h · Jaune = 48-72h · Rouge = &lt;48h
      </p>
    </div>
  )
}
