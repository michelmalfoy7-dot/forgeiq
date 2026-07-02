'use client'

import { useState, useEffect } from 'react'
import { Gift, Copy, Check, Share2 } from 'lucide-react'

/**
 * Card « Inviter un ami » — point d'entrée du système de parrainage.
 * Le filleul reçoit 14j Pro, le parrain +1 mois par ami (max 3).
 *
 * Auto-suffisante : fetch /api/referral qui RETOURNE OU GÉNÈRE le code —
 * marche pour tous les utilisateurs, même sans code pré-existant.
 */
export function ReferralCard() {
  const [code, setCode] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.json() as Promise<{ data: { code: string; count: number } | null }>)
      .then(json => { if (json.data?.code) { setCode(json.data.code); setCount(json.data.count ?? 0) } })
      .catch(() => null)
  }, [])

  if (!code) return null

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://getforgeiq.com'}/invite/${code}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard indisponible */ }
  }

  async function share() {
    const text = 'Rejoins-moi sur ForgeIQ — 14 jours de Pro offerts 💪'
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'ForgeIQ', text, url: inviteUrl })
        return
      } catch { /* annulé */ }
    }
    void copy()
  }

  return (
    <div className="fiq-card space-y-3" style={{ background: '#B4FF4A08', border: '1px solid #B4FF4A25' }}>
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
        <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Inviter un ami</p>
      </div>
      <p className="text-xs" style={{ color: 'var(--fiq-muted)', lineHeight: 1.5 }}>
        Ton ami reçoit <span style={{ color: 'var(--fiq-accent)', fontWeight: 700 }}>14 jours Pro offerts</span> — tu gagnes
        {' '}<span style={{ color: 'var(--fiq-accent)', fontWeight: 700 }}>+1 mois Pro</span> par ami qui s&apos;inscrit (jusqu&apos;à 3).
        {count > 0 && <> Déjà <span style={{ color: 'var(--fiq-text)', fontWeight: 700 }}>{count}</span> invité{count > 1 ? 's' : ''} 🎉</>}
      </p>

      <div className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
        <span className="text-xs truncate flex-1" style={{ color: 'var(--fiq-muted)' }}>{inviteUrl}</span>
        <button onClick={copy} className="flex-shrink-0 flex items-center gap-1 text-xs font-bold" style={{ color: copied ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }}>
          {copied ? <><Check className="w-3.5 h-3.5" /> Copié</> : <><Copy className="w-3.5 h-3.5" /> Copier</>}
        </button>
      </div>

      <button
        onClick={share}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm"
        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
      >
        <Share2 className="w-4 h-4" /> Partager mon lien
      </button>
    </div>
  )
}
