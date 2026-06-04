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
  totals:          MicroTotals
  collapsed:       boolean
  onToggle:        () => void
  totalCalories?:  number   // kcal loggées ce jour
  hasDinnerLogged?: boolean  // repas du soir enregistré
  isToday?:        boolean   // affichage du jour courant
}

export function MicroNutrientWidget({
  totals, collapsed, onToggle,
  totalCalories = 0, hasDinnerLogged = false, isToday = true,
}: Props) {
  const coveragePct = totals.totalLogs > 0
    ? Math.round((totals.logsWithData / totals.totalLogs) * 100)
    : 0

  const hour = new Date().getHours()

  // Conditions pour afficher des alertes fiables :
  // 1. Journée avancée (> 19h) OU dîner loggé OU jour passé
  // 2. Couverture données ≥ 60 %
  // 3. Au moins 1 500 kcal loggées
  const eveningReached  = !isToday || hour >= 19 || hasDinnerLogged
  const coverageOk      = coveragePct >= 60 || !isToday
  const calorieOk       = totalCalories >= 1500 || !isToday
  const canShowDeficits = eveningReached && coverageOk && calorieOk

  // Nombre de micros en déficit confirmé (< 50 % cible) — seulement si données fiables
  const deficits = canShowDeficits
    ? MICRO_CONFIG.filter(m => (totals[m.key] as number) < m.target * 0.5).length
    : 0

  // Sous-titre du header
  const subtitle = (() => {
    if (!eveningReached || !calorieOk) {
      return (
        <span style={{ color: 'var(--fiq-muted)' }}>
          📊 Suivi en cours — bilan ce soir
        </span>
      )
    }
    if (!coverageOk) {
      return (
        <span style={{ color: 'var(--fiq-muted)' }}>
          📊 Données partielles ({coveragePct}% aliments)
        </span>
      )
    }
    if (deficits > 0) {
      return (
        <span style={{ color: 'var(--fiq-orange)' }}>
          ⚠️ {deficits} déficit{deficits > 1 ? 's' : ''} probable{deficits > 1 ? 's' : ''}
        </span>
      )
    }
    return <span style={{ color: 'var(--fiq-accent)' }}>✅ Objectifs atteints</span>
  })()

  return (
    <div className="fiq-card">
      {/* Header */}
      <button className="w-full flex items-center justify-between" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className="text-base">🧬</span>
          <div className="text-left">
            <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Micronutriments</p>
            <p className="text-[10px] uppercase tracking-wider">{subtitle}</p>
          </div>
        </div>
        <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-2.5">

          {/* Bannière "données incomplètes" si journée non terminée */}
          {isToday && !canShowDeficits && (
            <div className="rounded-lg px-3 py-2 text-[11px]"
              style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', lineHeight: 1.4 }}>
              {!eveningReached || !calorieOk
                ? '📊 Ajoute tes repas de la journée pour voir ton bilan complet ce soir.'
                : `⚠️ Données disponibles pour ${totals.logsWithData}/${totals.totalLogs} aliments — les valeurs réelles sont probablement supérieures.`}
            </div>
          )}

          {/* Fiabilité (données partielles en journée normale) */}
          {canShowDeficits && coveragePct < 80 && (
            <div className="rounded-lg px-3 py-2 text-[11px]"
              style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}>
              ⚠️ Estimation basée sur {coveragePct}% de ta journée —
              {' '}{totals.logsWithData}/{totals.totalLogs} aliments avec données micro.
            </div>
          )}

          {MICRO_CONFIG.map((m) => {
            const val = totals[m.key] as number
            const hasData = totals.logsWithData > 0
            const pct = Math.min(100, m.target > 0 ? (val / m.target) * 100 : 0)
            const over = val > m.target

            // Couleur : gris si données insuffisantes et journée non terminée
            const color = (!hasData || (!canShowDeficits && val === 0))
              ? 'var(--fiq-muted)'
              : over
                ? 'var(--fiq-blue)'
                : pct >= 75 ? 'var(--fiq-accent)'
                : pct >= 40 ? 'var(--fiq-orange)'
                : canShowDeficits ? 'var(--fiq-red)' : 'var(--fiq-muted)'

            // Affichage valeur : "~?" si aucune donnée
            const displayVal = (val === 0 && totals.logsWithData === 0)
              ? <span style={{ color: 'var(--fiq-muted)' }}>~?</span>
              : <span style={{ color }}>{fmt(val, m.unit)}</span>

            return (
              <div key={m.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{m.icon}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--fiq-text)' }}>
                      {m.label}
                    </span>
                    <span className="text-[9px]" style={{ color: 'var(--fiq-muted)' }}>
                      {m.tip}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black fiq-data">{displayVal}</span>
                    <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                      / {fmt(m.target, m.unit)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fiq-faint)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: color,
                      opacity: val === 0 ? 0.2 : 1,
                    }}
                  />
                </div>
              </div>
            )
          })}

          {/* Légende — seulement si données présentes */}
          {totals.logsWithData > 0 && (
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
          )}
        </div>
      )}
    </div>
  )
}
