import { describe, it, expect } from 'vitest'
import {
  calcBMR,
  calcStepsCalories,
  calcTrainingCalories,
  goalAdjustment,
  calcMacrosFromCalories,
  getActivityMET,
  calcCardioCalories,
  calcWorkoutKcalFromTonnage,
  getSessionMuscleGroup,
  calcWorkoutKcal,
  calcDailyTarget,
  calcTDEESimple,
} from './tdee'

describe('calcBMR (Mifflin-St Jeor)', () => {
  it('formule homme : 10×kg + 6.25×cm − 5×âge + 5', () => {
    expect(calcBMR(80, 180, 30, 'male')).toBe(1780)
  })
  it('formule femme : −161 au lieu de +5', () => {
    expect(calcBMR(60, 165, 30, 'female')).toBe(1320)
  })
})

describe('calcStepsCalories', () => {
  it('0.04 kcal par pas', () => {
    expect(calcStepsCalories(10000)).toBe(400)
    expect(calcStepsCalories(0)).toBe(0)
  })
})

describe('calcTrainingCalories (paliers tonnage, lissé /7)', () => {
  it('palier 8-12k = 450 kcal/séance', () => {
    expect(calcTrainingCalories(10000, 4)).toBe(257) // 450×4/7
  })
  it('palier <5k = 250 kcal/séance', () => {
    expect(calcTrainingCalories(3000, 3)).toBe(107) // 250×3/7
  })
})

describe('goalAdjustment', () => {
  it('surplus / déficit selon objectif', () => {
    expect(goalAdjustment('muscle_gain')).toBe(250)
    expect(goalAdjustment('strength')).toBe(150)
    expect(goalAdjustment('weight_loss')).toBe(-350)
    expect(goalAdjustment('general')).toBe(0)
    expect(goalAdjustment('inconnu')).toBe(0)
  })
})

describe('calcMacrosFromCalories', () => {
  it('protéines 2.2g/kg, lipides ≥1g/kg, glucides en résidu', () => {
    expect(calcMacrosFromCalories(2000, 80)).toEqual({
      calories: 2000,
      protein_g: 176, // 2.2×80
      fat_g: 80,      // 1×80
      carbs_g: 144,   // (2000 − 704 − 720) / 4
    })
  })
  it('plancher lipides à 40g pour les petits gabarits', () => {
    expect(calcMacrosFromCalories(1500, 30).fat_g).toBe(40)
  })
  it('jamais de glucides négatifs', () => {
    expect(calcMacrosFromCalories(500, 80).carbs_g).toBe(0)
  })
})

describe('getActivityMET + calcCardioCalories', () => {
  it('reconnaît les activités par mot-clé', () => {
    expect(getActivityMET('Course du matin')).toBe(9.8)
    expect(getActivityMET('Vélo 30min')).toBe(8.0)
    expect(getActivityMET('Activité inconnue')).toBe(6.0) // défaut
  })
  it('kcal = MET × poids × durée_h', () => {
    expect(calcCardioCalories('Course', 30, 70)).toBe(343) // 9.8×70×0.5
  })
})

describe('calcWorkoutKcalFromTonnage (paliers)', () => {
  it('mappe le tonnage vers les paliers kcal', () => {
    expect(calcWorkoutKcalFromTonnage(null)).toBe(0)
    expect(calcWorkoutKcalFromTonnage(0)).toBe(0)
    expect(calcWorkoutKcalFromTonnage(4000)).toBe(250)
    expect(calcWorkoutKcalFromTonnage(6000)).toBe(350)
    expect(calcWorkoutKcalFromTonnage(9000)).toBe(450)
    expect(calcWorkoutKcalFromTonnage(13000)).toBe(550)
    expect(calcWorkoutKcalFromTonnage(19000)).toBe(600)
    expect(calcWorkoutKcalFromTonnage(26000)).toBe(650)
  })
})

describe('getSessionMuscleGroup (classification)', () => {
  it('classe par mot-clé, accents ignorés', () => {
    expect(getSessionMuscleGroup('Jambes')).toBe('legs')
    expect(getSessionMuscleGroup('Dos / Pull')).toBe('back')
    expect(getSessionMuscleGroup('Push poitrine')).toBe('push')
    expect(getSessionMuscleGroup('Bras biceps')).toBe('arms')
    expect(getSessionMuscleGroup('Core abdos')).toBe('core')
    expect(getSessionMuscleGroup('Full body')).toBe('full_body')
    expect(getSessionMuscleGroup('')).toBe('general')
    expect(getSessionMuscleGroup(null)).toBe('general')
  })
})

describe('calcWorkoutKcal (blend séries 60% + tonnage 40%)', () => {
  it('Push 20 séries 9k → 384 kcal', () => {
    expect(calcWorkoutKcal(9000, 20, 'Push')).toBe(384) // 20×17×0.6 + 450×0.4
  })
  it('fallback tonnage seul si pas de séries', () => {
    expect(calcWorkoutKcal(5000, null)).toBe(250)
  })
  it('0 si pas de tonnage', () => {
    expect(calcWorkoutKcal(null, 20, 'Push')).toBe(0)
  })
})

describe('calcDailyTarget', () => {
  it('fallback multiplicateur si aucune donnée d activité', () => {
    const r = calcDailyTarget({
      weight_kg: 80, height_cm: 180, age: 30, gender: 'male',
      goal: 'general', sessions_per_week: 3,
    })
    expect(r.usedFallback).toBe(true)
    expect(r.targetCalories).toBe(2759) // round(1780×1.55)
  })

  it('déficit weight_loss borné [200-400] et plancher de sécurité', () => {
    const r = calcDailyTarget({
      weight_kg: 80, height_cm: 180, age: 30, gender: 'male',
      goal: 'weight_loss', sessions_per_week: 4,
      avgSteps30d: 10000, todayWorkoutTonnage: 9000,
      todayWorkoutSets: 20, todayWorkoutName: 'Push',
    })
    expect(r.usedFallback).toBe(false)
    expect(r.adjustment).toBeGreaterThanOrEqual(-400)
    expect(r.adjustment).toBeLessThanOrEqual(-200)
    expect(r.adjustment).toBe(-337) // round(2593×0.13)
    expect(r.targetCalories).toBe(2256) // tdee 2593 − 337
  })

  it('plancher de sécurité écrase une cible custom trop basse', () => {
    const r = calcDailyTarget({
      weight_kg: 80, macro_mode: 'custom', custom_calories: 1000,
      goal: 'general', sessions_per_week: 3, avgSteps30d: 8000,
    })
    expect(r.isCustom).toBe(true)
    expect(r.targetCalories).toBe(1630) // floor max(1200, round(2090×0.78))
  })

  it('priorité steps : moy 30j > hier > aujourd hui', () => {
    const withAvg = calcDailyTarget({
      weight_kg: 80, avgSteps30d: 10000, yesterdaySteps: 5000, todaySteps: 2000,
    })
    expect(withAvg.stepsUsed).toBe(10000)
    expect(withAvg.usedYesterdaySteps).toBe(false)

    const noAvg = calcDailyTarget({
      weight_kg: 80, yesterdaySteps: 5000, todaySteps: 2000,
    })
    expect(noAvg.stepsUsed).toBe(5000)
    expect(noAvg.usedYesterdaySteps).toBe(true)
  })

  it('surplus réduit de moitié les jours de repos', () => {
    const rest = calcDailyTarget({
      weight_kg: 80, goal: 'muscle_gain', isRestDay: true,
      avgSteps30d: 8000, sessions_per_week: 4,
    })
    expect(rest.adjustment).toBe(125) // round(250×0.5)

    const active = calcDailyTarget({
      weight_kg: 80, goal: 'muscle_gain', isRestDay: false,
      avgSteps30d: 8000, sessions_per_week: 4,
    })
    expect(active.adjustment).toBe(250)
  })

  it('jamais en dessous du plancher absolu 1200', () => {
    const r = calcDailyTarget({ weight_kg: 45, goal: 'weight_loss' })
    expect(r.targetCalories).toBeGreaterThanOrEqual(1200)
  })
})

describe('calcTDEESimple', () => {
  it('Mifflin × multiplicateur + ajustement objectif', () => {
    const m = calcTDEESimple({
      weight_kg: 80, height_cm: 180, age: 30, gender: 'male',
      goal: 'muscle_gain', sessions_per_week: 4,
    })
    expect(m.calories).toBe(3009) // round(1780×1.55) + 250
  })
})
