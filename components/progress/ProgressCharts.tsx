'use client'

import { useState, useEffect, type ReactNode } from 'react'
import {
  ComposedChart, BarChart, Bar, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { TrendingUp, Dumbbell, Trophy, Calendar, Activity } from 'lucide-react'

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
type Tab = 'weight' | 'tonnage' | 'prs' | '1rm'

// Props supplémentaires pour les 4 nouvelles features Sprint 15
interface ExtraProgressProps {
  tonnageThisWeek: number
  tonnageLastWeek: number
  plateauDetected: boolean
  targetWeight: number | null
  currentEwma: number | null
  weeklyWeightTrend: number | null // kg/semaine, négatif = perte
  globalScore: number | null       // 0-100
}

type OneRmExercise = { exercise_id: string; exercise_name: string; value: number }
type OneRmPoint    = { date: string; raw_date: string; value_kg: number }

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

// ─── Tooltip custom 1RM ──────────────────────────────────────────────────────
interface OneRmTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function OneRmTooltip({ active, payload, label }: OneRmTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#161A21',
      border: '1px solid rgba(61,139,255,0.3)',
      borderRadius: 10,
      padding: '10px 14px',
    }}>
      <p style={{ color: '#6B7280', fontSize: 11, marginBottom: 6 }}>{label}</p>
      <p style={{ color: '#F0F2F5', fontWeight: 900, fontSize: 13 }}>
        {payload[0].value} <span style={{ color: '#6B7280', fontWeight: 400, fontSize: 11 }}>kg</span>
      </p>
      <p style={{ color: '#6B7280', fontSize: 10, marginTop: 2 }}>1RM estimé (Epley)</p>
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

// ─── Feature A : Delta tonnage semaine réelle ─────────────────────────────────
// Affiche le tonnage de la semaine courante (lundi→auj) vs la semaine précédente
function TonnageDeltaBar({
  thisWeek,
  lastWeek,
}: {
  thisWeek: number
  lastWeek: number
}) {
  if (lastWeek === 0 && thisWeek === 0) return null
  const hasDelta = lastWeek > 0
  const pct = hasDelta ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null
  const positive = pct !== null ? pct >= 0 : true

  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
      style={{ background: 'var(--fiq-faint)' }}
    >
      <div>
        <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>
          Cette semaine&nbsp;
          <span style={{ color: 'var(--fiq-accent)' }}>
            {thisWeek.toLocaleString('fr-FR')} kg
          </span>
        </p>
        {hasDelta && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
            vs sem. précédente
          </p>
        )}
      </div>

      {hasDelta && pct !== null && (
        <span
          className="text-xs font-black px-2.5 py-1 rounded-lg flex-shrink-0 flex items-center gap-1"
          style={{
            background: positive ? 'rgba(180,255,74,0.12)' : 'rgba(239,68,68,0.12)',
            color: positive ? '#B4FF4A' : '#EF4444',
            border: `1px solid ${positive ? 'rgba(180,255,74,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}
        >
          {positive ? '↑' : '↓'} {positive && pct > 0 ? '+' : ''}{pct}%
        </span>
      )}
    </div>
  )
}

// ─── Feature B : Alerte plateau ──────────────────────────────────────────────
function PlateauAlert() {
  return (
    <div
      className="flex gap-3 items-start px-3 py-3"
      style={{
        borderLeft: '3px solid var(--fiq-orange)',
        background: 'rgba(255,107,53,0.08)',
        borderRadius: 12,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠</span>
      <div>
        <p className="text-sm font-black" style={{ color: 'var(--fiq-orange)' }}>
          Plateau détecté
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
          Ton tonnage est stable depuis 3 semaines. Essaie d&apos;augmenter le volume ou l&apos;intensité sur 1-2 exercices clés.
        </p>
      </div>
    </div>
  )
}

// ─── Feature C : Projection objectif poids ───────────────────────────────────
function WeightProjection({
  targetWeight,
  currentEwma,
  weeklyTrend,
}: {
  targetWeight: number
  currentEwma: number
  weeklyTrend: number | null
}) {
  const ecart = Math.round((targetWeight - currentEwma) * 10) / 10
  const absEcart = Math.abs(ecart)
  const atGoal = absEcart < 0.5

  // Calcul projection
  let projectionLine: string
  let projectionColor = '#3D8BFF'

  if (atGoal) {
    projectionLine = 'Objectif atteint 🎯'
    projectionColor = '#B4FF4A'
  } else if (weeklyTrend === null || Math.abs(weeklyTrend) < 0.05) {
    projectionLine = 'Pas de tendance claire — continue le suivi'
    projectionColor = '#6B7280'
  } else if (Math.sign(weeklyTrend) !== Math.sign(ecart)) {
    projectionLine = 'Ta tendance actuelle s\'éloigne de l\'objectif'
    projectionColor = '#EF4444'
  } else {
    const weeks = Math.round(absEcart / Math.abs(weeklyTrend))
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + weeks * 7)
    const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(targetDate)
    const rythme = weeklyTrend > 0
      ? `+${Math.abs(weeklyTrend).toFixed(2)} kg/sem`
      : `−${Math.abs(weeklyTrend).toFixed(2)} kg/sem`
    projectionLine = `À ce rythme (${rythme}) → atteint dans ~${weeks} sem. (${monthLabel})`
  }

  return (
    <div
      className="fiq-card space-y-3"
      style={{ fontSize: 13 }}
    >
      <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>Objectif poids</p>

      {/* Ligne métriques */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <p className="fiq-label" style={{ fontSize: 10 }}>Objectif</p>
          <p className="font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
            {targetWeight} <span style={{ color: 'var(--fiq-muted)', fontWeight: 400, fontSize: 11 }}>kg</span>
          </p>
        </div>
        <div style={{ color: 'var(--fiq-muted)', fontSize: 18, alignSelf: 'center', marginTop: 8 }}>→</div>
        <div>
          <p className="fiq-label" style={{ fontSize: 10 }}>Actuel (EWMA)</p>
          <p className="font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
            {currentEwma} <span style={{ color: 'var(--fiq-muted)', fontWeight: 400, fontSize: 11 }}>kg</span>
          </p>
        </div>
        <div>
          <p className="fiq-label" style={{ fontSize: 10 }}>Écart</p>
          <p className="font-black fiq-data" style={{ color: ecart < 0 ? '#3D8BFF' : 'var(--fiq-orange)' }}>
            {ecart > 0 ? '+' : ''}{ecart} <span style={{ color: 'var(--fiq-muted)', fontWeight: 400, fontSize: 11 }}>kg</span>
          </p>
        </div>
      </div>

      {/* Ligne projection */}
      <p style={{ color: projectionColor, fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>
        {projectionLine}
      </p>
    </div>
  )
}

// ─── Feature D : Score de forme globale ──────────────────────────────────────
function GlobalFormScore({ score }: { score: number }) {
  // Couleur selon score
  const color =
    score >= 70 ? '#B4FF4A'
    : score >= 45 ? '#F59E0B'
    : '#EF4444'

  const label =
    score >= 70 ? 'En progression'
    : score >= 45 ? 'Stable'
    : 'À améliorer'

  // Arc SVG semi-circulaire (rayon 40, stroke-dasharray sur 126 = π*40)
  const circumference = Math.PI * 40
  const dashOffset = circumference * (1 - score / 100)

  return (
    <div
      className="fiq-card flex items-center gap-4"
      style={{ padding: '14px 16px' }}
    >
      {/* Arc gauge */}
      <div style={{ position: 'relative', width: 68, height: 40, flexShrink: 0 }}>
        <svg viewBox="0 0 88 48" width="68" height="40" overflow="visible">
          {/* Track */}
          <path
            d="M4,44 A40,40 0 0,1 84,44"
            fill="none"
            stroke="#1F242E"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <path
            d="M4,44 A40,40 0 0,1 84,44"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 600ms ease, stroke 300ms ease' }}
          />
        </svg>
        {/* Score centré sous l'arc */}
        <p
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 900,
            color,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          {score}
        </p>
      </div>

      <div>
        <p className="font-black" style={{ color: 'var(--fiq-text)', fontSize: 14 }}>
          Forme globale
        </p>
        <p style={{ color, fontSize: 12, fontWeight: 700 }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
          Tonnage · Régularité · Poids
        </p>
      </div>

      <div className="ml-auto flex-shrink-0">
        <span
          className="font-black"
          style={{ color: 'var(--fiq-muted)', fontSize: 11 }}
        >
          /100
        </span>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ProgressCharts({
  weightData,
  weeklyTonnage,
  personalRecords,
  tonnageThisWeek,
  tonnageLastWeek,
  plateauDetected,
  targetWeight,
  currentEwma,
  weeklyWeightTrend,
  globalScore,
}: {
  weightData: WeightPoint[]
  weeklyTonnage: TonnagePoint[]
  personalRecords: PR[]
} & ExtraProgressProps) {
  const [tab, setTab] = useState<Tab>('weight')

  // ── État 1RM ──────────────────────────────────────────────────
  const [oneRmExercises, setOneRmExercises]   = useState<OneRmExercise[]>([])
  const [selectedExoId, setSelectedExoId]     = useState<string | null>(null)
  const [oneRmHistory, setOneRmHistory]       = useState<OneRmPoint[]>([])
  const [oneRmLoading, setOneRmLoading]       = useState(false)

  // Charger la liste des exercices quand on arrive sur l'onglet 1RM
  useEffect(() => {
    if (tab !== '1rm' || oneRmExercises.length > 0) return
    fetch('/api/progress/1rm')
      .then(r => r.json())
      .then(({ data }) => {
        const list = data ?? []
        setOneRmExercises(list)
        if (list.length > 0 && !selectedExoId) {
          setSelectedExoId(list[0].exercise_id)
        }
      })
      .catch(() => {})
  }, [tab, oneRmExercises.length, selectedExoId])

  // Charger l'historique quand l'exercice change
  useEffect(() => {
    if (!selectedExoId) return
    setOneRmLoading(true)
    fetch(`/api/progress/1rm?exercise_id=${selectedExoId}`)
      .then(r => r.json())
      .then(({ data }) => { setOneRmHistory(data ?? []) })
      .catch(() => {})
      .finally(() => setOneRmLoading(false))
  }, [selectedExoId])

  const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'weight',  label: 'Poids',   icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'tonnage', label: 'Tonnage', icon: <Dumbbell className="w-4 h-4" /> },
    { key: 'prs',     label: 'Records', icon: <Trophy className="w-4 h-4" /> },
    { key: '1rm',     label: '1RM',     icon: <Activity className="w-4 h-4" /> },
  ]

  // Dernier poids EWMA connu pour le badge du header
  const currentTrend = [...weightData].reverse().find(d => d.trend)?.trend ?? null

  // Indice de la dernière barre de tonnage pour la surbrillance
  const lastBarIndex = weeklyTonnage.length - 1

  // 1RM actuel de l'exercice sélectionné
  const currentOneRm = oneRmExercises.find(e => e.exercise_id === selectedExoId)?.value ?? null

  return (
    <div className="space-y-4">
      {/* ── Feature D : Score de forme globale ───────────────────────────── */}
      {globalScore !== null && <GlobalFormScore score={globalScore} />}

      {/* ── Sélecteur onglets avec transition scale ────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
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

          {/* Feature C — Projection objectif poids */}
          {targetWeight !== null && currentEwma !== null && (
            <WeightProjection
              targetWeight={targetWeight}
              currentEwma={Math.round(currentEwma * 10) / 10}
              weeklyTrend={weeklyWeightTrend}
            />
          )}
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

          {/* Feature A — Delta tonnage semaine réelle */}
          <TonnageDeltaBar thisWeek={tonnageThisWeek} lastWeek={tonnageLastWeek} />

          {/* Feature B — Alerte plateau */}
          {plateauDetected && <PlateauAlert />}
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
                            {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(pr.achieved_date + 'T12:00:00'))}
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
      {/* ── 1RM estimé — sélecteur exercice + courbe historique ─────────── */}
      {tab === '1rm' && (
        <div className="fiq-card space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>1RM estimé</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                Formule Epley · charge × (1 + reps ÷ 30)
              </p>
            </div>
            {currentOneRm !== null && (
              <span className="text-xs font-black px-2.5 py-1 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(61,139,255,0.12)', color: '#3D8BFF', border: '1px solid rgba(61,139,255,0.25)' }}>
                {currentOneRm} kg
              </span>
            )}
          </div>

          {/* Sélecteur exercice */}
          {oneRmExercises.length === 0 ? (
            <EmptyState label="Complete quelques séances pour voir ton 1RM estimé par exercice." />
          ) : (
            <>
              <div className="relative">
                <select
                  value={selectedExoId ?? ''}
                  onChange={e => setSelectedExoId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold appearance-none outline-none pr-8"
                  style={{
                    background: 'var(--fiq-faint)',
                    border: '1px solid var(--fiq-border)',
                    color: 'var(--fiq-text)',
                  }}
                >
                  {oneRmExercises.map(e => (
                    <option key={e.exercise_id} value={e.exercise_id}>
                      {e.exercise_name} — {e.value} kg
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--fiq-muted)', fontSize: 12 }}>▼</span>
              </div>

              {oneRmLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'var(--fiq-border)', borderTopColor: '#3D8BFF' }} />
                </div>
              ) : oneRmHistory.length < 2 ? (
                <EmptyState label="Logue au moins 2 séances avec cet exercice pour voir la progression." />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={oneRmHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="oneRmGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3D8BFF" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3D8BFF" stopOpacity={0} />
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
                        tickFormatter={v => `${v}kg`}
                      />
                      <Tooltip content={<OneRmTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value_kg"
                        stroke="#3D8BFF"
                        strokeWidth={2.5}
                        fill="url(#oneRmGradient)"
                        dot={(props: object) => {
                          const p = props as { cx?: number; cy?: number; index?: number }
                          if (p.index !== oneRmHistory.length - 1 || p.cx == null || p.cy == null) return <g key={`dot-${p.index ?? 0}`} />
                          return (
                            <g key={`dot-${p.index}`}>
                              <circle cx={p.cx} cy={p.cy} r={8} fill="rgba(61,139,255,0.15)" />
                              <circle cx={p.cx} cy={p.cy} r={4} fill="#3D8BFF" stroke="#0A0C0F" strokeWidth={2} />
                            </g>
                          )
                        }}
                        activeDot={{ r: 4, fill: '#3D8BFF', stroke: '#0A0C0F', strokeWidth: 2 }}
                        name="1RM estimé"
                        connectNulls
                      />
                    </ComposedChart>
                  </ResponsiveContainer>

                  {/* Résumé progression */}
                  {(() => {
                    const first = oneRmHistory[0].value_kg
                    const last  = oneRmHistory[oneRmHistory.length - 1].value_kg
                    const diff  = Math.round((last - first) * 10) / 10
                    const pct   = Math.round(((last - first) / first) * 100)
                    return (
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--fiq-faint)' }}>
                        <span className="text-xl">{diff >= 0 ? '💪' : '📉'}</span>
                        <div>
                          <p className="text-sm font-black" style={{ color: diff >= 0 ? '#3D8BFF' : 'var(--fiq-orange)' }}>
                            {diff > 0 ? '+' : ''}{diff} kg ({pct > 0 ? '+' : ''}{pct}%)
                          </p>
                          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                            {first} kg → {last} kg · {oneRmHistory.length} séances
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </>
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
