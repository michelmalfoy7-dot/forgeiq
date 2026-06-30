/**
 * Calculs de dates ISO 8601 — semaine ISO, fonctions pures testables.
 *
 * Extrait de plusieurs routes (workout/complete, progress/year, progress)
 * où getISOWeek était dupliqué. Zone historiquement buggée : les années à
 * 53 semaines ISO (2015, 2020, 2026…) cassaient le calcul de streak.
 */

/**
 * Clé semaine ISO d'une date au format "YYYY-Www" (ex: "2026-W01").
 * Semaine ISO : commence le lundi, la semaine 1 contient le 1er jeudi de l'année.
 */
export function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // Décaler au jeudi de la semaine courante (ISO : la semaine appartient à l'année de son jeudi)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  )
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

/** Nombre de semaines ISO dans une année (52 ou 53). */
export function getISOWeeksInYear(year: number): number {
  const parsed = getISOWeek(new Date(year, 11, 28)).split('-W').map(Number)
  // Le 28 décembre appartient toujours à la dernière semaine ISO de son année.
  // S'il bascule en semaine 1 de l'année suivante (cas rare), l'année a 52 semaines.
  return parsed[0] === year ? parsed[1] : 52
}

/**
 * True si `lastWeekIso` est la semaine ISO juste avant `currentWeekIso`.
 * Gère le passage d'année, y compris les années à 53 semaines.
 */
export function isPrevWeek(lastWeekIso: string, currentWeekIso: string): boolean {
  const [ly, lw] = lastWeekIso.split('-W').map(Number)
  const [cy, cw] = currentWeekIso.split('-W').map(Number)
  // Passage d'année : la semaine 1 suit la dernière semaine (52 OU 53) de l'année précédente
  if (cy === ly + 1 && cw === 1) {
    return lw === getISOWeeksInYear(ly)
  }
  return cy === ly && cw === lw + 1
}
