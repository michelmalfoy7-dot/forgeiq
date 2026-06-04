'use client'

import { useState } from 'react'
import { Heart, Share2, Dumbbell, Zap, Clock } from 'lucide-react'
import Image from 'next/image'

export type FeedPost = {
  id: string
  workout_id: string
  user_id: string
  caption: string | null
  likes_count: number
  comments_count: number
  created_at: string
  is_liked: boolean
  author: {
    username: string | null
    display_name: string
    avatar_url: string | null
  }
  workout: {
    session_name: string | null
    total_tonnage_kg: number | null
    total_sets: number | null
    completed_at: string | null
  } | null
}

function formatRelativeDate(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin}m`
  if (diffH < 24) return `il y a ${diffH}h`
  if (diffD === 1) return 'hier'
  if (diffD < 7) return `il y a ${diffD}j`
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

function formatTonnage(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${kg.toLocaleString('fr-FR')} kg`
}

export function WorkoutPost({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(post.is_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [liking, setLiking] = useState(false)

  async function handleLike() {
    if (liking) return
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikesCount((prev) => prev + (wasLiked ? -1 : 1))
    setLiking(true)
    try {
      const res = await fetch('/api/social/like', {
        method: wasLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_id: post.id }),
      })
      if (!res.ok) {
        setLiked(wasLiked)
        setLikesCount((prev) => prev + (wasLiked ? 1 : -1))
      }
    } catch {
      setLiked(wasLiked)
      setLikesCount((prev) => prev + (wasLiked ? 1 : -1))
    } finally {
      setLiking(false)
    }
  }

  async function handleShare() {
    const text = [
      `💪 ${post.workout?.session_name ?? 'Séance'} — via ForgeIQ`,
      post.workout?.total_tonnage_kg ? `⚡ ${formatTonnage(post.workout.total_tonnage_kg)} soulevés` : '',
      post.caption ?? '',
      'getforgeiq.com',
    ].filter(Boolean).join('\n')
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  const avatarInitial = (post.author.display_name || post.author.username || '?')[0].toUpperCase()
  const hasWorkout = !!post.workout

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>

      {/* ── Carte séance (bloc visuel principal) ── */}
      {hasWorkout && (
        <div
          className="relative px-4 pt-4 pb-3"
          style={{
            background: 'linear-gradient(135deg, #0E1117 0%, #161A21 60%, #0A0F1A 100%)',
            borderBottom: '1px solid var(--fiq-border)',
          }}
        >
          {/* Watermark ForgeIQ */}
          <div className="absolute top-3 right-4 flex items-center gap-1 opacity-40">
            <Dumbbell className="w-3 h-3" style={{ color: 'var(--fiq-accent)' }} />
            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: 'var(--fiq-accent)' }}>
              ForgeIQ
            </span>
          </div>

          {/* Nom de la séance */}
          <p
            className="text-lg font-black leading-tight pr-16"
            style={{ color: 'var(--fiq-text)', letterSpacing: '-0.02em' }}
          >
            {post.workout!.session_name ?? 'Séance'}
          </p>

          {/* Stats principales */}
          <div className="flex items-end gap-5 mt-3">
            {post.workout!.total_tonnage_kg != null && (
              <div>
                <p className="text-2xl font-black fiq-data" style={{ color: 'var(--fiq-accent)', letterSpacing: '-0.03em' }}>
                  {formatTonnage(post.workout!.total_tonnage_kg)}
                </p>
                <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  soulevés
                </p>
              </div>
            )}

            {post.workout!.total_sets != null && (
              <div>
                <p className="text-2xl font-black fiq-data" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
                  {post.workout!.total_sets}
                </p>
                <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  séries
                </p>
              </div>
            )}
          </div>

          {/* Barre décorative accent */}
          <div className="mt-3 h-0.5 rounded-full w-12" style={{ background: 'var(--fiq-accent)' }} />
        </div>
      )}

      {/* ── Auteur + date ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
          style={{ background: 'var(--fiq-accent)' }}>
          {post.author.avatar_url ? (
            <Image src={post.author.avatar_url} alt={post.author.display_name} fill className="object-cover" sizes="36px" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-sm font-black" style={{ color: 'var(--bg)' }}>
              {avatarInitial}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--fiq-text)' }}>
            {post.author.display_name}
            {post.author.username && (
              <span className="font-normal ml-1.5 text-xs" style={{ color: 'var(--fiq-muted)' }}>
                @{post.author.username}
              </span>
            )}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-2.5 h-2.5" style={{ color: 'var(--fiq-muted)' }} />
            <p className="text-[11px]" style={{ color: 'var(--fiq-muted)' }}>
              {formatRelativeDate(post.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <p className="text-sm leading-relaxed px-4 pb-3" style={{ color: 'var(--fiq-text)' }}>
          {post.caption}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-1 px-3 pb-3 pt-1 border-t" style={{ borderColor: 'var(--fiq-border)' }}>
        {/* Like */}
        <button
          onClick={handleLike}
          disabled={liking}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95"
          style={{ color: liked ? '#EF4444' : 'var(--fiq-muted)' }}
        >
          <Heart
            className="w-4 h-4"
            style={{ fill: liked ? '#EF4444' : 'none', stroke: liked ? '#EF4444' : 'var(--fiq-muted)' }}
          />
          <span className="text-xs font-bold">
            {likesCount > 0 ? likesCount : 'J\'aime'}
          </span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
        >
          <Share2 className="w-3.5 h-3.5" />
          Partager
        </button>

        {/* Zap — motivation */}
        <button
          className="flex items-center gap-1 px-2.5 py-2 rounded-xl transition-all active:scale-95"
          style={{ color: 'var(--fiq-accent)' }}
          onClick={() => {
            // Future : réaction "🔥"
          }}
        >
          <Zap className="w-4 h-4" style={{ fill: 'var(--fiq-accent)' }} />
        </button>
      </div>
    </div>
  )
}
