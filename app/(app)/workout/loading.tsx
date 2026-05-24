import { Skeleton } from '@/components/ui/Skeleton'

export default function WorkoutLoading() {
  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-6">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="space-y-4">
        {/* Suggestion card */}
        <div className="fiq-card space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
        {/* Séance libre */}
        <Skeleton className="h-16 w-full rounded-2xl" />
        {/* Historique */}
        <div className="fiq-card space-y-3">
          <Skeleton className="h-4 w-32" />
          {[0, 1, 2].map(i => (
            <div key={i} className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--fiq-border)' }}>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
