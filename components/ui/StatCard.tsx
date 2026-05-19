import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string
  unit?: string
  sub?: string
  trend?: 'up' | 'down' | 'flat'
  color?: string
  alert?: boolean
  className?: string
}

export function StatCard({ label, value, unit, sub, trend, color, alert, className }: StatCardProps) {
  return (
    <div
      className={cn('fiq-card', className)}
      style={{ borderColor: alert ? 'var(--fiq-orange)' : 'var(--fiq-border)' }}
    >
      <p className="fiq-label">{label}</p>
      <div className="flex items-end gap-1 mt-1">
        <span
          className="text-2xl fiq-data"
          style={{ color: color ?? (alert ? 'var(--fiq-orange)' : 'var(--fiq-text)') }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm pb-0.5" style={{ color: 'var(--fiq-muted)' }}>
            {unit}
          </span>
        )}
        {trend && (
          <span className="ml-auto pb-0.5">
            {trend === 'up' && <TrendingUp className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />}
            {trend === 'down' && <TrendingDown className="w-4 h-4" style={{ color: 'var(--fiq-red)' }} />}
            {trend === 'flat' && <Minus className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />}
          </span>
        )}
      </div>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}
