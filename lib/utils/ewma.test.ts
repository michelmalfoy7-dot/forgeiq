import { describe, it, expect } from 'vitest'
import { calculateEWMA } from './ewma'

describe('calculateEWMA', () => {
  it('initialise sur le poids actuel si aucune tendance précédente', () => {
    expect(calculateEWMA(null, 80)).toBe(80)
    expect(calculateEWMA(undefined as unknown as null, 80)).toBe(80)
  })

  it('lisse vers le poids actuel avec factor 0.1', () => {
    expect(calculateEWMA(80, 82)).toBeCloseTo(80.2, 5)
    expect(calculateEWMA(80, 78)).toBeCloseTo(79.8, 5)
  })

  it('reste stable si le poids ne bouge pas', () => {
    expect(calculateEWMA(80, 80)).toBe(80)
  })

  it('repart du poids actuel si la tendance précédente est aberrante (>25%)', () => {
    // |50 − 80| / 80 = 0.375 > 0.25 → reset au poids actuel
    expect(calculateEWMA(50, 80)).toBe(80)
    // |110 − 80| / 80 = 0.375 > 0.25 → reset au poids actuel
    expect(calculateEWMA(110, 80)).toBe(80)
  })

  it('seuil exact à 25% : lisse si déviation = 0.25, reset si > 0.25', () => {
    // cur=100, prev=75 → dev = 0.25 (pas > 0.25) → lisse
    expect(calculateEWMA(75, 100)).toBeCloseTo(77.5, 5)
    // cur=100, prev=74 → dev = 0.26 > 0.25 → reset au poids actuel
    expect(calculateEWMA(74, 100)).toBe(100)
  })

  it('respecte un factor personnalisé', () => {
    expect(calculateEWMA(80, 90, 0.5)).toBeCloseTo(85, 5)
  })
})
