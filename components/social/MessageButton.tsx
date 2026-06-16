'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail } from 'lucide-react'

type Props = {
  recipientId: string
}

/**
 * Bouton "Message" sur le profil public d'un athlète.
 * Crée ou trouve la conversation et navigue vers la vue messages.
 */
export function MessageButton({ recipientId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleMessage() {
    if (loading) return
    setLoading(true)
    try {
      // Créer/trouver la conversation avec un message vide de "bonjour"
      // On envoie directement vers /social/messages?new=<id>
      // La page liste traitera le param et ouvrira la création
      router.push(`/social/messages?new=${recipientId}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={() => void handleMessage()}
      disabled={loading}
      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm transition-opacity"
      style={{
        background: 'var(--fiq-faint)',
        border: '1px solid var(--fiq-border)',
        color: 'var(--fiq-text)',
        opacity: loading ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
      aria-label="Envoyer un message"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Mail className="w-4 h-4" />
      )}
      <span>Message</span>
    </button>
  )
}
