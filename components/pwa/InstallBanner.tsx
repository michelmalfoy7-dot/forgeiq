'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download, X } from 'lucide-react'

// Bannière "Installer l'app" — affichée uniquement si l'app n'est pas déjà installée
export function InstallBanner() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Déjà installée → on n'affiche rien
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)

    if (isStandalone) return

    // Déjà rejeté par l'utilisateur cette session
    const stored = sessionStorage.getItem('install-banner-dismissed')
    if (stored) return

    // Afficher après 2s (pas immédiatement pour ne pas perturber le chargement)
    const timer = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  function dismiss() {
    sessionStorage.setItem('install-banner-dismissed', '1')
    setDismissed(true)
    setShow(false)
  }

  if (!show || dismissed) return null

  return (
    <div
      className="fixed left-4 right-4 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg"
      style={{
        top: 'calc(env(safe-area-inset-top) + 12px)',
        background: 'var(--fiq-card)',
        border: '1px solid var(--fiq-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--fiq-accent)' }}
      >
        <Download className="w-4 h-4" style={{ color: 'var(--bg)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Installer ForgeIQ</p>
        <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Ajoute l&apos;app sur ton écran d&apos;accueil</p>
      </div>

      <Link
        href="/install"
        onClick={dismiss}
        className="text-xs font-black px-3 py-1.5 rounded-xl flex-shrink-0"
        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
      >
        Installer
      </Link>

      <button onClick={dismiss} className="flex-shrink-0 p-1">
        <X className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
      </button>
    </div>
  )
}
