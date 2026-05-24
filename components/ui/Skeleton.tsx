// Skeleton avec shimmer ForgeIQ branded
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`fiq-shimmer rounded-xl ${className ?? ''}`}
      style={style}
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
      {/* Header */}
      <div className="pt-4 flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-36" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      {/* Alert */}
      <Skeleton className="h-14 w-full rounded-xl" />
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => <StatCardSkeleton key={i} />)}
      </div>
      {/* Séance card */}
      <div className="fiq-card space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-13 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-2xl" />
      </div>
      {/* Objectifs */}
      <div className="fiq-card space-y-4">
        <Skeleton className="h-5 w-32" />
        {[0, 1, 2].map(i => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
