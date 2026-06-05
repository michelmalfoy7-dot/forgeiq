'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'

type Props = {
  shareId: string
  initialLiked: boolean
  initialCount: number
}

export function PostLikeButton({ shareId, initialLiked, initialCount }: Props) {
  const [liked, setLiked]   = useState(initialLiked)
  const [count, setCount]   = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return
    const wasLiked = liked
    setLiked(!wasLiked)
    setCount((n) => n + (wasLiked ? -1 : 1))
    setLoading(true)
    try {
      const res = await fetch('/api/social/like', {
        method:  wasLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ share_id: shareId }),
      })
      if (!res.ok) {
        setLiked(wasLiked)
        setCount((n) => n + (wasLiked ? 1 : -1))
      }
    } catch {
      setLiked(wasLiked)
      setCount((n) => n + (wasLiked ? 1 : -1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
      style={{
        background: liked ? '#EF444415' : 'var(--fiq-faint)',
        border:     `1px solid ${liked ? '#EF444440' : 'var(--fiq-border)'}`,
        color:      liked ? '#EF4444' : 'var(--fiq-muted)',
      }}
    >
      <Heart
        className="w-4 h-4"
        style={{ fill: liked ? '#EF4444' : 'none', stroke: liked ? '#EF4444' : 'var(--fiq-muted)' }}
      />
      {count > 0 ? count : 'J\'aime'}
    </button>
  )
}
