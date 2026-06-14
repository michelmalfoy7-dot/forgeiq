'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type WeekData = { week: string; tonnage: number }

type Props = {
  data: WeekData[]
  bestWeek: number
}

export function WeeklyVolumeChart({ data, bestWeek }: Props) {
  // Formatter compact pour les valeurs de tonnage
  const formatTonnage = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`

  return (
    <div className="fiq-card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>
          Volume — 8 semaines
        </p>
        {bestWeek > 0 && (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: '#B4FF4A18', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A30' }}
          >
            Best : {formatTonnage(bestWeek)}
          </span>
        )}
      </div>

      {/* Graphique */}
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tick={{ fill: 'var(--fiq-muted)', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={1}
            />
            <YAxis
              tick={{ fill: 'var(--fiq-muted)', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatTonnage}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--fiq-card)',
                border: '1px solid var(--fiq-border)',
                borderRadius: 10,
                color: 'var(--fiq-text)',
                fontSize: 11,
              }}
              formatter={(v) => [formatTonnage(Number(v ?? 0)), 'Tonnage']}
              labelStyle={{ color: 'var(--fiq-muted)', fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="tonnage"
              stroke="var(--fiq-accent)"
              strokeWidth={2}
              dot={{ fill: 'var(--fiq-accent)', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'var(--fiq-accent)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pas de données */}
      {bestWeek === 0 && (
        <p className="text-xs text-center py-2" style={{ color: 'var(--fiq-muted)' }}>
          Aucune séance dans les 8 dernières semaines
        </p>
      )}
    </div>
  )
}
