'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

type DataPoint = {
  date: string
  poids: number
}

type CustomTooltipProps = {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs font-bold shadow-xl"
      style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
    >
      <p style={{ color: 'var(--fiq-muted)' }}>{label}</p>
      <p style={{ color: 'var(--fiq-accent)' }}>{payload[0].value} kg</p>
    </div>
  )
}

export function ExerciseProgressionChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="fiq-card" style={{ padding: '16px' }}>
      <p
        className="text-xs font-black uppercase mb-4"
        style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}
      >
        Progression sur 12 semaines
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--fiq-border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--fiq-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'var(--fiq-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}kg`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="poids"
            stroke="var(--fiq-accent)"
            strokeWidth={2}
            dot={{ fill: 'var(--fiq-accent)', r: 3, strokeWidth: 0 }}
            activeDot={{ fill: 'var(--fiq-accent)', r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
