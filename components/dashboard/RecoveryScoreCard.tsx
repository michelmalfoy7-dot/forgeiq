'use client'

import { useState } from 'react'

type RecoveryBreakdown = {
  deepSleepPts: number
  totalSleepPts: number
  fatiguePts: number
  stepsPts: number
  moodPts: number
  ewmaPts: number
}

type Props = {
  score: number
  label: string
  limitingFactor: string
  breakdown: RecoveryBreakdown
}

function BreakdownBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{label}</span>
        <span className="text-xs font-bold fiq-data" style={{ color }}>
          {value.toFixed(1)}<span className="font-normal text-[10px]">/{max}</span>
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fiq-faint)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function RecoveryScoreCard({ score, label, limitingFactor, breakdown }: Props) {
  const [showDetail, setShowDetail] = useState(false)

  const scoreColor = score >= 7 ? 'var(--fiq-accent)' : score >= 5 ? 'var(--fiq-yellow)' : 'var(--fiq-red)'
  const scoreBg    = score >= 7 ? '#B4FF4A18' : score >= 5 ? '#F59E0B18' : '#EF444418'
  const scoreBorder = score >= 7 ? '#B4FF4A44' : score >= 5 ? '#F59E0B44' : '#EF444444'

  const maxByCategory = { deepSleep: 1.5, totalSleep: 2, fatigue: 2, steps: 1.5, mood: 1, ewma: 1 }

  return (
    <>
      <div className="fiq-card flex items-center gap-4">
        {/* Cercle score */}
        <div
          className="relative flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: scoreBg, border: `2px solid ${scoreBorder}` }}
        >
          <span className="text-2xl font-black fiq-data leading-none" style={{ color: scoreColor }}>
            {score}
          </span>
          <span className="absolute bottom-1 text-[9px] font-bold" style={{ color: 'var(--fiq-muted)' }}>
            /10
          </span>
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <p className="fiq-label">Récupération</p>
          <p className="text-base font-black mt-0.5" style={{ color: scoreColor }}>
            {label}
          </p>
          {limitingFactor && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--fiq-muted)' }}>
              {limitingFactor}
            </p>
          )}
        </div>

        {/* Bouton détail */}
        <button
          onClick={() => setShowDetail(true)}
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
          style={{ color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)', background: 'var(--fiq-faint)' }}
          aria-label="Voir le détail du score de récupération"
          title="Détail récupération"
        >
          <span className="text-xs font-bold">ⓘ</span>
        </button>
      </div>

      {/* Modale détail */}
      {showDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowDetail(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4"
            style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header modale */}
            <div className="flex items-center justify-between">
              <div>
                <p className="fiq-label">Score du jour</p>
                <h2 className="text-lg font-black" style={{ color: 'var(--fiq-text)' }}>
                  Détail récupération
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black fiq-data" style={{ color: scoreColor }}>
                  {score}<span className="text-sm font-normal" style={{ color: 'var(--fiq-muted)' }}>/10</span>
                </span>
                <button
                  onClick={() => setShowDetail(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)', background: 'var(--fiq-faint)' }}
                  aria-label="Fermer"
                >
                  <span className="text-sm font-bold">×</span>
                </button>
              </div>
            </div>

            {/* Barres de détail — 6 critères */}
            <div className="space-y-3">
              <BreakdownBar
                label="Sommeil profond"
                value={breakdown.deepSleepPts}
                max={maxByCategory.deepSleep}
                color={breakdown.deepSleepPts >= maxByCategory.deepSleep ? 'var(--fiq-accent)' : breakdown.deepSleepPts > 0 ? 'var(--fiq-yellow)' : 'var(--fiq-red)'}
              />
              <BreakdownBar
                label="Sommeil total"
                value={breakdown.totalSleepPts}
                max={maxByCategory.totalSleep}
                color={breakdown.totalSleepPts >= maxByCategory.totalSleep ? 'var(--fiq-accent)' : breakdown.totalSleepPts > 0 ? 'var(--fiq-yellow)' : 'var(--fiq-red)'}
              />
              <BreakdownBar
                label="Énergie / Fatigue"
                value={breakdown.fatiguePts}
                max={maxByCategory.fatigue}
                color={breakdown.fatiguePts >= maxByCategory.fatigue ? 'var(--fiq-accent)' : breakdown.fatiguePts > 0 ? 'var(--fiq-yellow)' : 'var(--fiq-red)'}
              />
              <BreakdownBar
                label="Activité (pas)"
                value={breakdown.stepsPts}
                max={maxByCategory.steps}
                color={breakdown.stepsPts >= maxByCategory.steps ? 'var(--fiq-blue)' : breakdown.stepsPts > 0 ? 'var(--fiq-yellow)' : 'var(--fiq-red)'}
              />
              <BreakdownBar
                label="Humeur"
                value={breakdown.moodPts}
                max={maxByCategory.mood}
                color={breakdown.moodPts >= maxByCategory.mood ? 'var(--fiq-blue)' : breakdown.moodPts > 0 ? 'var(--fiq-yellow)' : 'var(--fiq-red)'}
              />
              <BreakdownBar
                label="Stabilité poids (EWMA)"
                value={breakdown.ewmaPts}
                max={maxByCategory.ewma}
                color={breakdown.ewmaPts >= maxByCategory.ewma ? 'var(--fiq-accent)' : breakdown.ewmaPts > 0 ? 'var(--fiq-yellow)' : 'var(--fiq-red)'}
              />
            </div>

            {/* Légende */}
            <p className="text-[10px] text-center" style={{ color: 'var(--fiq-muted)' }}>
              Total : {breakdown.deepSleepPts + breakdown.totalSleepPts + breakdown.fatiguePts + breakdown.stepsPts + breakdown.moodPts + breakdown.ewmaPts} / 9 pts → Score {score}/10
            </p>

            <button
              onClick={() => setShowDetail(false)}
              className="w-full py-2.5 rounded-xl font-black text-sm"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
