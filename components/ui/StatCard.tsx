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
  accent?: boolean   // true → met en avant la valeur avec le vert ForgeIQ
  className?: string
}

export function StatCard({ label, value, unit, sub, trend, color, alert, accent, className }: StatCardProps) {
  const valueColor = color ?? (alert ? 'var(--fiq-orange)' : accent ? 'var(--fiq-accent)' : 'var(--fiq-text)')

  return (
    <div
      className={cn('fiq-card', className)}
      style={{
        borderColor: alert ? 'rgba(239,68,68,0.4)' : accent ? 'rgba(180,255,74,0.2)' : 'var(--fiq-border)',
        // Micro-gradient en coin pour les valeurs accent
        backgroundImage: accent
          ? 'radial-gradient(ellipse at top left, rgba(180,255,74,0.05) 0%, transparent 60%)'
          : undefined,
      }}
    >
      <p className="fiq-label">{label}</p>
      <div className="flex items-end gap-1 mt-1.5">
        <span
          className={cn('text-2xl fiq-data leading-none', accent && 'fiq-glow')}
          style={{ color: valueColor }}
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
        <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}
