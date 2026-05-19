import { cn } from '@/lib/utils'

type ProgressBarProps = {
  value: number
  max: number
  color?: string
  height?: number
  label?: string
  showPercent?: boolean
  className?: string
}

export function ProgressBar({ value, max, color, height = 6, label, showPercent, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const barColor = color ?? 'var(--fiq-accent)'

  return (
    <div className={cn('space-y-1', className)}>
      {(label || showPercent) && (
        <div className="flex justify-between">
          {label && <span className="fiq-label">{label}</span>}
          {showPercent && <span className="fiq-label">{pct}%</span>}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, background: 'var(--fiq-border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  )
}
