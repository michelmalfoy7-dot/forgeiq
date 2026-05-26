import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { AlertBar } from '@/components/ui/AlertBar'
import { StatCard } from '@/components/ui/StatCard'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { UpgradeBanner } from '@/components/dashboard/UpgradeBanner'
import { CancelWorkoutButton } from '@/components/dashboard/CancelWorkoutButton'
import { formatSleep } from '@/lib/formatSleep'
import { Dumbbell, TrendingUp, ClipboardList, MessageCircle, Utensils } from 'lucide-react'
import { calcBMR, calcStepsCalories, calcTrainingCalories, goalAdjustment, calcMacrosFromCalories } from '@/lib/utils/tdee'

export const dynamic = 'force-dynamic'

const SESSIONS_TARGET = 4

export default async function DashboardPage() {
  let supabase
  try {
    supabase = await createClient()
  } catch (e) {
    console.error('[Dashboard] createClient failed:', e)
    throw new Error(`Supabase client init failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) console.error('[Dashboard] getUser error:', authError)
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  console.log('[Dashboard] Loading data for user:', user.id)

  const [
    { data: profile, error: profileError },
    { data: todayLog },
    { data: lastWorkout },
    { data: weekWorkouts },
    { data: weekLogs },
    { data: todayWorkouts },
    { data: todayFoodLogs },
  ] = await Promise.all([
    supabase.from('profiles')
      .select('display_name, goal, level, current_program_id, onboarding_done, sessions_per_week, weight_kg, height_cm, age, gender, macro_mode, custom_protein_g, custom_calories, steps_goal, target_weight_kg, avatar_url')
      .eq('id', user.id).maybeSingle(),

    supabase.from('daily_logs').select('*')
      .eq('user_id', user.id).eq('log_date', today).maybeSingle(),

    supabase.from('workouts').select('session_name, session_date, total_tonnage_kg, total_sets')
      .eq('user_id', user.id).not('completed_at', 'is', null)
      .order('session_date', { ascending: false }).limit(1).maybeSingle(),

    supabase.from('workouts').select('id, session_date')
      .eq('user_id', user.id).not('completed_at', 'is', null)
      .gte('session_date', getWeekStart())
      .order('session_date', { ascending: false }),

    supabase.from('daily_logs')
      .select('log_date, sleep_deep_min, protein_g, fatigue_score, steps, weight_kg')
      .eq('user_id', user.id)
      .gte('log_date', thirtyDaysAgo)
      .order('log_date', { ascending: false }),

    // Séances complétées aujourd'hui (pour l'état 4 cas)
    supabase.from('workouts')
      .select('id, session_name, total_tonnage_kg, total_sets, program_id, completed_at')
      .eq('user_id', user.id).eq('session_date', today)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }),

    // Macros réelles du jour depuis food_logs (nutrition tracker)
    supabase.from('food_logs')
      .select('protein_g, calories, carbs_g, fat_g')
      .eq('user_id', user.id)
      .eq('log_date', today),
  ])

  if (profileError) console.error('[Dashboard] profileError:', profileError.code, profileError.message)

  // Si profil absent → créer et rediriger vers l'onboarding
  if (!profile) {
    await supabase.from('profiles').upsert({
      id: user.id,
      onboarding_done: false,
      goal: 'general',
      level: 'beginner',
      equipment: 'full_gym',
      sessions_per_week: 3,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    redirect('/onboarding')
  }

  if (!profile.onboarding_done) redirect('/onboarding')

  // ── Macros réelles depuis food_logs (priorité sur le check-in manuel) ──
  const foodLogTotals = (todayFoodLogs ?? []).reduce(
    (acc, l) => ({
      calories: acc.calories + (l.calories ?? 0),
      protein_g: acc.protein_g + (l.protein_g ?? 0),
      carbs_g: acc.carbs_g + (l.carbs_g ?? 0),
      fat_g: acc.fat_g + (l.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
  const hasFoodLogs = (todayFoodLogs ?? []).length > 0
  const proteinToday = hasFoodLogs ? Math.round(foodLogTotals.protein_g) : (todayLog?.protein_g ?? null)

  // ── État séance du jour (4 cas) ──────────────────────────────
  const latestTodayWorkout = todayWorkouts?.[0] ?? null
  const programDoneToday = !!(
    latestTodayWorkout?.program_id &&
    profile?.current_program_id &&
    latestTodayWorkout.program_id === profile.current_program_id
  )
  const freeDoneToday = !!latestTodayWorkout && !programDoneToday

  // Suggestion séance depuis le programme actuel
  let suggestion: {
    session_name: string
    program_name: string
    volume_adjustment: string
    adjustment_reason: string
    adaptation_reason: string
  } | null = null

  if (profile?.current_program_id) {
    const { data: program } = await supabase
      .from('programs').select('name, structure').eq('id', profile.current_program_id).single()

    if (program) {
      // Support ancien format (string[]) et nouveau format ({name, exercises}[])
      const rawDays: (string | { name: string; exercises?: unknown[] })[] = program.structure?.days ?? []
      const days: string[] = rawDays.map(d => (typeof d === 'string' ? d : d.name))

      const { data: lastProgramWorkout } = await supabase
        .from('workouts').select('session_name')
        .eq('user_id', user.id).eq('program_id', profile.current_program_id)
        .not('completed_at', 'is', null)
        .order('session_date', { ascending: false }).limit(1).maybeSingle()

      const lastIdx = lastProgramWorkout ? days.indexOf(lastProgramWorkout.session_name) : -1
      const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % days.length : 0
      const nextSession = days[nextIdx] ?? 'Séance libre'

      let volumeAdj = 'normal'
      let adjReason = ''
      let adaptReason = ''

      if (todayLog) {
        if ((todayLog.sleep_deep_min ?? 90) < 60 || (todayLog.fatigue_score ?? 5) >= 8) {
          volumeAdj = 'reduce'
          adjReason = (todayLog.sleep_deep_min ?? 90) < 60 ? 'Sommeil profond insuffisant' : 'Fatigue élevée'
          adaptReason = 'Volume réduit pour optimiser ta récupération'
        } else if ((todayLog.sleep_deep_min ?? 90) > 90 && (todayLog.fatigue_score ?? 5) <= 4) {
          volumeAdj = 'increase'
          adjReason = 'Récupération optimale'
          adaptReason = 'Conditions idéales — repousse tes limites'
        } else {
          adaptReason = 'Récupération normale, séance standard'
        }
      }

      suggestion = {
        session_name: nextSession,
        program_name: program.name,
        volume_adjustment: volumeAdj,
        adjustment_reason: adjReason,
        adaptation_reason: adaptReason,
      }
    }
  }

  // TDEE Mifflin-St Jeor + NEAT
  const w = profile?.weight_kg ?? 75
  const logsWithSteps = (weekLogs ?? []).filter(l => l.steps != null)
  const hasLogsWithSteps = logsWithSteps.length >= 3
  const avgSteps7d = hasLogsWithSteps
    ? Math.round(logsWithSteps.reduce((a, l) => a + (l.steps ?? 0), 0) / logsWithSteps.length)
    : 0

  const bmr = calcBMR(w, profile?.height_cm ?? 175, profile?.age ?? 30, profile?.gender ?? 'male')
  const stepsKcal = hasLogsWithSteps ? calcStepsCalories(avgSteps7d) : 0
  const trainKcal = calcTrainingCalories(0, profile?.sessions_per_week ?? 3)
  const sessionsPerWeek = profile?.sessions_per_week ?? 3
  const multiplier = sessionsPerWeek >= 5 ? 1.725 : sessionsPerWeek >= 3 ? 1.55 : 1.375
  const tdeeCalc = hasLogsWithSteps
    ? bmr + stepsKcal + trainKcal
    : Math.round(bmr * multiplier)

  const targetCaloriesDash = Math.max(1200, tdeeCalc + goalAdjustment(profile?.goal ?? 'general'))
  const autoMacros = calcMacrosFromCalories(targetCaloriesDash, w)

  const proteinTarget = profile?.macro_mode === 'custom' && profile?.custom_protein_g
    ? { min: profile.custom_protein_g, max: profile.custom_protein_g }
    : { min: autoMacros.protein_g, max: autoMacros.protein_g }

  // Cible calorique effective (custom ou auto)
  const calTarget = profile?.macro_mode === 'custom' && profile?.custom_calories
    ? profile.custom_calories
    : targetCaloriesDash
  const calConsumed = hasFoodLogs ? Math.round(foodLogTotals.calories) : 0
  const calRemaining = calTarget - calConsumed
  const calPct = Math.min(100, Math.round((calConsumed / Math.max(1, calTarget)) * 100))

  // Alertes statiques
  const alerts: { type: 'red' | 'yellow' | 'green' | 'blue'; message: string; sub: string }[] = []

  if (todayLog) {
    const deepSleep = todayLog.sleep_deep_min
    const sysBP = todayLog.sys_bp

    if (deepSleep !== null && deepSleep < 60)
      alerts.push({ type: 'yellow', message: '😴 Sommeil profond insuffisant', sub: `${formatSleep(deepSleep)} — réduis le volume d'entraînement de 15-20% aujourd'hui.` })

    if (proteinToday !== null && proteinToday < proteinTarget.min)
      alerts.push({ type: 'yellow', message: '🥩 Protéines en dessous de l\'objectif', sub: `${proteinToday}g — objectif ${proteinTarget.min}g · pense à une source supplémentaire.` })

    if (sysBP !== null && sysBP > 135)
      alerts.push({ type: 'red', message: '🫀 Tension systolique élevée', sub: `${sysBP} mmHg — consulte un médecin si ça persiste.` })
  } else {
    alerts.push({ type: 'blue', message: '📋 Bilan du jour non renseigné', sub: 'Complète ton check-in pour des recommandations personnalisées.' })
  }

  // Indicateur fiabilité EWMA
  const weightDaysCount = (weekLogs ?? []).filter(l => l.weight_kg != null).length
  const ewmaLabel = weightDaysCount < 7
    ? `⚠️ ${weightDaysCount}/7j`
    : weightDaysCount < 14
    ? '📊 En calibration'
    : '✅ Fiable'

  // Streak check-in
  const checkInDates = (weekLogs ?? []).map(l => l.log_date)
  const streak = calcStreak(checkInDates)

  const prenom = profile?.display_name?.split(' ')[0] ?? 'Athlete'
  const sessionsThisWeek = weekWorkouts?.length ?? 0
  const sessionsTarget = profile?.sessions_per_week ?? SESSIONS_TARGET
  const stepsTarget = profile?.steps_goal ?? 8000
  const targetWeightKg = profile?.target_weight_kg ?? null

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      {/* Banner upgrade Stripe (succès/annulation) */}
      <Suspense fallback={null}>
        <UpgradeBanner />
      </Suspense>

      {/* Header */}
      <div className="pt-4 flex items-start justify-between">
        <div>
          <p className="fiq-label">Bonjour</p>
          <h1 className="text-2xl fiq-display mt-0.5" style={{ color: 'var(--fiq-text)' }}>
            {prenom} 👋
          </h1>
          {streak >= 2 && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm">🔥</span>
              <span className="text-xs font-bold" style={{ color: 'var(--fiq-orange)' }}>
                {streak} jours d&apos;affilée
              </span>
            </div>
          )}
        </div>
        <Link href="/profile" className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-black flex-shrink-0"
          style={profile?.avatar_url ? {} : { background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={prenom} className="w-full h-full object-cover" />
            : prenom[0]?.toUpperCase()
          }
        </Link>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => <AlertBar key={i} type={a.type} message={a.message} sub={a.sub} />)}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Poids lissé"
          value={todayLog?.weight_trend ? `${todayLog.weight_trend}` : '—'}
          unit={todayLog?.weight_trend ? 'kg' : ''}
          sub={todayLog?.weight_kg
            ? `Brut : ${todayLog.weight_kg}kg · ${ewmaLabel}`
            : ewmaLabel}
          accent={!!todayLog?.weight_trend}
          trend={todayLog?.weight_trend && todayLog?.weight_kg
            ? todayLog.weight_kg > todayLog.weight_trend ? 'up' : todayLog.weight_kg < todayLog.weight_trend ? 'down' : 'flat'
            : undefined}
        />
        <StatCard
          label="Sommeil profond"
          value={todayLog?.sleep_deep_min != null ? formatSleep(todayLog.sleep_deep_min) : '—'}
          unit=""
          sub={todayLog?.sleep_total_min ? `Total : ${formatSleep(todayLog.sleep_total_min)}` : 'Non renseigné'}
          alert={!!todayLog?.sleep_deep_min && todayLog.sleep_deep_min < 60}
          accent={!!todayLog?.sleep_deep_min && todayLog.sleep_deep_min >= 60}
        />
        <StatCard
          label="Protéines"
          value={proteinToday !== null ? `${proteinToday}` : '—'}
          unit={proteinToday !== null ? 'g' : ''}
          sub={`Objectif : ${proteinTarget.min}g`}
          alert={proteinToday !== null && proteinToday < proteinTarget.min}
          accent={proteinToday !== null && proteinToday >= proteinTarget.min}
        />
        <StatCard
          label="Pas"
          value={todayLog?.steps ? todayLog.steps.toLocaleString('fr-FR') : '—'}
          sub={`Objectif : ${stepsTarget.toLocaleString('fr-FR')}`}
          alert={!!todayLog?.steps && todayLog.steps < stepsTarget * 0.5}
          accent={!!todayLog?.steps && todayLog.steps >= stepsTarget}
        />
      </div>

      {/* Widget Nutrition rapide */}
      <Link href="/nutrition" className="fiq-card block space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4" style={{ color: 'var(--fiq-orange)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--fiq-text)' }}>Nutrition</p>
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--fiq-muted)' }}>Voir tout →</span>
        </div>

        {hasFoodLogs ? (
          <>
            {/* Calories */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-black fiq-data" style={{ color: calRemaining < 0 ? 'var(--fiq-orange)' : 'var(--fiq-accent)' }}>
                  {Math.abs(calRemaining).toLocaleString('fr-FR')}
                  <span className="text-sm font-normal ml-1" style={{ color: 'var(--fiq-muted)' }}>
                    kcal {calRemaining < 0 ? 'dépassé' : 'restantes'}
                  </span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  {calConsumed.toLocaleString('fr-FR')} / {calTarget.toLocaleString('fr-FR')} kcal
                </p>
              </div>
              <span className="text-sm font-black" style={{ color: calPct >= 100 ? 'var(--fiq-orange)' : 'var(--fiq-muted)' }}>
                {calPct}%
              </span>
            </div>

            {/* Barre calories */}
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fiq-faint)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${calPct}%`,
                  background: calPct >= 100 ? 'var(--fiq-orange)' : calPct >= 80 ? 'var(--fiq-accent)' : 'var(--fiq-blue)',
                }}
              />
            </div>

            {/* Mini macros */}
            <div className="flex gap-3">
              {[
                { label: 'P', value: Math.round(foodLogTotals.protein_g), color: 'var(--fiq-accent)' },
                { label: 'G', value: Math.round(foodLogTotals.carbs_g), color: '#A855F7' },
                { label: 'L', value: Math.round(foodLogTotals.fat_g), color: 'var(--fiq-orange)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="text-xs font-black" style={{ color }}>{label}</span>
                  <span className="text-xs font-semibold fiq-data" style={{ color: 'var(--fiq-muted)' }}>{value}g</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Aucun repas enregistré</p>
            <span className="text-xs font-black px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
              + Ajouter
            </span>
          </div>
        )}
      </Link>

      {/* Card séance proposée — 4 cas */}
      <div className="fiq-card space-y-4">

        {programDoneToday && latestTodayWorkout ? (
          /* ── Cas 1 : Séance programme faite aujourd'hui ── */
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="fiq-label">Séance du jour</p>
                <h2 className="text-lg font-black mt-0.5" style={{ color: 'var(--fiq-accent)' }}>
                  ✅ {latestTodayWorkout.session_name}
                </h2>
                {suggestion?.program_name && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{suggestion.program_name}</p>
                )}
              </div>
              <Dumbbell className="w-5 h-5 mt-1" style={{ color: 'var(--fiq-accent)' }} />
            </div>

            {(latestTodayWorkout.total_tonnage_kg != null || latestTodayWorkout.total_sets != null) && (
              <div className="flex items-center gap-6">
                {latestTodayWorkout.total_tonnage_kg != null && (
                  <div>
                    <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                      {latestTodayWorkout.total_tonnage_kg.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>kg soulevés</p>
                  </div>
                )}
                {latestTodayWorkout.total_sets != null && (
                  <div>
                    <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                      {latestTodayWorkout.total_sets}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>séries</p>
                  </div>
                )}
              </div>
            )}

            {suggestion && (
              <div className="text-xs px-3 py-2 rounded-lg font-semibold"
                style={{ background: '#B4FF4A18', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A33' }}>
                📅 Prochaine : {suggestion.session_name}
              </div>
            )}

            <Link
              href="/coach?q=Analyse+ma+séance+d'aujourd'hui+et+donne-moi+des+conseils+de+récupération"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-xs"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Demander au coach
            </Link>
          </>

        ) : freeDoneToday && latestTodayWorkout ? (
          /* ── Cas 2 : Séance libre faite, programme non effectué ── */
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="fiq-label">Séance du jour</p>
                <h2 className="text-lg font-black mt-0.5" style={{ color: 'var(--fiq-text)' }}>
                  {latestTodayWorkout.session_name}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  {latestTodayWorkout.session_name === 'Jour de repos' ? 'Repos enregistré' : 'Séance libre effectuée'}
                </p>
              </div>
              {(latestTodayWorkout.session_name === 'Jour de repos' || (latestTodayWorkout.total_sets ?? 0) === 0) && (
                <CancelWorkoutButton workoutId={latestTodayWorkout.id} label="Annuler" />
              )}
            </div>

            {(latestTodayWorkout.total_tonnage_kg != null || latestTodayWorkout.total_sets != null) && (
              <div className="flex items-center gap-6">
                {latestTodayWorkout.total_tonnage_kg != null && (
                  <div>
                    <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                      {latestTodayWorkout.total_tonnage_kg.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>kg soulevés</p>
                  </div>
                )}
                {latestTodayWorkout.total_sets != null && (
                  <div>
                    <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                      {latestTodayWorkout.total_sets}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>séries</p>
                  </div>
                )}
              </div>
            )}

            {suggestion && (
              <div className="text-xs px-3 py-2 rounded-lg"
                style={{ background: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B44' }}>
                ⚠️ Séance programme non effectuée :{' '}
                <span className="font-black">{suggestion.session_name}</span>
              </div>
            )}

            <div className="flex gap-2">
              {suggestion && (
                <Link
                  href="/workout"
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-black text-xs"
                  style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  {suggestion.session_name}
                </Link>
              )}
              <Link
                href="/coach?q=Analyse+mon+dashboard+et+dis-moi+ce+que+je+dois+améliorer"
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-xs"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Coach
              </Link>
            </div>
          </>

        ) : (
          /* ── Cas 3 : Rien fait aujourd'hui ── */
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="fiq-label">Séance du jour</p>
                <h2 className="text-lg font-black mt-0.5" style={{ color: 'var(--fiq-text)' }}>
                  {suggestion?.session_name ?? 'Séance libre'}
                </h2>
                {suggestion?.program_name && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{suggestion.program_name}</p>
                )}
              </div>
              <Dumbbell className="w-5 h-5 mt-1" style={{ color: 'var(--fiq-accent)' }} />
            </div>

            {suggestion?.adaptation_reason && !suggestion?.adjustment_reason && (
              <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                💡 {suggestion.adaptation_reason}
              </p>
            )}

            {suggestion?.volume_adjustment === 'reduce' && (
              <div className="text-xs px-3 py-2 rounded-lg font-semibold"
                style={{ background: '#FF6B3518', color: 'var(--fiq-orange)', border: '1px solid #FF6B3544' }}>
                ⚠️ Volume réduit — {suggestion.adjustment_reason}
              </div>
            )}
            {suggestion?.volume_adjustment === 'increase' && (
              <div className="text-xs px-3 py-2 rounded-lg space-y-0.5"
                style={{ background: '#3D8BFF18', color: 'var(--fiq-blue)', border: '1px solid #3D8BFF44' }}>
                <p className="font-black">⚡ {suggestion.adjustment_reason}</p>
                <p style={{ opacity: 0.75 }}>{suggestion.adaptation_reason}</p>
              </div>
            )}

            <Link
              href="/workout"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-sm transition-all"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              <Dumbbell className="w-4 h-4" />
              Démarrer la séance
            </Link>

            <Link
              href="/coach?q=Analyse+mon+dashboard+et+dis-moi+ce+que+je+dois+améliorer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-xs transition-all"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Demander au coach
            </Link>

            {lastWorkout && (
              <p className="text-xs text-center" style={{ color: 'var(--fiq-muted)' }}>
                Dernière : {lastWorkout.session_name} ·{' '}
                {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(lastWorkout.session_date))}
                {lastWorkout.total_tonnage_kg ? ` · ${lastWorkout.total_tonnage_kg.toLocaleString('fr-FR')}kg` : ''}
              </p>
            )}
          </>
        )}
      </div>

      {/* Objectifs semaine */}
      <div className="fiq-card space-y-4">
        <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Cette semaine</p>

        <ProgressBar
          value={sessionsThisWeek}
          max={sessionsTarget}
          color="var(--fiq-accent)"
          label={`Séances : ${sessionsThisWeek}/${sessionsTarget}`}
          showPercent
        />
        <ProgressBar
          value={proteinToday ?? 0}
          max={proteinTarget.max}
          color="var(--fiq-accent)"
          label={`Protéines : ${proteinToday ?? 0}g / ${proteinTarget.min}g`}
        />
        <ProgressBar
          value={todayLog?.steps ?? 0}
          max={stepsTarget}
          color="var(--fiq-blue)"
          label={`Pas : ${(todayLog?.steps ?? 0).toLocaleString('fr-FR')}/${stepsTarget.toLocaleString('fr-FR')}`}
        />
        {targetWeightKg && todayLog?.weight_trend && Math.abs((profile?.weight_kg ?? todayLog.weight_trend) - targetWeightKg) > 0 && (
          <ProgressBar
            value={Math.max(0, Math.abs((profile?.weight_kg ?? todayLog.weight_trend) - targetWeightKg) - Math.abs(todayLog.weight_trend - targetWeightKg))}
            max={Math.abs((profile?.weight_kg ?? todayLog.weight_trend) - targetWeightKg)}
            color={targetWeightKg < (profile?.weight_kg ?? todayLog.weight_trend) ? 'var(--fiq-orange)' : 'var(--fiq-blue)'}
            label={`Poids cible : ${todayLog.weight_trend}kg → ${targetWeightKg}kg (${Math.abs(todayLog.weight_trend - targetWeightKg).toFixed(1)}kg restants)`}
          />
        )}
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/checkin" className="fiq-card flex items-center gap-3">
          <ClipboardList className="w-5 h-5" style={{ color: 'var(--fiq-blue)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Check-in</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{todayLog ? 'Mis à jour ✓' : 'Non renseigné'}</p>
          </div>
        </Link>
        <Link href="/progress" className="fiq-card flex items-center gap-3">
          <TrendingUp className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Progression</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Voir mes stats</p>
          </div>
        </Link>
        <Link href="/exercises" className="fiq-card flex items-center gap-3">
          <Dumbbell className="w-5 h-5" style={{ color: 'var(--fiq-orange)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Exercices</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>230+ exercices</p>
          </div>
        </Link>
        <Link href="/programs" className="fiq-card flex items-center gap-3">
          <ClipboardList className="w-5 h-5" style={{ color: '#A855F7' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Programmes</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Guidés & custom</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const unique = [...new Set(dates)].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  let streak = 0
  let expected = today
  for (const d of unique) {
    if (d === expected) {
      streak++
      const prev = new Date(expected)
      prev.setDate(prev.getDate() - 1)
      expected = prev.toISOString().split('T')[0]
    } else {
      break
    }
  }
  return streak
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}
