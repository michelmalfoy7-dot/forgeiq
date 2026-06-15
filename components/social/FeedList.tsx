'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, CheckCircle2, Compass, Users, UserPlus } from 'lucide-react'
import { WorkoutPost } from './WorkoutPost'
import type { FeedPost } from './WorkoutPost'

export type SuggestedAthlete = {
  user_id: string
  username: string | null
  display_name: string
  avatar_url: string | null
  followers_count: number
  recent_shares: number
}

type Props = {
  initialDiscoverPosts: FeedPost[]
  initialFollowingPosts: FeedPost[]
  suggestedAthletes: SuggestedAthlete[]
  followingCount: number
}

const PAGE_SIZE = 20

export function FeedList({ initialDiscoverPosts, initialFollowingPosts, suggestedAthletes, followingCount }: Props) {
  const [activeTab, setActiveTab] = useState<'discover' | 'following'>('discover')

  // Discover state
  const [discoverPosts, setDiscoverPosts] = useState<FeedPost[]>(initialDiscoverPosts)
  const [discoverPage, setDiscoverPage]   = useState(1)
  const [discoverMore, setDiscoverMore]   = useState(initialDiscoverPosts.length >= PAGE_SIZE)

  // Following state
  const [followingPosts, setFollowingPosts] = useState<FeedPost[]>(initialFollowingPosts)
  const [followingPage, setFollowingPage]   = useState(1)
  const [followingMore, setFollowingMore]   = useState(initialFollowingPosts.length >= PAGE_SIZE)

  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Follow state per suggested athlete
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [followLoading, setFollowLoading] = useState<string | null>(null)

  async function handleFollow(userId: string, isFollowed: boolean) {
    if (followLoading) return
    setFollowLoading(userId)
    const prev = new Set(followedIds)
    if (isFollowed) followedIds.delete(userId); else followedIds.add(userId)
    setFollowedIds(new Set(followedIds))
    try {
      const res = await fetch('/api/social/follow', {
        method: isFollowed ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: userId }),
      })
      if (!res.ok) setFollowedIds(prev)
    } catch {
      setFollowedIds(prev)
    } finally {
      setFollowLoading(null)
    }
  }

  const loadMore = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      if (activeTab === 'discover') {
        const res  = await fetch(`/api/social/feed?mode=discover&page=${discoverPage}`)
        const json = await res.json() as { data: FeedPost[] | null; hasMore: boolean; error: string | null }
        if (json.data && json.data.length > 0) {
          setDiscoverPosts((prev) => [...prev, ...json.data!])
          setDiscoverPage((p) => p + 1)
          setDiscoverMore(json.hasMore ?? json.data.length >= PAGE_SIZE)
        } else {
          setDiscoverMore(false)
        }
      } else {
        const res  = await fetch(`/api/social/feed?mode=following&page=${followingPage}`)
        const json = await res.json() as { data: FeedPost[] | null; hasMore: boolean; error: string | null }
        if (json.data && json.data.length > 0) {
          setFollowingPosts((prev) => [...prev, ...json.data!])
          setFollowingPage((p) => p + 1)
          setFollowingMore(json.hasMore ?? json.data.length >= PAGE_SIZE)
        } else {
          setFollowingMore(false)
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [activeTab, discoverPage, followingPage, loading])

  // IntersectionObserver — déclenche loadMore quand le sentinel entre dans le viewport
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  const posts   = activeTab === 'discover' ? discoverPosts : followingPosts
  const hasMore = activeTab === 'discover' ? discoverMore  : followingMore

  return (
    <div className="space-y-3">

      {/* ── Onglets Pour toi / Abonnements ── */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
        <button
          onClick={() => setActiveTab('discover')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-black transition-all"
          style={activeTab === 'discover'
            ? { background: 'var(--fiq-accent)', color: 'var(--bg)' }
            : { color: 'var(--fiq-muted)' }
          }
        >
          <Compass className="w-3.5 h-3.5" />
          Pour toi
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-black transition-all relative"
          style={activeTab === 'following'
            ? { background: 'var(--fiq-card)', color: 'var(--fiq-text)', border: '1px solid var(--fiq-border)' }
            : { color: 'var(--fiq-muted)' }
          }
        >
          <Users className="w-3.5 h-3.5" />
          Abonnements
          {followingCount > 0 && (
            <span className="absolute top-1 right-3 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--fiq-accent)' }} />
          )}
        </button>
      </div>

      {/* ── Athlètes suggérés (onglet "Pour toi" uniquement) ── */}
      {activeTab === 'discover' && suggestedAthletes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase font-black tracking-widest px-1" style={{ color: 'var(--fiq-muted)' }}>
            Athlètes à découvrir
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {suggestedAthletes.map((athlete) => {
              const isFollowed = followedIds.has(athlete.user_id)
              const initial    = (athlete.display_name || athlete.username || '?')[0].toUpperCase()
              return (
                <div
                  key={athlete.user_id}
                  className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl text-center w-28"
                  style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
                >
                  <Link href={athlete.username ? `/u/${athlete.username}` : '#'} className="flex flex-col items-center gap-2">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0" style={{ background: 'var(--fiq-accent)' }}>
                      {athlete.avatar_url ? (
                        <Image src={athlete.avatar_url} alt={athlete.display_name} fill className="object-cover" sizes="48px" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-base font-black" style={{ color: 'var(--bg)' }}>
                          {initial}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black leading-tight truncate w-24" style={{ color: 'var(--fiq-text)' }}>
                        {athlete.display_name}
                      </p>
                      {athlete.username && (
                        <p className="text-[10px] truncate w-24" style={{ color: 'var(--fiq-muted)' }}>
                          @{athlete.username}
                        </p>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleFollow(athlete.user_id, isFollowed)}
                    disabled={followLoading === athlete.user_id}
                    className="w-full py-1.5 rounded-xl text-[11px] font-black transition-all active:scale-95 disabled:opacity-60"
                    style={isFollowed
                      ? { background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }
                      : { background: 'var(--fiq-accent)', color: 'var(--bg)' }
                    }
                  >
                    {followLoading === athlete.user_id ? (
                      <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                    ) : isFollowed ? 'Suivi ✓' : (
                      <span className="flex items-center justify-center gap-1"><UserPlus className="w-3 h-3" />Suivre</span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Posts ── */}
      {posts.length > 0 && posts.map((post) => (
        <WorkoutPost key={post.id} post={post} />
      ))}

      {/* ── État vide Abonnements — injecter les athlètes suggérés ── */}
      {activeTab === 'following' && posts.length === 0 && (
        <div className="space-y-4">
          {/* CTA explicatif */}
          <div className="fiq-card text-center py-6 space-y-2">
            <div className="flex justify-center text-4xl">🏋️</div>
            <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>
              Suis tes premiers athlètes
            </p>
            <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
              Leurs séances apparaîtront ici une fois abonné
            </p>
          </div>

          {/* Athlètes suggérés directement dans l'onglet Abonnements */}
          {suggestedAthletes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase font-black tracking-widest px-1" style={{ color: 'var(--fiq-muted)' }}>
                Athlètes à suivre
              </p>
              {suggestedAthletes.slice(0, 5).map((athlete) => {
                const isFollowed = followedIds.has(athlete.user_id)
                const initial    = (athlete.display_name || athlete.username || '?')[0].toUpperCase()
                return (
                  <div
                    key={athlete.user_id}
                    className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
                  >
                    <Link href={athlete.username ? `/u/${athlete.username}` : '#'} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--fiq-accent)' }}>
                        {athlete.avatar_url ? (
                          <Image src={athlete.avatar_url} alt={athlete.display_name} fill className="object-cover" sizes="44px" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-base font-black" style={{ color: 'var(--bg)' }}>
                            {initial}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate" style={{ color: 'var(--fiq-text)' }}>
                          {athlete.display_name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--fiq-muted)' }}>
                          {athlete.followers_count > 0 ? `${athlete.followers_count} abonné${athlete.followers_count > 1 ? 's' : ''}` : '@' + (athlete.username ?? '')}
                          {athlete.recent_shares > 0 && ` · ${athlete.recent_shares} séance${athlete.recent_shares > 1 ? 's' : ''} ce mois`}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleFollow(athlete.user_id, isFollowed)}
                      disabled={followLoading === athlete.user_id}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-60"
                      style={isFollowed
                        ? { background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }
                        : { background: 'var(--fiq-accent)', color: 'var(--bg)' }
                      }
                    >
                      {followLoading === athlete.user_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isFollowed ? 'Suivi ✓' : (
                        <span className="flex items-center gap-1"><UserPlus className="w-3 h-3" />Suivre</span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ou explorer */}
          <button
            onClick={() => setActiveTab('discover')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
          >
            <Compass className="w-4 h-4" />
            Explorer toute la communauté
          </button>
        </div>
      )}

      {/* ── Sentinel infinite scroll — visible uniquement si hasMore ── */}
      {hasMore && posts.length > 0 && (
        <div ref={sentinelRef}>
          {loading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="fiq-card animate-pulse space-y-3"
                  style={{ padding: '16px' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex-shrink-0" style={{ background: 'var(--fiq-faint)' }} />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 rounded" style={{ background: 'var(--fiq-faint)', width: '50%' }} />
                      <div className="h-2.5 rounded" style={{ background: 'var(--fiq-faint)', width: '35%' }} />
                    </div>
                  </div>
                  <div className="h-12 rounded-xl" style={{ background: 'var(--fiq-faint)' }} />
                  <div className="flex gap-4">
                    <div className="h-2.5 rounded" style={{ background: 'var(--fiq-faint)', width: '30%' }} />
                    <div className="h-2.5 rounded" style={{ background: 'var(--fiq-faint)', width: '25%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Fin du feed ── */}
      {!hasMore && posts.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            {activeTab === 'discover' ? 'Tu as tout vu — reviens après ta prochaine séance 💪' : 'Fin du feed — explore de nouveaux athlètes'}
          </p>
        </div>
      )}

      {/* Spinner de chargement initial (skeleton déjà affiché via sentinel) */}
      {loading && !hasMore && posts.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
        </div>
      )}
    </div>
  )
}
