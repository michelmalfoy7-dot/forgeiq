'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log l'erreur pour Vercel Function Logs
    console.error('[Dashboard Error]', error.message, error.stack, error.digest)
  }, [error])

  return (
    <div className="p-4 max-w-lg mx-auto pt-12 space-y-6">
      <div className="text-center space-y-2">
        <p className="text-4xl">⚠️</p>
        <h1 className="text-xl font-black" style={{ color: 'var(--fiq-text)' }}>
          Erreur dashboard
        </h1>
        <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
          {error.message || 'Une erreur inattendue est survenue'}
        </p>
        {error.digest && (
          <p className="text-xs font-mono px-3 py-1 rounded-lg inline-block"
            style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}>
            {error.digest}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={reset}
          className="w-full py-3 rounded-xl font-black text-sm"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          Réessayer
        </button>
        <Link
          href="/checkin"
          className="block w-full py-3 rounded-xl font-semibold text-sm text-center"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          Aller au check-in
        </Link>
      </div>
    </div>
  )
}
