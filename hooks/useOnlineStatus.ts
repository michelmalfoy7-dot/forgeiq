'use client'

import { useState, useEffect } from 'react'

/**
 * Retourne true si le navigateur a accès au réseau.
 * Se met à jour automatiquement via les événements 'online' / 'offline'.
 */
export function useOnlineStatus(): boolean {
  // Initialisation côté serveur : on suppose connecté (SSR/SSG)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Synchronisation initiale (en cas de montage après changement d'état)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
