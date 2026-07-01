import { getISOWeek } from './dates'

/**
 * Progression d'un programme actif — dérivée des séances complétées.
 * Aucune date d'adoption stockée : la 1ère séance du programme = début effectif.
 *
 * Différenciateur vs FitBod : suivi coaching long-terme (cycle, tonnage cumulé,
 * régularité, tendance).
 */

export type ProgramSession = {
  session_date: string            // 'YYYY-MM-DD'
  total_tonnage_kg: number | null
}

export type ProgramProgress = {
  sessionsCompleted: number
  totalTonnage: number
  avgTonnage: number
  weeksActive: number             // nb de semaines ISO distinctes avec ≥ 1 séance
  cyclesDone: number              // cycles complets du programme parcourus
  positionInCycle: number         // séance suivante dans le cycle (0 = début d'un nouveau cycle)
  cycleLength: number             // nb de séances par cycle (structure.days)
  trendPct: number | null         // tonnage 3 dernières vs 3 précédentes (%), null si < 6 séances
}

const round = (n: number) => Math.round(n)

export function computeProgramProgress(
  sessions: ProgramSession[],
  cycleLength: number,
): ProgramProgress {
  const sessionsCompleted = sessions.length
  const totalTonnage = round(sessions.reduce((acc, s) => acc + (s.total_tonnage_kg ?? 0), 0))
  const avgTonnage = sessionsCompleted > 0 ? round(totalTonnage / sessionsCompleted) : 0

  // Semaines ISO distinctes avec au moins une séance
  const weeks = new Set(sessions.map(s => getISOWeek(new Date(s.session_date + 'T12:00:00'))))
  const weeksActive = weeks.size

  const cyclesDone = cycleLength > 0 ? Math.floor(sessionsCompleted / cycleLength) : 0
  const positionInCycle = cycleLength > 0 ? sessionsCompleted % cycleLength : 0

  // Tendance tonnage : moyenne des 3 dernières séances vs les 3 précédentes
  let trendPct: number | null = null
  if (sessionsCompleted >= 6) {
    const tonnages = sessions.map(s => s.total_tonnage_kg ?? 0)
    const recent = tonnages.slice(-3)
    const older = tonnages.slice(-6, -3)
    const recentAvg = recent.reduce((a, b) => a + b, 0) / 3
    const olderAvg = older.reduce((a, b) => a + b, 0) / 3
    if (olderAvg > 0) trendPct = round(((recentAvg - olderAvg) / olderAvg) * 100)
  }

  return {
    sessionsCompleted, totalTonnage, avgTonnage,
    weeksActive, cyclesDone, positionInCycle, cycleLength, trendPct,
  }
}
