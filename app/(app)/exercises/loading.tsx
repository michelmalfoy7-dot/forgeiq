import { Skeleton } from '@/components/ui/Skeleton'

export default function ExercisesLoading() {
  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-5 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-36" />
      </div>
      {/* Search + filters */}
      <Skeleton className="h-12 w-full rounded-xl mb-3" />
      <div className="flex gap-2 mb-4 overflow-hidden">
        {[0,1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />)}
      </div>
      {/* Exercise list */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="fiq-card flex items-start gap-3 mb-2">
          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
