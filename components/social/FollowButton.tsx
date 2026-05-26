'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus, UserMinus } from 'lucide-react'

type Props = {
  targetUserId: string
  initialIsFollowing: boolean
}

export function FollowButton({ targetUserId, initialIsFollowing }: Props) {
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    if (loading) return
    setLoading(true)

    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing) // Optimistic update

    try {
      const res = await fetch('/api/social/follow', {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      })

      if (!res.ok) {
        // Rollback
        setIsFollowing(wasFollowing)
      } else {
        // Rafraîchir les compteurs affichés
        router.refresh()
      }
    } catch {
      // Rollback
      setIsFollowing(wasFollowing)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm"
      style={{
        background: isFollowing ? 'var(--fiq-faint)' : 'var(--fiq-accent)',
        color: isFollowing ? 'var(--fiq-muted)' : 'var(--bg)',
        border: isFollowing ? '1px solid var(--fiq-border)' : 'none',
      }}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <><UserMinus className="w-4 h-4" /> Ne plus suivre</>
      ) : (
        <><UserPlus className="w-4 h-4" /> Suivre</>
      )}
    </button>
  )
}
