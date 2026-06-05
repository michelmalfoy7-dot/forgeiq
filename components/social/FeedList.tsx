'use client'

import { useState, useCallback } from 'react'
import { Loader2, ChevronDown, CheckCircle2 } from 'lucide-react'
import { WorkoutPost } from './WorkoutPost'
import type { FeedPost } from './WorkoutPost'

type Props = {
  initialPosts: FeedPost[]
}

const PAGE_SIZE = 20

export function FeedList({ initialPosts }: Props) {
  const [posts, setPosts]     = useState<FeedPost[]>(initialPosts)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialPosts.length >= PAGE_SIZE)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/social/feed?page=${page}`)
      const json = await res.json() as { data: FeedPost[] | null; error: string | null }

      if (json.data && json.data.length > 0) {
        setPosts((prev) => [...prev, ...json.data!])
        setPage((p) => p + 1)
        setHasMore(json.data.length >= PAGE_SIZE)
      } else {
        setHasMore(false)
      }
    } catch {
      // ignore — bouton reste visible pour réessayer
    } finally {
      setLoading(false)
    }
  }, [page, loading, hasMore])

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <WorkoutPost key={post.id} post={post} />
      ))}

      {/* Bouton charger plus */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
          style={{
            background: 'var(--fiq-faint)',
            border: '1px solid var(--fiq-border)',
            color: 'var(--fiq-muted)',
          }}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
            : <><ChevronDown className="w-4 h-4" /> Charger plus</>
          }
        </button>
      )}

      {/* Fin du feed */}
      {!hasMore && posts.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            Tu as tout vu — reviens après ta prochaine séance 💪
          </p>
        </div>
      )}
    </div>
  )
}
