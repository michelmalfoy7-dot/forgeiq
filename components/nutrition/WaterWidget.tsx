'use client'

import { useState } from 'react'
import { Minus } from 'lucide-react'

type Props = {
  initialWaterMl: number
  goalMl: number
}

const QUICK_ADD = [200, 300, 500] // ml

export function WaterWidget({ initialWaterMl, goalMl }: Props) {
  const [waterMl, setWaterMl] = useState(initialWaterMl)
  const [loading, setLoading] = useState(false)

  const pct = Math.min(100, Math.round((waterMl / goalMl) * 100))
  const remaining = Math.max(0, goalMl - waterMl)
  const done = waterMl >= goalMl

  async function addWater(ml: number) {
    if (loading) return
    setLoading(true)
    // Optimistic update
    setWaterMl(prev => Math.max(0, prev + ml))
    try {
      const res = await fetch('/api/water/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add_ml: ml }),
      })
      const { data, error } = await res.json() as { data: { water_ml: number } | null; error: string | null }
      if (error || !data) {
        // Revert on error
        setWaterMl(prev => Math.max(0, prev - ml))
      } else {
        setWaterMl(data.water_ml)
      }
    } catch {
      setWaterMl(prev => Math.max(0, prev - ml))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fiq-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💧</span>
          <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Hydratation</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-base font-black fiq-data" style={{ color: done ? 'var(--fiq-accent)' : 'var(--fiq-blue)' }}>
            {waterMl >= 1000 ? `${(waterMl / 1000).toFixed(1)}L` : `${waterMl}ml`}
          </span>
          <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            / {goalMl >= 1000 ? `${(goalMl / 1000).toFixed(1)}L` : `${goalMl}ml`}
          </span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="w-full h-2 rounded-full mb-3 overflow-hidden" style={{ background: 'var(--fiq-faint)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: done ? 'var(--fiq-accent)' : 'var(--fiq-blue)',
          }}
        />
      </div>

      {/* Message contexte */}
      <p className="text-[11px] mb-3" style={{ color: 'var(--fiq-muted)' }}>
        {done
          ? '✅ Objectif hydratation atteint !'
          : `Encore ${remaining >= 1000 ? `${(remaining / 1000).toFixed(1)}L` : `${remaining}ml`} pour atteindre ton objectif`}
      </p>

      {/* Boutons rapides */}
      <div className="flex gap-2">
        {QUICK_ADD.map(ml => (
          <button
            key={ml}
            onClick={() => addWater(ml)}
            disabled={loading}
            className="flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
            style={{
              background: 'var(--fiq-faint)',
              border: '1px solid var(--fiq-border)',
              color: 'var(--fiq-blue)',
            }}
          >
            +{ml}ml
          </button>
        ))}
        {/* Bouton retirer */}
        <button
          onClick={() => addWater(-200)}
          disabled={loading || waterMl === 0}
          className="px-3 py-2 rounded-xl transition-all active:scale-95"
          style={{
            background: 'var(--fiq-faint)',
            border: '1px solid var(--fiq-border)',
            color: 'var(--fiq-muted)',
            opacity: waterMl === 0 ? 0.4 : 1,
          }}
          title="Retirer 200ml"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
