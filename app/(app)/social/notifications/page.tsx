import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Heart, UserPlus, Bell } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Notification = {
  id: string
  type: 'like' | 'follow' | 'comment'
  actor_id: string
  reference_id: string | null
  is_read: boolean
  created_at: string
  actor: {
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

function formatRelativeDate(dateString: string): string {
  const diffMs  = Date.now() - new Date(dateString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH   = Math.floor(diffMin / 60)
  const diffD   = Math.floor(diffH / 24)

  if (diffMin < 1)  return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin}m`
  if (diffH < 24)   return `il y a ${diffH}h`
  if (diffD === 1)  return 'hier'
  return `il y a ${diffD}j`
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Marquer toutes comme lues (page ouverte = lues, fire-and-forget)
  void supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Charger les notifications
  let notifications: Notification[] = []
  try {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, actor_id, reference_id, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data && data.length > 0) {
      const actorIds = [...new Set(data.map((n: { actor_id: string }) => n.actor_id))]
      const { data: actorProfiles } = await supabase
        .from('social_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', actorIds)

      const actorMap = new Map((actorProfiles ?? []).map((p: {
        user_id: string; username: string | null; display_name: string | null; avatar_url: string | null
      }) => [p.user_id, p]))

      notifications = data.map((n: { id: string; type: string; actor_id: string; reference_id: string | null; is_read: boolean; created_at: string }) => ({
        ...n,
        type: n.type as Notification['type'],
        actor: actorMap.get(n.actor_id) ?? { username: null, display_name: 'Quelqu\'un', avatar_url: null },
      }))
    }
  } catch {
    // Table notifications non encore créée — afficher état vide
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/social"
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-70"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            Notifications
          </h1>
        </div>
      </div>

      {/* Liste */}
      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const name    = notif.actor.display_name || notif.actor.username || 'Quelqu\'un'
            const initial = name[0].toUpperCase()
            const profileHref = notif.actor.username ? `/u/${notif.actor.username}` : '#'

            return (
              <Link
                key={notif.id}
                href={profileHref}
                className="flex items-center gap-3 p-3 rounded-2xl transition-opacity active:opacity-70"
                style={{
                  background: notif.is_read ? 'var(--fiq-card)' : '#B4FF4A08',
                  border: `1px solid ${notif.is_read ? 'var(--fiq-border)' : '#B4FF4A25'}`,
                }}
              >
                {/* Avatar acteur */}
                <div
                  className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                >
                  {notif.actor.avatar_url ? (
                    <Image
                      src={notif.actor.avatar_url}
                      alt={name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : initial}
                </div>

                {/* Texte */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--fiq-text)' }}>
                    <span className="font-black">{name}</span>
                    {' '}
                    {notif.type === 'like'    && 'a aimé ta séance'}
                    {notif.type === 'follow'  && 'te suit maintenant'}
                    {notif.type === 'comment' && 'a commenté ta séance'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                    {formatRelativeDate(notif.created_at)}
                  </p>
                </div>

                {/* Icône type */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: notif.type === 'like'   ? '#EF444420'
                              : notif.type === 'follow' ? '#B4FF4A20'
                              : '#3D8BFF20',
                  }}
                >
                  {notif.type === 'like'   && <Heart className="w-4 h-4" style={{ color: '#EF4444' }} />}
                  {notif.type === 'follow' && <UserPlus className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="fiq-card text-center py-12 space-y-3">
          <Bell className="w-10 h-10 mx-auto" style={{ color: 'var(--fiq-muted)' }} />
          <div>
            <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Pas encore de notifications</p>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Partage une séance pour commencer à recevoir des likes !
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
