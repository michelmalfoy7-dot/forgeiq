import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { unstable_cache } from 'next/cache'
import { AlertBar } from '@/components/ui/AlertBar'
import { StatCard } from '@/components/ui/StatCard'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { UpgradeBanner } from '@/components/dashboard/UpgradeBanner'
import { CancelWorkoutButton } from '@/components/dashboard/CancelWorkoutButton'
import { formatSleep } from '@/lib/formatSleep'
import { Dumbbell, TrendingUp, ClipboardList, MessageCircle } from 'lucide-react'
import { calcBMR, calcStepsCalories, calcTrainingCalories, goalAdjustment, calcMacrosFromCalories } from '@/lib/utils/tdee'

export const dynamic = 'force-dynamic'

const SESSIONS_TARGET = 4

// Cache module-level — unstable_cache DOIT être défini hors du composant (règle Next.js 15+)
// Les arguments (userId, today, logs, goal, level) servent de clé de cache unique par utilisateur/jour
const getCachedAIAlerts = unstable_cache(
  async (
    _userId: string,
    _today: string,
    logs: LogForAI[],
    goal: string,
    level: string
  ): Promise<Alert[]> => {
    return Promise.race([
      generateAIAlerts(logs, { goal, level }),
      new Promise<Alert[]>(resolve => setTimeout(() => resolve([]), 4000)),
    ])
  },
  ['ai-alerts'],
  { revalidate: 4 * 3600 }
)

type Alert = { type: 'red' | 'yellow' | 'green' | 'blue'; message: string; sub: string }
type LogForAI = { log_date: string; sleep_deep_min: number | null; protein_g: number | null; fatigue_score: number | null; steps: number | null }

async function generateAIAlerts(
  logs: LogForAI[],
  profile: { goal: string; level: string }
): Promise<Alert[]> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') return []
  if (!logs.length) return []

  try {
    // Timeout 5s max — évite de bloquer le rendu du dashboard si l'API est lente
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 5000,
    })

    const logSummary = logs.map(l =>
      `${l.log_date}: sommeil_profond=${l.sleep_deep_min ?? '?'}min fatigue=${l.fatigue_score ?? '?'}/10 proteines=${l.protein_g ?? '?'}g pas=${l.steps ?? '?'}`
    ).join('\n')

    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-20250514',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Analyse ces 7 jours de données fitness et génère 1-2 alertes pertinentes en JSON.

Profil: objectif=${profile.goal}, niveau=${profile.level}
Données:
${logSummary}

Réponds UNIQUEMENT avec ce JSON (sans markdown):
[
  { "type": "yellow", "message": "🔑 Titre court", "sub": "Explication actionnable max 15 mots" }
]

Types disponibles: "red" (urgence), "yellow" (attention), "green" (bien joué), "blue" (info).
Max 2 alertes. Si tout va bien, retourne [].`,
      }],
    })

    const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : '[]'
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, 2) : []
  } catch {
    return []
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [
    { data: profile },
    { data: todayLog },
    { data: lastWorkout },
    { data: weekWorkouts },
    { data: weekLogs },
    { data: todayWorkouts },
    { data: todayFoodLogs },
  ] = await Promise.all([
    supabase.from('profiles')
      .select('display_name, goal, level, current_program_id, onboarding_done, sessions_per_week, weight_kg, height_cm, age, gender, macro_mode, custom_protein_g, custom_calories, steps_goal, target_weight_kg')
      .eq('id', user.id).single(),

    supabase.from('daily_logs').select('*')
      .eq('user_id', user.id).eq('log_date', today).single(),

    supabase.from('workouts').select('session_name, session_date, total_tonnage_kg, total_sets')
      .eq('user_id', user.id).not('completed_at', 'is', null)
      .order('session_date', { ascending: false }).limit(1).single(),

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

  // Si le profil n'existe pas encore (pas de trigger Supabase, ou upsert raté),
  // on le crée avec les valeurs minimales pour éviter la boucle /dashboard ↔ /onboarding
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
  // Protéines : food_logs si dispo, sinon check-in manuel
  const proteinToday = hasFoodLogs ? Math.round(foodLogTotals.protein_g) : (todayLog?.protein_g ?? null)
  const caloriesToday = hasFoodLogs ? Math.round(foodLogTotals.calories) : null

  // ── État séance du jour (4 cas) ──────────────────────────────
  const latestTodayWorkout = todayWorkouts?.[0] ?? null
  const programDoneToday = !!(
    latestTodayWorkout?.program_id &&
    profile?.current_program_id &&
    latestTodayWorkout.program_id === profile.current_program_id
  )
  const freeDoneToday = !!latestTodayWorkout && !programDoneToday

  // Suggestion séance
  let suggestion: {
    session_name: string
    program_name: string
    volume_adjustment: string
    adjustment_reason: string
    adaptation_reason: string
    exercises: { name: string; sets: number; reps: string; weight_kg: number | null; note: string }[]
  } | null = null

  if (profile?.current_program_id) {
    const { data: program } = await supabase
      .from('programs').select('name, structure').eq('id', profile.current_program_id).single()

    if (program) {
      const days: string[] = program.structure?.days ?? []
      const { data: lastProgramWorkout } = await supabase
        .from('workouts').select('session_name')
        .eq('user_id', user.id).eq('program_id', profile.current_program_id)
        .not('completed_at', 'is', null)
        .order('session_date', { ascending: false }).limit(1).single()

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
        exercises: [],
      }
    }
  }

  // TDEE Mifflin-St Jeor + NEAT depuis les logs (30j disponibles dans weekLogs)
  // Sur le dashboard on utilise les 7 derniers jours disponibles pour les steps
  const w = profile?.weight_kg ?? 75
  const hasLogsWithSteps = (weekLogs ?? []).filter(l => l.steps != null).length >= 3
  const avgSteps7d = hasLogsWithSteps
    ? Math.round((weekLogs ?? []).filter(l => l.steps != null).reduce((a, l) => a + (l.steps ?? 0), 0) / (weekLogs ?? []).filter(l => l.steps != null).length)
    : 0

  const bmr = calcBMR(w, profile?.height_cm ?? 175, profile?.age ?? 30, profile?.gender ?? 'male')
  const stepsKcal = hasLogsWithSteps ? calcStepsCalories(avgSteps7d) : 0
  const trainKcal = calcTrainingCalories(0, profile?.sessions_per_week ?? 3) // tonnage inconnu côté dashboard
  const tdeeCalc = hasLogsWithSteps
    ? bmr + stepsKcal + trainKcal
    : Math.round(bmr * (profile?.sessions_per_week ?? 3 >= 5 ? 1.725 : profile?.sessions_per_week ?? 3 >= 3 ? 1.55 : 1.375))

  const targetCaloriesDash = Math.max(1200, tdeeCalc + goalAdjustment(profile?.goal ?? 'general'))
  const autoMacros = calcMacrosFromCalories(targetCaloriesDash, w)

  // Cible protéines : custom si définie, sinon TDEE auto
  const proteinTarget = profile?.macro_mode === 'custom' && profile?.custom_protein_g
    ? { min: profile.custom_protein_g, max: profile.custom_protein_g, mid: profile.custom_protein_g }
    : { min: autoMacros.protein_g, max: autoMacros.protein_g, mid: autoMacros.protein_g }

  // Alertes statiques immédiates
  const staticAlerts: { type: 'red' | 'yellow' | 'green' | 'blue'; message: string; sub: string }[] = []

  if (todayLog) {
    const deepSleep = todayLog.sleep_deep_min
    const sysBP = todayLog.sys_bp

    if (deepSleep !== null && deepSleep < 60)
      staticAlerts.push({ type: 'yellow', message: '😴 Sommeil profond insuffisant', sub: `${formatSleep(deepSleep)} — réduis le volume d'entraînement de 15-20% aujourd'hui.` })

    if (proteinToday !== null && proteinToday < proteinTarget.min)
      staticAlerts.push({ type: 'yellow', message: '🥩 Protéines en dessous de l\'objectif', sub: `${proteinToday}g — objectif ${proteinTarget.min}g · pense à une source supplémentaire.` })

    if (sysBP !== null && sysBP > 135)
      staticAlerts.push({ type: 'red', message: '🫀 Tension systolique élevée', sub: `${sysBP} mmHg — consulte un médecin si ça persiste.` })
  } else {
    staticAlerts.push({ type: 'blue', message: '📋 Bilan du jour non renseigné', sub: 'Complète ton check-in pour des recommandations personnalisées.' })
  }

  // Alertes IA — cache 4h par user + date (fonction définie au niveau module)
  const logsForAI: LogForAI[] = (weekLogs ?? []).map(l => ({
    log_date: l.log_date,
    sleep_deep_min: l.sleep_deep_min,
    protein_g: l.protein_g,
    fatigue_score: l.fatigue_score,
    steps: l.steps,
  }))

  let aiAlerts: Alert[] = []
  try {
    aiAlerts = await getCachedAIAlerts(
      user.id,
      today,
      logsForAI,
      profile?.goal ?? 'force',
      profile?.level ?? 'intermédiaire',
    )
  } catch {
    aiAlerts = []
  }

  // Fusionner alertes (statiques d'abord, puis IA si pas de doublon)
  const allAlerts = [...staticAlerts, ...aiAlerts].slice(0, 4)

  // Indicateur fiabilité EWMA — basé sur le nb de jours avec poids dans les 30 derniers jours
  const weightDaysCount = (weekLogs ?? []).filter(l => l.weight_kg != null).length
  const ewmaReliability: { label: string; color: string } =
    weightDaysCount < 7
      ? { label: `⚠️ ${weightDaysCount}/7j`, color: 'var(--fiq-muted)' }
      : weightDaysCount < 14
      ? { label: '📊 En calibration', color: 'var(--fiq-yellow)' }
      : { label: '✅ Fiable', color: 'var(--fiq-accent)' }

  // Calcul du streak (jours consécutifs de check-in)
  const checkInDates = (weekLogs ?? []).map((l) => l.log_date)
  const streak = calcStreak(checkInDates)

  const prenom = profile?.display_name?.split(' ')[0] ?? 'Athlete'
  const sessionsThisWeek = weekWorkouts?.length ?? 0
  const sessionsTarget = profile?.sessions_per_week ?? SESSIONS_TARGET
  // Objectifs personnalisés depuis le profil (avec fallbacks)
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
        <Link href="/profile" className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          {prenom[0]?.toUpperCase()}
        </Link>
      </div>

      {/* Alertes */}
      {allAlerts.length > 0 && (
        <div className="space-y-2">
          {allAlerts.map((a, i) => <AlertBar key={i} type={a.type} message={a.message} sub={a.sub} />)}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Poids lissé"
          value={todayLog?.weight_trend ? `${todayLog.weight_trend}` : '—'}
          unit={todayLog?.weight_trend ? 'kg' : ''}
          sub={todayLog?.weight_kg
            ? `Brut : ${todayLog.weight_kg}kg · ${ewmaReliability.label}`
            : ewmaReliability.label}
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

            {/* Stats séance */}
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

            {/* Prochaine séance */}
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
          /* ── Cas 2 : Séance libre / repos faite, programme non effectué ── */
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
              {/* Bouton annuler uniquement pour repos ou séances sans séries */}
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

            {/* Alerte programme non fait */}
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
          /* ── Cas 4 : Rien fait aujourd'hui ── */
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

            {/* Raison IA — seulement pour le volume normal (pas de badge) */}
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
        {/* Poids cible (affiché seulement si défini et différent du poids actuel) */}
        {targetWeightKg && todayLog?.weight_trend && (
          <ProgressBar
            value={Math.abs(todayLog.weight_trend - targetWeightKg) <= Math.abs((profile?.weight_kg ?? todayLog.weight_trend) - targetWeightKg)
              ? Math.abs((profile?.weight_kg ?? todayLog.weight_trend) - targetWeightKg) - Math.abs(todayLog.weight_trend - targetWeightKg)
              : 0}
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

// Calcule le nombre de jours consécutifs de check-in (streak)
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
