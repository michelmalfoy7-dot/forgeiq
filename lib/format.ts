/**
 * ForgeIQ — Utilitaires de formatage partagés
 */

/**
 * Formate des minutes de sommeil en format lisible
 * 0 → "—"
 * 45 → "45min"
 * 60 → "1h"
 * 90 → "1h 30min"
 */
export function formatSleep(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return '—'
  if (minutes < 60) return `${Math.round(minutes)}min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/**
 * Formate une durée en minutes → "1h30" ou "45min"
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return '—'
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}
