'use client'

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Trophy } from 'lucide-react'

type WeightPoint = { date: string; weight: number | null; trend: number | null }
type TonnagePoint = { week: string; tonnage: number }
type PR = { exercise_name: string; record_type: string; value: number; unit: string; achieved_date: string }

type Props = {
  weightData: WeightPoint[]
  weeklyTonnage: TonnagePoint[]
  personalRecords: PR[]
}

// Tooltip custom dark
function DarkTooltip({ active, payload, label }: {active?: boolean; payload?: {value: number; name: string; color: string}[]; label?: string}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
      <p style={{ color: 'var(--fiq-muted)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold mt-0.5" style={{ color: p.color }}>
          {p.name} : {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}
        </p>
      ))}
    </div>
  )
}

export function ProgressCharts({ weightData, weeklyTonnage, personalRecords }: Props) {
  const hasWeight = weightData.length > 0
  const hasTonnage = weeklyTonnage.length > 0
  const hasPRs = personalRecords.length > 0

  return (
    <div className="space-y-5">
      {/* ── Graphique poids EWMA ───────────────────────────── */}
      <div className="fiq-card space-y-4">
        <div>
          <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Évolution du poids</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
            Poids brut + tendance lissée EWMA
          </p>
        </div>

        {!hasWeight ? (
          <EmptyState label="Remplis ton poids dans le check-in quotidien" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--fiq-border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--fiq-muted)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'var(--fiq-muted)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<DarkTooltip />} />
              {/* Poids brut (pointillé) */}
              <Line
                type="monotone"
                dataKey="weight"
                name="Poids brut"
                stroke="var(--fiq-muted)"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
              />
              {/* Tendance EWMA (plein) */}
              <Line
                type="monotone"
                dataKey="trend"
                name="Tendance"
                stroke="var(--fiq-accent)"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Graphique tonnage hebdomadaire ────────────────── */}
      <div className="fiq-card space-y-4">
        <div>
          <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Tonnage hebdomadaire</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
            Total poids × reps par semaine
          </p>
        </div>

        {!hasTonnage ? (
          <EmptyState label="Complète ta première séance pour voir le tonnage" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyTonnage} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--fiq-border)" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fill: 'var(--fiq-muted)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--fiq-muted)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`}
              />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="tonnage" name="Tonnage (kg)" fill="var(--fiq-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Table des PRs ─────────────────────────────────── */}
      <div className="fiq-card space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
          <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Records personnels</p>
        </div>

        {!hasPRs ? (
          <EmptyState label="Tes PRs s'afficheront après ta première séance" />
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 pb-2" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
              <span className="fiq-label">Exercice</span>
              <span className="fiq-label text-right">PR (kg)</span>
              <span className="fiq-label text-right">Date</span>
            </div>

            {personalRecords.map((pr, i) => {
              const isNew = Date.now() - new Date(pr.achieved_date).getTime() < 7 * 86400000
              return (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_auto] gap-3 py-2.5"
                  style={{ borderBottom: i < personalRecords.length - 1 ? '1px solid var(--fiq-border)' : undefined }}
                >
                  <span className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: 'var(--fiq-text)' }}>
                    {pr.exercise_name}
                    {isNew && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: '#B4FF4A22', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A44' }}
                      >
                        NOUVEAU
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-black fiq-data text-right" style={{ color: 'var(--fiq-accent)' }}>
                    {pr.value} {pr.unit}
                  </span>
                  <span className="text-xs text-right" style={{ color: 'var(--fiq-muted)' }}>
                    {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(pr.achieved_date))}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>{label}</p>
    </div>
  )
}
