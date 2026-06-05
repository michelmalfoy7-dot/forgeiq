'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Hash, Loader2 } from 'lucide-react'
import { WorkoutPost } from '@/components/social/WorkoutPost'
import type { FeedPost } from '@/components/social/WorkoutPost'

type PageProps = {
  params: Promise<{ tag: string }>
}

const PAGE_SIZE = 15

export default function TagPage({ params }: PageProps) {
  const { tag } = use(params)
  const decodedTag = decodeURIComponent(tag).toLowerCase()

  const [posts, setPosts]       = useState<FeedPost[]>([])
  const [loading, setLoading]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage]         = useState(0)
  const [hasMore, setHasMore]   = useState(true)

  // Charger la première page
  useEffect(() => {
    setLoading(true)
    fetch(`/api/social/tag?tag=${encodeURIComponent(decodedTag)}&page=0`)
      .then(r => r.json())
      .then((json: { data: FeedPost[] | null }) => {
        const data = json.data ?? []
        setPosts(data)
        setHasMore(data.length === PAGE_SIZE)
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [decodedTag])

  async function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/social/tag?tag=${encodeURIComponent(decodedTag)}&page=${nextPage}`)
      const json = await res.json() as { data: FeedPost[] | null }
      const data = json.data ?? []
      setPosts(prev => [...prev, ...data])
      setPage(nextPage)
      setHasMore(data.length === PAGE_SIZE)
    } catch { /* silencieux */ }
    finally  { setLoadingMore(false) }
  }

  function handleDelete(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/social"
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#B4FF4A15', border: '1px solid #B4FF4A30' }}
          >
            <Hash className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
          </div>
          <div>
            <h1 className="text-lg font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
              #{decodedTag}
            </h1>
            {!loading && (
              <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                {posts.length > 0
                  ? `${posts.length}${hasMore ? '+' : ''} séance${posts.length > 1 ? 's' : ''}`
                  : 'Aucune séance'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Skeleton loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="fiq-card h-32 animate-pulse" style={{ background: 'var(--fiq-faint)' }} />
          ))}
        </div>
      )}

      {/* Feed */}
      {!loading && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map(post => (
            <WorkoutPost key={post.id} post={post} onDelete={handleDelete} />
          ))}

          {/* Charger plus */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
            >
              {loadingMore
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Charger plus'
              }
            </button>
          )}

          {!hasMore && posts.length >= PAGE_SIZE && (
            <p className="text-center text-xs py-4" style={{ color: 'var(--fiq-muted)' }}>
              Tu as tout vu pour #{decodedTag} 🏁
            </p>
          )}
        </div>
      )}

      {/* Vide */}
      {!loading && posts.length === 0 && (
        <div className="fiq-card text-center py-14">
          <p className="text-4xl mb-3">#</p>
          <p className="font-bold text-sm" style={{ color: 'var(--fiq-text)' }}>
            Aucune séance avec #{decodedTag}
          </p>
          <p className="text-xs mt-1 mb-5" style={{ color: 'var(--fiq-muted)' }}>
            Ajoute #{decodedTag} dans ta prochaine caption !
          </p>
          <Link
            href="/workout"
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-black"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            Commencer une séance →
          </Link>
        </div>
      )}
    </div>
  )
}
