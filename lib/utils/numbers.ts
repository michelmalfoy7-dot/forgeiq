/**
 * Utilitaires de précision numérique pour les poids en salle.
 *
 * Problème : en JS, 6.8 - 5 = 1.7999999999999998 (virgule flottante IEEE 754).
 * Solution : arrondir à 2 décimales via Math.round(x * 100) / 100.
 */

/** Arrondi précis à 2 décimales — élimine les erreurs IEEE 754 */
export const roundWeight = (n: number): number =>
  Math.round(n * 100) / 100

/**
 * Affichage propre d'un poids :
 * - 1.80 → "1.8"
 * - 6.80 → "6.8"
 * - 10.00 → "10"
 * - 0.25 → "0.25"
 */
export const formatWeight = (n: number): string =>
  parseFloat(roundWeight(n).toFixed(2)).toString()

/**
 * Delta entre deux poids, avec signe et unité.
 * weightDelta(5, 6.8)  → "-1.8kg"
 * weightDelta(9, 6.8)  → "+2.2kg"
 * weightDelta(5, 4.5)  → "+0.5kg"
 * weightDelta(5, 5)    → "0kg"
 */
export const weightDelta = (current: number, previous: number): string => {
  const diff = roundWeight(current - previous)
  const sign = diff > 0 ? '+' : ''
  return `${sign}${formatWeight(diff)}kg`
}

/**
 * Parse un poids saisi par l'utilisateur.
 * Accepte virgule et point : "6,8" → 6.8, "3.75" → 3.75
 * Retourne NaN si la valeur est invalide.
 */
export const parseWeightInput = (val: string): number =>
  parseFloat(val.replace(',', '.').trim())
