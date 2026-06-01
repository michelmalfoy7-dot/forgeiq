'use client'

import { useEffect, useState } from 'react'

/**
 * Splash screen PWA — affiché uniquement en mode standalone, une seule fois par session.
 * Durée totale : 1.5s (fade-in 400ms + pause 800ms + fade-out 300ms)
 */
export function SplashScreen() {
  // 'hidden' = pas rendu | 'entering' = fade-in | 'visible' = plein | 'leaving' = fade-out
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'visible' | 'leaving'>('hidden')

  useEffect(() => {
    // Uniquement en mode PWA standalone (installée sur écran d'accueil)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true

    if (!isStandalone) return

    // Une seule fois par session de navigation
    if (sessionStorage.getItem('fiq_splash_shown')) return
    sessionStorage.setItem('fiq_splash_shown', '1')

    // Phase 1 : rendre avec opacity 0
    setPhase('entering')

    // Phase 2 : déclencher le fade-in au prochain frame (force le reflow)
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('visible'))
    })

    // Phase 3 : début fade-out à 1.2s
    const fadeOutTimer = setTimeout(() => setPhase('leaving'), 1200)

    // Phase 4 : démonter à 1.5s
    const hideTimer = setTimeout(() => setPhase('hidden'), 1500)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(fadeOutTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (phase === 'hidden') return null

  const opacity = phase === 'visible' ? 1 : 0
  const transition =
    phase === 'leaving'
      ? 'opacity 300ms ease-out'
      : 'opacity 400ms ease-in'

  return (
    <div
      role="presentation"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0A0C0F',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        opacity,
        transition,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {/* Icône principale */}
      <span style={{ fontSize: '64px', lineHeight: 1, color: '#B4FF4A' }}>⚗️</span>

      {/* Nom de l'application */}
      <span
        style={{
          fontSize: '32px',
          fontWeight: 900,
          color: '#F0F2F5',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          fontFamily: 'var(--font-geist-sans, sans-serif)',
        }}
      >
        ForgeIQ
      </span>

      {/* Tagline */}
      <span
        style={{
          fontSize: '12px',
          color: '#6B7280',
          fontStyle: 'italic',
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}
      >
        Build smarter. Lift harder.
      </span>
    </div>
  )
}
