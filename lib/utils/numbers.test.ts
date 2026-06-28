import { describe, it, expect } from 'vitest'
import { roundWeight, formatWeight, weightDelta, parseWeightInput } from './numbers'

describe('roundWeight', () => {
  it('élimine les erreurs IEEE 754', () => {
    expect(roundWeight(6.8 - 5)).toBe(1.8)
    expect(roundWeight(0.1 + 0.2)).toBe(0.3)
  })
  it('arrondit à 2 décimales', () => {
    expect(roundWeight(1.005)).toBe(1) // IEEE : 1.005 → 1.00499… → arrondi 1
    expect(roundWeight(2.346)).toBe(2.35)
  })
})

describe('formatWeight', () => {
  it('retire les zéros superflus', () => {
    expect(formatWeight(1.8)).toBe('1.8')
    expect(formatWeight(10)).toBe('10')
    expect(formatWeight(0.25)).toBe('0.25')
    expect(formatWeight(6.8)).toBe('6.8')
  })
})

describe('weightDelta', () => {
  it('formate le delta avec signe et unité', () => {
    expect(weightDelta(5, 6.8)).toBe('-1.8kg')
    expect(weightDelta(9, 6.8)).toBe('+2.2kg')
    expect(weightDelta(5, 4.5)).toBe('+0.5kg')
    expect(weightDelta(5, 5)).toBe('0kg')
  })
})

describe('parseWeightInput', () => {
  it('accepte virgule et point', () => {
    expect(parseWeightInput('6,8')).toBe(6.8)
    expect(parseWeightInput('3.75')).toBe(3.75)
    expect(parseWeightInput(' 80 ')).toBe(80)
  })
  it('retourne NaN pour une valeur invalide', () => {
    expect(Number.isNaN(parseWeightInput('abc'))).toBe(true)
    expect(Number.isNaN(parseWeightInput(''))).toBe(true)
  })
})
