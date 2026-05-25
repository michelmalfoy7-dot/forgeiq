import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProgressChartsLazy as ProgressCharts } from '@/components/progress/ProgressChartsLazy'
import { ProgressPhotos } from '@/components/progress/ProgressPhotos'

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 12 semaines de données
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)
  const since = twelveWeeksAgo.toISOString().split('T')[0]

  const [
    { data: weightLogs },
    { data: workouts },
    { data: prs },
  ] = await Promise.all([
    supabase.from('daily_logs')
      .select('log_date, weight_kg, weight_trend')
      .eq('user_id', user.id)
      .gte('log_date', since)
      .not('weight_kg', 'is', null)
      .order('log_date', { ascending: true }),

    supabase.from('workouts')
      .select('session_date, total_tonnage_kg, session_name')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .gte('session_date', since)
      .order('session_date', { ascending: true }),

    supabase.from('personal_records')
      .select('exercise_name, record_type, value, unit, achieved_date')
      .eq('user_id', user.id)
      .eq('record_type', 'top_set')
      .order('value', { ascending: false }),
  ])

  // Regrouper le tonnage par semaine ISO
  const tonnageByWeek: Record<string, number> = {}
  for (const w of workouts ?? []) {
    if (!w.total_tonnage_kg) continue
    const weekKey = getISOWeek(new Date(w.session_date))
    tonnageByWeek[weekKey] = (tonnageByWeek[weekKey] ?? 0) + w.total_tonnage_kg
  }

  const weeklyTonnage = Object.entries(tonnageByWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, tonnage]) => ({
      week: formatWeekLabel(week),
      tonnage: Math.round(tonnage),
    }))

  const weightData = (weightLogs ?? []).map((l) => ({
    date: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(l.log_date)),
    weight: l.weight_kg,
    trend: l.weight_trend,
  }))

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-6">
        <p className="fiq-label">Progression</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Mes progrès</h1>
      </div>

      <ProgressCharts
        weightData={weightData}
        weeklyTonnage={weeklyTonnage}
        personalRecords={prs ?? []}
      />

      {/* Séparateur */}
      <div className="mt-6 mb-4" style={{ height: '1px', background: 'var(--fiq-border)' }} />

      {/* Photos de progression — opt-in, jamais imposées */}
      <ProgressPhotos />

      <div className="pb-8" />
    </div>
  )
}

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function formatWeekLabel(isoWeek: string): string {
  const [year, week] = isoWeek.split('-W')
  const jan4 = new Date(parseInt(year), 0, 4)
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (parseInt(week) - 1) * 7)
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(weekStart)
}
