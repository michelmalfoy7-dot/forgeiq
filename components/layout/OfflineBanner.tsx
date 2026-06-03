'use client'

import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { WifiOff, RefreshCw } from 'lucide-react'

/**
 * Bannière sticky affichée quand le réseau est indisponible.
 * - Apparaît en haut de l'écran avec une animation slide-down
 * - Affiche un message de retour en ligne pendant 3 secondes
 * - Invisible si tout va bien → aucun impact sur le layout
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
      setShowReconnected(false)
    } else if (wasOffline) {
      // Vient de se reconnecter → message flash 3 secondes
      setShowReconnected(true)
      const t = setTimeout(() => {
        setShowReconnected(false)
        setWasOffline(false)
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [isOnline, wasOffline])

  // Invisible si online et jamais été offline
  if (isOnline && !showReconnected) return null

  if (showReconnected) {
    return (
      <div
        className="sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold"
        style={{
          background: '#B4FF4A',
          color: '#0A0C0F',
          animation: 'slideDown 0.25s ease-out',
        }}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Connexion rétablie — synchronisation en cours…
      </div>
    )
  }

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold"
      style={{
        background: '#FF6B3512',
        borderBottom: '1px solid #FF6B3544',
        color: '#FF6B35',
        animation: 'slideDown 0.25s ease-out',
      }}
    >
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        Mode hors-ligne — tes séances sont sauvegardées localement
      </span>
    </div>
  )
}
