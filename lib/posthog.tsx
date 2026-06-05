'use client'

import { useEffect } from 'react'

// Flag module-level — évite la double initialisation (HMR, StrictMode)
// Remplace posthog.__loaded (propriété interne non documentée, fragile aux upgrades)
let posthogInitialized = false

/**
 * Charge PostHog en différé (import dynamique) pour ne pas alourdir le bundle initial.
 * Utilisation : <PostHogProvider>{children}</PostHogProvider> dans le layout racine.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return

    // Import dynamique : PostHog (~70KB) ne bloque pas le LCP
    import('posthog-js').then(({ default: posthog }) => {
      if (posthogInitialized) return // évite la double initialisation (HMR)
      posthogInitialized = true
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
        capture_pageview: true,
        capture_pageleave: true,
        // Respect RGPD — pas de cookies tiers
        persistence: 'localStorage',
        // Pas de recording des inputs (données sensibles fitness)
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '[data-sensitive]',
        },
      })
    })
  }, [])

  // Pas de Provider wrapper nécessaire (usePostHog() non utilisé dans l'app)
  return <>{children}</>
}
