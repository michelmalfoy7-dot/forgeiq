import { Skeleton } from '@/components/ui/Skeleton'
import { Zap } from 'lucide-react'

export default function CoachLoading() {
  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--fiq-accent)' }}>
          <Zap className="w-4 h-4" style={{ color: 'var(--bg)' }} />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 px-4 pt-5 space-y-4 overflow-hidden">
        {/* Assistant bubble */}
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: 'var(--fiq-accent)' }} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
        {/* Quick suggestions */}
        <div className="flex gap-2 flex-wrap pt-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-8 w-36 rounded-2xl" />)}
        </div>
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid var(--fiq-border)' }}>
        <Skeleton className="flex-1 h-12 rounded-2xl" />
        <Skeleton className="h-12 w-12 rounded-2xl" />
      </div>
    </div>
  )
}
