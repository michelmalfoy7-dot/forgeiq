'use client'

import { useState, type ReactNode } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Dumbbell, Trophy, Calendar } from 'lucide-react'

type WeightPoint = { date: string; weight: number | null; trend: number | null }
type TonnagePoint = { week: string; tonnage: number }
type PR = {
  exercise_name: string
  record_type: string
  value: number
  unit: string
  achieved_date: string | null
}
type Tab = 'weight' | 'tonnage' | 'prs'

// Sous-composant résumé poids
function WeightSummary({ data }: { data: WeightPoint[] }) {
  const first = data.find(d => d.trend)?.trend
  const last = [...data].reverse().find(d => d.trend)?.trend
  if (!first || !last) return null
  const diff = Math.round((last - first) * 10) / 10
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--fiq-faint)' }}>
      <span className="text-xl">{diff < 0 ? '📉' : '📈'}</span>
      <div>
        <p className="text-sm font-black" style={{ color: diff < 0 ? 'var(--fiq-accent)' : 'var(--fiq-orange)' }}>
          {diff > 0 ? '+' : ''}{diff} kg sur la période
        </p>
        <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Tendance lissée · 12 semaines</p>
      </div>
    </div>
  )
}

// Sous-composant résumé tonnage
function TonnageSummary({ data }: { data: TonnagePoint[] }) {
  const last = data[data.length - 1]?.tonnage ?? 0
  const prev = data[data.length - 2]?.tonnage ?? 0
  if (!prev) return null
  const pct = Math.round(((last - prev) / prev) * 100)
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--fiq-faint)' }}>
      <span className="text-xl">{pct >= 0 ? '⬆️' : '⬇️'}</span>
      <div>
        <p className="text-sm font-black" style={{ color: pct >= 0 ? 'var(--fiq-accent)' : 'var(--fiq-orange)' }}>
          {pct > 0 ? '+' : ''}{pct}% vs semaine dernière
        </p>
        <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          {last.toLocaleString('fr-FR')} kg cette semaine
        </p>
      </div>
    </div>
  )
}

const tooltipStyle = {
  contentStyle: { background: '#161A21', border: '1px solid #1F242E', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#6B7280', fontSize: 11, marginBottom: 4 },
}

export function ProgressCharts({
  weightData,
  weeklyTonnage,
  personalRecords,
}: {
  weightData: WeightPoint[]
  weeklyTonnage: TonnagePoint[]
  personalRecords: PR[]
}) {
  const [tab, setTab] = useState<Tab>('weight')

  const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'weight',  label: 'Poids',   icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'tonnage', label: 'Tonnage', icon: <Dumbbell className="w-4 h-4" /> },
    { key: 'prs',     label: 'Records', icon: <Trophy className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Sélecteur onglets */}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all"
            style={{
              background: tab === t.key ? 'var(--fiq-accent)' : 'var(--fiq-card)',
              color: tab === t.key ? 'var(--bg)' : 'var(--fiq-muted)',
              border: `1px solid ${tab === t.key ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Poids ──────────────────────────────────────────── */}
      {tab === 'weight' && (
        <div className="fiq-card space-y-4">
          <div>
            <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Évolution du poids</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              Brut (pointillés) · Tendance EWMA (plein)
            </p>
          </div>

          {weightData.length < 2 ? (
            <EmptyState label="Complète quelques check-ins pour voir ta courbe de poids." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weightData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F242E" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v) => [`${String(v)} kg`]}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#3D8BFF"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  name="Brut"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="#B4FF4A"
                  strokeWidth={2.5}
                  dot={false}
                  name="Tendance"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {weightData.length >= 2 && <WeightSummary data={weightData} />}
        </div>
      )}

      {/* ── Tonnage ────────────────────────────────────────── */}
      {tab === 'tonnage' && (
        <div className="fiq-card space-y-4">
          <div>
            <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Tonnage hebdomadaire</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              Charge totale soulevée · 12 dernières semaines
            </p>
          </div>

          {weeklyTonnage.length < 2 ? (
            <EmptyState label="Complète quelques séances pour voir ton évolution de charge." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyTonnage} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F242E" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(v) => Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v) => [`${Number(String(v)).toLocaleString('fr-FR')} kg`, 'Tonnage']}
                />
                <Bar
                  dataKey="tonnage"
                  fill="#B4FF4A"
                  radius={4}
                />
              </BarChart>
            </ResponsiveContainer>
          )}

          {weeklyTonnage.length >= 2 && <TonnageSummary data={weeklyTonnage} />}
        </div>
      )}

      {/* ── Records personnels ─────────────────────────────── */}
      {tab === 'prs' && (
        <div className="fiq-card">
          <div className="mb-4">
            <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Records personnels</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              Meilleur top set enregistré par exercice
            </p>
          </div>

          {personalRecords.length === 0 ? (
            <EmptyState label="Tes PRs apparaîtront automatiquement après chaque séance loggée." />
          ) : (
            <div>
              {personalRecords.slice(0, 25).map((pr, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--fiq-border)' : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center flex-shrink-0">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>
                        {pr.exercise_name}
                      </p>
                      {pr.achieved_date && (
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                          <Calendar className="w-3 h-3" />
                          {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(pr.achieved_date))}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-base font-black fiq-data flex-shrink-0" style={{ color: 'var(--fiq-accent)' }}>
                    {pr.value}
                    <span className="text-xs font-normal ml-1" style={{ color: 'var(--fiq-muted)' }}>{pr.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <span className="text-4xl">📊</span>
      <p className="text-sm max-w-[240px]" style={{ color: 'var(--fiq-muted)' }}>{label}</p>
    </div>
  )
}
