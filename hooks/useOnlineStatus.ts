'use client'

import { useState, useEffect } from 'react'

/**
 * Retourne true si le navigateur a accès au réseau.
 * Se met à jour automatiquement via les événements 'online' / 'offline'.
 */
export function useOnlineStatus(): boolean {
  // Toujours true en SSR — état identique serveur/client pour éviter l'hydration mismatch.
  // La valeur réelle est synchronisée dans useEffect (côté client uniquement).
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
