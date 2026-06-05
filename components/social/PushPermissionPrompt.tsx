'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    // Afficher seulement si :
    // - Push supporté
    // - Permission pas encore demandée
    // - Pas déjà refusé (localStorage)
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !VAPID_PUBLIC_KEY ||
      Notification.permission !== 'default' ||
      localStorage.getItem('forgeiq_push_dismissed') === '1'
    ) return

    // Attendre 3s avant d'afficher (laisser la page se charger)
    const t = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(t)
  }, [])

  async function handleAccept() {
    setSubscribing(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setVisible(false)
        localStorage.setItem('forgeiq_push_dismissed', '1')
        return
      }

      const sw  = await navigator.serviceWorker.ready
      const sub = await sw.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })

      await fetch('/api/social/push', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
            auth:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
          },
        }),
      })

      setVisible(false)
    } catch {
      setVisible(false)
    } finally {
      setSubscribing(false)
    }
  }

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem('forgeiq_push_dismissed', '1')
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-24 left-0 right-0 z-40 flex justify-center px-4"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl p-4 flex items-start gap-3 shadow-2xl"
        style={{
          background: 'var(--surface)',
          border:     '1px solid var(--fiq-border)',
          boxShadow:  '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Icône */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#B4FF4A20' }}
        >
          <Bell className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
        </div>

        {/* Texte */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>
            Reste dans la boucle 🔥
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
            Reçois une notif quand quelqu&apos;un like ou commente ta séance.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAccept}
              disabled={subscribing}
              className="flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              {subscribing ? 'Activation…' : 'Activer les notifs'}
            </button>
            <button
              onClick={handleDismiss}
              className="py-2 px-3 rounded-xl text-xs font-semibold"
              style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
            >
              Plus tard
            </button>
          </div>
        </div>

        {/* Fermer */}
        <button onClick={handleDismiss} style={{ color: 'var(--fiq-muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
