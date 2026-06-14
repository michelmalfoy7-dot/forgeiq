'use client'

import { useState } from 'react'

interface ShareActionsProps {
  url: string
  title: string
  text?: string
}

export default function ShareActions({ url, title, text }: ShareActionsProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (typeof navigator === 'undefined') return

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {
        // Annulé par l'utilisateur → rien à faire
      }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="block w-full py-3.5 rounded-2xl font-black text-sm text-center transition-opacity active:opacity-70"
      style={{
        background: 'var(--fiq-faint)',
        color: 'var(--fiq-text)',
        border: '1px solid var(--fiq-border)',
        letterSpacing: '-0.01em',
      }}
    >
      {copied ? '✓ Lien copié !' : '↑ Partager cette séance'}
    </button>
  )
}
