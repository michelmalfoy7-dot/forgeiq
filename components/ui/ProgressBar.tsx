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
  const isComplete = pct >= 100

  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <span className="text-xs font-medium flex-1 min-w-0 truncate" style={{ color: 'var(--fiq-muted)' }}>
              {label}
            </span>
          )}
          <span
            className="text-xs font-black fiq-data flex-shrink-0"
            style={{ color: isComplete ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }}
          >
            {isComplete ? '✓' : `${pct}%`}
          </span>
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, background: 'var(--fiq-faint)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: isComplete
              ? `linear-gradient(90deg, ${barColor}, rgba(180,255,74,0.8))`
              : barColor,
            boxShadow: isComplete ? `0 0 8px rgba(180,255,74,0.4)` : undefined,
          }}
        />
      </div>
    </div>
  )
}
