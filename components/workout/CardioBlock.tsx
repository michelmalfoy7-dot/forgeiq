'use client'

import { Activity, Trash2 } from 'lucide-react'

/**
 * Bloc cardio dans le logger de séance (vs Hevy) — activité + durée, sans
 * poids/reps. Rendu distinct des exercices de musculation.
 */
export function CardioBlock({
  activity,
  minutes,
  activities,
  onChangeActivity,
  onChangeMinutes,
  onRemove,
}: {
  activity: string
  minutes: number | ''
  activities: string[]
  onChangeActivity: (a: string) => void
  onChangeMinutes: (m: number | '') => void
  onRemove: () => void
}) {
  const min = Number(minutes) || 0

  return (
    <div className="fiq-card space-y-3" style={{ borderColor: '#FF6B3533' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-orange)' }} />
          <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--fiq-orange)' }}>
            Cardio
          </span>
        </div>
        <button
          onClick={onRemove}
          className="flex items-center justify-center w-7 h-7 rounded-lg"
          title="Retirer le cardio"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
        >
          <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--fiq-muted)' }} />
        </button>
      </div>

      {/* Choix de l'activité */}
      <div className="flex flex-wrap gap-1.5">
        {activities.map(a => {
          const active = a === activity
          return (
            <button
              key={a}
              onClick={() => onChangeActivity(a)}
              className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{
                background: active ? '#FF6B3522' : 'var(--fiq-faint)',
                color: active ? 'var(--fiq-orange)' : 'var(--fiq-muted)',
                border: `1px solid ${active ? '#FF6B3544' : 'var(--fiq-border)'}`,
              }}
            >
              {a}
            </button>
          )
        })}
      </div>

      {/* Durée */}
      <div className="flex items-center gap-2">
        <span className="text-sm flex-1" style={{ color: 'var(--fiq-muted)' }}>Durée</span>
        <button
          onClick={() => onChangeMinutes(Math.max(0, min - 5))}
          className="w-8 h-8 rounded-lg font-black flex items-center justify-center"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => onChangeMinutes(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
          className="w-16 text-center text-base font-black rounded-lg h-9"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
        />
        <button
          onClick={() => onChangeMinutes(min + 5)}
          className="w-8 h-8 rounded-lg font-black flex items-center justify-center"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
        >
          ＋
        </button>
        <span className="text-sm" style={{ color: 'var(--fiq-muted)' }}>min</span>
      </div>
    </div>
  )
}
