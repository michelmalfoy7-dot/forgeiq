/**
 * Score de récupération composite 0–10 — fonction pure.
 *
 * Extrait de app/(app)/dashboard/page.tsx pour être testable.
 * 6 composantes principales (max 9 pts) + bonus HRV optionnel (max 1 pt) :
 *   sommeil profond 1.5 · sommeil total 2 · fatigue 2 · pas 1.5 · humeur 1 · EWMA 1 · HRV 1
 * Score = round(pts / 9 × 10), borné [0, 10].
 */

export type RecoveryBreakdown = {
  deepSleepPts: number
  totalSleepPts: number
  fatiguePts: number
  stepsPts: number
  moodPts: number
  ewmaPts: number
  hrvPts: number
}

export type RecoveryResult = {
  score: number
  label: string
  limitingFactor: string
  breakdown: RecoveryBreakdown
}

export type RecoveryInput = {
  sleepDeepMin: number | null
  sleepTotalMin: number | null
  fatigueScore: number | null     // 1 (énergie) → 10 (épuisé)
  steps: number | null
  stepsGoal: number | null
  motivationScore: number | null  // humeur 1–10
  weightTrend: number | null      // EWMA du jour
  prevWeightTrend: number | null  // EWMA de la veille
  weightKg: number | null         // poids brut (bonus partiel si pas d'EWMA)
  hrvMs: number | null
  tempDeviationC: number | null
}

const MAX_PTS = 9

export function calcRecoveryScore(input: RecoveryInput): RecoveryResult {
  let pts = 0

  // Sommeil profond (max 1.5 pts)
  const deepSleepMin = input.sleepDeepMin
  let deepSleepPts = 0
  if (deepSleepMin !== null) {
    if (deepSleepMin >= 90) deepSleepPts = 1.5
    else if (deepSleepMin >= 60) deepSleepPts = 1
  }
  pts += deepSleepPts

  // Sommeil total (max 2 pts)
  const sleepTotal = input.sleepTotalMin
  let totalSleepPts = 0
  if (sleepTotal !== null) {
    if (sleepTotal >= 420) totalSleepPts = 2
    else if (sleepTotal >= 360) totalSleepPts = 1
  }
  pts += totalSleepPts

  // Fatigue inversée (max 2 pts) — 1 = plein d'énergie, 10 = épuisé
  const fatigue = input.fatigueScore
  let fatiguePts = 0
  if (fatigue !== null) {
    if (fatigue <= 2) fatiguePts = 2
    else if (fatigue <= 5) fatiguePts = 1
  }
  pts += fatiguePts

  // Pas vs objectif (max 1.5 pts)
  const steps = input.steps
  const stepsGoal = input.stepsGoal ?? 8000
  let stepsPts = 0
  if (steps !== null && stepsGoal > 0) {
    const ratio = steps / stepsGoal
    if (ratio >= 1) stepsPts = 1.5
    else if (ratio >= 0.7) stepsPts = 1
  }
  pts += stepsPts

  // Humeur (max 1 pt)
  const mood = input.motivationScore
  let moodPts = 0
  if (mood !== null) {
    if (mood >= 7) moodPts = 1
    else if (mood >= 5) moodPts = 0.5
  }
  pts += moodPts

  // Poids EWMA stable vs veille (max 1 pt) — compare EWMA J vs EWMA J-1
  const todayTrend = input.weightTrend
  let ewmaPts = 0
  if (todayTrend !== null) {
    const prevDayTrend = input.prevWeightTrend
    if (prevDayTrend !== null && Math.abs(todayTrend - prevDayTrend) < 0.5) ewmaPts = 1
  } else if (input.weightKg !== null) {
    ewmaPts = 0.5 // données partielles → bonus partiel
  }
  pts += ewmaPts

  // HRV (bonus optionnel, max 1 pt) — variabilité cardiaque en ms
  const hrv = input.hrvMs
  let hrvPts = 0
  if (hrv !== null) {
    if (hrv >= 70) hrvPts = 1
    else if (hrv >= 50) hrvPts = 0.5
  }
  pts += hrvPts

  const score = Math.min(10, Math.max(0, Math.round((pts / MAX_PTS) * 10)))

  let label: string
  if (score >= 7) label = 'Optimale'
  else if (score >= 5) label = 'Correcte'
  else label = 'Limitée'

  // Facteur limitant principal (ordre de priorité)
  let limitingFactor = ''
  if (deepSleepMin !== null && deepSleepMin < 60) limitingFactor = 'Sommeil profond insuffisant'
  else if (sleepTotal !== null && sleepTotal < 360) limitingFactor = 'Durée de sommeil insuffisante'
  else if (fatigue !== null && fatigue > 7) limitingFactor = 'Fatigue élevée'
  else if (steps !== null && steps < stepsGoal * 0.5) limitingFactor = 'Activité physique faible'
  else if (mood !== null && mood < 5) limitingFactor = 'Humeur basse'
  const tempDev = input.tempDeviationC
  if (!limitingFactor && tempDev !== null && Math.abs(tempDev) > 0.3) {
    limitingFactor = `Température basale ${tempDev > 0 ? '+' : ''}${tempDev}°C`
  }

  return {
    score,
    label,
    limitingFactor,
    breakdown: { deepSleepPts, totalSleepPts, fatiguePts, stepsPts, moodPts, ewmaPts, hrvPts },
  }
}
