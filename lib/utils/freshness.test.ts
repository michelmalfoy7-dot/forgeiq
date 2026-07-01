import { describe, it, expect } from 'vitest'
import { classifyMuscleFreshness } from './freshness'

describe('classifyMuscleFreshness', () => {
  it('fatigued sous 48h', () => {
    expect(classifyMuscleFreshness(0.5)).toBe('fatigued')
    expect(classifyMuscleFreshness(1.9)).toBe('fatigued')
  })
  it('moderate entre 48h et 72h (borne 48h incluse)', () => {
    expect(classifyMuscleFreshness(2)).toBe('moderate')
    expect(classifyMuscleFreshness(2.5)).toBe('moderate')
    expect(classifyMuscleFreshness(2.99)).toBe('moderate')
  })
  it('fresh au-delà de 72h (borne 72h incluse)', () => {
    expect(classifyMuscleFreshness(3)).toBe('fresh')
    expect(classifyMuscleFreshness(7)).toBe('fresh')
  })
})
