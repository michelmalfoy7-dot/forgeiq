'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { X, Send, Loader2, Trash2 } from 'lucide-react'

type Comment = {
  id: string
  user_id: string
  content: string
  created_at: string
  is_mine: boolean
  author: {
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

type Props = {
  shareId: string
  initialCount: number
  onClose: () => void
  onCountChange: (delta: number) => void
}

function formatRelativeDate(dateString: string): string {
  const diffMs  = Date.now() - new Date(dateString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH   = Math.floor(diffMin / 60)
  const diffD   = Math.floor(diffH / 24)
  if (diffMin < 1)  return "à l'instant"
  if (diffMin < 60) return `${diffMin}m`
  if (diffH < 24)   return `${diffH}h`
  if (diffD === 1)  return 'hier'
  return `${diffD}j`
}

export function CommentSheet({ shareId, initialCount, onClose, onCountChange }: Props) {
  const [comments, setComments]   = useState<Comment[]>([])
  const [loading, setLoading]     = useState(true)
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)

  // Charger les commentaires
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/social/comments?share_id=${shareId}`)
        const json = await res.json() as { data: Comment[] | null }
        setComments(json.data ?? [])
      } catch { /* silencieux */ }
      finally  { setLoading(false) }
    }
    load()
    // Focus input après ouverture
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [shareId])

  // Scroll en bas quand de nouveaux commentaires arrivent
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [comments])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setError(null)
    setInput('')

    try {
      const res  = await fetch('/api/social/comments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ share_id: shareId, content: text }),
      })
      const json = await res.json() as { data: Comment | null; error: string | null }

      if (json.error) {
        setError(json.error)
        setInput(text) // remettre le texte si erreur
      } else if (json.data) {
        setComments((prev) => [...prev, json.data!])
        onCountChange(1)
      }
    } catch {
      setError('Erreur réseau')
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    onCountChange(-1)
    try {
      await fetch('/api/social/comments', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ comment_id: commentId, share_id: shareId }),
      })
    } catch { /* rollback si besoin — rare */ }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className="w-full max-w-[480px] rounded-t-3xl flex flex-col"
          style={{
            background:  'var(--surface)',
            border:      '1px solid var(--fiq-border)',
            borderBottom: 'none',
            maxHeight:   '80dvh',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--fiq-border)' }}
          >
            <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
              Commentaires
              {comments.length > 0 && (
                <span className="ml-2 font-normal text-xs" style={{ color: 'var(--fiq-muted)' }}>
                  ({comments.length})
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

          {/* Liste commentaires */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ minHeight: 120 }}>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">💬</p>
                <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
                  Sois le premier à commenter !
                </p>
              </div>
            ) : (
              comments.map((comment) => {
                const name    = comment.author.display_name || comment.author.username || 'Athlète'
                const initial = name[0].toUpperCase()
                return (
                  <div key={comment.id} className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="relative w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center font-black text-xs flex-shrink-0"
                      style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                    >
                      {comment.author.avatar_url ? (
                        <Image
                          src={comment.author.avatar_url}
                          alt={name}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : initial}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-black" style={{ color: 'var(--fiq-text)' }}>
                          {name}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                          {formatRelativeDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--fiq-text)' }}>
                        {comment.content}
                      </p>
                    </div>

                    {/* Supprimer (seulement ses propres) */}
                    {comment.is_mine && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-opacity active:opacity-60"
                        style={{ color: 'var(--fiq-muted)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Input */}
          <div
            className="px-4 py-3 flex-shrink-0"
            style={{ borderTop: '1px solid var(--fiq-border)' }}
          >
            {error && (
              <p className="text-xs mb-2" style={{ color: 'var(--fiq-red)' }}>{error}</p>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend() }}
                placeholder="Ajoute un commentaire…"
                maxLength={500}
                className="flex-1 outline-none text-sm px-4 py-3 rounded-xl"
                style={{
                  background: 'var(--fiq-faint)',
                  border:     '1px solid var(--fiq-border)',
                  color:      'var(--fiq-text)',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: input.trim() ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                  color:      input.trim() ? 'var(--bg)' : 'var(--fiq-muted)',
                }}
              >
                {sending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
