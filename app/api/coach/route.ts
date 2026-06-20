import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calcDailyTarget } from '@/lib/utils/tdee'
import { MUSCLE_GROUPS, VOLUME_TARGETS } from '@/lib/utils/volume'
import { AI_MODELS } from '@/lib/utils/ai-models'
import { buildSystemPrompt, type CoachMemoryEntry } from '@/lib/ai/coach-prompt'
import { PLAN_SELECT, isFreeUser } from '@/lib/utils/plan'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Streaming Sonnet — peut prendre 30-50s sur longues réponses

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Sonnet — coaching fitness avec contexte complet utilisateur
const MODEL_COACH = AI_MODELS.coach

// Limites selon le plan
const LIMITS = {
  free_total:    5,        // Messages TOTAL à vie pour les comptes gratuits (pas de trial)
  monthly:      60,        // Pro mensuel — usage confortable
  annual:  Infinity,       // Pro annuel — illimité
  lifetime: Infinity,      // Accès à vie — illimité
}

// Nombre de messages d'historique injectés dans le contexte
const HISTORY_LIMIT = 10

// Extraction de mémoire via Haiku — analyse l'échange et détecte les informations persistables
async function extractMemoriesFromExchange(
  userMsg: string,
  assistantMsg: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    const prompt = `Analyse cet échange entre un athlète et son coach IA fitness.
Extrais uniquement les informations importantes et persistantes méritant d'être mémorisées pour les prochaines sessions.

Message utilisateur : "${userMsg}"
Réponse coach : "${assistantMsg}"

Réponds UNIQUEMENT avec un JSON valide (tableau, peut être vide []).
Format exact attendu :
[
  {
    "category": "injury|goal|preference|milestone|note",
    "content": "description concise en français (max 200 chars)",
    "expires_in_days": null
  }
]

Règles :
- injury : blessure, douleur, gêne physique mentionnée → expires_in_days: 90
- goal : objectif déclaré (événement, performance cible, deadline) → expires_in_days: null
- preference : préférence d'entraînement, aliment aimé/détesté, horaire → expires_in_days: null
- milestone : performance accomplie, record battu, étape franchie → expires_in_days: null
- note : information contextuelle importante non classifiable ailleurs → expires_in_days: 30
- Si rien de notable : retourne []
- Maximum 3 éléments par échange
- Ignore les informations déjà évidentes dans le profil (objectif général, niveau)`

    const resp = await anthropic.messages.create({
      model: AI_MODELS.alerts, // Haiku — léger et rapide
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = resp.content[0]?.type === 'text' ? resp.content[0].text.trim() : '[]'
    // Extraire le JSON même si Haiku ajoute du texte autour
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return

    const entries: { category: string; content: string; expires_in_days: number | null }[] = JSON.parse(jsonMatch[0])
    if (!Array.isArray(entries) || entries.length === 0) return

    const validCategories = ['injury', 'goal', 'preference', 'milestone', 'note']
    const now = new Date().toISOString()

    // Vérifier la limite de 100 entrées actives
    const { count } = await supabase
      .from('coach_memory')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
    if ((count ?? 0) >= 100) return

    const toInsert = entries
      .filter(e => validCategories.includes(e.category) && e.content?.length >= 5 && e.content?.length <= 500)
      .slice(0, 3)
      .map(e => ({
        user_id:    userId,
        category:   e.category,
        content:    e.content.trim(),
        source:     'auto',
        expires_at: e.expires_in_days
          ? new Date(Date.now() + e.expires_in_days * 86400000).toISOString()
          : null,
      }))

    if (toInsert.length > 0) {
      await supabase.from('coach_memory').insert(toInsert)
    }
  } catch (err) {
    // Non-bloquant : l'extraction de mémoire ne doit jamais faire rater une réponse
    console.error('[coach/memory] Extraction failed:', err)
  }
}

// Classifie le nom de séance en type (legs/push/pull/full/free)
function classifySessionType(name: string): 'legs' | 'push' | 'pull' | 'full' | 'free' {
  const n = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/jambe|leg|squat|deadlift|souleве|rdl|tibia|curl femoral|leg press|presse/.test(n)) return 'legs'
  if (/push|pousse|chest|pecto|epaule|tricep|developpe|developpé|developpe|press|benchpress/.test(n)) return 'push'
  if (/pull|tirage|dos|back|bicep|curl|rowing|row|tractions/.test(n)) return 'pull'
  if (/full|corps|total|compound/.test(n)) return 'full'
  return 'free'
}

// Calcule la baseline 30j pour le type de séance du jour, compare avec aujourd'hui
function computeSessionTypeCtx(
  sessions30d: { session_name: string; total_tonnage_kg: number | null }[],
  todaySession: { session_name: string; total_tonnage_kg: number | null } | undefined
): string | null {
  if (!todaySession) return null
  const type = classifySessionType(todaySession.session_name)
  if (type === 'free') return null
  const sameType = sessions30d.filter(s => classifySessionType(s.session_name) === type && s.total_tonnage_kg)
  if (sameType.length < 3) return null
  const baseline = Math.round(sameType.reduce((acc, s) => acc + (s.total_tonnage_kg ?? 0), 0) / sameType.length)
  const todayKg = todaySession.total_tonnage_kg
  if (!todayKg) return `Séance ${type} · Baseline 30j : ${baseline}kg (${sameType.length} sessions)`
  const delta = Math.round(((todayKg - baseline) / baseline) * 100)
  const sign = delta >= 0 ? '+' : ''
  return `Séance ${type} · Baseline 30j : ${baseline}kg · Aujourd'hui : ${todayKg}kg (${sign}${delta}%)`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const userMessage: string = body.message ?? ''
    if (!userMessage.trim()) return NextResponse.json({ data: null, error: 'Message vide' }, { status: 400 })
    // Limite de longueur — évite les injections de prompt massives et les coûts excessifs en tokens
    if (userMessage.length > 2000) return NextResponse.json({ data: null, error: 'Message trop long (max 2000 caractères)' }, { status: 400 })

    // Récupérer statut, plan et flag admin — détermine le type de comptage
    const { data: subProfile } = await supabase
      .from('profiles')
      .select(PLAN_SELECT)
      .eq('id', user.id)
      .maybeSingle()

    const status = subProfile?.subscription_status ?? 'free'
    const plan   = subProfile?.subscription_plan ?? 'free'
    const isAdmin = subProfile?.is_admin ?? false
    const isFree = isFreeUser(subProfile)

    // ── Comptage messages selon le plan ───────────────────────────────────────
    let msgCount = 0
    let msgLimit: number

    if (isAdmin) {
      msgLimit = Infinity

    } else if (status === 'lifetime' || (status === 'pro' && plan === 'annual')) {
      msgLimit = Infinity

    } else if (status === 'pro') {
      // Pro mensuel : 60/mois calendaire
      const startOfMonth = new Date()
      startOfMonth.setUTCDate(1)
      startOfMonth.setUTCHours(0, 0, 0, 0)
      const { count: monthly } = await supabase
        .from('coach_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'user')
        .gte('created_at', startOfMonth.toISOString())
      msgCount = monthly ?? 0
      msgLimit = LIMITS.monthly

    } else {
      // Free : 5 messages TOTAL à vie — pour goûter, pas pour abuser
      const { count: total } = await supabase
        .from('coach_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'user')
      msgCount = total ?? 0
      msgLimit = LIMITS.free_total
    }

    if (msgLimit !== Infinity && msgCount >= msgLimit) {
      const errMsg = isFree
        ? `Tu as utilisé tes ${LIMITS.free_total} messages offerts. Passe en Pro pour un accès illimité au coach IA.`
        : `Limite de ${msgLimit} messages atteinte ce mois-ci.`
      return NextResponse.json({
        data: null,
        error: errMsg,
        limitReached: true,
        count: msgCount,
        limit: msgLimit,
        isFree,
      }, { status: 429 })
    }

    const today         = new Date().toISOString().split('T')[0]
    const yesterday     = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const sevenDaysAgo  = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    // Fenêtres pour le delta tonnage 4 sem vs 4 sem précédentes
    const fourWeeksAgo  = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]
    const eightWeeksAgo = new Date(Date.now() - 56 * 86400000).toISOString().split('T')[0]

    // Semaine ISO courante (lundi → dimanche)
    const nowD = new Date()
    const dow  = nowD.getDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const isoMonday = new Date(nowD)
    isoMonday.setDate(nowD.getDate() + mondayOffset)
    isoMonday.setHours(0, 0, 0, 0)
    const weekStart = isoMonday.toISOString().split('T')[0]

    // Charger le contexte utilisateur en parallèle
    const [
      { data: profile },
      { data: todayLog },
      { data: yesterdayLog },
      { data: recentWorkouts },
      { data: topPRs },
      { data: todayFoodLogs },
      { data: steps30dLogs },
      { data: weekWorkoutsData },
      { data: eightWeekWorkouts },
      { data: persistentMemoryRaw },
      { data: ewma7DaysAgoLog },
      { data: tonnage30dData },
    ] = await Promise.all([
      supabase.from('profiles')
        .select('display_name, goal, level, weight_kg, height_cm, age, gender, sessions_per_week, macro_mode, custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g, target_weight_kg')
        .eq('id', user.id).maybeSingle(),
      supabase.from('daily_logs')
        .select('weight_kg, weight_trend, sleep_deep_min, sleep_total_min, fatigue_score, protein_g, steps, sys_bp')
        .eq('user_id', user.id).eq('log_date', today).maybeSingle(),
      // Steps d'hier — fallback si pas assez de données 30j
      supabase.from('daily_logs')
        .select('steps')
        .eq('user_id', user.id).eq('log_date', yesterday).maybeSingle(),
      supabase.from('workouts')
        .select('session_name, session_date, total_tonnage_kg, total_sets')
        .eq('user_id', user.id).not('completed_at', 'is', null)
        .gte('session_date', sevenDaysAgo)
        .order('session_date', { ascending: false }).limit(7),
      supabase.from('personal_records')
        .select('exercise_name, value, unit, record_type')
        .eq('user_id', user.id)
        .in('record_type', ['top_set', '1rm_estimated', 'max_weight'])
        .order('value', { ascending: false }).limit(30),
      // Macros réelles du jour (food_logs) — pour le bilan calorique coach
      supabase.from('food_logs')
        .select('calories, protein_g, carbs_g, fat_g, iron_mg, magnesium_mg, zinc_mg, calcium_mg, vitamin_d_mcg, potassium_mg, vitamin_c_mg, sodium_mg')
        .eq('user_id', user.id).eq('log_date', today),
      // Moyenne steps 30j (journées complètes = exclut aujourd'hui + zéros)
      // .limit(30) explicite : borne la requête à 30 lignes max, cohérent avec la fenêtre glissante
      // Note : une RPC Supabase (AVG côté DB) serait plus efficace si le volume de daily_logs grandit
      supabase.from('daily_logs')
        .select('steps')
        .eq('user_id', user.id)
        .gte('log_date', thirtyDaysAgo)
        .lt('log_date', today)
        .gt('steps', 0)
        .limit(30),
      // Workouts de la semaine courante → volume hebdo
      supabase.from('workouts')
        .select('id')
        .eq('user_id', user.id)
        .gte('session_date', weekStart)
        .not('completed_at', 'is', null),
      // Workouts 8 semaines — pour le delta tonnage 4 sem vs 4 sem précédentes
      supabase.from('workouts')
        .select('id, session_date')
        .eq('user_id', user.id)
        .gte('session_date', eightWeeksAgo)
        .not('completed_at', 'is', null),
      // Mémoire persistante coach — 20 entrées actives les plus récentes
      supabase.from('coach_memory')
        .select('id, category, content, source, created_at, expires_at')
        .eq('user_id', user.id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(20),
      // Log J-7 pour calculer la variation EWMA sur 7 jours
      supabase.from('daily_logs')
        .select('weight_trend')
        .eq('user_id', user.id)
        .lte('log_date', sevenDaysAgo)
        .not('weight_trend', 'is', null)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Séances 30j avec nom + tonnage — baseline par type de séance
      supabase.from('workouts')
        .select('session_name, total_tonnage_kg')
        .eq('user_id', user.id)
        .gte('session_date', thirtyDaysAgo)
        .not('completed_at', 'is', null)
        .not('total_tonnage_kg', 'is', null)
        .order('session_date', { ascending: false })
        .limit(60),
    ])

    // ── Volume hebdomadaire par groupe musculaire ────────────────────────────
    const weekWorkoutIds = (weekWorkoutsData ?? []).map((w: { id: string }) => w.id)
    let weeklyVolumeData: { muscle: string; sets: number; mev: number; mav: number; status: 'low' | 'optimal' | 'high' }[] = []

    if (weekWorkoutIds.length > 0) {
      const { data: weekSets } = await supabase
        .from('workout_sets')
        .select('exercise_id, exercises_library(muscle_primary)')
        .in('workout_id', weekWorkoutIds)
        .eq('is_warmup', false)
        .neq('reps', 0)

      const counts: Record<string, number> = {}
      for (const s of weekSets ?? []) {
        type ExLib = { muscle_primary?: string[] } | null
        const lib = s.exercises_library as ExLib | ExLib[]
        const muscles: string[] = Array.isArray(lib)
          ? (lib[0]?.muscle_primary ?? [])
          : (lib?.muscle_primary ?? [])
        if (!muscles.length) continue
        const group = MUSCLE_GROUPS[muscles[0]]
        if (!group) continue
        counts[group] = (counts[group] ?? 0) + 1
      }

      weeklyVolumeData = Object.entries(VOLUME_TARGETS)
        .map(([muscle, { mev, mav }]) => {
          const sets = counts[muscle] ?? 0
          const status: 'low' | 'optimal' | 'high' = sets >= mav ? 'high' : sets >= mev ? 'optimal' : 'low'
          return { muscle, sets, mev, mav, status }
        })
        .filter(m => m.sets > 0)
        .sort((a, b) => b.sets - a.sets)
    }

    // ── Delta tonnage 4 sem vs 4 sem précédentes par groupe musculaire ─────────
    // Sépare les workouts en deux fenêtres : N-4 sem (récent) vs N-8 à N-4 sem (précédent)
    const tonnageDelta: { muscle: string; delta: number }[] = []
    const recentIds = (eightWeekWorkouts ?? [])
      .filter((w: { id: string; session_date: string }) => w.session_date >= fourWeeksAgo)
      .map((w: { id: string; session_date: string }) => w.id)
    const olderIds = (eightWeekWorkouts ?? [])
      .filter((w: { id: string; session_date: string }) => w.session_date < fourWeeksAgo)
      .map((w: { id: string; session_date: string }) => w.id)

    if (recentIds.length > 0 && olderIds.length > 0) {
      const [{ data: recentSets }, { data: olderSets }] = await Promise.all([
        supabase.from('workout_sets')
          .select('weight_kg, reps, exercises_library(muscle_primary)')
          .in('workout_id', recentIds)
          .eq('is_warmup', false)
          .gt('reps', 0)
          .gt('weight_kg', 0),
        supabase.from('workout_sets')
          .select('weight_kg, reps, exercises_library(muscle_primary)')
          .in('workout_id', olderIds)
          .eq('is_warmup', false)
          .gt('reps', 0)
          .gt('weight_kg', 0),
      ])

      // Calcul tonnage par groupe musculaire (weight_kg × reps)
      function tonnageByGroup(sets: { weight_kg: number | null; reps: number | null; exercises_library: unknown }[] | null) {
        const acc: Record<string, number> = {}
        for (const s of sets ?? []) {
          type ExLib = { muscle_primary?: string[] } | null
          const lib = s.exercises_library as ExLib | ExLib[]
          const muscles: string[] = Array.isArray(lib) ? (lib[0]?.muscle_primary ?? []) : (lib?.muscle_primary ?? [])
          if (!muscles.length) continue
          const group = MUSCLE_GROUPS[muscles[0]]
          if (!group) continue
          acc[group] = (acc[group] ?? 0) + (s.weight_kg ?? 0) * (s.reps ?? 0)
        }
        return acc
      }

      const recentTonnage = tonnageByGroup(recentSets)
      const olderTonnage  = tonnageByGroup(olderSets)
      const allGroups = new Set([...Object.keys(recentTonnage), ...Object.keys(olderTonnage)])

      const deltas: { muscle: string; delta: number; absRecent: number }[] = []
      for (const muscle of allGroups) {
        const r = recentTonnage[muscle] ?? 0
        const o = olderTonnage[muscle] ?? 0
        if (o === 0 || r === 0) continue // données insuffisantes
        const pct = Math.round(((r - o) / o) * 100)
        deltas.push({ muscle, delta: pct, absRecent: r })
      }
      // Garder les 5 groupes musculaires avec le tonnage récent le plus élevé
      deltas.sort((a, b) => b.absRecent - a.absRecent)
      tonnageDelta.push(...deltas.slice(0, 5).map(d => ({ muscle: d.muscle, delta: d.delta })))
    }

    // Poids lissé le plus récent (fallback si pas de check-in aujourd'hui)
    let recentWeightTrend: number | null = todayLog?.weight_trend ?? null
    let recentWeightKg: number | null = todayLog?.weight_kg ?? null
    if (recentWeightTrend === null) {
      const { data: lastWeightLog } = await supabase
        .from('daily_logs')
        .select('weight_kg, weight_trend')
        .eq('user_id', user.id)
        .not('weight_trend', 'is', null)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      recentWeightTrend = lastWeightLog?.weight_trend ?? null
      if (!recentWeightKg) recentWeightKg = lastWeightLog?.weight_kg ?? profile?.weight_kg ?? null
    }

    // Récupérer les derniers échanges uniquement (coût tokens maîtrisé)
    const { data: history } = await supabase
      .from('coach_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT)

    // ── Variation EWMA 7 jours ───────────────────────────────────────────────
    const ewma7DaysAgo = ewma7DaysAgoLog?.weight_trend ?? null
    const ewmaVariation7d = (recentWeightTrend !== null && ewma7DaysAgo !== null)
      ? parseFloat((recentWeightTrend - ewma7DaysAgo).toFixed(1))
      : null

    // Totaux nutrition du jour depuis food_logs (plus précis que protein_g du check-in)
    //
    // SOURCES DE PROTÉINES — deux champs distincts, priorité à food_logs :
    //  • daily_logs.protein_g  : saisie manuelle au check-in (approximatif, optionnel)
    //  • food_logs.protein_g   : somme des aliments loggés dans /nutrition (précis, item par item)
    //
    // Ici on utilise food_logs quand hasFoodLogs=true (priorité), sinon fallback sur
    // daily_logs.protein_g. Le client (coach/page.tsx) affiche daily_logs.protein_g via
    // le check-in — il y a donc un écart possible si l'utilisateur a loggé ses repas
    // mais pas fait son check-in. Amélioration future : exposer le total food_logs
    // directement dans la réponse initiale du coach pour synchroniser l'affichage.
    const foodTotals = (todayFoodLogs ?? []).reduce(
      (acc, l) => ({
        calories:  acc.calories  + (l.calories  ?? 0),
        protein_g: acc.protein_g + (l.protein_g ?? 0),
        carbs_g:   acc.carbs_g   + (l.carbs_g   ?? 0),
        fat_g:     acc.fat_g     + (l.fat_g     ?? 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    )
    const hasFoodLogs = (todayFoodLogs ?? []).length > 0

    // ── Carences micronutriments (< 50% DRI athlète) ─────────────────────────
    // DRI athlètes (valeurs journalières de référence pour sportifs actifs)
    const DRI_ATHLETES: Record<string, { key: string; label: string; target: number }> = {
      iron_mg:       { key: 'iron_mg',       label: 'fer',         target: 18 },
      magnesium_mg:  { key: 'magnesium_mg',  label: 'magnésium',   target: 400 },
      zinc_mg:       { key: 'zinc_mg',        label: 'zinc',        target: 11 },
      calcium_mg:    { key: 'calcium_mg',     label: 'calcium',     target: 1000 },
      vitamin_d_mcg: { key: 'vitamin_d_mcg', label: 'vitamine D',  target: 20 },
      potassium_mg:  { key: 'potassium_mg',  label: 'potassium',   target: 3500 },
      vitamin_c_mg:  { key: 'vitamin_c_mg',  label: 'vitamine C',  target: 90 },
    }
    type FoodLogWithMicros = {
      calories?: number | null
      protein_g?: number | null
      carbs_g?: number | null
      fat_g?: number | null
      iron_mg?: number | null
      magnesium_mg?: number | null
      zinc_mg?: number | null
      calcium_mg?: number | null
      vitamin_d_mcg?: number | null
      potassium_mg?: number | null
      vitamin_c_mg?: number | null
    }
    const microDeficiencies: { nutrient: string; pct: number }[] = []
    if (hasFoodLogs) {
      for (const { key, label, target } of Object.values(DRI_ATHLETES)) {
        const total = (todayFoodLogs as FoodLogWithMicros[] ?? []).reduce(
          (acc, l) => acc + ((l[key as keyof FoodLogWithMicros] as number | null | undefined) ?? 0),
          0
        )
        if (total > 0) {
          const pct = Math.round((total / target) * 100)
          if (pct < 50) microDeficiencies.push({ nutrient: label, pct })
        }
      }
    }

    // Moyenne 30j steps — source stable (journées complètes, zéros exclus)
    const avgSteps30d = (steps30dLogs ?? []).length >= 3
      ? Math.round((steps30dLogs ?? []).reduce((acc, l) => acc + (l.steps ?? 0), 0) / (steps30dLogs ?? []).length)
      : null

    // TDEE dynamique du jour — même source de vérité que dashboard/nutrition
    const todayWorkoutInRecent = (recentWorkouts ?? []).find(w => w.session_date === today)

    // Contexte tonnage par type de séance (legs/push/pull/full) — baseline 30j vs aujourd'hui
    const sessionTypeCtx = computeSessionTypeCtx(
      (tonnage30dData ?? []) as { session_name: string; total_tonnage_kg: number | null }[],
      todayWorkoutInRecent as { session_name: string; total_tonnage_kg: number | null } | undefined
    )
    const isRestDay = !todayWorkoutInRecent
    const coachDailyTarget = calcDailyTarget({
      weight_kg:         profile?.weight_kg,
      height_cm:         profile?.height_cm,
      age:               profile?.age,
      gender:            profile?.gender,
      goal:              profile?.goal ?? 'general',
      sessions_per_week: profile?.sessions_per_week,
      macro_mode:        profile?.macro_mode,
      custom_calories:   profile?.custom_calories,
      custom_protein_g:  profile?.custom_protein_g,
      custom_carbs_g:    profile?.custom_carbs_g,
      custom_fat_g:      profile?.custom_fat_g,
      avgSteps30d,
      todaySteps:          todayLog?.steps                              ?? null,
      yesterdaySteps:      yesterdayLog?.steps                         ?? null,
      todayWorkoutTonnage: todayWorkoutInRecent?.total_tonnage_kg       ?? null,
      todayWorkoutSets:    todayWorkoutInRecent?.total_sets             ?? null,
      todayWorkoutName:    todayWorkoutInRecent?.session_name           ?? null,
      isRestDay,
    })

    const systemPrompt = buildSystemPrompt({
      displayName: profile?.display_name ?? 'Athlète',
      goal: profile?.goal ?? 'general',
      level: profile?.level ?? 'non renseigné',
      age: profile?.age ?? null,
      heightCm: profile?.height_cm ?? null,
      gender: profile?.gender ?? null,
      sessionsPerWeek: profile?.sessions_per_week ?? null,
      weightKg: recentWeightKg,
      weightTrend: recentWeightTrend,
      targetWeightKg: profile?.target_weight_kg ?? null,
      ewmaVariation7d,
      sleepDeepMin: todayLog?.sleep_deep_min ?? null,
      sleepTotalMin: todayLog?.sleep_total_min ?? null,
      fatigueScore: todayLog?.fatigue_score ?? null,
      proteinG: hasFoodLogs ? Math.round(foodTotals.protein_g) : (todayLog?.protein_g ?? null),
      steps: todayLog?.steps ?? null,
      sysBp: todayLog?.sys_bp ?? null,
      recentWorkouts: recentWorkouts ?? [],
      topPRs: topPRs ?? [],
      weeklyVolume: weeklyVolumeData,
      macroMode: profile?.macro_mode ?? null,
      customCalories: profile?.custom_calories ?? null,
      customProtein: profile?.custom_protein_g ?? null,
      customCarbs: profile?.custom_carbs_g ?? null,
      customFat: profile?.custom_fat_g ?? null,
      caloriesConsumed: hasFoodLogs ? Math.round(foodTotals.calories) : null,
      carbsG: hasFoodLogs ? Math.round(foodTotals.carbs_g) : null,
      fatG: hasFoodLogs ? Math.round(foodTotals.fat_g) : null,
      microDeficiencies: microDeficiencies.length > 0 ? microDeficiencies : undefined,
      tonnageDelta,
      sessionTonnageContext: sessionTypeCtx,
      tdeeBreakdown: {
        bmr:                  coachDailyTarget.bmr,
        stepsKcal:            coachDailyTarget.stepsKcal,
        stepsUsed:            coachDailyTarget.stepsUsed,
        workoutKcal:          coachDailyTarget.workoutKcal,
        workoutMuscleGroup:   coachDailyTarget.workoutMuscleGroup,
        tdee:                 coachDailyTarget.tdee,
        adjustment:           coachDailyTarget.adjustment,
        targetCalories:       coachDailyTarget.targetCalories,
        todayWorkoutTonnage:  coachDailyTarget.todayWorkoutTonnage,
        todayWorkoutSets:     todayWorkoutInRecent?.total_sets ?? null,
        usedFallback:         coachDailyTarget.usedFallback,
      },
      persistentMemory: (persistentMemoryRaw ?? []) as CoachMemoryEntry[],
    })

    // Construire l'historique pour Claude (ordre chronologique, fenêtre glissante)
    // Strip leading assistant messages — Anthropic API requires conversations to start with 'user'
    const historyOrdered = [...(history ?? [])].reverse().map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    // Find first user message index (skip orphan assistant messages at the top)
    const firstUserIdx = historyOrdered.findIndex(m => m.role === 'user')
    const cleanHistory = firstUserIdx >= 0 ? historyOrdered.slice(firstUserIdx) : []

    const messages: Anthropic.MessageParam[] = [
      ...cleanHistory,
      { role: 'user', content: userMessage },
    ]

    // Persister le message utilisateur
    await supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'user',
      content: userMessage,
    })

    // Haiku pour tous — contexte préchargé = qualité optimale pour le coaching fitness

    // Stream Claude avec prompt caching sur le system prompt
    // Le system prompt (~700 tokens) est mis en cache 5min → économise ~70% des tokens input
    // sur les messages consécutifs dans une session
    const encoder = new TextEncoder()
    let assistantContent = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const claudeStream = anthropic.messages.stream(
            {
              model: MODEL_COACH,
              max_tokens: 600,  // 800 → 600 : suffisant pour 3 paragraphes, -25% sur output tokens
              system: [
                {
                  type: 'text' as const,
                  text: systemPrompt,
                  // Cache le system prompt 5 minutes : économise sur les échanges consécutifs
                  cache_control: { type: 'ephemeral' },
                },
              ],
              messages,
            },
            {
              headers: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
            }
          )

          for await (const chunk of claudeStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const text = chunk.delta.text
              assistantContent += text
              controller.enqueue(encoder.encode(text))
            }
          }

          // Persister la réponse du coach (non-bloquant si échoue)
          if (assistantContent) {
            const { error: insertErr } = await supabase.from('coach_messages').insert({
              user_id: user.id,
              role: 'assistant',
              content: assistantContent,
            })
            if (insertErr) console.error('[coach] Failed to persist assistant message:', insertErr.message)

            // Extraction mémoire asynchrone — ne bloque pas le stream
            extractMemoriesFromExchange(userMessage, assistantContent, user.id, supabase)
          }

          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
        // Exposer le compteur dans les headers pour affichage client
        'X-Coach-Count': String(isAdmin ? 0 : msgCount + 1),
        'X-Coach-Limit': String(msgLimit === Infinity ? 9999 : msgLimit),
        'X-Coach-Is-Free': String(isFree),
        'X-Coach-Is-Admin': String(isAdmin),
      },
    })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
