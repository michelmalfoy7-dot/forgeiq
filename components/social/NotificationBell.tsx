'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

type Props = {
  initialUnread?: number
}

export function NotificationBell({ initialUnread = 0 }: Props) {
  const [unread, setUnread] = useState(initialUnread)

  // Rafraîchir le count toutes les 60s si la page est visible
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>

    async function fetchCount() {
      try {
        const res  = await fetch('/api/social/notifications')
        const json = await res.json() as { data: { unread_count: number } | null }
        if (json.data) setUnread(json.data.unread_count)
      } catch { /* silencieux */ }
    }

    // Fetch initial
    fetchCount()

    interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchCount()
    }, 60_000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Link
      href="/social/notifications"
      className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-opacity active:opacity-70"
      style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
    >
      <Bell className="w-4 h-4" style={{ color: unread > 0 ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }} />

      {/* Badge rouge count */}
      {unread > 0 && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[9px] font-black"
          style={{
            minWidth: 16,
            height: 16,
            background: 'var(--fiq-red)',
            color: '#fff',
            padding: '0 3px',
            boxShadow: '0 0 0 2px var(--bg)',
          }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
