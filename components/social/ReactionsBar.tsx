'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'

const EMOJIS = ['🔥', '💪', '⚡'] as const
type Emoji = typeof EMOJIS[number]

type UserProfile = {
  user_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

type ReactionsState = {
  counts: Record<string, number>
  mine: string[]
}

type Props = { shareId: string }

export function ReactionsBar({ shareId }: Props) {
  const [loaded, setLoaded]   = useState(false)
  const [state, setState]     = useState<ReactionsState>({
    counts: { '🔥': 0, '💪': 0, '⚡': 0 },
    mine: [],
  })
  const [toggling, setToggling] = useState<string | null>(null)

  // Modale "qui a réagi"
  const [modalEmoji, setModalEmoji]   = useState<Emoji | null>(null)
  const [modalUsers, setModalUsers]   = useState<UserProfile[]>([])
  const [modalLoading, setModalLoading] = useState(false)

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

  async function openModal(emoji: Emoji) {
    if ((state.counts[emoji] ?? 0) === 0) return
    setModalEmoji(emoji)
    setModalLoading(true)
    try {
      const res = await fetch(`/api/social/reactions?share_id=${shareId}&detail=true`)
      const json = await res.json() as { data: (ReactionsState & { users?: Record<string, UserProfile[]> }) | null }
      if (json.data?.users) {
        setModalUsers(json.data.users[emoji] ?? [])
      }
    } catch {
      setModalUsers([])
    } finally {
      setModalLoading(false)
    }
  }

  if (!loaded) return null

  return (
    <>
      <div className="flex items-center gap-1.5 px-4 pb-2 pt-0">
        {EMOJIS.map(emoji => {
          const count  = state.counts[emoji] ?? 0
          const isMine = state.mine.includes(emoji)
          const isTogg = toggling === emoji

          return (
            <div key={emoji} className="flex items-center gap-0.5">
              <button
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
              </button>
              {count > 0 && (
                <button
                  onClick={() => openModal(emoji)}
                  className="px-1.5 py-1 rounded-lg text-xs font-black transition-all active:scale-95"
                  style={{ color: isMine ? 'var(--fiq-accent)' : 'var(--fiq-muted)', minWidth: 20 }}
                >
                  {count}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Modale — liste des réactants */}
      {modalEmoji && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setModalEmoji(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl p-5 pb-8 space-y-4"
            style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>
                <span style={{ fontSize: 20 }}>{modalEmoji}</span>
                {' '}Réactions ({state.counts[modalEmoji] ?? 0})
              </p>
              <button onClick={() => setModalEmoji(null)} style={{ color: 'var(--fiq-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--fiq-accent)', borderTopColor: 'transparent' }} />
              </div>
            ) : modalUsers.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--fiq-muted)' }}>Aucun réactant trouvé</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {modalUsers.map(u => {
                  const initial = (u.display_name || u.username || '?')[0].toUpperCase()
                  return (
                    <Link
                      key={u.user_id}
                      href={u.username ? `/u/${u.username}` : '#'}
                      onClick={() => setModalEmoji(null)}
                      className="flex items-center gap-3"
                    >
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--fiq-accent)' }}>
                        {u.avatar_url ? (
                          <Image src={u.avatar_url} alt={u.display_name ?? ''} fill className="object-cover" sizes="40px" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-sm font-black" style={{ color: 'var(--bg)' }}>
                            {initial}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate" style={{ color: 'var(--fiq-text)' }}>
                          {u.display_name ?? u.username ?? 'Athlète'}
                        </p>
                        {u.username && (
                          <p className="text-xs truncate" style={{ color: 'var(--fiq-muted)' }}>@{u.username}</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
