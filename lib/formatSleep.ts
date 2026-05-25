/**
 * Formate des minutes en format lisible h min
 * 82 → "1h 22min" | 60 → "1h" | 40 → "40min" | 0 → "—"
 */
export function formatSleep(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

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
