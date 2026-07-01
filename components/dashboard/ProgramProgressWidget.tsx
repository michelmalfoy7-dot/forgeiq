'use client'

import { useState, useEffect } from 'react'

type Progress = {
  active: boolean
  programName?: string
  sessionsCompleted?: number
  totalTonnage?: number
  avgTonnage?: number
  weeksActive?: number
  cyclesDone?: number
  positionInCycle?: number
  cycleLength?: number
  trendPct?: number | null
}

function fmtTonnage(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`
}

export function ProgramProgressWidget() {
  const [data, setData] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/programs/progress')
      .then(r => r.json() as Promise<{ data: Progress | null }>)
      .then(json => { if (json.data) setData(json.data) })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  // Invisible tant qu'on charge, ou si pas de programme actif / aucune séance
  if (loading) return null
  if (!data?.active || !data.sessionsCompleted) return null

  const trend = data.trendPct
  const trendColor = trend == null ? 'var(--fiq-muted)' : trend > 0 ? 'var(--fiq-accent)' : trend < 0 ? 'var(--fiq-red)' : 'var(--fiq-muted)'
  const cyclePos = (data.positionInCycle ?? 0) === 0 ? (data.cycleLength ?? 0) : data.positionInCycle ?? 0

  return (
    <div className="fiq-card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="fiq-label">Programme en cours</p>
          <p className="text-sm font-black truncate" style={{ color: 'var(--fiq-text)' }}>
            {data.programName}
          </p>
        </div>
        {trend != null && (
          <span
            className="text-[11px] font-black px-2 py-1 rounded-full flex-shrink-0"
            style={{ background: `${trendColor}18`, color: trendColor, border: `1px solid ${trendColor}44` }}
            title="Tendance tonnage : 3 dernières séances vs 3 précédentes"
          >
            Tonnage {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-2 text-center" style={{ background: 'var(--fiq-faint)' }}>
          <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>{data.sessionsCompleted}</p>
          <p className="text-[10px] font-semibold" style={{ color: 'var(--fiq-muted)' }}>séances</p>
        </div>
        <div className="rounded-xl p-2 text-center" style={{ background: 'var(--fiq-faint)' }}>
          <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>{fmtTonnage(data.totalTonnage ?? 0)}</p>
          <p className="text-[10px] font-semibold" style={{ color: 'var(--fiq-muted)' }}>tonnage cumulé</p>
        </div>
        <div className="rounded-xl p-2 text-center" style={{ background: 'var(--fiq-faint)' }}>
          <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>{data.weeksActive}</p>
          <p className="text-[10px] font-semibold" style={{ color: 'var(--fiq-muted)' }}>sem. actives</p>
        </div>
      </div>

      {(data.cycleLength ?? 0) > 0 && (
        <p className="text-[11px]" style={{ color: 'var(--fiq-muted)' }}>
          Cycle {(data.cyclesDone ?? 0) + ((data.positionInCycle ?? 0) === 0 ? 0 : 1)} · séance {cyclePos}/{data.cycleLength} du cycle
        </p>
      )}
    </div>
  )
}
