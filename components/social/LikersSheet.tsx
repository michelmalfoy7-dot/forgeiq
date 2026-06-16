'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Loader2 } from 'lucide-react'

type Liker = {
  user_id: string
  username: string | null
  display_name: string
  avatar_url: string | null
}

type Props = {
  shareId: string
  count: number
  onClose: () => void
}

export function LikersSheet({ shareId, count, onClose }: Props) {
  const [likers, setLikers] = useState<Liker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/social/like?share_id=${shareId}`)
        const json = await res.json() as { data: Liker[] | null }
        setLikers(json.data ?? [])
      } catch { /* silencieux */ }
      finally  { setLoading(false) }
    }
    load()
  }, [shareId])

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className="w-full max-w-[480px] rounded-t-3xl flex flex-col"
          style={{
            background:   'var(--surface)',
            border:       '1px solid var(--fiq-border)',
            borderBottom: 'none',
            maxHeight:    '60dvh',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--fiq-border)' }}
          >
            <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
              J&apos;aime
              {count > 0 && (
                <span className="ml-2 font-normal text-xs" style={{ color: 'var(--fiq-muted)' }}>
                  ({count})
                </span>
              )}
            </p>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity active:opacity-70"
              style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
              </div>
            ) : likers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">❤️</p>
                <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
                  Aucun like pour l&apos;instant
                </p>
              </div>
            ) : (
              likers.map((liker) => {
                const initial = (liker.display_name || liker.username || '?')[0].toUpperCase()
                return (
                  <Link
                    key={liker.user_id}
                    href={liker.username ? `/u/${liker.username}` : '#'}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-xl transition-opacity active:opacity-70"
                  >
                    <div
                      className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center font-black text-sm flex-shrink-0"
                      style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                    >
                      {liker.avatar_url ? (
                        <Image
                          src={liker.avatar_url}
                          alt={liker.display_name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate" style={{ color: 'var(--fiq-text)' }}>
                        {liker.display_name}
                      </p>
                      {liker.username && (
                        <p className="text-xs truncate" style={{ color: 'var(--fiq-muted)' }}>
                          @{liker.username}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}
