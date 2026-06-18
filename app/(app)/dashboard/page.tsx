import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { AlertBar } from '@/components/ui/AlertBar'
import { StatCard } from '@/components/ui/StatCard'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { UpgradeBanner } from '@/components/dashboard/UpgradeBanner'
import { CancelWorkoutButton } from '@/components/dashboard/CancelWorkoutButton'
import { formatSleep } from '@/lib/formatSleep'
import { Dumbbell, TrendingUp, ClipboardList, MessageCircle, Utensils, Users, BarChart2, CalendarDays, Zap } from 'lucide-react'
import { FiqBreakfast, FiqLunch, FiqDinner, FiqSnack, FiqStreak, FiqAlert, FiqCheck } from '@/components/ui/FiqIcons'
import { calcDailyTarget } from '@/lib/utils/tdee'
import { VolumeHebdoWidget } from '@/components/dashboard/VolumeHebdoWidget'
import { RecoveryScoreCard } from '@/components/dashboard/RecoveryScoreCard'

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
    { data: pausedWorkoutRow },
    { data: recentWorkoutsFor60d },
  ] = await Promise.all([
    supabase.from('profiles')
      .select('display_name, goal, level, current_program_id, onboarding_done, sessions_per_week, weight_kg, height_cm, age, gender, macro_mode, custom_protein_g, custom_calories, custom_carbs_g, custom_fat_g, steps_goal, target_weight_kg, avatar_url, checkin_streak, training_streak_weeks')
      .eq('id', user.id).maybeSingle(),

    supabase.from('daily_logs').select('*')
      .eq('user_id', user.id).eq('log_date', today).maybeSingle(),

    supabase.from('workouts').select('session_name, session_date, total_tonnage_kg, total_sets')
      .eq('user_id', user.id).not('completed_at', 'is', null)
      .order('session_date', { ascending: false }).limit(1).maybeSingle(),

    // Séances réelles de la semaine — jours de repos exclus du compteur
    supabase.from('workouts').select('id, session_date, session_name')
      .eq('user_id', user.id).not('completed_at', 'is', null)
      .gte('session_date', getWeekStart())
      .not('session_name', 'in', '("Jour de repos","Repos actif","Repos complet")')
      .order('session_date', { ascending: false }),

    supabase.from('daily_logs')
      .select('log_date, sleep_deep_min, protein_g, fatigue_score, steps, weight_kg, weight_trend')
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
      .select('protein_g, calories, carbs_g, fat_g, meal_type')
      .eq('user_id', user.id)
      .eq('log_date', today),

    // Séance en pause : démarrée aujourd'hui, non terminée — mode pause
    supabase.from('workouts')
      .select('id, session_name, started_at, draft_state')
      .eq('user_id', user.id)
      .eq('session_date', today)
      .is('completed_at', null)
      .not('started_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Séances 60 derniers jours avec started_at — pour le créneau optimal
    supabase.from('workouts')
      .select('started_at, total_tonnage_kg')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .not('started_at', 'is', null)
      .gte('session_date', new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0])
      .not('session_name', 'in', '("Jour de repos","Repos actif","Repos complet")')
      .neq('workout_type', 'cardio'),
  ])

  if (profileError) console.error('[Dashboard] profileError:', profileError.code, profileError.message)

  // Erreur DB réelle (pas "ligne introuvable") → déclenche error.tsx avec bouton Réessayer
  // Évite la boucle dashboard→onboarding→dashboard quand le réseau est lent/coupé
  if (profileError) {
    throw new Error(`Erreur réseau — impossible de charger ton profil. (${profileError.code ?? profileError.message})`)
  }

  // Profil absent pour de vrai → créer et rediriger vers l'onboarding
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

  // Types de repas logués aujourd'hui — pour les indicateurs du widget nutrition
  const loggedMealTypes = new Set((todayFoodLogs ?? []).map(l => (l as { meal_type?: string }).meal_type).filter(Boolean))

  // ── Séance en pause — infos du draft ────────────────────────
  type PausedWorkout = {
    id: string
    session_name: string | null
    started_at: string | null
    draft_state: { groups?: { sets?: { is_warmup?: boolean }[] }[]; saved_at?: string } | null
  }
  const paused = pausedWorkoutRow as PausedWorkout | null
  const pausedDraft = paused?.draft_state ?? null
  const pausedExerciseCount = pausedDraft?.groups?.length ?? 0
  const pausedSetCount = pausedDraft?.groups?.reduce(
    (acc: number, g: { sets?: { is_warmup?: boolean }[] }) =>
      acc + (g.sets?.filter(s => !s.is_warmup).length ?? 0), 0
  ) ?? 0
  // Durée écoulée depuis le démarrage (en minutes)
  const pausedStartedAt = paused?.started_at ?? null
  const pausedElapsedMin = pausedStartedAt
    ? Math.floor((Date.now() - new Date(pausedStartedAt).getTime()) / 60000)
    : null
  const pausedElapsedLabel = pausedElapsedMin === null ? null
    : pausedElapsedMin < 1
      ? 'À l\'instant'
      : pausedElapsedMin < 60
      ? `il y a ${pausedElapsedMin} min`
      : `il y a ${Math.floor(pausedElapsedMin / 60)}h${pausedElapsedMin % 60 > 0 ? `${pausedElapsedMin % 60}min` : ''}`

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
    days: string[]
  } | null = null

  if (profile?.current_program_id) {
    const { data: program } = await supabase
      .from('programs').select('name, structure').eq('id', profile.current_program_id).maybeSingle()

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
        days,
      }
    }
  }

  // ── Cible calorique dynamique du jour — source unique via calcDailyTarget ──
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const yesterdaySteps = (weekLogs ?? []).find(l => l.log_date === yesterday)?.steps ?? null

  // Moyenne steps 30 derniers jours (journées COMPLÈTES = exclut aujourd'hui, exclut 0)
  // Source stable — évite le bug TDEE avec steps partiels du jour ou du matin
  const logsWithSteps = (weekLogs ?? []).filter(l => l.log_date !== today && (l.steps ?? 0) > 0)
  const avgSteps30d = logsWithSteps.length >= 3
    ? Math.round(logsWithSteps.reduce((acc, l) => acc + (l.steps ?? 0), 0) / logsWithSteps.length)
    : null

  // Détection jour de repos (aucune séance réelle aujourd'hui)
  const isRestDay = !latestTodayWorkout ||
    ['Jour de repos', 'Repos actif', 'Repos complet'].includes(latestTodayWorkout.session_name ?? '')

  // Tonnage de la dernière séance réelle (pour déficit = 0 si post-séance très lourde)
  const recentHeavyTonnage = lastWorkout?.total_tonnage_kg ?? null

  const dailyTarget = calcDailyTarget({
    weight_kg:         profile?.weight_kg,
    height_cm:         profile?.height_cm,
    age:               profile?.age,
    gender:            profile?.gender,
    goal:              profile?.goal,
    sessions_per_week: profile?.sessions_per_week,
    macro_mode:        profile?.macro_mode,
    custom_calories:   profile?.custom_calories,
    custom_protein_g:  profile?.custom_protein_g,
    custom_carbs_g:    profile?.custom_carbs_g,
    custom_fat_g:      profile?.custom_fat_g,
    avgSteps30d,
    todaySteps:          todayLog?.steps                         ?? null,
    yesterdaySteps,
    todayWorkoutTonnage: latestTodayWorkout?.total_tonnage_kg    ?? null,
    todayWorkoutSets:    latestTodayWorkout?.total_sets          ?? null,
    todayWorkoutName:    latestTodayWorkout?.session_name        ?? null,
    isRestDay,
    recentHeavyTonnage,
  })

  const proteinTarget = { min: dailyTarget.macros.protein_g, max: dailyTarget.macros.protein_g }
  const calTarget     = dailyTarget.targetCalories
  const calConsumed   = hasFoodLogs ? Math.round(foodLogTotals.calories) : 0
  const calRemaining  = calTarget - calConsumed
  const calPct        = Math.min(100, Math.round((calConsumed / Math.max(1, calTarget)) * 100))

  // Alertes statiques
  const alerts: { type: 'red' | 'yellow' | 'green' | 'blue'; message: string; sub: string }[] = []

  if (todayLog) {
    const deepSleep = todayLog.sleep_deep_min
    const sysBP = todayLog.sys_bp

    if (deepSleep !== null && deepSleep < 60)
      alerts.push({ type: 'yellow', message: 'Sommeil profond insuffisant', sub: `${formatSleep(deepSleep)} — réduis le volume d'entraînement de 15-20% aujourd'hui.` })

    if (proteinToday !== null && proteinToday < proteinTarget.min)
      alerts.push({ type: 'yellow', message: 'Protéines en dessous de l\'objectif', sub: `${proteinToday}g — objectif ${proteinTarget.min}g · pense à une source supplémentaire.` })

    if (sysBP !== null && sysBP > 135)
      alerts.push({ type: 'red', message: 'Tension systolique élevée', sub: `${sysBP} mmHg — consulte un médecin si ça persiste.` })
  } else {
    alerts.push({ type: 'blue', message: 'Bilan du jour non renseigné', sub: 'Complète ton check-in pour des recommandations personnalisées.' })
  }

  // Alerte déficit trop agressif après séance lourde (> 25 000 kg)
  if (hasFoodLogs &&
      (dailyTarget.todayWorkoutTonnage ?? 0) > 25000 &&
      calRemaining < 500) {
    const toEat = Math.max(300, Math.round((800 - calRemaining) / 100) * 100)
    const tonnageLabel = dailyTarget.todayWorkoutTonnage
      ? `${(dailyTarget.todayWorkoutTonnage / 1000).toFixed(1)}t`
      : ''
    alerts.push({
      type: 'yellow',
      message: 'Déficit trop agressif post-séance lourde',
      sub: `Tu as soulevé ${tonnageLabel} aujourd'hui (+${dailyTarget.workoutKcal} kcal dépensées). Mange encore ~${toEat} kcal ce soir pour préserver ta masse musculaire.`,
    })
  }

  // Indicateur fiabilité EWMA
  const weightDaysCount = (weekLogs ?? []).filter(l => l.weight_kg != null).length
  const ewmaLabel = weightDaysCount < 7
    ? `${weightDaysCount}/7j`
    : weightDaysCount < 14
    ? 'En calibration'
    : 'Fiable'

  // ── Score de récupération composite 0–10 ────────────────────────────────────
  // Calcul uniquement si check-in du jour disponible
  let recoveryScore: number | null = null
  let recoveryLabel = ''
  let recoveryLimitingFactor = ''
  // Points de détail pour la modale breakdown
  let recoveryBreakdown = { deepSleepPts: 0, totalSleepPts: 0, fatiguePts: 0, stepsPts: 0, moodPts: 0, ewmaPts: 0 }

  if (todayLog) {
    let pts = 0

    // Sommeil profond (max 1.5 pts)
    const deepSleepMin = todayLog.sleep_deep_min ?? null
    let deepSleepPts = 0
    if (deepSleepMin !== null) {
      if (deepSleepMin >= 90) deepSleepPts = 1.5
      else if (deepSleepMin >= 60) deepSleepPts = 1
    }
    pts += deepSleepPts

    // Sommeil total (max 2 pts)
    const sleepTotal = todayLog.sleep_total_min ?? null
    let totalSleepPts = 0
    if (sleepTotal !== null) {
      if (sleepTotal >= 420) totalSleepPts = 2
      else if (sleepTotal >= 360) totalSleepPts = 1
    }
    pts += totalSleepPts

    // Fatigue inversée (max 2 pts) — fatigue_score 1-10, 1=plein d'énergie, 10=épuisé
    const fatigue = todayLog.fatigue_score ?? null
    let fatiguePts = 0
    if (fatigue !== null) {
      if (fatigue <= 2) fatiguePts = 2
      else if (fatigue <= 5) fatiguePts = 1
    }
    pts += fatiguePts

    // Pas vs objectif (max 1.5 pts)
    const steps = todayLog.steps ?? null
    const stepsGoal = profile?.steps_goal ?? 8000
    let stepsPts = 0
    if (steps !== null && stepsGoal > 0) {
      const ratio = steps / stepsGoal
      if (ratio >= 1) stepsPts = 1.5
      else if (ratio >= 0.7) stepsPts = 1
    }
    pts += stepsPts

    // Humeur (max 1 pt)
    const mood = (todayLog as { motivation_score?: number | null }).motivation_score ?? null
    let moodPts = 0
    if (mood !== null) {
      if (mood >= 7) moodPts = 1
      else if (mood >= 5) moodPts = 0.5
    }
    pts += moodPts

    // Poids EWMA stable vs veille (max 1 pt) — compare EWMA J vs EWMA J-1
    const todayTrend = todayLog.weight_trend ?? null
    let ewmaPts = 0
    if (todayTrend !== null) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const prevDayLog = (weekLogs ?? []).find(l => l.log_date === yesterday)
      // Utilise weight_trend (EWMA) du log précédent, pas le poids brut
      const prevDayTrend = (prevDayLog as { weight_trend?: number | null } | undefined)?.weight_trend ?? null
      if (prevDayTrend !== null && Math.abs(todayTrend - prevDayTrend) < 0.5) ewmaPts = 1
    } else if ((todayLog.weight_kg ?? null) !== null) {
      ewmaPts = 0.5 // Données partielles → bonus partiel
    }
    pts += ewmaPts

    recoveryBreakdown = { deepSleepPts, totalSleepPts, fatiguePts, stepsPts, moodPts, ewmaPts }
    recoveryScore = Math.min(10, Math.max(0, Math.round((pts / 9) * 10)))

    if (recoveryScore >= 7) {
      recoveryLabel = 'Optimale'
    } else if (recoveryScore >= 5) {
      recoveryLabel = 'Correcte'
    } else {
      recoveryLabel = 'Limitée'
    }

    // Facteur limitant principal
    if (deepSleepMin !== null && deepSleepMin < 60) {
      recoveryLimitingFactor = 'Sommeil profond insuffisant'
    } else if (sleepTotal !== null && sleepTotal < 360) {
      recoveryLimitingFactor = 'Durée de sommeil insuffisante'
    } else if (fatigue !== null && fatigue > 7) {
      recoveryLimitingFactor = 'Fatigue élevée'
    } else if (steps !== null && steps < (stepsGoal ?? 8000) * 0.5) {
      recoveryLimitingFactor = 'Activité physique faible'
    } else if (mood !== null && mood < 5) {
      recoveryLimitingFactor = 'Humeur basse'
    }
  }

  // ── Streak check-in — valeur persistante (profiles) en priorité, fallback calcul 30j
  const checkInDates = (weekLogs ?? []).map(l => l.log_date)
  const streakCalc = calcStreak(checkInDates)
  const streak = (profile?.checkin_streak ?? 0) > streakCalc
    ? (profile?.checkin_streak ?? 0)
    : streakCalc
  const trainingStreakWeeks = profile?.training_streak_weeks ?? 0

  // ── Créneau optimal d'entraînement ────────────────────────────────────────
  // Calcul uniquement si >= 5 séances dans les 60 jours avec started_at
  let optimalWindow: { slot: string; days: string } | null = null
  {
    const workoutsWithTime = (recentWorkoutsFor60d ?? []).filter(
      (w): w is { started_at: string; total_tonnage_kg: number | null } =>
        typeof w.started_at === 'string'
    )
    if (workoutsWithTime.length >= 5) {
      // Percentile 66 du tonnage — garder les séances dans le tiers supérieur
      const tonnages = workoutsWithTime
        .map(w => w.total_tonnage_kg ?? 0)
        .sort((a, b) => a - b)
      const p66Index = Math.floor(tonnages.length * 0.66)
      const p66Threshold = tonnages[p66Index] ?? 0

      const topWorkouts = workoutsWithTime.filter(
        w => (w.total_tonnage_kg ?? 0) >= p66Threshold && (w.total_tonnage_kg ?? 0) > 0
      )

      if (topWorkouts.length >= 3) {
        // Tranches de 2h : comptage par slot
        const slotCounts: Record<string, number> = {}
        const slotDays: Record<string, Record<number, number>> = {}

        for (const w of topWorkouts) {
          const d = new Date(w.started_at)
          const hour = d.getHours()
          const slotStart = Math.floor(hour / 2) * 2
          const slotKey = `${slotStart}h–${slotStart + 2}h`
          slotCounts[slotKey] = (slotCounts[slotKey] ?? 0) + 1

          // Compter les jours de la semaine (0=dim, 1=lun, …)
          const dow = d.getDay()
          if (!slotDays[slotKey]) slotDays[slotKey] = {}
          slotDays[slotKey][dow] = (slotDays[slotKey][dow] ?? 0) + 1
        }

        // Slot dominant
        const dominantSlot = Object.entries(slotCounts).sort((a, b) => b[1] - a[1])[0]
        if (dominantSlot) {
          const [slot, count] = dominantSlot
          // Afficher uniquement si ce slot représente >= 25% des séances top
          if (count / topWorkouts.length >= 0.25) {
            const FR_DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
            const dowMap = slotDays[slot] ?? {}
            const topDows = Object.entries(dowMap)
              .sort((a, b) => Number(b[1]) - Number(a[1]))
              .slice(0, 2)
              .map(([d]) => FR_DAYS[Number(d)])
            const daysStr = topDows.length > 0 ? topDows.join('/') : ''
            optimalWindow = { slot, days: daysStr }
          }
        }
      }
    }
  }

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
            {prenom}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {streak >= 2 && (
              <div className="flex items-center gap-1.5">
                <FiqStreak size={14} style={{ color: 'var(--fiq-orange)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--fiq-orange)' }}>
                  {streak}j check-in
                </span>
              </div>
            )}
            {trainingStreakWeeks >= 2 && (
              <div className="flex items-center gap-1.5">
                <Dumbbell size={13} style={{ color: 'var(--fiq-blue)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--fiq-blue)' }}>
                  {trainingStreakWeeks} sem. d&apos;affilée
                </span>
              </div>
            )}
          </div>
        </div>
        <Link href="/profile" className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-black flex-shrink-0"
          style={profile?.avatar_url ? {} : { background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          {profile?.avatar_url
            ? <Image src={profile.avatar_url} alt={prenom} fill className="object-cover" sizes="36px" />
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

      {/* Score de récupération composite */}
      {recoveryScore !== null ? (
        <RecoveryScoreCard
          score={recoveryScore}
          label={recoveryLabel}
          limitingFactor={recoveryLimitingFactor}
          breakdown={recoveryBreakdown}
        />
      ) : (
        <Link href="/checkin" className="fiq-card flex items-center gap-3" style={{ borderStyle: 'dashed' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
            <span className="text-lg">🩺</span>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Score de récupération</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Fais ton check-in pour voir ton score</p>
          </div>
        </Link>
      )}

      {/* Alerte récupération faible */}
      {recoveryScore !== null && recoveryScore < 4 && (
        <AlertBar
          type="red"
          message="Repos recommandé aujourd'hui"
          sub="Score de récupération faible — privilégie un repos actif ou une séance légère."
        />
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

      {/* Volume hebdomadaire par groupe musculaire */}
      <VolumeHebdoWidget />

      {/* Créneau optimal d'entraînement — masqué si données insuffisantes */}
      {optimalWindow && (
        <div
          className="fiq-card flex items-center gap-3 py-3"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#B4FF4A18', border: '1px solid #B4FF4A33' }}
          >
            <Zap className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--fiq-muted)' }}>
              Ton meilleur créneau
            </p>
            <p className="text-sm font-black mt-0.5" style={{ color: 'var(--fiq-text)' }}>
              {optimalWindow.days && <span style={{ color: 'var(--fiq-accent)' }}>{optimalWindow.days} · </span>}
              {optimalWindow.slot}
            </p>
          </div>
          <p className="text-[10px] text-right flex-shrink-0" style={{ color: 'var(--fiq-muted)' }}>
            60 derniers jours
          </p>
        </div>
      )}

      {/* Widget Nutrition rapide */}
      <Link href="/nutrition" className="fiq-card block space-y-3">

        {/* Header : titre + indicateurs repas + lien */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4" style={{ color: 'var(--fiq-orange)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--fiq-text)' }}>Nutrition</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Indicateurs repas — actif = coloré, non loggé = grisé */}
            <div className="flex items-center gap-0.5">
              {[
                { type: 'breakfast', Icon: FiqBreakfast, color: 'var(--fiq-accent)' },
                { type: 'lunch',     Icon: FiqLunch,     color: 'var(--fiq-yellow)' },
                { type: 'dinner',    Icon: FiqDinner,    color: 'var(--fiq-blue)'   },
                { type: 'snack',     Icon: FiqSnack,     color: 'var(--fiq-orange)' },
              ].map(({ type, Icon, color }) => (
                <span
                  key={type}
                  className="leading-none"
                  style={{ opacity: loggedMealTypes.has(type) ? 1 : 0.18 }}
                  title={type}
                >
                  <Icon size={15} style={{ color }} />
                </span>
              ))}
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--fiq-muted)' }}>Voir tout →</span>
          </div>
        </div>

        {hasFoodLogs ? (
          <>
            {/* Calories restantes */}
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
              <span
                className="text-sm font-black px-2 py-0.5 rounded-lg"
                style={{
                  background: calPct >= 100 ? '#FF6B3520' : '#B4FF4A15',
                  color: calPct >= 100 ? 'var(--fiq-orange)' : 'var(--fiq-accent)',
                }}
              >
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

            {/* Barres macro P / G / L */}
            <div className="space-y-2">
              {([
                { label: 'Protéines', consumed: Math.round(foodLogTotals.protein_g), target: dailyTarget.macros.protein_g, color: 'var(--fiq-accent)' },
                { label: 'Glucides',  consumed: Math.round(foodLogTotals.carbs_g),   target: dailyTarget.macros.carbs_g,   color: '#A855F7' },
                { label: 'Lipides',   consumed: Math.round(foodLogTotals.fat_g),      target: dailyTarget.macros.fat_g,     color: 'var(--fiq-orange)' },
              ] as const).map(({ label, consumed, target, color }) => {
                const pct = Math.min(100, target > 0 ? Math.round((consumed / target) * 100) : 0)
                return (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--fiq-muted)' }}>
                        {label}
                      </span>
                      <span className="text-[11px] font-bold fiq-data" style={{ color: pct >= 100 ? color : 'var(--fiq-muted)' }}>
                        {consumed}<span className="font-normal">/{target}g</span>
                      </span>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--fiq-faint)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: color, opacity: pct >= 100 ? 1 : 0.65 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* TDEE compact — une seule ligne */}
            {!dailyTarget.isCustom && (
              <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--fiq-muted)' }}>
                <BarChart2 className="w-3 h-3 shrink-0" />
                {dailyTarget.usedFallback
                  ? `Estimé : ${dailyTarget.tdee.toLocaleString('fr-FR')} kcal`
                  : (
                    <>
                      {dailyTarget.bmr} BMR
                      {dailyTarget.stepsKcal > 0 && ` + ${dailyTarget.stepsKcal} pas`}
                      {dailyTarget.workoutKcal > 0 && ` + ${dailyTarget.workoutKcal} séance`}
                      {' = '}<span className="font-semibold">{dailyTarget.tdee.toLocaleString('fr-FR')} kcal</span>
                    </>
                  )
                }
                {dailyTarget.adjustment !== 0 && (
                  <span style={{ color: dailyTarget.adjustment > 0 ? 'var(--fiq-blue)' : 'var(--fiq-orange)' }}>
                    {dailyTarget.adjustment > 0 ? ` +${dailyTarget.adjustment}` : ` −${Math.abs(dailyTarget.adjustment)}`}
                  </span>
                )}
                {' → '}<span className="font-semibold">{dailyTarget.targetCalories.toLocaleString('fr-FR')} kcal cibles</span>
              </p>
            )}
          </>
        ) : (
          /* État vide — aucun repas loggé */
          <div className="space-y-2">
            <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
              Objectif : <span className="font-bold" style={{ color: 'var(--fiq-text)' }}>{calTarget.toLocaleString('fr-FR')} kcal</span>
              {' · '}{dailyTarget.macros.protein_g}g P · {dailyTarget.macros.carbs_g}g G · {dailyTarget.macros.fat_g}g L
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Aucun repas enregistré</span>
              <span className="text-xs font-black px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
                + Ajouter
              </span>
            </div>
          </div>
        )}
      </Link>

      {/* Card séance proposée — 5 cas (pause + 4 originaux) */}
      <div className="fiq-card space-y-4">

        {/* Banner check-in recommandé — visible si pas de check-in ET pas de séance active */}
        {!todayLog && !latestTodayWorkout && !pausedWorkoutRow && (
          <Link
            href="/checkin"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: '#3D8BFF12', border: '1px solid #3D8BFF33' }}
          >
            <ClipboardList className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-blue)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: 'var(--fiq-blue)' }}>Check-in recommandé</p>
              <p className="text-[11px]" style={{ color: 'var(--fiq-muted)' }}>Pour adapter le volume à ta fatigue du jour</p>
            </div>
            <span className="text-xs font-black px-2 py-1 rounded-lg flex-shrink-0"
              style={{ background: 'var(--fiq-blue)', color: 'var(--bg)' }}>
              Faire →
            </span>
          </Link>
        )}

        {pausedWorkoutRow ? (
          /* ── Cas 0 : Séance en pause — non terminée aujourd'hui ── */
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="fiq-label">Séance en pause</p>
                <h2 className="text-lg font-black mt-0.5" style={{ color: 'var(--fiq-yellow)' }}>
                  ⏸ {paused?.session_name ?? 'Séance'}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  {pausedElapsedLabel ?? 'Interrompue'}
                  {pausedExerciseCount > 0 && ` · ${pausedExerciseCount} exercice${pausedExerciseCount > 1 ? 's' : ''}`}
                  {pausedSetCount > 0 && `, ${pausedSetCount} série${pausedSetCount > 1 ? 's' : ''} effectuée${pausedSetCount > 1 ? 's' : ''}`}
                </p>
              </div>
              <span className="text-2xl">⏸</span>
            </div>

            {/* Barre de progression visuelle */}
            {pausedSetCount > 0 && (
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: '#F59E0B15', border: '1px solid #F59E0B33' }}
              >
                <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>
                  {pausedSetCount} série{pausedSetCount > 1 ? 's' : ''} sauvegardée{pausedSetCount > 1 ? 's' : ''}
                </span>
                <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>— reprends où tu t&apos;es arrêté</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Link
                href={`/workout/${paused?.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
              >
                ▶ Reprendre la séance
              </Link>
              <CancelWorkoutButton workoutId={paused?.id ?? ''} label="Abandonner" />
            </div>
          </>

        ) : programDoneToday && latestTodayWorkout ? (
          /* ── Cas 1 : Séance programme faite aujourd'hui ── */
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="fiq-label">Séance du jour</p>
                <h2 className="text-lg font-black mt-0.5" style={{ color: 'var(--fiq-accent)' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <FiqCheck size={18} style={{ color: 'var(--fiq-accent)' }} />
                    {latestTodayWorkout.session_name}
                  </span>
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
              <div className="text-xs px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5"
                style={{ background: '#B4FF4A18', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A33' }}>
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                Prochaine : {suggestion.session_name}
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
              <div className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
                style={{ background: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B44' }}>
                <FiqAlert size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
                Séance programme non effectuée :{' '}
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
                {suggestion.adaptation_reason}
              </p>
            )}

            {suggestion?.volume_adjustment === 'reduce' && (
              <div className="text-xs px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5"
                style={{ background: '#FF6B3518', color: 'var(--fiq-orange)', border: '1px solid #FF6B3544' }}>
                <FiqAlert size={13} style={{ color: 'var(--fiq-orange)', flexShrink: 0 }} />
                Volume réduit — {suggestion.adjustment_reason}
              </div>
            )}
            {suggestion?.volume_adjustment === 'increase' && (
              <div className="text-xs px-3 py-2 rounded-lg space-y-0.5"
                style={{ background: '#3D8BFF18', color: 'var(--fiq-blue)', border: '1px solid #3D8BFF44' }}>
                <p className="font-black flex items-center gap-1.5"><Zap className="w-3 h-3 shrink-0" />{suggestion.adjustment_reason}</p>
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
                {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(lastWorkout.session_date + 'T12:00:00'))}
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
          label={`Protéines aujourd'hui : ${proteinToday ?? 0}g / ${proteinTarget.min}g`}
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

      {/* Vue semaine programme en cours */}
      {suggestion && suggestion.days.length > 0 && (
        <div className="fiq-card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>
              {suggestion.program_name}
            </p>
            <Link href="/programs" className="text-xs font-semibold" style={{ color: 'var(--fiq-muted)' }}>
              Voir →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestion.days.map((day, i) => {
              const isDone = (weekWorkouts ?? []).some(w => w.session_name === day)
              const isNext = !programDoneToday && day === suggestion!.session_name
              return (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: isDone ? '#B4FF4A18' : isNext ? '#3D8BFF18' : 'var(--fiq-faint)',
                    border: `1px solid ${isDone ? '#B4FF4A55' : isNext ? '#3D8BFF55' : 'var(--fiq-border)'}`,
                    color: isDone ? 'var(--fiq-accent)' : isNext ? 'var(--fiq-blue)' : 'var(--fiq-muted)',
                  }}
                >
                  {isDone ? '✓ ' : isNext ? '→ ' : ''}{day}
                </span>
              )
            })}
          </div>
        </div>
      )}

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
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>1000+ exercices</p>
          </div>
        </Link>
        <Link href="/programs" className="fiq-card flex items-center gap-3">
          <ClipboardList className="w-5 h-5" style={{ color: '#A855F7' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Programmes</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Guidés & custom</p>
          </div>
        </Link>
        <Link href="/coach" className="fiq-card flex items-center gap-3">
          <MessageCircle className="w-5 h-5" style={{ color: 'var(--fiq-blue)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Coach IA</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Poser une question</p>
          </div>
        </Link>
        <Link href="/social/explorer" className="fiq-card flex items-center gap-3 col-span-2"
          style={{ background: '#B4FF4A08', borderColor: '#B4FF4A25' }}>
          <Users className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Communauté</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Voir les séances de la communauté</p>
          </div>
          <span className="text-xs font-black px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
            Explorer →
          </span>
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
