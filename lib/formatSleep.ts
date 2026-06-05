// Re-export depuis la source canonique — lib/format.ts
// Évite la duplication de logique (deux implémentations légèrement divergentes existaient)
export { formatSleep } from '@/lib/format'

/**
 * Convertit heures + minutes en minutes totales pour la DB
 */
export function hMinToMinutes(h: number | string, min: number | string): number | null {
  const hours = parseInt(String(h)) || 0
  const mins = parseInt(String(min)) || 0
  if (hours === 0 && mins === 0) return null
  return hours * 60 + mins
}

/**
 * Convertit minutes en {h, min} pour les inputs
 */
export function minutesToHMin(totalMin: number | string | null | undefined): { h: number; min: number } {
  const total = parseInt(String(totalMin)) || 0
  return { h: Math.floor(total / 60), min: total % 60 }
}
