'use client'

// ── Cibles DRI (Dietary Reference Intakes) — moyennes adulte sportif ──────────
// Sources : ANSES 2021, ISSN 2017, EFSA 2019
// Légèrement majorées vs grand public pour compenser les pertes sudation + métabolisme élevé

export type MicroTotals = {
  iron_mg:       number
  magnesium_mg:  number
  zinc_mg:       number
  calcium_mg:    number
  vitamin_d_mcg: number
  potassium_mg:  number
  vitamin_c_mg:  number
  logsWithData:  number  // nb d'entrées journal avec données micro
  totalLogs:     number  // nb total d'entrées journal
}

type MicroConfig = {
  key:    keyof Omit<MicroTotals, 'logsWithData' | 'totalLogs'>
  label:  string
  unit:   string
  target: number
  color:  string
  icon:   string
  tip:    string  // bénéfice court pour athletes
}

export const MICRO_CONFIG: MicroConfig[] = [
  {
    key: 'iron_mg', label: 'Fer', unit: 'mg', target: 12, color: '#EF4444', icon: '🩸',
    tip: 'Transport O₂ & énergie',
  },
  {
    key: 'magnesium_mg', label: 'Magnésium', unit: 'mg', target: 360, color: '#8B5CF6', icon: '⚡',
    tip: 'Récupération & sommeil',
  },
  {
    key: 'zinc_mg', label: 'Zinc', unit: 'mg', target: 10, color: '#3D8BFF', icon: '🛡',
    tip: 'Testostérone & immunité',
  },
  {
    key: 'calcium_mg', label: 'Calcium', unit: 'mg', target: 1000, color: '#F59E0B', icon: '🦴',
    tip: 'Os & contraction musculaire',
  },
  {
    key: 'vitamin_d_mcg', label: 'Vit. D', unit: 'mcg', target: 15, color: '#F97316', icon: '☀️',
    tip: 'Absorption Ca & force musculaire',
  },
  {
    key: 'potassium_mg', label: 'Potassium', unit: 'mg', target: 3500, color: '#10B981', icon: '💧',
    tip: 'Électrolyte & crampes',
  },
  {
    key: 'vitamin_c_mg', label: 'Vit. C', unit: 'mg', target: 82, color: '#F97316', icon: '🍊',
    tip: 'Absorption fer & collagène',
  },
]

function fmt(val: number, unit: string): string {
  if (unit === 'mcg') return `${Math.round(val * 10) / 10}mcg`
  if (val >= 1000) return `${Math.round(val / 10) / 100}g`
  return `${Math.round(val * 10) / 10}mg`
}

// ── Composant ────────────────────────────────────────────────────────────────

type Props = {
  totals:    MicroTotals
  collapsed: boolean
  onToggle:  () => void
}

export function MicroNutrientWidget({ totals, collapsed, onToggle }: Props) {
  const dataQualityPct = totals.totalLogs > 0
    ? Math.round((totals.logsWithData / totals.totalLogs) * 100)
    : 0

  // Nombre de micros en déficit (< 50% de la cible)
  const deficits = MICRO_CONFIG.filter(m => {
    const val = totals[m.key] as number
    return val < m.target * 0.5
  }).length

  return (
    <div className="fiq-card">
      {/* Header */}
      <button className="w-full flex items-center justify-between" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className="text-base">🧬</span>
          <div className="text-left">
            <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Micronutriments</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--fiq-muted)' }}>
              {deficits > 0
                ? <span style={{ color: 'var(--fiq-orange)' }}>⚠️ {deficits} déficit{deficits > 1 ? 's' : ''}</span>
                : <span style={{ color: 'var(--fiq-accent)' }}>✅ Tous les objectifs atteints</span>
              }
            </p>
          </div>
        </div>
        <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-2.5">
          {MICRO_CONFIG.map((m) => {
            const val = totals[m.key] as number
            const pct = Math.min(100, m.target > 0 ? (val / m.target) * 100 : 0)
            const over = val > m.target
            const color = over
              ? 'var(--fiq-blue)'
              : pct >= 75 ? 'var(--fiq-accent)'
              : pct >= 40 ? 'var(--fiq-orange)'
              : 'var(--fiq-red)'

            return (
              <div key={m.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{m.icon}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--fiq-text)' }}>
                      {m.label}
                    </span>
                    <span className="text-[9px]" style={{ color: 'var(--fiq-muted)' }} title={m.tip}>
                      {m.tip}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black fiq-data" style={{ color }}>
                      {fmt(val, m.unit)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                      / {fmt(m.target, m.unit)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fiq-faint)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color, opacity: val === 0 ? 0.25 : 1 }}
                  />
                </div>
              </div>
            )
          })}

          {/* Qualité des données */}
          {totals.totalLogs > 0 && dataQualityPct < 100 && (
            <p className="text-[10px] pt-1" style={{ color: 'var(--fiq-muted)' }}>
              ⚡ Données disponibles pour {totals.logsWithData}/{totals.totalLogs} aliments
              {dataQualityPct < 50 && ' — ajoute des aliments depuis la bibliothèque pour plus de précision'}
            </p>
          )}

          {/* Légende */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {[
              { color: 'var(--fiq-red)',    label: '< 40%' },
              { color: 'var(--fiq-orange)', label: '40–75%' },
              { color: 'var(--fiq-accent)', label: '75–100%' },
              { color: 'var(--fiq-blue)',   label: 'Dépassé' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[9px]" style={{ color: 'var(--fiq-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
