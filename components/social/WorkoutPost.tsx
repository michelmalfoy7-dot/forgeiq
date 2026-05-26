'use client'

import { useState } from 'react'
import { Heart, MessageCircle } from 'lucide-react'

// Types du post enrichi provenant du feed
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

// Formatage date relative en français sans librairie externe
function formatRelativeDate(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffH < 24) return `il y a ${diffH}h`
  if (diffD === 1) return 'hier'
  if (diffD < 7) return `il y a ${diffD} jours`

  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

export function WorkoutPost({ post }: { post: FeedPost }) {
  // Optimistic update pour le like
  const [liked, setLiked] = useState(post.is_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [liking, setLiking] = useState(false)

  async function handleLike() {
    if (liking) return

    // Optimistic update immédiat
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
        // Rollback si erreur
        setLiked(wasLiked)
        setLikesCount((prev) => prev + (wasLiked ? 1 : -1))
      }
    } catch {
      // Rollback en cas d'erreur réseau
      setLiked(wasLiked)
      setLikesCount((prev) => prev + (wasLiked ? 1 : -1))
    } finally {
      setLiking(false)
    }
  }

  // Initiale de l'auteur pour l'avatar
  const avatarInitial = (post.author.display_name || post.author.username || '?')[0].toUpperCase()

  return (
    <div
      className="fiq-card space-y-3"
      style={{ padding: '14px 16px' }}
    >
      {/* En-tête : avatar + username + date */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          {post.author.avatar_url ? (
            // eslint-disable-next-line @next/next-eslint/no-img-element
            <img
              src={post.author.avatar_url}
              alt={post.author.display_name}
              className="w-full h-full rounded-xl object-cover"
            />
          ) : (
            avatarInitial
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--fiq-text)' }}>
            {post.author.display_name}
            {post.author.username && (
              <span className="font-normal ml-1.5" style={{ color: 'var(--fiq-muted)' }}>
                @{post.author.username}
              </span>
            )}
          </p>
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            {formatRelativeDate(post.created_at)}
          </p>
        </div>
      </div>

      {/* Stats de la séance */}
      {post.workout && (
        <div
          className="rounded-xl px-3 py-2.5 space-y-1"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
        >
          <p className="text-xs font-black" style={{ color: 'var(--fiq-accent)' }}>
            💪 {post.workout.session_name ?? 'Séance'}
          </p>
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            {post.workout.total_tonnage_kg
              ? `⚡ ${post.workout.total_tonnage_kg.toLocaleString('fr-FR')} kg soulevés`
              : null}
            {post.workout.total_tonnage_kg && post.workout.total_sets ? ' · ' : null}
            {post.workout.total_sets ? `${post.workout.total_sets} séries` : null}
          </p>
        </div>
      )}

      {/* Caption optionnelle */}
      {post.caption && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--fiq-text)' }}>
          {post.caption}
        </p>
      )}

      {/* Actions : like + commentaires */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleLike}
          disabled={liking}
          className="flex items-center gap-1.5 transition-transform active:scale-90"
          style={{ color: liked ? '#EF4444' : 'var(--fiq-muted)' }}
        >
          <Heart
            className="w-4 h-4"
            style={{
              fill: liked ? '#EF4444' : 'none',
              stroke: liked ? '#EF4444' : 'var(--fiq-muted)',
              transition: 'fill 150ms ease, stroke 150ms ease',
            }}
          />
          <span className="text-xs font-semibold">
            {likesCount > 0 ? likesCount : ''}
          </span>
        </button>

        {/* Bouton commentaires — affichage seulement, fonctionnalité future */}
        <div
          className="flex items-center gap-1.5"
          style={{ color: 'var(--fiq-muted)' }}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs font-semibold">
            {post.comments_count > 0 ? post.comments_count : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
