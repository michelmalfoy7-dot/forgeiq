'use client'

import { useState } from 'react'
import { Share2, Loader2, Download } from 'lucide-react'

type Props = {
  userId: string
  username: string | null
  displayName: string
}

export function ShareBig5Button({ userId, username, displayName }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleShare() {
    if (loading) return
    setLoading(true)

    const param   = username ? `username=${username}` : `user_id=${userId}`
    const cardUrl = `/api/social/card/big5?${param}`
    const slug    = (displayName).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const fileName = `forgeiq-records-${slug}.png`
    const fallback = `🏆 Mes records ForgeIQ\n@${username ?? displayName}\ngetforgeiq.com`

    try {
      const res = await fetch(cardUrl)
      if (res.ok) {
        const blob = await res.blob()
        const file = new File([blob], fileName, { type: 'image/png' })

        // iOS / Android → Web Share API avec fichier image
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: fallback })
          return
        }

        // Desktop → télécharger le PNG directement
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href     = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        return
      }
    } catch { /* Fallback texte */ }
    finally   { setLoading(false) }

    // Fallback : partage texte
    if (navigator.share) {
      await navigator.share({ text: fallback, url: 'https://getforgeiq.com' }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(fallback).catch(() => {})
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-60"
      style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
    >
      {loading
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</>
        : typeof navigator !== 'undefined' && 'share' in navigator
          ? <><Share2 className="w-4 h-4" /> Partager mes records</>
          : <><Download className="w-4 h-4" /> Télécharger ma carte</>
      }
    </button>
  )
}
