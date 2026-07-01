import { describe, it, expect } from 'vitest'
import { computeProgramProgress, type ProgramSession } from './program-progress'

const s = (date: string, tonnage: number | null): ProgramSession => ({
  session_date: date, total_tonnage_kg: tonnage,
})

describe('computeProgramProgress', () => {
  it('programme vide', () => {
    const p = computeProgramProgress([], 4)
    expect(p).toMatchObject({
      sessionsCompleted: 0, totalTonnage: 0, avgTonnage: 0,
      weeksActive: 0, cyclesDone: 0, positionInCycle: 0, cycleLength: 4, trendPct: null,
    })
  })

  it('tonnage cumulé + moyenne', () => {
    const p = computeProgramProgress([s('2026-01-05', 1000), s('2026-01-06', 2000)], 4)
    expect(p.sessionsCompleted).toBe(2)
    expect(p.totalTonnage).toBe(3000)
    expect(p.avgTonnage).toBe(1500)
  })

  it('cycles : 4 séances sur un cycle de 4 → 1 cycle, position 0', () => {
    const four = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'].map(d => s(d, 1000))
    const p = computeProgramProgress(four, 4)
    expect(p.cyclesDone).toBe(1)
    expect(p.positionInCycle).toBe(0)
  })

  it('cycles : 5 séances sur un cycle de 4 → 1 cycle, position 1', () => {
    const five = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-12'].map(d => s(d, 1000))
    const p = computeProgramProgress(five, 4)
    expect(p.cyclesDone).toBe(1)
    expect(p.positionInCycle).toBe(1)
  })

  it('cycleLength 0 → pas de division par zéro', () => {
    const p = computeProgramProgress([s('2026-01-05', 1000)], 0)
    expect(p.cyclesDone).toBe(0)
    expect(p.positionInCycle).toBe(0)
  })

  it('semaines ISO distinctes', () => {
    // 05 & 06 janv = W02, 12 janv = W03 → 2 semaines actives
    const p = computeProgramProgress([s('2026-01-05', 1), s('2026-01-06', 1), s('2026-01-12', 1)], 3)
    expect(p.weeksActive).toBe(2)
  })

  it('tendance tonnage : 3 dernières vs 3 précédentes', () => {
    const sessions = [
      s('2026-01-01', 1000), s('2026-01-02', 1000), s('2026-01-03', 1000),
      s('2026-01-08', 1100), s('2026-01-09', 1100), s('2026-01-10', 1100),
    ]
    const p = computeProgramProgress(sessions, 3)
    expect(p.trendPct).toBe(10) // (1100-1000)/1000
  })

  it('pas de tendance sous 6 séances', () => {
    const sessions = ['a', 'b', 'c', 'd', 'e'].map((_, i) => s(`2026-01-0${i + 1}`, 1000))
    expect(computeProgramProgress(sessions, 3).trendPct).toBeNull()
  })
})
