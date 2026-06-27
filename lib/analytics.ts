'use client'

/**
 * Capture d'un événement analytics via PostHog (déjà initialisé dans PostHogProvider).
 * Lazy-load posthog-js pour ne pas alourdir le bundle. No-op silencieux si :
 *  - exécution SSR (pas de window)
 *  - PostHog non configuré (pas de NEXT_PUBLIC_POSTHOG_KEY)
 *
 * Événements north-star (activation = 1ère occurrence par user, calculée côté PostHog) :
 *  - workout_completed   → activation training
 *  - checkin_completed   → activation recovery
 *  - coach_message_sent  → activation coach (le fossé produit)
 * Funnel conversion :
 *  - pricing_viewed → checkout_started
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.capture(event, properties)
    })
    .catch(() => { /* analytics non-bloquant — ne doit jamais casser un flux utilisateur */ })
}
