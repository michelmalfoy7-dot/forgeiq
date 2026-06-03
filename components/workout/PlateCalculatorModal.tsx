'use client'

import { useState } from 'react'
import { X, Minus, Plus } from 'lucide-react'

// ── Couleurs standard IWF ─────────────────────────────────────
const PLATE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  25:   { bg: '#EF444422', text: '#EF4444', border: '#EF444455' },
  20:   { bg: '#3D8BFF22', text: '#3D8BFF', border: '#3D8BFF55' },
  15:   { bg: '#F59E0B22', text: '#F59E0B', border: '#F59E0B55' },
  10:   { bg: '#10B98122', text: '#10B981', border: '#10B98155' },
  5:    { bg: '#6B728022', text: '#9CA3AF', border: '#6B728055' },
  2.5:  { bg: '#3D8BFF15', text: '#7CB3FF', border: '#3D8BFF33' },
  1.25: { bg: '#1A1F2A',   text: '#6B7280', border: '#374151' },
  0.5:  { bg: '#1A1F2A',   text: '#4B5563', border: '#2D3340' },
  0.25: { bg: '#1A1F2A',   text: '#374151', border: '#1F242E' },
}

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25]

const BAR_TYPES = [
  { label: 'Olympique', weight: 20 },
  { label: 'Femme',     weight: 15 },
  { label: 'EZ Bar',    weight: 10 },
  { label: 'Hex Bar',   weight: 18 },
]

// ── Calcul des disques par côté ───────────────────────────────
function calcPlates(target: number, barWeight: number): { size: number; count: number }[] {
  let remaining = Math.round(((target - barWeight) / 2) * 1000) / 1000
  if (remaining <= 0) return []

  const result: { size: number; count: number }[] = []
  for (const plate of PLATES) {
    const count = Math.floor(remaining / plate + 0.0001)
    if (count > 0) {
      result.push({ size: plate, count })
      remaining = Math.round((remaining - count * plate) * 1000) / 1000
    }
  }
  return result
}

// ── Visualisation d'un disque ─────────────────────────────────
function PlateVisual({ size }: { size: number }) {
  const c = PLATE_COLORS[size] ?? { bg: '#1A1F2A', text: '#6B7280', border: '#374151' }
  const h = size >= 25 ? 56 : size >= 20 ? 50 : size >= 15 ? 42 : size >= 10 ? 36 : size >= 5 ? 30 : size >= 2.5 ? 24 : 18
  return (
    <div
      className="flex items-center justify-center rounded-[3px] shrink-0"
      style={{ width: 14, height: h, background: c.bg, border: `1.5px solid ${c.border}` }}
    >
      <span className="font-black select-none"
        style={{ fontSize: 7, color: c.text, writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
        {size}
      </span>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────

type Props = {
  initialWeight?: number
  onClose: () => void
}

export function PlateCalculatorModal({ initialWeight = 60, onClose }: Props) {
  const [barIdx, setBarIdx]     = useState(0)
  const [target, setTarget]     = useState(
    initialWeight > 0 ? String(initialWeight) : ''
  )

  const barWeight  = BAR_TYPES[barIdx].weight
  const targetNum  = parseFloat(String(target).replace(',', '.')) || 0
  const plates     = targetNum > barWeight ? calcPlates(targetNum, barWeight) : []
  const achieved   = Math.round((plates.reduce((a, p) => a + p.size * p.count * 2, 0) + barWeight) * 100) / 100
  const diff       = Math.round((targetNum - achieved) * 100) / 100
  const exact      = targetNum > 0 && Math.abs(diff) < 0.005
  const underBar   = targetNum > 0 && targetNum <= barWeight

  // Incrément / décrément rapide
  function nudge(delta: number) {
    const current = parseFloat(String(target).replace(',', '.')) || barWeight
    const next = Math.round((current + delta) * 4) / 4   // arrondi au 0.25 kg
    if (next >= barWeight) setTarget(String(next))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[480px] rounded-t-3xl p-5 pb-8 space-y-4"
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏋️</span>
            <div>
              <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>Calculateur de disques</p>
              <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>Disques par côté · barre incluse</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
          </button>
        </div>

        {/* Type de barre */}
        <div className="grid grid-cols-4 gap-1.5">
          {BAR_TYPES.map((b, i) => (
            <button
              key={i}
              onClick={() => setBarIdx(i)}
              className="py-2 rounded-xl text-center transition-all"
              style={{
                background: barIdx === i ? '#B4FF4A18' : 'var(--fiq-faint)',
                border: `1px solid ${barIdx === i ? '#B4FF4A55' : 'var(--fiq-border)'}`,
              }}
            >
              <p className="text-xs font-black" style={{ color: barIdx === i ? 'var(--fiq-accent)' : 'var(--fiq-text)' }}>
                {b.weight}kg
              </p>
              <p className="text-[9px]" style={{ color: 'var(--fiq-muted)' }}>{b.label}</p>
            </button>
          ))}
        </div>

        {/* Saisie poids cible */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => nudge(-2.5)}
            className="w-10 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
          >
            <Minus className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          </button>
          <div className="flex-1 relative">
            <input
              type="number"
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder={String(barWeight)}
              className="w-full text-center py-3 rounded-xl text-3xl font-black outline-none"
              style={{
                background: 'var(--fiq-faint)',
                border: '1px solid var(--fiq-border)',
                color: 'var(--fiq-text)',
              }}
              step="0.25"
              min={barWeight}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
              style={{ color: 'var(--fiq-muted)' }}>kg</span>
          </div>
          <button
            onClick={() => nudge(2.5)}
            className="w-10 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
          >
            <Plus className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          </button>
        </div>

        {/* Résultat */}
        {underBar ? (
          <p className="text-center text-sm py-2" style={{ color: 'var(--fiq-muted)' }}>
            Le poids doit être ≥ barre ({barWeight}kg)
          </p>
        ) : targetNum > 0 ? (
          <div className="space-y-3">
            {/* Barre + disques — visualisation */}
            <div
              className="flex items-center justify-center gap-0.5 py-4 rounded-2xl overflow-hidden"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', minHeight: 80 }}
            >
              {/* Côté gauche (miroir) */}
              <div className="flex items-center gap-0.5 flex-row-reverse">
                {plates.flatMap(p => Array(p.count).fill(p.size)).map((sz, i) => (
                  <PlateVisual key={`l-${i}`} size={sz} />
                ))}
              </div>
              {/* Barre */}
              <div
                className="flex items-center justify-center rounded-sm mx-1"
                style={{ width: 36, height: 10, background: '#4B5563', border: '1px solid #6B7280' }}
              >
                <span style={{ fontSize: 7, color: '#9CA3AF', fontWeight: 700 }}>{barWeight}kg</span>
              </div>
              {/* Côté droit */}
              <div className="flex items-center gap-0.5">
                {plates.flatMap(p => Array(p.count).fill(p.size)).map((sz, i) => (
                  <PlateVisual key={`r-${i}`} size={sz} />
                ))}
              </div>
            </div>

            {/* Détail disques par côté */}
            <div
              className="rounded-xl p-3 space-y-2"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
            >
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--fiq-muted)' }}>
                Par côté
              </p>
              {plates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {plates.map(p => {
                    const c = PLATE_COLORS[p.size] ?? { bg: 'var(--fiq-faint)', text: 'var(--fiq-text)', border: 'var(--fiq-border)' }
                    return (
                      <div
                        key={p.size}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                        style={{ background: c.bg, border: `1px solid ${c.border}` }}
                      >
                        <span className="text-sm font-black fiq-data" style={{ color: c.text }}>
                          {p.count}×{p.size}kg
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Barre seule — pas de disques</p>
              )}
            </div>

            {/* Total + statut */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{
                background: exact ? '#B4FF4A12' : '#F59E0B12',
                border: `1px solid ${exact ? '#B4FF4A44' : '#F59E0B44'}`,
              }}
            >
              <span className="text-xs font-semibold" style={{ color: exact ? 'var(--fiq-accent)' : '#F59E0B' }}>
                {exact ? '✅ Poids exact' : `⚠️ Approx. (manque ${Math.abs(diff)}kg)`}
              </span>
              <span className="text-base font-black fiq-data" style={{ color: exact ? 'var(--fiq-accent)' : '#F59E0B' }}>
                {achieved}kg
              </span>
            </div>

            {/* Légende couleurs */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
              {[25, 20, 15, 10, 5, 2.5].map(s => {
                const c = PLATE_COLORS[s]
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
                    <span className="text-[9px]" style={{ color: 'var(--fiq-muted)' }}>{s}kg</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
