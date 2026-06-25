'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Activity, Check, RefreshCw, Unlink, Zap } from 'lucide-react'

type Connection = {
  provider: string
  connected_at: string
  last_synced_at: string | null
}

type SyncResult = {
  steps: number | null
  sleepTotal: number | null
  sleepDeep: number | null
  calories: number | null
  date: string
}

function IntegrationsContent() {
  const searchParams = useSearchParams()
  const [connections, setConnections] = useState<Connection[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (searchParams.get('success') === 'google_fit') showToast('Google Fit connecté !')
    if (searchParams.get('error')) showToast('Connexion refusée ou annulée.', false)
  }, [searchParams])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('wearable_connections')
        .select('provider, connected_at, last_synced_at')
        .eq('user_id', user.id)
        .then(({ data }) => setConnections(data ?? []))
    })
  }, [])

  const googleConn = connections.find(c => c.provider === 'google_fit')

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/integrations/google-fit/sync', { method: 'POST' })
      const { data, error } = await res.json()
      if (error) { showToast(error, false); return }
      setSyncResult(data)
      showToast(`Sync réussie — ${data.steps ?? '?'} pas, ${data.sleepTotal ?? '?'} min sommeil`)
      // Mettre à jour last_synced_at localement
      setConnections(prev => prev.map(c =>
        c.provider === 'google_fit' ? { ...c, last_synced_at: new Date().toISOString() } : c
      ))
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    if (!confirmDisconnect) { setConfirmDisconnect(true); return }
    setConfirmDisconnect(false)
    setDisconnecting(true)
    try {
      await fetch('/api/integrations/google-fit/sync', { method: 'DELETE' })
      setConnections(prev => prev.filter(c => c.provider !== 'google_fit'))
      setSyncResult(null)
      showToast('Google Fit déconnecté')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div
      className="max-w-lg mx-auto px-4 space-y-5"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-bold shadow-lg"
          style={{ background: toast.ok ? 'var(--fiq-accent)' : 'var(--fiq-red)', color: toast.ok ? 'var(--bg)' : '#fff' }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="pt-4">
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--fiq-muted)' }}>ForgeIQ</p>
        <h1 className="text-2xl font-black leading-none" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
          Intégrations
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
          Sync auto de ton sommeil, pas et FC depuis ta montre
        </p>
      </div>

      {/* Google Fit */}
      <div className="fiq-card space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: '#4285F422', border: '1px solid #4285F444' }}
          >
            🏃
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>Google Fit</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
              Garmin · Samsung · Pixel Watch · toute montre Android
            </p>
          </div>
          {googleConn ? (
            <span
              className="text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: '#B4FF4A22', border: '1px solid #B4FF4A44', color: 'var(--fiq-accent)' }}
            >
              <Check className="w-3 h-3" /> Connecté
            </span>
          ) : (
            <span
              className="text-[10px] font-black px-2 py-1 rounded-full"
              style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
            >
              Non connecté
            </span>
          )}
        </div>

        <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          Importe automatiquement : pas quotidiens, sommeil (total + profond + REM), fréquence cardiaque — pré-remplit ton check-in ForgeIQ.
        </p>

        {googleConn ? (
          <div className="space-y-2">
            {googleConn.last_synced_at && (
              <p className="text-[11px]" style={{ color: 'var(--fiq-muted)' }}>
                Dernière sync : {new Date(googleConn.last_synced_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}

            {syncResult && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Pas', val: syncResult.steps?.toLocaleString('fr-FR') ?? '—' },
                  { label: 'Sommeil total', val: syncResult.sleepTotal ? `${syncResult.sleepTotal} min` : '—' },
                  { label: 'Sommeil profond', val: syncResult.sleepDeep ? `${syncResult.sleepDeep} min` : '—' },
                  { label: 'Calories', val: syncResult.calories ? `${syncResult.calories} kcal` : '—' },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-xl p-2.5" style={{ background: 'var(--fiq-faint)' }}>
                    <p className="text-[9px] uppercase font-black tracking-wider mb-0.5" style={{ color: 'var(--fiq-muted)' }}>{label}</p>
                    <p className="text-sm font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>{val}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sync...' : 'Sync maintenant'}
              </button>
              {confirmDisconnect ? (
                <div className="flex gap-1">
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="px-3 py-3 rounded-xl font-black text-xs disabled:opacity-50"
                    style={{ background: 'var(--fiq-red)', color: '#fff' }}
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setConfirmDisconnect(false)}
                    className="px-3 py-3 rounded-xl font-black text-xs"
                    style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-4 py-3 rounded-xl font-black text-sm flex items-center gap-1 disabled:opacity-50"
                  style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
                >
                  <Unlink className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <a
            href="/api/integrations/google-fit/connect"
            className="block w-full py-3 rounded-xl text-center font-black text-sm"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            Connecter Google Fit
          </a>
        )}
      </div>

      {/* Coming soon */}
      {[
        { name: 'Fitbit', icon: '💚', desc: 'HRV · sommeil · FC · steps', color: '#00B0B9' },
        { name: 'Garmin', icon: '⌚', desc: 'HRV · charge training · VO2max', color: '#009CDE' },
        { name: 'Apple Health', icon: '🍎', desc: 'Apple Watch · Whoop · Oura', color: '#FF375F' },
      ].map(({ name, icon, desc, color }) => (
        <div key={name} className="fiq-card opacity-60">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: `${color}22`, border: `1px solid ${color}44` }}
            >
              {icon}
            </div>
            <div>
              <p className="font-black text-sm flex items-center gap-2" style={{ color: 'var(--fiq-text)' }}>
                {name}
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}>
                  Bientôt
                </span>
              </p>
              <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{desc}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Info */}
      <div
        className="rounded-xl p-3 flex gap-2"
        style={{ background: '#3D8BFF12', borderLeft: '3px solid var(--fiq-blue)' }}
      >
        <Zap className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fiq-blue)' }} />
        <div>
          <p className="text-xs font-bold" style={{ color: 'var(--fiq-blue)' }}>Sync automatique</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
            Tes données wearable pré-remplissent ton check-in quotidien. Tu peux toujours les ajuster avant de sauvegarder.
          </p>
        </div>
      </div>

      {/* Lien check-in */}
      {googleConn && (
        <a
          href="/checkin"
          className="block w-full py-3 rounded-2xl text-center font-black text-sm"
          style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-text)' }}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Ouvrir le check-in →
        </a>
      )}
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsContent />
    </Suspense>
  )
}
