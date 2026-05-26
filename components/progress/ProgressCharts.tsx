'use client'

import { useState, type ReactNode } from 'react'
import {
  ComposedChart, BarChart, Bar, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { TrendingUp, Dumbbell, Trophy, Calendar } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type WeightPoint  = { date: string; weight: number | null; trend: number | null }
type TonnagePoint = { week: string; tonnage: number }
type PR = {
  exercise_name: string
  record_type: string
  value: number
  unit: string
  reps?: number | null
  achieved_date: string | null
}
type Tab = 'weight' | 'tonnage' | 'prs'

// ─── Tooltip custom poids ─────────────────────────────────────────────────────
// Affiche date + brut + tendance dans un tooltip premium dark
interface WeightTooltipPayloadItem {
  name: string
  value: number | null
  color: string
}
interface WeightTooltipProps {
  active?: boolean
  payload?: WeightTooltipPayloadItem[]
  label?: string
}

function WeightTooltip({ active, payload, label }: WeightTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#161A21',
      border: '1px solid rgba(180,255,74,0.2)',
      borderRadius: 10,
      padding: '10px 14px',
      minWidth: 130,
    }}>
      <p style={{ color: '#6B7280', fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((item) => {
        if (item.value == null) return null
        return (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: '#6B7280', fontSize: 11, marginRight: 4 }}>{item.name}</span>
            <span style={{ color: '#F0F2F5', fontWeight: 900, fontSize: 13 }}>{item.value} kg</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tooltip custom tonnage ───────────────────────────────────────────────────
interface TonnageTooltipPayloadItem {
  name: string
  value: number
}
interface TonnageTooltipProps {
  active?: boolean
  payload?: TonnageTooltipPayloadItem[]
  label?: string
}

function TonnageTooltip({ active, payload, label }: TonnageTooltipProps) {
  if (!active || !payload?.length) return null
  const tonnage = payload[0]?.value ?? 0
  return (
    <div style={{
      background: '#161A21',
      border: '1px solid rgba(180,255,74,0.2)',
      borderRadius: 10,
      padding: '10px 14px',
    }}>
      <p style={{ color: '#6B7280', fontSize: 11, marginBottom: 6 }}>{label}</p>
      <p style={{ color: '#F0F2F5', fontWeight: 900, fontSize: 13 }}>
        {tonnage.toLocaleString('fr-FR')} <span style={{ color: '#6B7280', fontWeight: 400, fontSize: 11 }}>kg</span>
      </p>
    </div>
  )
}

// ─── Dot personnalisé pour le dernier point de tendance ───────────────────────
// Petit cercle vert avec halo lumineux sur le point le plus récent
interface TrendDotProps {
  cx?: number
  cy?: number
  index?: number
  dataLength: number
}

function TrendDot({ cx, cy, index, dataLength }: TrendDotProps) {
  // N'affiche le dot que sur le dernier point valide
  if (index !== dataLength - 1 || cx == null || cy == null) return null
  return (
    <g>
      {/* Halo externe */}
      <circle cx={cx} cy={cy} r={8} fill="rgba(180,255,74,0.15)" />
      {/* Cercle principal */}
      <circle cx={cx} cy={cy} r={4} fill="#B4FF4A" stroke="#0A0C0F" strokeWidth={2} />
    </g>
  )
}

// ─── Résumé poids ─────────────────────────────────────────────────────────────
function WeightSummary({ data }: { data: WeightPoint[] }) {
  const first = data.find(d => d.trend)?.trend
  const last  = [...data].reverse().find(d => d.trend)?.trend
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

// ─── Résumé tonnage ───────────────────────────────────────────────────────────
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

// ─── Composant principal ──────────────────────────────────────────────────────

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

  // Dernier poids EWMA connu pour le badge du header
  const currentTrend = [...weightData].reverse().find(d => d.trend)?.trend ?? null

  // Indice de la dernière barre de tonnage pour la surbrillance
  const lastBarIndex = weeklyTonnage.length - 1

  return (
    <div className="space-y-4">
      {/* ── Sélecteur onglets avec transition scale ────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map(t => {
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black"
              style={{
                background: isActive ? 'var(--fiq-accent)' : 'var(--fiq-card)',
                color: isActive ? 'var(--bg)' : 'var(--fiq-muted)',
                border: `1px solid ${isActive ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                transition: 'all 150ms ease',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Chart poids (Area + gradient EWMA) ────────────────────────────── */}
      {tab === 'weight' && (
        <div className="fiq-card space-y-4">
          {/* Mini-header avec badge poids actuel */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Évolution du poids</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                Brut (pointillés) · Tendance EWMA (plein)
              </p>
            </div>
            {/* Badge poids actuel — affiché seulement si données disponibles */}
            {currentTrend !== null && (
              <span
                className="text-xs font-black px-2.5 py-1 rounded-lg flex-shrink-0"
                style={{
                  background: 'rgba(180,255,74,0.12)',
                  color: '#B4FF4A',
                  border: '1px solid rgba(180,255,74,0.25)',
                }}
              >
                {currentTrend} kg
              </span>
            )}
          </div>

          {weightData.length < 2 ? (
            <EmptyState label="Complète quelques check-ins pour voir ta courbe de poids." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={weightData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                {/* Définition des gradients SVG */}
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#B4FF4A" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#B4FF4A" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1F242E" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<WeightTooltip />} />

                {/* Area EWMA avec gradient vert sous la courbe */}
                <Area
                  type="monotone"
                  dataKey="trend"
                  stroke="#B4FF4A"
                  strokeWidth={2.5}
                  fill="url(#trendGradient)"
                  dot={(props: object) => {
                    const p = props as { cx?: number; cy?: number; index?: number }
                    return (
                      <TrendDot
                        key={`dot-${p.index ?? 0}`}
                        cx={p.cx}
                        cy={p.cy}
                        index={p.index}
                        dataLength={weightData.length}
                      />
                    )
                  }}
                  activeDot={false}
                  name="Tendance"
                  connectNulls
                />

                {/* Line brute en pointillés bleus, sans remplissage */}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#3D8BFF"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3D8BFF', stroke: '#0A0C0F', strokeWidth: 2 }}
                  name="Brut"
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {weightData.length >= 2 && <WeightSummary data={weightData} />}
        </div>
      )}

      {/* ── Chart tonnage (barres avec gradient + Cell dernier) ────────────── */}
      {tab === 'tonnage' && (
        <div className="fiq-card space-y-4">
          <div>
            <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Tonnage hebdomadaire</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              Charge totale soulevée · 12 dernières semaines
            </p>
          </div>

          {weeklyTonnage.length < 1 ? (
            <EmptyState label="Complète ta première séance pour voir ton évolution de charge." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyTonnage} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                {/* Gradient vertical du vert acide vers le vert atténué */}
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#B4FF4A" stopOpacity={1} />
                    <stop offset="100%" stopColor="#7CB82F" stopOpacity={0.85} />
                  </linearGradient>
                  {/* Gradient légèrement plus clair pour la barre la plus récente */}
                  <linearGradient id="barGradientLatest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#C8FF6A" stopOpacity={1} />
                    <stop offset="100%" stopColor="#B4FF4A" stopOpacity={0.9} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1F242E" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)}
                />
                <Tooltip content={<TonnageTooltip />} />

                {/* Barres arrondies uniquement en haut, Cell pour différencier la dernière */}
                <Bar dataKey="tonnage" radius={[6, 6, 0, 0]}>
                  {weeklyTonnage.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === lastBarIndex ? 'url(#barGradientLatest)' : 'url(#barGradient)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {weeklyTonnage.length >= 2 && <TonnageSummary data={weeklyTonnage} />}
        </div>
      )}

      {/* ── Records personnels avec backgrounds top-3 ──────────────────────── */}
      {tab === 'prs' && (
        <div className="fiq-card">
          <div className="mb-4">
            <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Records personnels</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              Charge maximale soulevée par exercice
            </p>
          </div>

          {personalRecords.length === 0 ? (
            <EmptyState label="Tes PRs apparaîtront automatiquement après chaque séance loggée." />
          ) : (
            <div className="space-y-1">
              {personalRecords.slice(0, 25).map((pr, i) => {
                // Styles distinctifs pour le podium (top 3)
                const podiumStyle: React.CSSProperties =
                  i === 0 ? { background: 'rgba(180,255,74,0.06)', borderLeft: '3px solid #B4FF4A' }
                : i === 1 ? { background: 'rgba(180,255,74,0.03)', borderLeft: '3px solid #7CB82F' }
                : i === 2 ? { background: 'rgba(180,255,74,0.02)', borderLeft: '3px solid #1F242E' }
                : {}

                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3"
                    style={{
                      borderRadius: 8,
                      paddingLeft: 12,
                      paddingRight: 12,
                      ...podiumStyle,
                      // Pour les entrées hors podium, on garde la bordure top classique
                      ...(i > 2 ? { borderTop: '1px solid var(--fiq-border)', borderRadius: 0 } : {}),
                    }}
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
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                        {pr.value}
                        <span className="text-xs font-normal ml-1" style={{ color: 'var(--fiq-muted)' }}>{pr.unit}</span>
                      </p>
                      {pr.reps && (
                        <p className="text-xs font-semibold" style={{ color: 'var(--fiq-muted)' }}>
                          × {pr.reps} reps
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── État vide générique ──────────────────────────────────────────────────────
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <span className="text-4xl">📊</span>
      <p className="text-sm max-w-[240px]" style={{ color: 'var(--fiq-muted)' }}>{label}</p>
    </div>
  )
}
