'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/Skeleton'

// Recharts est lourd (~250KB) — lazy loadé uniquement quand /progress est visité
const ProgressCharts = dynamic(
  () => import('./ProgressCharts').then(m => ({ default: m.ProgressCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}
        </div>
        <div className="fiq-card">
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </div>
      </div>
    ),
  }
)

export { ProgressCharts as ProgressChartsLazy }
