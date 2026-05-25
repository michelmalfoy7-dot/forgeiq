'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

/**
 * Affiche un banner succès/annulation après le retour de Stripe Checkout.
 * Lit les query params ?upgrade=success|cancelled et nettoie l'URL.
 * Doit être wrappé dans <Suspense> côté serveur.
 */
export function UpgradeBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [type, setType] = useState<'success' | 'cancelled' | null>(null)

  useEffect(() => {
    const upgrade = searchParams.get('upgrade')
    if (upgrade === 'success') setType('success')
    else if (upgrade === 'cancelled') setType('cancelled')

    if (upgrade) {
      // Nettoyer l'URL sans recharger la page
      const url = new URL(window.location.href)
      url.searchParams.delete('upgrade')
      router.replace(url.pathname, { scroll: false })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!type) return null

  return (
    <div className="rounded-2xl px-4 py-4 flex items-start gap-3 relative"
      style={type === 'success'
        ? { background: '#B4FF4A15', border: '1px solid #B4FF4A44' }
        : { background: '#6B728012', border: '1px solid var(--fiq-border)' }
      }>
      <span className="text-xl flex-shrink-0">{type === 'success' ? '🎉' : '↩️'}</span>
      <div className="flex-1 min-w-0">
        {type === 'success' ? (
          <>
            <p className="font-black text-sm" style={{ color: 'var(--fiq-accent)' }}>
              Bienvenue dans ForgeIQ Pro !
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              Accès activé. Coach IA illimité et toutes les fonctionnalités Pro sont disponibles.
            </p>
          </>
        ) : (
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            Paiement annulé. Tes données restent intactes — reviens quand tu veux.
          </p>
        )}
      </div>
      <button onClick={() => setType(null)} className="flex-shrink-0 mt-0.5"
        style={{ color: 'var(--fiq-muted)' }}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
