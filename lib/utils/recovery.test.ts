import { describe, it, expect } from 'vitest'
import { calcRecoveryScore, type RecoveryInput } from './recovery'

// Entrée de base — tout null (aucune donnée)
const base = (): RecoveryInput => ({
  sleepDeepMin: null,
  sleepTotalMin: null,
  fatigueScore: null,
  steps: null,
  stepsGoal: 8000,
  motivationScore: null,
  weightTrend: null,
  prevWeightTrend: null,
  weightKg: null,
  hrvMs: null,
  tempDeviationC: null,
})

describe('calcRecoveryScore — score global', () => {
  it('aucune donnée → score 0, label Limitée', () => {
    const r = calcRecoveryScore(base())
    expect(r.score).toBe(0)
    expect(r.label).toBe('Limitée')
    expect(r.limitingFactor).toBe('')
  })

  it('récupération parfaite → score plafonné à 10, Optimale', () => {
    const r = calcRecoveryScore({
      ...base(),
      sleepDeepMin: 90, sleepTotalMin: 420, fatigueScore: 1,
      steps: 9000, stepsGoal: 8000, motivationScore: 8,
      weightTrend: 80, prevWeightTrend: 80, hrvMs: 75,
    })
    expect(r.score).toBe(10)
    expect(r.label).toBe('Optimale')
    expect(r.breakdown).toEqual({
      deepSleepPts: 1.5, totalSleepPts: 2, fatiguePts: 2,
      stepsPts: 1.5, moodPts: 1, ewmaPts: 1, hrvPts: 1,
    })
  })

  it('récupération moyenne → score 5, Correcte', () => {
    const r = calcRecoveryScore({
      ...base(),
      sleepDeepMin: 60, sleepTotalMin: 360, fatigueScore: 5,
      steps: 5600, stepsGoal: 8000, motivationScore: 6,
    })
    expect(r.score).toBe(5) // 4.5/9 × 10 = 5
    expect(r.label).toBe('Correcte')
  })
})

describe('calcRecoveryScore — composantes', () => {
  it('sommeil profond : ≥90→1.5, ≥60→1, sinon 0', () => {
    expect(calcRecoveryScore({ ...base(), sleepDeepMin: 90 }).breakdown.deepSleepPts).toBe(1.5)
    expect(calcRecoveryScore({ ...base(), sleepDeepMin: 60 }).breakdown.deepSleepPts).toBe(1)
    expect(calcRecoveryScore({ ...base(), sleepDeepMin: 45 }).breakdown.deepSleepPts).toBe(0)
  })

  it('fatigue inversée : ≤2→2, ≤5→1, sinon 0', () => {
    expect(calcRecoveryScore({ ...base(), fatigueScore: 1 }).breakdown.fatiguePts).toBe(2)
    expect(calcRecoveryScore({ ...base(), fatigueScore: 5 }).breakdown.fatiguePts).toBe(1)
    expect(calcRecoveryScore({ ...base(), fatigueScore: 9 }).breakdown.fatiguePts).toBe(0)
  })

  it('pas : ratio ≥1→1.5, ≥0.7→1, sinon 0', () => {
    expect(calcRecoveryScore({ ...base(), steps: 8000, stepsGoal: 8000 }).breakdown.stepsPts).toBe(1.5)
    expect(calcRecoveryScore({ ...base(), steps: 5600, stepsGoal: 8000 }).breakdown.stepsPts).toBe(1)
    expect(calcRecoveryScore({ ...base(), steps: 4000, stepsGoal: 8000 }).breakdown.stepsPts).toBe(0)
  })

  it('HRV bonus : ≥70→1, ≥50→0.5, sinon 0', () => {
    expect(calcRecoveryScore({ ...base(), hrvMs: 70 }).breakdown.hrvPts).toBe(1)
    expect(calcRecoveryScore({ ...base(), hrvMs: 55 }).breakdown.hrvPts).toBe(0.5)
    expect(calcRecoveryScore({ ...base(), hrvMs: 40 }).breakdown.hrvPts).toBe(0)
  })

  it('EWMA : stable vs veille (<0.5) → 1pt ; poids brut seul → 0.5pt', () => {
    expect(calcRecoveryScore({ ...base(), weightTrend: 80, prevWeightTrend: 80.2 }).breakdown.ewmaPts).toBe(1)
    expect(calcRecoveryScore({ ...base(), weightTrend: 80, prevWeightTrend: 81 }).breakdown.ewmaPts).toBe(0)
    expect(calcRecoveryScore({ ...base(), weightTrend: null, weightKg: 80 }).breakdown.ewmaPts).toBe(0.5)
  })
})

describe('calcRecoveryScore — facteur limitant (ordre de priorité)', () => {
  it('sommeil profond < 60 prioritaire', () => {
    const r = calcRecoveryScore({ ...base(), sleepDeepMin: 30, sleepTotalMin: 300, fatigueScore: 9 })
    expect(r.limitingFactor).toBe('Sommeil profond insuffisant')
  })

  it('durée de sommeil < 360 si profond OK', () => {
    const r = calcRecoveryScore({ ...base(), sleepDeepMin: 70, sleepTotalMin: 300 })
    expect(r.limitingFactor).toBe('Durée de sommeil insuffisante')
  })

  it('fatigue > 7 si sommeil OK', () => {
    const r = calcRecoveryScore({ ...base(), sleepDeepMin: 70, sleepTotalMin: 400, fatigueScore: 8 })
    expect(r.limitingFactor).toBe('Fatigue élevée')
  })

  it('température basale en dernier recours si aucun autre facteur', () => {
    const r = calcRecoveryScore({
      ...base(),
      sleepDeepMin: 90, sleepTotalMin: 420, fatigueScore: 1,
      steps: 9000, motivationScore: 8, tempDeviationC: 0.5,
    })
    expect(r.limitingFactor).toBe('Température basale +0.5°C')
  })
})
