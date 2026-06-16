'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, MessageCircle, PenSquare } from 'lucide-react'

type Conversation = {
  id: string
  contact: {
    user_id: string
    username: string | null
    display_name: string
    avatar_url: string | null
  }
  last_message: {
    content: string
    created_at: string
    sender_id: string
    read_at: string | null
  } | null
  last_message_at: string
  unread_count: number
}

type Props = {
  conversations: Conversation[]
  currentUserId: string
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'À l\'instant'
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}j`
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(dateStr))
}

export function MessagesClient({ conversations, currentUserId }: Props) {
  const totalUnread = conversations.reduce((acc, c) => acc + c.unread_count, 0)

  return (
    <div className="max-w-lg mx-auto" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(10, 12, 15, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--fiq-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/social"
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.02em' }}>
              Messages
            </h1>
            {totalUnread > 0 && (
              <p className="text-xs" style={{ color: 'var(--fiq-accent)' }}>
                {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        {/* Icône "nouvelle conversation" → recherche d'athlète */}
        <Link
          href="/social/search"
          className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
          title="Nouvelle conversation"
        >
          <PenSquare className="w-4 h-4" />
        </Link>
      </div>

      {/* État vide */}
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
          >
            <MessageCircle className="w-7 h-7" style={{ color: 'var(--fiq-muted)' }} />
          </div>
          <div>
            <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>
              Aucun message
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Visite le profil d&apos;un athlète et envoie-lui un message.
            </p>
          </div>
          <Link
            href="/social/search"
            className="px-5 py-2.5 rounded-xl font-black text-sm"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            Trouver des athlètes
          </Link>
        </div>
      ) : (
        /* Liste des conversations */
        <div className="divide-y" style={{ borderColor: 'var(--fiq-border)' }}>
          {conversations.map((conv) => {
            const isUnread = conv.unread_count > 0
            const isFromMe = conv.last_message?.sender_id === currentUserId
            const lastText = conv.last_message
              ? (isFromMe ? 'Vous : ' : '') + conv.last_message.content.slice(0, 50) + (conv.last_message.content.length > 50 ? '…' : '')
              : 'Nouvelle conversation'
            const avatarInitial = conv.contact.display_name[0].toUpperCase()

            return (
              <Link
                key={conv.id}
                href={`/social/messages/${conv.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors active:opacity-70"
                style={{ background: isUnread ? 'rgba(180,255,74,0.03)' : 'transparent' }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black overflow-hidden"
                    style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                  >
                    {conv.contact.avatar_url ? (
                      <Image
                        src={conv.contact.avatar_url}
                        alt={conv.contact.display_name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      avatarInitial
                    )}
                  </div>
                  {/* Badge non lu */}
                  {isUnread && (
                    <span
                      className="absolute -top-0.5 -right-0.5 rounded-full"
                      style={{
                        width: 10,
                        height: 10,
                        background: 'var(--fiq-accent)',
                        border: '2px solid var(--bg)',
                        boxShadow: '0 0 6px rgba(180,255,74,0.5)',
                      }}
                    />
                  )}
                </div>

                {/* Nom + aperçu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className="text-sm truncate"
                      style={{ color: 'var(--fiq-text)', fontWeight: isUnread ? 900 : 600 }}
                    >
                      {conv.contact.display_name}
                    </p>
                    <p className="text-[10px] flex-shrink-0" style={{ color: 'var(--fiq-muted)' }}>
                      {relativeTime(conv.last_message_at)}
                    </p>
                  </div>
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: 'var(--fiq-muted)', fontWeight: isUnread ? 600 : 400 }}
                  >
                    {lastText}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
