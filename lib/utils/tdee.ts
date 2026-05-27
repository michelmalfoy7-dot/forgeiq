/**
 * Calcul TDEE (Total Daily Energy Expenditure) — Mifflin-St Jeor + NEAT réel
 *
 * Sources :
 *  - Mifflin MD et al., "A new predictive equation for resting energy expenditure",
 *    J Am Diet Assoc 1990 — formule BMR référence ACSM/ISSN
 *  - Frankenfield D et al., J Am Diet Assoc 2005 — comparaison formules prédictives
 *  - Tudor-Locke C et al., Int J Behav Nutr Phys Act 2011 — 0.04 kcal/step
 */

// ── Types ─────────────────────────────────────────────────────

export type TDEEMacros = {
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export type TDEEBreakdown = {
  bmr: number             // Métabolisme de base Mifflin-St Jeor
  stepsCalories: number   // Calories steps (avgSteps × 0.04)
  trainingCalories: number // Calories entraînement musculaire par jour
  cardioCalories: number  // Calories cardio (MET × poids × durée) par jour
  tdee: number            // TDEE total = BMR + steps + training + cardio
  adjustment: number      // Ajustement objectif (+250 masse, -350 sèche)
  targetCalories: number  // Calories cibles = TDEE + adjustment
  macros: TDEEMacros
  hasEnoughData: boolean  // ≥ 7 jours de daily_logs avec steps
  avgStepsPerDay: number
  logsCount: number
}

// ── Activités cardio — MET (Metabolic Equivalent of Task) ─────
// Source : Ainsworth BE et al., Compendium of Physical Activities, Med Sci Sports Exerc 2011

/** Map keyword (nom session) → valeur MET scientifique */
export const CARDIO_ACTIVITY_KEYWORDS: Record<string, number> = {
  'vélo':       8.0,
  'cyclisme':   8.0,
  'course':     9.8,
  'natation':   8.0,
  'yoga':       3.0,
  'pilates':    3.0,
  'randonnée':  6.0,
  'football':   8.0,
  'tennis':     7.3,
  'combat':     9.5,
  'boxe':       9.5,
  'stretching': 2.5,
}

// MET par défaut pour les activités non reconnues
const DEFAULT_MET = 6.0

/** Retourne le MET correspondant au nom de session (recherche par mot-clé) */
export function getActivityMET(sessionName: string): number {
  const lower = sessionName.toLowerCase()
  for (const [keyword, met] of Object.entries(CARDIO_ACTIVITY_KEYWORDS)) {
    if (lower.includes(keyword)) return met
  }
  return DEFAULT_MET
}

/**
 * Calcule les calories brûlées pour une session cardio
 * Formule MET standard : kcal = MET × poids_kg × durée_h
 */
export function calcCardioCalories(
  sessionName: string,
  durationMin: number,
  weightKg: number
): number {
  const met = getActivityMET(sessionName)
  return Math.round(met * weightKg * (durationMin / 60))
}

// ── Fonctions pures ───────────────────────────────────────────

/**
 * BMR Mifflin-St Jeor
 * Homme : 10×kg + 6.25×cm − 5×âge + 5
 * Femme : 10×kg + 6.25×cm − 5×âge − 161
 */
export function calcBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: string
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return Math.round(gender === 'female' ? base - 161 : base + 5)
}

/**
 * Calories brûlées via les pas
 * Approximation standard : 1 pas ≈ 0.04 kcal
 */
export function calcStepsCalories(avgStepsPerDay: number): number {
  return Math.round(avgStepsPerDay * 0.04)
}

/**
 * Calories entraînement par JOUR (lissé sur la semaine)
 * Paliers basés sur le tonnage moyen par séance :
 *  < 5 000 kg   → 250 kcal  (séance très légère)
 *  5–8 000 kg   → 350 kcal  (séance modérée)
 *  8–12 000 kg  → 450 kcal  (séance standard)
 *  12–18 000 kg → 550 kcal  (séance lourde)
 *  > 18 000 kg  → 650 kcal  (séance très volumineuse — ex: 36k kg)
 */
export function calcTrainingCalories(
  avgTonnagePerSession: number,
  sessionsPerWeek: number
): number {
  const kcalPerSession =
    avgTonnagePerSession > 18000 ? 650 :
    avgTonnagePerSession > 12000 ? 550 :
    avgTonnagePerSession > 8000  ? 450 :
    avgTonnagePerSession > 5000  ? 350 : 250
  return Math.round((kcalPerSession * sessionsPerWeek) / 7)
}

/**
 * Ajustement calorique selon objectif fitness
 */
export function goalAdjustment(goal: string): number {
  switch (goal) {
    case 'muscle_gain': return 250
    case 'strength':    return 150
    case 'weight_loss': return -350 // jamais > 500 kcal de déficit
    default:            return 0    // maintien, endurance, general
  }
}

/**
 * Distribution macros depuis les calories cibles
 * Ordre de priorité : protéines → lipides → glucides (en résidu)
 */
export function calcMacrosFromCalories(
  targetCalories: number,
  weight_kg: number
): TDEEMacros {
  const protein_g = Math.round(2.2 * weight_kg) // 2.2g/kg — priorité absolue
  const fat_g = Math.max(Math.round(1.0 * weight_kg), 40) // 1g/kg minimum
  const remaining = targetCalories - protein_g * 4 - fat_g * 9
  const carbs_g = Math.max(0, Math.round(remaining / 4))
  return { calories: targetCalories, protein_g, fat_g, carbs_g }
}

/**
 * Construit le TDEEBreakdown complet
 *
 * Si hasEnoughData (≥ 7 jours de logs) → TDEE depuis données réelles
 * Sinon → fallback multiplicateur classique Harris-Benedict :
 *   sédentaire (0-2j/sem) × 1.375
 *   modéré (3-4j/sem)     × 1.55
 *   actif (5+j/sem)       × 1.725
 */
export function buildTDEEBreakdown(params: {
  weight_kg: number
  height_cm: number
  age: number
  gender: string
  goal: string
  sessionsPerWeek: number
  avgStepsPerDay: number
  avgTonnagePerSession: number
  avgCardioCaloriesPerDay: number
  hasEnoughData: boolean
  logsCount: number
}): TDEEBreakdown {
  const {
    weight_kg, height_cm, age, gender, goal,
    sessionsPerWeek, avgStepsPerDay, avgTonnagePerSession,
    avgCardioCaloriesPerDay, hasEnoughData, logsCount,
  } = params

  const bmr = calcBMR(weight_kg, height_cm, age, gender)
  const trainingCalories = calcTrainingCalories(avgTonnagePerSession, sessionsPerWeek)
  // Cardio lissé sur 30 jours — indépendant du flag hasEnoughData
  const cardioCalories = Math.round(avgCardioCaloriesPerDay)

  let stepsCalories = 0
  let tdee: number

  if (hasEnoughData) {
    stepsCalories = calcStepsCalories(avgStepsPerDay)
    tdee = bmr + stepsCalories + trainingCalories + cardioCalories
  } else {
    // Fallback multiplicateur classique + cardio si disponible
    const multiplier =
      sessionsPerWeek >= 5 ? 1.725 :
      sessionsPerWeek >= 3 ? 1.55  : 1.375
    tdee = Math.round(bmr * multiplier) + cardioCalories
  }

  const adjustment = goalAdjustment(goal)
  const targetCalories = Math.max(1200, tdee + adjustment)
  const macros = calcMacrosFromCalories(targetCalories, weight_kg)

  return {
    bmr,
    stepsCalories: hasEnoughData ? stepsCalories : 0,
    trainingCalories,
    cardioCalories,
    tdee,
    adjustment,
    targetCalories,
    macros,
    hasEnoughData,
    avgStepsPerDay: hasEnoughData ? avgStepsPerDay : 0,
    logsCount,
  }
}

// ── Paliers calories séance (activité du JOUR, pas hebdo lissé) ──────────────

/**
 * Calories brûlées pour UNE séance selon son tonnage réel.
 * Plus fin que calcTrainingCalories qui lisse sur la semaine.
 * Barème : <5k=250, 5-8k=350, 8-12k=450, 12-18k=550, 18-25k=600, >25k=650
 */
export function calcWorkoutKcalFromTonnage(tonnageKg: number | null | undefined): number {
  if (!tonnageKg || tonnageKg <= 0) return 0
  if (tonnageKg > 25000) return 650
  if (tonnageKg > 18000) return 600
  if (tonnageKg > 12000) return 550
  if (tonnageKg > 8000)  return 450
  if (tonnageKg > 5000)  return 350
  return 250
}

// ── Cible calorique journalière dynamique ─────────────────────────────────────

export type DailyTarget = {
  bmr: number
  stepsKcal: number             // calories steps du JOUR
  workoutKcal: number           // calories séance du JOUR (0 si repos)
  tdee: number                  // BMR + steps + workout
  adjustment: number            // surplus/déficit objectif
  targetCalories: number        // cible effective (plancher 1 200)
  macros: TDEEMacros
  todaySteps: number | null
  todayWorkoutTonnage: number | null
  usedFallback: boolean         // pas de données → multiplicateur
  isCustom: boolean             // macros manuelles actives
}

/**
 * Source unique de vérité pour la cible calorique du jour.
 * Utilise les données RÉELLES du jour (steps + tonnage séance).
 * Fallback BMR × multiplicateur si aucune donnée d'activité disponible.
 *
 * Appelé depuis : dashboard, nutrition/page, api/coach
 */
export function calcDailyTarget(params: {
  weight_kg?:         number | null
  height_cm?:         number | null
  age?:               number | null
  gender?:            string | null
  goal?:              string | null
  sessions_per_week?: number | null
  macro_mode?:        string | null
  custom_calories?:   number | null
  custom_protein_g?:  number | null
  custom_carbs_g?:    number | null
  custom_fat_g?:      number | null
  todaySteps?:              number | null
  todayWorkoutTonnage?:     number | null
}): DailyTarget {
  const w = (params.weight_kg && params.weight_kg > 30 && params.weight_kg < 250)
    ? params.weight_kg : 75

  const bmr = calcBMR(w, params.height_cm ?? 175, params.age ?? 30, params.gender ?? 'male')

  const steps   = params.todaySteps   ?? null
  const tonnage = params.todayWorkoutTonnage ?? null

  const stepsKcal   = steps   ? Math.round(steps * 0.04) : 0
  const workoutKcal = calcWorkoutKcalFromTonnage(tonnage)

  const hasActivity = steps !== null || tonnage !== null
  let tdee: number
  let usedFallback = false

  if (hasActivity) {
    tdee = bmr + stepsKcal + workoutKcal
  } else {
    const sessions = params.sessions_per_week ?? 3
    const mult = sessions >= 5 ? 1.725 : sessions >= 3 ? 1.55 : 1.375
    tdee = Math.round(bmr * mult)
    usedFallback = true
  }

  const adjustment = goalAdjustment(params.goal ?? 'general')
  const isCustom = params.macro_mode === 'custom' &&
    !!(params.custom_protein_g || params.custom_calories)

  let targetCalories: number
  let macros: TDEEMacros

  if (isCustom) {
    targetCalories = params.custom_calories ?? Math.max(1200, tdee + adjustment)
    const base = calcMacrosFromCalories(targetCalories, w)
    macros = {
      calories:  targetCalories,
      protein_g: params.custom_protein_g ?? base.protein_g,
      carbs_g:   params.custom_carbs_g   ?? base.carbs_g,
      fat_g:     params.custom_fat_g     ?? base.fat_g,
    }
  } else {
    targetCalories = Math.max(1200, tdee + adjustment)
    macros = calcMacrosFromCalories(targetCalories, w)
  }

  return {
    bmr, stepsKcal, workoutKcal, tdee, adjustment, targetCalories, macros,
    todaySteps: steps, todayWorkoutTonnage: tonnage, usedFallback, isCustom,
  }
}

/**
 * Calcul simplifié côté client (sans données réelles steps/tonnage)
 * Utilisé comme fallback quand l'API TDEE n'a pas encore répondu.
 * Mifflin-St Jeor + multiplicateur d'activité selon sessions/semaine.
 */
export function calcTDEESimple(params: {
  weight_kg: number
  height_cm?: number | null
  age?: number | null
  gender?: string | null
  goal?: string | null
  sessions_per_week?: number | null
}): TDEEMacros {
  const w = params.weight_kg
  const h = params.height_cm ?? 175
  const a = params.age ?? 30
  const g = params.gender ?? 'male'
  const sessions = params.sessions_per_week ?? 3
  const goal = params.goal ?? 'general'

  const bmr = calcBMR(w, h, a, g)
  const multiplier = sessions >= 5 ? 1.725 : sessions >= 3 ? 1.55 : 1.375
  const tdee = Math.round(bmr * multiplier)
  const targetCalories = Math.max(1200, tdee + goalAdjustment(goal))
  return calcMacrosFromCalories(targetCalories, w)
}
