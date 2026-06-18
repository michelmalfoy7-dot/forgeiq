import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProgressChartsLazy as ProgressCharts } from '@/components/progress/ProgressChartsLazy'
import { ProgressPhotos } from '@/components/progress/ProgressPhotos'
import { MeasurementsSection } from '@/components/progress/MeasurementsSection'

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 12 semaines de données
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)
  const since = twelveWeeksAgo.toISOString().split('T')[0]

  // Cette semaine et la semaine dernière (pour Feature A delta + Feature D)
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=dimanche
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - ((dayOfWeek + 6) % 7)) // lundi
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfWeek.getDate() - 7)

  const todayStr = today.toISOString().split('T')[0]
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0]
  const startOfLastWeekStr = startOfLastWeek.toISOString().split('T')[0]

  const [
    { data: weightLogs },
    { data: workouts },
    { data: prs },
    { data: profile },
    { data: thisWeekWorkouts },
    { data: lastWeekWorkouts },
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
      .select('exercise_name, record_type, value, unit, reps, achieved_date')
      .eq('user_id', user.id)
      .eq('record_type', 'top_set')
      .order('value', { ascending: false }),

    supabase.from('profiles')
      .select('target_weight_kg, sessions_per_week')
      .eq('id', user.id)
      .maybeSingle(),

    // Séances cette semaine (lundi → aujourd'hui)
    supabase.from('workouts')
      .select('session_date, total_tonnage_kg')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .gte('session_date', startOfWeekStr)
      .lte('session_date', todayStr),

    // Séances semaine dernière
    supabase.from('workouts')
      .select('session_date, total_tonnage_kg')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .gte('session_date', startOfLastWeekStr)
      .lt('session_date', startOfWeekStr),
  ])

  // Regrouper le tonnage par semaine ISO
  const tonnageByWeek: Record<string, number> = {}
  for (const w of workouts ?? []) {
    if (!w.total_tonnage_kg) continue
    // T12:00:00 évite le décalage timezone (new Date('2026-05-15') = UTC midnight = 14 mai en UTC+2)
    const weekKey = getISOWeek(new Date(w.session_date + 'T12:00:00'))
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
    date: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(l.log_date + 'T12:00:00')),
    weight: l.weight_kg,
    trend: l.weight_trend,
  }))

  // ── Feature A & B : tonnage cette semaine vs semaine dernière ─────────────
  const tonnageThisWeek = (thisWeekWorkouts ?? []).reduce((sum, w) => sum + (w.total_tonnage_kg ?? 0), 0)
  const tonnageLastWeek = (lastWeekWorkouts ?? []).reduce((sum, w) => sum + (w.total_tonnage_kg ?? 0), 0)
  const sessionsThisWeek = (thisWeekWorkouts ?? []).length

  // ── Feature B : plateau — comparer les 3 dernières semaines ISO ──────────
  const last3Weeks = weeklyTonnage.slice(-3)
  let plateauDetected = false
  if (last3Weeks.length === 3) {
    const values = last3Weeks.map(w => w.tonnage)
    const maxVal = Math.max(...values)
    const minVal = Math.min(...values)
    if (maxVal > 0 && (maxVal - minVal) / maxVal < 0.03) {
      plateauDetected = true
    }
  }

  // ── Feature C : projection objectif poids ────────────────────────────────
  const targetWeight = profile?.target_weight_kg ?? null
  // Tendance EWMA sur 4 semaines : (ewma_today - ewma_4weeks_ago) / 4
  const trendLogs = (weightLogs ?? []).filter(l => l.weight_trend != null)
  let weeklyWeightTrend: number | null = null // kg/semaine, positif = prise, négatif = perte
  if (trendLogs.length >= 2) {
    // On cherche un point ~4 semaines en arrière
    const latestTrend = trendLogs[trendLogs.length - 1].weight_trend!
    const fourWeeksAgoDate = new Date()
    fourWeeksAgoDate.setDate(fourWeeksAgoDate.getDate() - 28)
    const oldLog = trendLogs.find(l => new Date(l.log_date + 'T12:00:00') >= fourWeeksAgoDate) ?? trendLogs[0]
    const oldTrend = oldLog.weight_trend!
    const daysDiff = (new Date(trendLogs[trendLogs.length - 1].log_date + 'T12:00:00').getTime() - new Date(oldLog.log_date + 'T12:00:00').getTime()) / 86400000
    if (daysDiff >= 1) {
      weeklyWeightTrend = ((latestTrend - oldTrend) / Math.max(daysDiff, 7)) * 7
    }
  }
  const currentEwma = trendLogs.length > 0 ? trendLogs[trendLogs.length - 1].weight_trend! : null

  // ── Feature D : score de forme globale 0-100 ────────────────────────────
  let globalScore: number | null = null
  {
    // 40% tendance tonnage (en progression vs plateau)
    let tonnageScore = 50 // neutre par défaut
    if (weeklyTonnage.length >= 2) {
      const last = weeklyTonnage[weeklyTonnage.length - 1].tonnage
      const prev = weeklyTonnage[weeklyTonnage.length - 2].tonnage
      if (prev > 0) {
        const pct = ((last - prev) / prev) * 100
        // +10% ou plus = 100, -10% ou moins = 0, linéaire entre
        tonnageScore = Math.max(0, Math.min(100, 50 + pct * 5))
      }
    }
    if (plateauDetected) tonnageScore = Math.min(tonnageScore, 30)

    // 30% régularité séances : sessionsThisWeek vs objectif
    const targetSessions = profile?.sessions_per_week ?? 3
    const regularityScore = Math.min(100, (sessionsThisWeek / targetSessions) * 100)

    // 30% poids trend vs objectif
    let weightScore = 50
    if (targetWeight !== null && currentEwma !== null && weeklyWeightTrend !== null) {
      const ecart = targetWeight - currentEwma
      const absEcart = Math.abs(ecart)
      if (absEcart < 0.5) {
        weightScore = 100 // objectif atteint
      } else if (Math.abs(weeklyWeightTrend) < 0.05) {
        weightScore = 40 // pas de tendance claire
      } else if (Math.sign(weeklyWeightTrend) === Math.sign(ecart)) {
        // Tendance dans la bonne direction
        const weeksToGoal = absEcart / Math.abs(weeklyWeightTrend)
        weightScore = weeksToGoal <= 12 ? 90 : weeksToGoal <= 24 ? 70 : 50
      } else {
        weightScore = 10 // tendance inverse
      }
    }

    globalScore = Math.round(tonnageScore * 0.4 + regularityScore * 0.3 + weightScore * 0.3)
  }

  const thisYear = new Date().getFullYear()

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-4">
        <p className="fiq-label">Progression</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Mes progrès</h1>
      </div>

      {/* Year in Forge CTA */}
      <Link
        href={`/progress/year?year=${thisYear}`}
        className="flex items-center justify-between w-full rounded-2xl px-4 py-3 mb-6"
        style={{
          background: 'var(--fiq-faint)',
          border: '1px solid var(--fiq-border)',
          textDecoration: 'none',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>
              Ton année {thisYear} en chiffres
            </p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
              Récapitulatif annuel
            </p>
          </div>
        </div>
        <span className="text-sm font-bold" style={{ color: 'var(--fiq-accent)' }}>Voir →</span>
      </Link>

      <ProgressCharts
        weightData={weightData}
        weeklyTonnage={weeklyTonnage}
        personalRecords={prs ?? []}
        tonnageThisWeek={Math.round(tonnageThisWeek)}
        tonnageLastWeek={Math.round(tonnageLastWeek)}
        plateauDetected={plateauDetected}
        targetWeight={targetWeight}
        currentEwma={currentEwma}
        weeklyWeightTrend={weeklyWeightTrend}
        globalScore={globalScore}
      />

      {/* Séparateur */}
      <div className="mt-6 mb-4" style={{ height: '1px', background: 'var(--fiq-border)' }} />

      {/* Mensurations corporelles */}
      <MeasurementsSection />

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
