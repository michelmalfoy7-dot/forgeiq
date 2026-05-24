'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Dumbbell, Utensils, MessageCircle, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: "Aujourd'hui" },
  { href: '/workout',   icon: Dumbbell,         label: 'Séance' },
  { href: '/nutrition', icon: Utensils,          label: 'Nutrition' },
  { href: '/coach',     icon: MessageCircle,     label: 'Coach' },
  { href: '/profile',   icon: User,              label: 'Profil' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 pb-safe z-50"
      style={{
        background: 'rgba(10, 12, 15, 0.92)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 relative"
              style={{
                color: isActive ? 'var(--fiq-accent)' : 'rgba(107, 114, 128, 0.75)',
                // Montée subtile de l'item actif
                transform: isActive ? 'translateY(-1px)' : 'none',
                transition: 'color 150ms ease, transform 150ms ease',
              }}
            >
              {/* Barre accent en haut de l'item actif — signature ForgeIQ */}
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full transition-all duration-200"
                style={{
                  width: isActive ? 20 : 0,
                  height: 2.5,
                  background: 'var(--fiq-accent)',
                  opacity: isActive ? 1 : 0,
                }}
              />

              {/* Icône */}
              <Icon
                style={{
                  width: 20,
                  height: 20,
                  strokeWidth: isActive ? 2.5 : 1.8,
                  transition: 'stroke-width 150ms ease',
                  // Glow vert sur l'actif
                  filter: isActive ? 'drop-shadow(0 0 6px rgba(180, 255, 74, 0.45))' : 'none',
                }}
              />

              {/* Label */}
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: isActive ? 800 : 500,
                  lineHeight: 1,
                  letterSpacing: isActive ? '0.04em' : '0.02em',
                  transition: 'font-weight 150ms ease, letter-spacing 150ms ease',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
