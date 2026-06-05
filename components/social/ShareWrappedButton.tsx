'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

type Props = {
  userId: string
  year?: number
}

export function ShareWrappedButton({ userId, year = new Date().getFullYear() }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleShare() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/social/card/year?user_id=${userId}&year=${year}`)
      if (!res.ok) throw new Error('Erreur génération')

      const blob = await res.blob()
      const file = new File([blob], `forgeiq-bilan-${year}.png`, { type: 'image/png' })

      if (typeof navigator !== 'undefined' && 'share' in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: `Mon bilan ForgeIQ ${year} 💪 #ForgeIQ #fitness`,
        })
      } else {
        // Téléchargement direct
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `forgeiq-bilan-${year}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch { /* silencieux si l'user annule */ }
    finally   { setLoading(false) }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all active:opacity-80 disabled:opacity-60"
      style={{ background: 'linear-gradient(135deg, #B4FF4A22 0%, #3D8BFF22 100%)', border: '1px solid #B4FF4A33', color: 'var(--fiq-accent)' }}
    >
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Sparkles className="w-4 h-4" />
      }
      {loading ? 'Génération…' : `Partager mon bilan ${year}`}
    </button>
  )
}
