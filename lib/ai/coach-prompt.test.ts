import { describe, it, expect } from 'vitest'
import { calcProteinTarget } from './coach-prompt'

describe('calcProteinTarget (g/kg selon objectif, ratios ISSN/ACSM)', () => {
  it('prise de masse / force : ~2.0 g/kg', () => {
    expect(calcProteinTarget('muscle_gain', 80)).toBe(160) // 80 × (1.8+2.2)/2
    expect(calcProteinTarget('strength', 80)).toBe(160)
  })

  it('perte de poids : ~1.9 g/kg (préserve la masse)', () => {
    expect(calcProteinTarget('weight_loss', 80)).toBe(152) // 80 × 1.9
  })

  it('endurance : ~1.4 g/kg', () => {
    expect(calcProteinTarget('endurance', 70)).toBe(98) // 70 × 1.4
  })

  it('général : ~1.6 g/kg', () => {
    expect(calcProteinTarget('general', 75)).toBe(120) // 75 × 1.6
  })

  it('objectif inconnu → barème général', () => {
    expect(calcProteinTarget('xyz', 75)).toBe(120)
  })

  it('poids invalide ou manquant → défaut 75 kg', () => {
    expect(calcProteinTarget('muscle_gain', null)).toBe(150) // 75 × 2.0
    expect(calcProteinTarget('muscle_gain', 10)).toBe(150)   // < 30 → 75
    expect(calcProteinTarget('muscle_gain', 300)).toBe(150)  // > 250 → 75
  })
})
