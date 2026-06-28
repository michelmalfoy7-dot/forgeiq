/**
 * Calculs de force purs — 1RM estimé, tonnage, détection de PR.
 *
 * Extrait de api/workout/complete/route.ts pour être testable et partagé.
 * Ce sont des chiffres auxquels l'utilisateur fait confiance (PRs, tonnage) :
 * ils méritent une couverture de tests dédiée (fondation correctness).
 */

/**
 * 1RM estimé — formule d'Epley.
 * 1RM = poids × (1 + reps / 30), arrondi à 1 décimale.
 * Exemple : 100kg × 5 reps → 116.7kg
 */
export function estimate1RM(weightKg: number, reps: number): number {
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

/**
 * Multiplicateur de tonnage (×2 si les deux côtés/haltères sont comptés).
 *  - isBilateralDumbbell : haltères 2 bras simultanément
 *  - isUnilateralDouble : exercice unilatéral fait des 2 côtés
 *
 * Le défaut de `unilateral_both_sides` est laissé à l'appelant (serveur = false,
 * logger = true) — ce helper ne fait que la combinaison logique.
 */
export function tonnageMultiplier(opts: {
  isBilateralDumbbell?: boolean
  isUnilateralDouble?: boolean
}): 1 | 2 {
  return (opts.isBilateralDumbbell || opts.isUnilateralDouble) ? 2 : 1
}

/** Tonnage d'une série : poids × reps × multiplicateur */
export function setTonnage(weightKg: number, reps: number, multiplier: 1 | 2 = 1): number {
  return weightKg * reps * multiplier
}

export type ScoredSet = { weight_kg: number; reps: number; set_type?: string | null }

/** Types de séries exclues de la détection de PR (séries de volume, pas de force max) */
export const PR_EXCLUDED_TYPES = ['backoff', 'drop', 'failure', 'pause_rep']

/**
 * Sélectionne la série candidate au PR pour un exercice :
 *  1. Priorité aux séries taguées `top_set` si présentes.
 *  2. Sinon, toutes les séries sauf back-off / drop / échec / pause-rep.
 *  3. La plus lourde gagne ; à poids égal, celle avec le plus de reps.
 * Retourne null si aucune série éligible.
 */
export function pickPRCandidate<T extends ScoredSet>(sets: T[]): T | null {
  if (sets.length === 0) return null
  const tagged = sets.filter(s => s.set_type === 'top_set')
  const candidates = tagged.length > 0
    ? tagged
    : sets.filter(s => !PR_EXCLUDED_TYPES.includes(s.set_type ?? ''))
  if (candidates.length === 0) return null
  return candidates.reduce((best, s) =>
    s.weight_kg > best.weight_kg
      ? s
      : s.weight_kg === best.weight_kg && s.reps > best.reps
      ? s
      : best
  )
}
