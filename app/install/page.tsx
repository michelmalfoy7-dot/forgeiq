'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Dumbbell, Download, CheckCircle2, Smartphone, ArrowUpFromLine, Share2 } from 'lucide-react'

// Interface étendue pour l'événement PWA (non standard, Chrome uniquement)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'loading' | 'ios' | 'android-ready' | 'android-manual' | 'installed' | 'desktop'

export default function InstallPage() {
  const [platform, setPlatform] = useState<Platform>('loading')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
    const isAndroid = /Android/.test(ua)

    // Déjà installée en mode standalone ?
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)

    if (isStandalone) {
      setPlatform('installed')
      return
    }

    if (isIOS) {
      setPlatform('ios')
      return
    }

    // Android / Chrome Desktop : capturer beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setPlatform('android-ready')
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Si aucun prompt en 1.5s → instructions manuelles
    const timer = setTimeout(() => {
      if (platform === 'loading') {
        setPlatform(isAndroid ? 'android-manual' : 'desktop')
      }
    }, 1500)

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setPlatform('installed')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
        setPlatform('installed')
      }
    } finally {
      setInstalling(false)
      setDeferredPrompt(null)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'var(--bg)' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl"
          style={{ background: 'var(--fiq-accent)' }}
        >
          <Dumbbell className="w-10 h-10" style={{ color: 'var(--bg)' }} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            ForgeIQ
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
            Build smarter. Lift harder.
          </p>
        </div>
      </div>

      {/* Contenu selon plateforme */}
      <div className="w-full max-w-sm space-y-5">

        {/* ── CHARGEMENT ─────────────────────────────── */}
        {platform === 'loading' && (
          <div className="text-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto"
              style={{ borderColor: 'var(--fiq-accent)', borderTopColor: 'transparent' }} />
            <p className="text-sm mt-3" style={{ color: 'var(--fiq-muted)' }}>Détection de ta plateforme…</p>
          </div>
        )}

        {/* ── INSTALLÉE ──────────────────────────────── */}
        {(platform === 'installed' || installed) && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{ background: '#B4FF4A22', border: '2px solid var(--fiq-accent)' }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--fiq-accent)' }} />
            </div>
            <div>
              <h2 className="text-xl font-black" style={{ color: 'var(--fiq-text)' }}>App installée !</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
                ForgeIQ est sur ton écran d&apos;accueil. Bonne séance 💪
              </p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-sm"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              Ouvrir ForgeIQ
            </Link>
          </div>
        )}

        {/* ── ANDROID — PRÊT ─────────────────────────── */}
        {platform === 'android-ready' && !installed && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5 text-center space-y-3"
              style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
              <Smartphone className="w-10 h-10 mx-auto" style={{ color: 'var(--fiq-accent)' }} />
              <div>
                <h2 className="text-xl font-black" style={{ color: 'var(--fiq-text)' }}>Installer sur Android</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
                  Ajoute ForgeIQ à ton écran d&apos;accueil pour un accès instantané, même hors-ligne.
                </p>
              </div>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
              >
                {installing
                  ? <><div className="w-4 h-4 rounded-full border-2 border-b-transparent animate-spin" style={{ borderColor: 'var(--bg)' }} /> Installation…</>
                  : <><Download className="w-4 h-4" /> Installer l&apos;app</>
                }
              </button>
            </div>
            <FeatureList />
          </div>
        )}

        {/* ── ANDROID — MANUEL (prompt déjà vu) ─────── */}
        {(platform === 'android-manual') && !installed && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
              <h2 className="text-lg font-black" style={{ color: 'var(--fiq-text)' }}>
                Installer sur Android (Chrome)
              </h2>
              <div className="space-y-3">
                <Step n={1} icon="⋮" text="Appuie sur les 3 points en haut à droite de Chrome" />
                <Step n={2} icon="+" text={'Sélectionne "Ajouter à l\'écran d\'accueil"'} />
                <Step n={3} icon="✓" text={'Confirme en appuyant sur "Ajouter"'} />
              </div>
            </div>
            <FeatureList />
          </div>
        )}

        {/* ── DESKTOP ────────────────────────────────── */}
        {platform === 'desktop' && !installed && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
              <h2 className="text-lg font-black" style={{ color: 'var(--fiq-text)' }}>
                Installer sur ordinateur
              </h2>
              <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
                Dans Chrome ou Edge, clique sur l&apos;icône d&apos;installation (⊕) dans la barre d&apos;adresse.
              </p>
              <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
                Ou ouvre ce lien sur ton téléphone pour l&apos;installer en tant qu&apos;app mobile.
              </p>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono select-all"
                style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-accent)', border: '1px solid var(--fiq-border)' }}
              >
                getforgeiq.com/install
              </div>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-semibold text-sm"
              style={{ border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)', background: 'transparent' }}
            >
              Continuer dans le navigateur
            </Link>
          </div>
        )}

        {/* ── IOS SAFARI ─────────────────────────────── */}
        {platform === 'ios' && !installed && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
              <div className="flex items-center gap-3">
                <ArrowUpFromLine className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
                <h2 className="text-lg font-black" style={{ color: 'var(--fiq-text)' }}>
                  Installer sur iPhone / iPad
                </h2>
              </div>

              <div className="space-y-3">
                <Step
                  n={1}
                  icon="↑"
                  text={
                    <span>
                      Appuie sur le bouton{' '}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-xs align-middle"
                        style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}>
                        <Share2 className="w-3 h-3" /> Partager
                      </span>
                      {' '}en bas de Safari
                    </span>
                  }
                />
                <Step
                  n={2}
                  icon="＋"
                  text={
                    <span>
                      Fais défiler et appuie sur{' '}
                      <strong style={{ color: 'var(--fiq-text)' }}>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong>
                    </span>
                  }
                />
                <Step n={3} icon="✓" text='Appuie sur "Ajouter" en haut à droite' />
              </div>

              {/* Rappel : doit être ouvert dans Safari */}
              <div
                className="flex items-start gap-2 rounded-xl p-3 text-xs"
                style={{ background: '#3D8BFF12', border: '1px solid #3D8BFF44', color: '#3D8BFF' }}
              >
                <span className="text-base leading-none mt-0.5">ℹ️</span>
                <span>
                  Ce lien doit être ouvert dans <strong>Safari</strong> (pas Chrome iOS). Si tu es dans Chrome,
                  copie l&apos;URL et colle-la dans Safari.
                </span>
              </div>
            </div>

            <FeatureList />

            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm"
              style={{ border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)', background: 'transparent' }}
            >
              Continuer dans le navigateur
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-xs mt-10" style={{ color: 'var(--fiq-muted)' }}>
        ForgeIQ · getforgeiq.com
      </p>
    </div>
  )
}

// ── Sous-composants ───────────────────────────────────────────

function Step({ n, icon, text }: { n: number; icon: string; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
      >
        {n}
      </div>
      <p className="text-sm pt-1" style={{ color: 'var(--fiq-muted)' }}>
        <span className="mr-1.5 text-base leading-none">{icon}</span>
        {text}
      </p>
    </div>
  )
}

function FeatureList() {
  const features = [
    { emoji: '💪', label: 'Logger tes séances en 2 min' },
    { emoji: '📊', label: 'Voir ta progression en temps réel' },
    { emoji: '🤖', label: 'Coach IA personnalisé' },
    { emoji: '📋', label: 'Check-in quotidien ultra-rapide' },
  ]
  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
    >
      <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--fiq-muted)' }}>
        Tout ce que tu as dans l&apos;app
      </p>
      {features.map((f) => (
        <div key={f.label} className="flex items-center gap-3">
          <span className="text-xl">{f.emoji}</span>
          <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>{f.label}</p>
        </div>
      ))}
    </div>
  )
}
