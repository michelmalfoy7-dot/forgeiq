import { Skeleton } from '@/components/ui/Skeleton'

export default function ProgramsLoading() {
  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-5 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-44" />
      </div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-hidden">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-8 w-24 rounded-full flex-shrink-0" />)}
      </div>
      {/* Program cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="fiq-card mb-3 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}
