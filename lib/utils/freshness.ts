/**
 * Fraîcheur musculaire — statut d'un groupe selon le temps écoulé depuis sa
 * dernière sollicitation. Utilisé par le widget dashboard et les badges du logger.
 *
 * Extrait de api/workout/muscle-freshness/route.ts pour être testable.
 */
export type FreshnessStatus = 'fresh' | 'moderate' | 'fatigued'

/**
 * @param daysSince jours écoulés depuis la dernière série sur ce muscle
 *  - < 2j (48h)  → 'fatigued'
 *  - 2–3j (48-72h) → 'moderate'
 *  - > 3j (72h)  → 'fresh'
 */
export function classifyMuscleFreshness(daysSince: number): FreshnessStatus {
  if (daysSince < 2) return 'fatigued'
  if (daysSince < 3) return 'moderate'
  return 'fresh'
}
