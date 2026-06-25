'use client'

import { useState, useEffect } from 'react'
import { X, Share, Download } from 'lucide-react'

type Platform = 'ios' | 'android' | null

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isChrome = /Chrome/.test(ua) && !/Edg|OPR/.test(ua)

  if (isIOS && isSafari) return 'ios'
  if (isAndroid && isChrome) return 'android'
  return null
}

export function InstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Déjà installée en mode standalone → rien afficher
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    if (isStandalone) return

    // Déjà rejeté de façon permanente
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) return

    const p = detectPlatform()
    if (!p) return

    setPlatform(p)
    const timer = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  // ── iOS Safari : bottom sheet avec instructions Share ──────────────────
  if (platform === 'ios') {
    return (
      <>
        {/* Overlay semi-transparent */}
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={dismiss}
        />

        {/* Bottom sheet */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 pb-safe"
          style={{
            background: 'var(--fiq-card)',
            border: '1px solid var(--fiq-border)',
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          }}
        >
          {/* Handle */}
          <div
            className="w-10 h-1 rounded-full mx-auto mb-4"
            style={{ background: 'var(--fiq-border)' }}
          />

          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Icône app */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shrink-0"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
              >
                F
              </div>
              <div>
                <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>
                  Installe ForgeIQ
                </p>
                <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                  Accès rapide depuis ton écran d'accueil
                </p>
              </div>
            </div>
            <button onClick={dismiss} className="p-1 mt-1">
              <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
            </button>
          </div>

          {/* Étapes */}
          <div className="space-y-3 mb-5">
            <div
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{ background: 'var(--fiq-faint)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#3D8BFF22', border: '1px solid #3D8BFF44' }}
              >
                <Share className="w-4 h-4" style={{ color: 'var(--fiq-blue)' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>
                  1. Appuie sur le bouton Partager
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  L'icône <span className="font-bold">⬆</span> en bas de Safari
                </p>
              </div>
            </div>

            <div
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{ background: 'var(--fiq-faint)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{ background: '#B4FF4A22', border: '1px solid #B4FF4A44' }}
              >
                ➕
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>
                  2. "Sur l'écran d'accueil"
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  Fais défiler le menu et appuie sur cette option
                </p>
              </div>
            </div>

            <div
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{ background: 'var(--fiq-faint)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{ background: '#FF6B3522', border: '1px solid #FF6B3544' }}
              >
                ✅
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>
                  3. Confirme "Ajouter"
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  L'icône ForgeIQ apparaît comme une vraie app
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="w-full py-3 rounded-2xl text-sm font-black"
            style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
          >
            Plus tard
          </button>
        </div>
      </>
    )
  }

  // ── Android Chrome : banner discret en haut ────────────────────────────
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
        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
      >
        F
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>
          Installer ForgeIQ
        </p>
        <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          Ajoute l&apos;app sur ton écran d&apos;accueil
        </p>
      </div>

      <button
        onClick={() => {
          dismiss()
          // Le prompt natif Android est géré par le navigateur via beforeinstallprompt
          // L'utilisateur voit la modal système d'installation Chrome
        }}
        className="text-xs font-black px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1"
        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
      >
        <Download className="w-3 h-3" />
        Installer
      </button>

      <button onClick={dismiss} className="shrink-0 p-1">
        <X className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
      </button>
    </div>
  )
}
