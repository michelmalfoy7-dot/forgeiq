export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ''}`}
      style={{ background: 'var(--fiq-faint)', ...style }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="fiq-card space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="fiq-card space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <div className="pt-4">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}
