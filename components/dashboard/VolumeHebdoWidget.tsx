'use client'

import { useEffect, useState } from 'react'
import type { MuscleVolume } from '@/lib/utils/volume'

// Couleur selon le statut du volume
function statusColor(status: MuscleVolume['status']): string {
  if (status === 'optimal') return 'var(--fiq-accent)'
  if (status === 'high')    return 'var(--fiq-blue)'
  return 'var(--fiq-orange)'
}

function statusBg(status: MuscleVolume['status']): string {
  if (status === 'optimal') return '#B4FF4A22'
  if (status === 'high')    return '#3D8BFF22'
  return '#FF6B3518'
}

// Emoji indicateur
function statusIcon(status: MuscleVolume['status'], sets: number): string {
  if (sets === 0)           return '○'
  if (status === 'high')    return '🔥'
  if (status === 'optimal') return '✅'
  return '⚠️'
}

export function VolumeHebdoWidget() {
  const [data, setData] = useState<MuscleVolume[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/progress/volume-weekly')
      .then(r => r.json())
      .then(({ data }) => { if (data) setData(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Muscles affichés : ceux avec sets > 0 en priorité + toujours les principaux
  const MAIN_MUSCLES = ['Poitrine', 'Dos', 'Épaules', 'Jambes', 'Biceps', 'Triceps']
  const displayMuscles = data
    ? [
        ...data.filter(m => m.sets > 0),
        ...data.filter(m => m.sets === 0 && MAIN_MUSCLES.includes(m.muscle)),
      ].filter((m, i, arr) => arr.findIndex(x => x.muscle === m.muscle) === i)
    : []

  if (!loading && (!data || displayMuscles.length === 0)) return null

  return (
    <div className="fiq-card">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <div className="text-left">
            <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Volume cette semaine</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--fiq-muted)' }}>
              Séries de travail par muscle
            </p>
          </div>
        </div>
        <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-2">
          {loading ? (
            // Skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: 'var(--fiq-faint)' }} />
            ))
          ) : (
            displayMuscles.map((m) => {
              const pct = m.mav > 0 ? Math.min(100, Math.round((m.sets / m.mav) * 100)) : 0
              const mevPct = m.mav > 0 ? Math.round((m.mev / m.mav) * 100) : 0

              return (
                <div key={m.muscle}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{statusIcon(m.status, m.sets)}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--fiq-text)' }}>
                        {m.muscle}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-black fiq-data"
                        style={{ color: m.sets > 0 ? statusColor(m.status) : 'var(--fiq-muted)' }}
                      >
                        {m.sets}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                        /{m.mav} séries
                      </span>
                    </div>
                  </div>

                  {/* Barre de progression avec marqueur MEV */}
                  <div className="relative h-2 rounded-full overflow-visible" style={{ background: 'var(--fiq-faint)' }}>
                    {/* Fill */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: m.sets > 0 ? statusColor(m.status) : 'var(--fiq-muted)',
                        opacity: m.sets > 0 ? 1 : 0.3,
                      }}
                    />
                    {/* Marqueur MEV (seuil minimal efficace) */}
                    {mevPct > 0 && mevPct < 100 && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full"
                        style={{ left: `${mevPct}%`, background: '#ffffff44' }}
                      />
                    )}
                  </div>
                </div>
              )
            })
          )}

          {/* Légende */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--fiq-orange)' }} />
              <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>Insuffisant</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--fiq-accent)' }} />
              <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>Optimal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--fiq-blue)' }} />
              <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>Élevé 🔥</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <div className="w-0.5 h-3 rounded" style={{ background: '#ffffff44' }} />
              <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>= MEV</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
