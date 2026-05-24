import { Skeleton } from '@/components/ui/Skeleton'

export default function ProgressLoading() {
  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-6 flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>
      {/* Tab selector */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}
      </div>
      {/* Chart placeholder */}
      <div className="fiq-card space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-[220px] w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}
