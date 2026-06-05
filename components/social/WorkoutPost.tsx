'use client'

import { useState } from 'react'
import { Heart, Share2, Dumbbell, Clock, MessageCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { CommentSheet } from './CommentSheet'

export type ExerciseInPost = {
  name: string
  top_set_kg: number
  top_set_reps: number
  set_count: number
}

export type FeedPost = {
  id: string
  workout_id: string
  user_id: string
  caption: string | null
  likes_count: number
  comments_count: number
  created_at: string
  is_liked: boolean
  exercises?: ExerciseInPost[]
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
  const [liked, setLiked]               = useState(post.is_liked)
  const [likesCount, setLikesCount]     = useState(post.likes_count)
  const [commentsCount, setCommentsCount] = useState(post.comments_count)
  const [liking, setLiking]             = useState(false)
  const [sharing, setSharing]           = useState(false)
  const [showComments, setShowComments] = useState(false)

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
    if (sharing) return
    setSharing(true)

    const profileUrl = post.author.username
      ? `${window.location.origin}/u/${post.author.username}`
      : window.location.origin
    const fallbackText = [
      `💪 ${post.workout?.session_name ?? 'Séance'} — ${post.author.display_name}`,
      post.workout?.total_tonnage_kg ? `⚡ ${formatTonnage(post.workout.total_tonnage_kg)} soulevés` : '',
      post.caption ?? '',
      profileUrl,
    ].filter(Boolean).join('\n')

    try {
      // 1. Essayer de partager la carte image (Web Share API level 2 — iOS 15+, Android)
      const cardRes = await fetch(`/api/social/card?id=${post.id}`)
      if (cardRes.ok) {
        const blob = await cardRes.blob()
        const slug = (post.workout?.session_name ?? 'seance')
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
        const file = new File([blob], `forgeiq-${slug}.png`, { type: 'image/png' })

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            text: fallbackText,
          })
          return
        }

        // 2. Pas de Web Share avec fichiers → télécharger l'image directement
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `forgeiq-${slug}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
        return
      }
    } catch {
      // Fallback texte si la génération échoue
    } finally {
      setSharing(false)
    }

    // 3. Fallback final : partage texte + URL
    if (navigator.share) {
      await navigator.share({ text: fallbackText, url: profileUrl }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(fallbackText).catch(() => {})
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

      {/* ── Exercices — top sets par exercice ── */}
      {post.exercises && post.exercises.length > 0 && (
        <div className="px-4 py-3 space-y-2" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
          {post.exercises.slice(0, 4).map((ex, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-xs truncate flex-1" style={{ color: 'var(--fiq-muted)' }}>
                {ex.name}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                  {ex.top_set_kg}kg
                </span>
                <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                  × {ex.top_set_reps}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                  style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
                >
                  {ex.set_count}s
                </span>
              </div>
            </div>
          ))}
          {post.exercises.length > 4 && (
            <p className="text-[11px]" style={{ color: 'var(--fiq-muted)' }}>
              +{post.exercises.length - 4} exercice{post.exercises.length - 4 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* ── Auteur + date ── */}
      <Link
        href={post.author.username ? `/u/${post.author.username}` : '#'}
        className="flex items-center gap-3 px-4 py-3 transition-opacity active:opacity-70"
      >
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
      </Link>

      {/* Caption */}
      {post.caption && (
        <p className="text-sm leading-relaxed px-4 pb-3" style={{ color: 'var(--fiq-text)' }}>
          {post.caption}
        </p>
      )}

      {/* ── Sheet commentaires ── */}
      {showComments && (
        <CommentSheet
          shareId={post.id}
          initialCount={commentsCount}
          onClose={() => setShowComments(false)}
          onCountChange={(delta) => setCommentsCount((n) => Math.max(0, n + delta))}
        />
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

        {/* Commentaires */}
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95"
          style={{ color: showComments ? 'var(--fiq-blue)' : 'var(--fiq-muted)' }}
          onClick={() => setShowComments(true)}
        >
          <MessageCircle
            className="w-4 h-4"
            style={{ fill: showComments ? 'var(--fiq-blue)' : 'none', stroke: showComments ? 'var(--fiq-blue)' : 'var(--fiq-muted)' }}
          />
          <span className="text-xs font-bold">
            {commentsCount > 0 ? commentsCount : 'Commenter'}
          </span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Share — génère une carte image PNG */}
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'var(--fiq-faint)', color: sharing ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }}
        >
          {sharing
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Share2 className="w-3.5 h-3.5" />
          }
          {sharing ? 'Carte…' : 'Partager'}
        </button>
      </div>
    </div>
  )
}
