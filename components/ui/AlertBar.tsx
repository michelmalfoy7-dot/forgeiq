import { cn } from '@/lib/utils'

type AlertBarProps = {
  type: 'red' | 'yellow' | 'green' | 'blue'
  message: string
  sub?: string
  className?: string
}

const STYLES: Record<AlertBarProps['type'], { border: string; bg: string; text: string }> = {
  red:    { border: 'var(--fiq-red)',    bg: '#EF444412', text: 'var(--fiq-red)'    },
  yellow: { border: 'var(--fiq-yellow)', bg: '#F59E0B12', text: 'var(--fiq-yellow)' },
  green:  { border: 'var(--fiq-accent)', bg: '#B4FF4A12', text: 'var(--fiq-accent)' },
  blue:   { border: 'var(--fiq-blue)',   bg: '#3D8BFF12', text: 'var(--fiq-blue)'   },
}

export function AlertBar({ type, message, sub, className }: AlertBarProps) {
  const s = STYLES[type]
  return (
    <div
      className={cn('rounded-lg px-4 py-3', className)}
      style={{ borderLeft: `3px solid ${s.border}`, background: s.bg }}
    >
      <p className="text-sm font-semibold" style={{ color: s.text }}>
        {message}
      </p>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}
