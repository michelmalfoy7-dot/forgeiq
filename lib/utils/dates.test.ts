import { describe, it, expect } from 'vitest'
import { getISOWeek, getISOWeeksInYear, isPrevWeek } from './dates'

describe('getISOWeek', () => {
  it('1er janvier jeudi → semaine 1 (2026)', () => {
    expect(getISOWeek(new Date(2026, 0, 1))).toBe('2026-W01')
  })
  it('lundi de fin décembre rattaché à la semaine 1 de l année suivante', () => {
    // 29 déc 2025 (lundi) → son jeudi est le 1er janv 2026 → 2026-W01
    expect(getISOWeek(new Date(2025, 11, 29))).toBe('2026-W01')
  })
  it('31 déc 2020 (jeudi) → 2020-W53 (année à 53 semaines)', () => {
    expect(getISOWeek(new Date(2020, 11, 31))).toBe('2020-W53')
  })
  it('4 janvier toujours en semaine 1', () => {
    expect(getISOWeek(new Date(2021, 0, 4))).toBe('2021-W01')
  })
})

describe('getISOWeeksInYear (52 ou 53)', () => {
  it('2020 a 53 semaines ISO (année bissextile, 1er janv mercredi)', () => {
    expect(getISOWeeksInYear(2020)).toBe(53)
  })
  it('2026 a 53 semaines ISO (1er janv jeudi)', () => {
    expect(getISOWeeksInYear(2026)).toBe(53)
  })
  it('2021 a 52 semaines ISO', () => {
    expect(getISOWeeksInYear(2021)).toBe(52)
  })
  it('2025 a 52 semaines ISO', () => {
    expect(getISOWeeksInYear(2025)).toBe(52)
  })
})

describe('isPrevWeek', () => {
  it('semaines consécutives dans la même année', () => {
    expect(isPrevWeek('2026-W01', '2026-W02')).toBe(true)
    expect(isPrevWeek('2026-W05', '2026-W06')).toBe(true)
  })
  it('non consécutives → false', () => {
    expect(isPrevWeek('2026-W01', '2026-W03')).toBe(false)
    expect(isPrevWeek('2026-W06', '2026-W05')).toBe(false)
  })
  it('passage d année normal (52 semaines)', () => {
    expect(isPrevWeek('2025-W52', '2026-W01')).toBe(true)
  })
  it('passage d année à 53 semaines : W52 n est PAS la précédente', () => {
    // 2020 a 53 semaines → la semaine avant 2021-W01 est 2020-W53, pas W52
    expect(isPrevWeek('2020-W52', '2021-W01')).toBe(false)
    expect(isPrevWeek('2020-W53', '2021-W01')).toBe(true)
  })
})
