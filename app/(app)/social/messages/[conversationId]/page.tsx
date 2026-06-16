'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}

type Contact = {
  user_id: string
  username: string | null
  display_name: string
  avatar_url: string | null
}

function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (isSameDay(date, today)) return 'Aujourd\'hui'
  if (isSameDay(date, yesterday)) return 'Hier'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.conversationId as string

  const [messages, setMessages] = useState<Message[]>([])
  const [contact, setContact] = useState<Contact | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMessages = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch(`/api/social/messages/${conversationId}`)
      const json = await res.json() as {
        data: { messages: Message[]; contact: Contact; current_user_id: string } | null
        error: string | null
      }
      if (json.error || !json.data) {
        if (!silent) setError(json.error ?? 'Conversation introuvable')
        return
      }
      setMessages(json.data.messages)
      setContact(json.data.contact)
      setCurrentUserId(json.data.current_user_id)
      if (!silent) setLoading(false)
    } catch {
      if (!silent) setError('Erreur réseau')
      if (!silent) setLoading(false)
    }
  }, [conversationId])

  // Chargement initial
  useEffect(() => {
    void fetchMessages(false)
  }, [fetchMessages])

  // Scroll automatique vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Polling toutes les 5 secondes — suspendu quand l'onglet est en arrière-plan
  useEffect(() => {
    function startPolling() {
      if (pollingRef.current) return
      pollingRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') void fetchMessages(true)
      }, 5000)
    }
    function stopPolling() {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void fetchMessages(true)
        startPolling()
      } else {
        stopPolling()
      }
    }
    startPolling()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [fetchMessages])

  async function sendMessage() {
    if (!input.trim() || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)

    // Optimistic update
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      sender_id: currentUserId ?? '',
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res = await fetch(`/api/social/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const json = await res.json() as { data: Message | null; error: string | null }
      if (json.data) {
        // Remplacer l'optimistic par le vrai message
        setMessages(prev =>
          prev.map(m => m.id === optimistic.id ? json.data! : m)
        )
      } else {
        // Annuler l'optimistic en cas d'erreur
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        setInput(content)
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(content)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  // Regrouper les messages par date pour les séparateurs
  const messagesWithSeparators: Array<{ type: 'separator'; label: string; dateKey: string } | { type: 'message'; data: Message }> = []
  let lastDate = ''
  for (const msg of messages) {
    const msgDate = new Date(msg.created_at).toDateString()
    if (msgDate !== lastDate) {
      messagesWithSeparators.push({ type: 'separator', label: formatDateSeparator(msg.created_at), dateKey: msgDate })
      lastDate = msgDate
    }
    messagesWithSeparators.push({ type: 'message', data: msg })
  }

  const avatarInitial = contact ? contact.display_name[0].toUpperCase() : '?'

  if (loading) {
    return (
      <div className="max-w-lg mx-auto flex flex-col h-screen" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {/* Header squelette */}
        <div
          className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10"
          style={{ background: 'var(--bg)', borderBottom: '1px solid var(--fiq-border)' }}
        >
          <div className="w-9 h-9 rounded-xl" style={{ background: 'var(--fiq-faint)' }} />
          <div className="w-10 h-10 rounded-2xl" style={{ background: 'var(--fiq-faint)' }} />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-28 rounded" style={{ background: 'var(--fiq-faint)' }} />
            <div className="h-3 w-20 rounded" style={{ background: 'var(--fiq-faint)' }} />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Chargement…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto p-4 text-center pt-20">
        <p className="text-sm font-semibold" style={{ color: 'var(--fiq-red)' }}>{error}</p>
        <button
          onClick={() => router.push('/social/messages')}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-black"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          Retour aux messages
        </button>
      </div>
    )
  }

  return (
    <div
      className="max-w-lg mx-auto flex flex-col"
      style={{ height: '100dvh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      {/* Header fixe */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0 sticky top-0 z-10"
        style={{
          background: 'rgba(10, 12, 15, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--fiq-border)',
        }}
      >
        <button
          onClick={() => router.push('/social/messages')}
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Avatar + nom → lien vers profil */}
        {contact && (
          <Link
            href={contact.username ? `/u/${contact.username}` : '#'}
            className="flex items-center gap-2.5 flex-1 min-w-0"
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black overflow-hidden flex-shrink-0"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              {contact.avatar_url ? (
                <Image
                  src={contact.avatar_url}
                  alt={contact.display_name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                avatarInitial
              )}
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm truncate" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.01em' }}>
                {contact.display_name}
              </p>
              {contact.username && (
                <p className="text-[11px]" style={{ color: 'var(--fiq-muted)' }}>@{contact.username}</p>
              )}
            </div>
          </Link>
        )}
      </div>

      {/* Zone de messages scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ overscrollBehavior: 'contain' }}>
        {messagesWithSeparators.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-center" style={{ color: 'var(--fiq-muted)' }}>
              Envoie le premier message !
            </p>
          </div>
        )}

        {messagesWithSeparators.map((item, i) => {
          if (item.type === 'separator') {
            return (
              <div key={`sep-${item.dateKey}`} className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px" style={{ background: 'var(--fiq-border)' }} />
                <p className="text-[10px] uppercase font-semibold" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
                  {item.label}
                </p>
                <div className="flex-1 h-px" style={{ background: 'var(--fiq-border)' }} />
              </div>
            )
          }

          const msg = item.data
          const isMe = msg.sender_id === currentUserId
          const isOptimistic = msg.id.startsWith('optimistic-')

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: isMe ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                  color: isMe ? 'var(--bg)' : 'var(--fiq-text)',
                  borderBottomRightRadius: isMe ? 4 : undefined,
                  borderBottomLeftRadius: !isMe ? 4 : undefined,
                  border: !isMe ? '1px solid var(--fiq-border)' : 'none',
                  opacity: isOptimistic ? 0.7 : 1,
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
                <span
                  className="ml-2 text-[10px]"
                  style={{
                    color: isMe ? 'rgba(10,12,15,0.5)' : 'var(--fiq-muted)',
                    float: 'right',
                    marginTop: 2,
                  }}
                >
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Zone de saisie */}
      <div
        className="flex-shrink-0 flex items-end gap-2 px-4 py-3"
        style={{ borderTop: '1px solid var(--fiq-border)', background: 'var(--bg)' }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écris un message…"
          rows={1}
          className="flex-1 resize-none text-sm leading-relaxed outline-none px-3.5 py-2.5 rounded-2xl"
          style={{
            background: 'var(--fiq-faint)',
            border: '1px solid var(--fiq-border)',
            color: 'var(--fiq-text)',
            maxHeight: 120,
            overflowY: 'auto',
            caretColor: 'var(--fiq-accent)',
          }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`
          }}
        />
        <button
          onClick={() => void sendMessage()}
          disabled={!input.trim() || sending}
          className="flex items-center justify-center w-10 h-10 rounded-2xl flex-shrink-0 transition-opacity"
          style={{
            background: input.trim() && !sending ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
            color: input.trim() && !sending ? 'var(--bg)' : 'var(--fiq-muted)',
            border: '1px solid var(--fiq-border)',
            opacity: !input.trim() || sending ? 0.5 : 1,
          }}
          aria-label="Envoyer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
