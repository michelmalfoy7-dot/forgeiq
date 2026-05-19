'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return

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
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
