// Rate limiter in-memory — efficace sur instance Vercel chaude (warm function)
// Pour du multi-instance à grande échelle, migrer vers Upstash Redis.
//
// Usage :
//   const ok = rateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000) // 5 req/h par IP
//   if (!ok) return 429

type Entry = { count: number; resetAt: number }

// Map partagée au niveau du module (survit aux requêtes sur la même instance)
const store = new Map<string, Entry>()

/**
 * @returns true si la requête est autorisée, false si la limite est atteinte
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()

  // Purge paresseuse — évite la fuite mémoire lente sur instance chaude :
  // les entrées expirées ne sont sinon jamais retirées tant que la clé n'est
  // pas re-touchée. Ne se déclenche qu'au-delà d'un seuil (coût amorti).
  if (store.size > 5000) {
    for (const [k, v] of store) if (v.resetAt < now) store.delete(k)
  }

  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= max) return false
  entry.count++
  return true
}
