import { Skeleton } from '@/components/ui/Skeleton'

export default function NutritionLoading() {
  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-5 flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      {/* Macro ring placeholder */}
      <div className="fiq-card mb-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-32" />
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[0,1,2].map(i => <Skeleton key={i} className="h-8 rounded-lg" />)}
            </div>
          </div>
        </div>
      </div>
      {/* Meal sections */}
      {['Petit-déjeuner', 'Déjeuner', 'Dîner'].map(meal => (
        <div key={meal} className="fiq-card mb-3 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}
