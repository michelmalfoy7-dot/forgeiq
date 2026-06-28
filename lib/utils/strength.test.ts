import { describe, it, expect } from 'vitest'
import {
  estimate1RM,
  tonnageMultiplier,
  setTonnage,
  pickPRCandidate,
  PR_EXCLUDED_TYPES,
} from './strength'

describe('estimate1RM (Epley)', () => {
  it('poids × (1 + reps/30), arrondi 1 décimale', () => {
    expect(estimate1RM(100, 1)).toBe(103.3)
    expect(estimate1RM(100, 5)).toBe(116.7)
    expect(estimate1RM(100, 10)).toBe(133.3)
  })
  it('0 si poids nul', () => {
    expect(estimate1RM(0, 5)).toBe(0)
  })
})

describe('tonnageMultiplier', () => {
  it('×1 par défaut', () => {
    expect(tonnageMultiplier({})).toBe(1)
    expect(tonnageMultiplier({ isBilateralDumbbell: false, isUnilateralDouble: false })).toBe(1)
  })
  it('×2 si haltères bilatéraux ou unilatéral des 2 côtés', () => {
    expect(tonnageMultiplier({ isBilateralDumbbell: true })).toBe(2)
    expect(tonnageMultiplier({ isUnilateralDouble: true })).toBe(2)
  })
})

describe('setTonnage', () => {
  it('poids × reps × multiplicateur', () => {
    expect(setTonnage(100, 5)).toBe(500)
    expect(setTonnage(100, 5, 2)).toBe(1000)
    expect(setTonnage(0, 5)).toBe(0)
  })
})

describe('pickPRCandidate', () => {
  it('retourne null si aucune série', () => {
    expect(pickPRCandidate([])).toBeNull()
  })

  it('priorité aux séries top_set même si plus légères', () => {
    const best = pickPRCandidate([
      { weight_kg: 100, reps: 5, set_type: 'top_set' },
      { weight_kg: 120, reps: 3, set_type: 'work' },
    ])
    expect(best?.weight_kg).toBe(100)
  })

  it('parmi plusieurs top_sets, la plus lourde gagne', () => {
    const best = pickPRCandidate([
      { weight_kg: 100, reps: 5, set_type: 'top_set' },
      { weight_kg: 110, reps: 3, set_type: 'top_set' },
    ])
    expect(best?.weight_kg).toBe(110)
  })

  it('exclut back-off / drop / échec / pause-rep en l absence de top_set', () => {
    const best = pickPRCandidate([
      { weight_kg: 120, reps: 3, set_type: 'drop' },
      { weight_kg: 100, reps: 5, set_type: 'work' },
    ])
    expect(best?.weight_kg).toBe(100)
  })

  it('null si toutes les séries sont exclues', () => {
    expect(pickPRCandidate([
      { weight_kg: 100, reps: 5, set_type: 'drop' },
      { weight_kg: 90, reps: 8, set_type: 'failure' },
    ])).toBeNull()
  })

  it('la plus lourde gagne ; à poids égal, le plus de reps', () => {
    expect(pickPRCandidate([
      { weight_kg: 100, reps: 5, set_type: 'work' },
      { weight_kg: 110, reps: 3, set_type: 'work' },
    ])?.weight_kg).toBe(110)

    expect(pickPRCandidate([
      { weight_kg: 100, reps: 5, set_type: 'work' },
      { weight_kg: 100, reps: 8, set_type: 'work' },
    ])?.reps).toBe(8)
  })

  it('traite set_type absent comme une série de travail éligible', () => {
    const best = pickPRCandidate([{ weight_kg: 80, reps: 6 }])
    expect(best?.weight_kg).toBe(80)
  })

  it('PR_EXCLUDED_TYPES couvre les 4 types de volume', () => {
    expect(PR_EXCLUDED_TYPES).toEqual(['backoff', 'drop', 'failure', 'pause_rep'])
  })
})
