import { Skeleton } from '@/components/ui/Skeleton'

function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="fiq-card mb-4 space-y-4">
      <Skeleton className="h-5 w-32" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}

export default function CheckinLoading() {
  return (
    <div className="p-4 max-w-lg mx-auto pb-6">
      <div className="pt-4 mb-6">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-3 w-56 mt-1" />
      </div>
      <SectionSkeleton rows={2} />
      <SectionSkeleton rows={3} />
      <SectionSkeleton rows={3} />
      <SectionSkeleton rows={2} />
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  )
}
