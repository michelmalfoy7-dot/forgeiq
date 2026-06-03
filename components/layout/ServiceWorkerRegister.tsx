'use client'

import { useEffect } from 'react'

/**
 * Enregistre le Service Worker et gère les mises à jour silencieuses.
 * Lorsqu'un nouveau SW est en attente, on l'active immédiatement via
 * SKIP_WAITING pour que l'utilisateur bénéficie des dernières corrections
 * sans avoir à fermer tous les onglets.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then(registration => {
        // Vérifier les mises à jour toutes les 60 min
        setInterval(() => registration.update(), 60 * 60 * 1000)

        // Si un nouveau SW est en attente, l'activer immédiatement
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nouveau SW prêt — activer sans rechargement page
              newWorker.postMessage('SKIP_WAITING')
            }
          })
        })
      })
      .catch(() => {
        // Enregistrement SW échoué silencieusement (ex: mode privé Firefox)
      })
  }, [])

  return null
}
