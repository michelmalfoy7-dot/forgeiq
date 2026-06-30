/**
 * Lissage exponentiel (EWMA — Exponentially Weighted Moving Average) du poids.
 * Atténue les variations hydriques quotidiennes (±2 kg) pour révéler la vraie tendance.
 *
 * factor = 0.1 → "mémoire" d'environ 10 jours.
 *
 * Sanity check : si la tendance précédente s'écarte de plus de 25% du poids
 * actuel (donnée corrompue / saisie erronée), on repart du poids actuel pour
 * éviter une convergence lente sur une valeur aberrante.
 *
 * Extrait de api/ewma/route.ts pour être testable.
 */
export function calculateEWMA(
  previousTrend: number | null,
  currentWeight: number,
  factor = 0.1
): number {
  if (previousTrend === null || previousTrend === undefined) return currentWeight
  const deviation = Math.abs(previousTrend - currentWeight) / currentWeight
  if (deviation > 0.25) return currentWeight
  return previousTrend + factor * (currentWeight - previousTrend)
}
