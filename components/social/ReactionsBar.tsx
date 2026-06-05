'use client'

import { useState, useEffect } from 'react'

const EMOJIS = ['🔥', '💪', '⚡'] as const
type Emoji = typeof EMOJIS[number]

type Props = { shareId: string }

type ReactionsState = {
  counts: Record<string, number>
  mine: string[]
}

export function ReactionsBar({ shareId }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [state, setState]   = useState<ReactionsState>({
    counts: { '🔥': 0, '💪': 0, '⚡': 0 },
    mine: [],
  })
  const [toggling, setToggling] = useState<string | null>(null)

  // Charger les réactions au montage
  useEffect(() => {
    fetch(`/api/social/reactions?share_id=${shareId}`)
      .then(r => r.json())
      .then((json: { data: ReactionsState | null }) => {
        if (json.data) setState(json.data)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [shareId])

  async function handleToggle(emoji: Emoji) {
    if (toggling) return
    const isMine = state.mine.includes(emoji)

    // Optimisme
    setState(prev => ({
      counts: {
        ...prev.counts,
        [emoji]: Math.max(0, (prev.counts[emoji] ?? 0) + (isMine ? -1 : 1)),
      },
      mine: isMine ? prev.mine.filter(e => e !== emoji) : [...prev.mine, emoji],
    }))

    setToggling(emoji)
    try {
      await fetch('/api/social/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_id: shareId, emoji }),
      })
    } catch {
      // Rollback si erreur
      setState(prev => ({
        counts: {
          ...prev.counts,
          [emoji]: Math.max(0, (prev.counts[emoji] ?? 0) + (isMine ? 1 : -1)),
        },
        mine: isMine ? [...prev.mine, emoji] : prev.mine.filter(e => e !== emoji),
      }))
    } finally {
      setToggling(null)
    }
  }

  // Afficher seulement si chargé ou s'il y a des réactions
  const hasAny = Object.values(state.counts).some(c => c > 0)
  if (!loaded && !hasAny) {
    // Afficher les boutons vides dès le départ (pas de spinner)
  }

  return (
    <div className="flex items-center gap-1.5 px-4 pb-2 pt-0">
      {EMOJIS.map(emoji => {
        const count   = state.counts[emoji] ?? 0
        const isMine  = state.mine.includes(emoji)
        const isTogg  = toggling === emoji

        return (
          <button
            key={emoji}
            onClick={() => handleToggle(emoji)}
            disabled={isTogg}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-70"
            style={{
              background: isMine ? 'rgba(180,255,74,0.12)' : 'var(--fiq-faint)',
              border:     isMine ? '1px solid rgba(180,255,74,0.35)' : '1px solid var(--fiq-border)',
              color:      isMine ? 'var(--fiq-accent)' : 'var(--fiq-muted)',
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>
            {count > 0 && (
              <span style={{ color: isMine ? 'var(--fiq-accent)' : 'var(--fiq-muted)', minWidth: 12 }}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
