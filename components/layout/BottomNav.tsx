'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Dumbbell, Utensils, Users, User } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { FiqAlert } from '@/components/ui/FiqIcons'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: "Aujourd'hui" },
  { href: '/workout',   icon: Dumbbell,        label: 'Séance' },
  { href: '/nutrition', icon: Utensils,         label: 'Nutrition' },
  { href: '/social',    icon: Users,            label: 'Communauté' },
  { href: '/profile',   icon: User,             label: 'Profil' },
]

/** Vérifie si une séance est en cours dans localStorage */
function getActiveWorkoutId(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('forgeiq_workout_')) {
        const data = JSON.parse(localStorage.getItem(key) ?? '{}')
        // Valide si récent (< 24h) et contient des groupes
        if (data?.groups?.length > 0 && Date.now() - (data.savedAt ?? 0) < 86400000) {
          return key.replace('forgeiq_workout_', '')
        }
      }
    }
  } catch { /* ignore */ }
  return null
}

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null)
  const [showQuitModal, setShowQuitModal] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [notifUnread, setNotifUnread] = useState(0)

  // Vérifier localStorage pour une séance active
  const checkActiveWorkout = useCallback(() => {
    setActiveWorkoutId(getActiveWorkoutId())
  }, [])

  useEffect(() => {
    checkActiveWorkout()
    // Revérifier à chaque focus (l'utilisateur revient sur l'onglet)
    window.addEventListener('focus', checkActiveWorkout)
    // Revérifier quand localStorage change (depuis d'autres onglets)
    window.addEventListener('storage', checkActiveWorkout)
    return () => {
      window.removeEventListener('focus', checkActiveWorkout)
      window.removeEventListener('storage', checkActiveWorkout)
    }
  }, [checkActiveWorkout])

  // Revérifier quand le pathname change (navigation terminée)
  useEffect(() => {
    checkActiveWorkout()
  }, [pathname, checkActiveWorkout])

  // Badge notifications — vérifier le count toutes les 60s
  useEffect(() => {
    async function fetchNotifCount() {
      try {
        const res  = await fetch('/api/social/notifications')
        const json = await res.json() as { data: { unread_count: number } | null }
        if (json.data) setNotifUnread(json.data.unread_count)
      } catch { /* silencieux */ }
    }
    fetchNotifCount()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchNotifCount()
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  function handleNavClick(e: React.MouseEvent, href: string) {
    // On est déjà sur la destination → rien
    if (pathname === href || pathname.startsWith(href + '/')) return

    // Séance active ET on quitte la zone workout → intercepter
    const isInWorkout = pathname.startsWith('/workout/')
    const goingToWorkout = href === '/workout' || href.startsWith('/workout')

    if (isInWorkout && activeWorkoutId && !goingToWorkout) {
      e.preventDefault()
      setPendingHref(href)
      setShowQuitModal(true)
    }
  }

  function confirmNavigation() {
    setShowQuitModal(false)
    if (pendingHref) {
      router.push(pendingHref)
      setPendingHref(null)
    }
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 pb-safe z-50 flex justify-center"
        style={{
          background: 'rgba(10, 12, 15, 0.92)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="w-full max-w-[480px] flex items-stretch">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const isWorkout = item.href === '/workout'
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 relative"
                style={{
                  color: isActive ? 'var(--fiq-accent)' : 'rgba(107, 114, 128, 0.75)',
                  transition: 'color 150ms ease',
                }}
              >
                {/* Barre accent en haut de l'item actif */}
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full transition-all duration-200"
                  style={{
                    width: isActive ? 24 : 0,
                    height: 2.5,
                    background: 'var(--fiq-accent)',
                    opacity: isActive ? 1 : 0,
                    boxShadow: isActive ? '0 0 8px rgba(180,255,74,0.6)' : 'none',
                  }}
                />

                {/* Pill background actif */}
                {isActive && (
                  <span
                    className="absolute inset-x-1.5 rounded-2xl pointer-events-none"
                    style={{
                      top: 6, bottom: 4,
                      background: 'rgba(180, 255, 74, 0.07)',
                      border: '1px solid rgba(180, 255, 74, 0.14)',
                    }}
                  />
                )}

                {/* Icône + badges */}
                <div
                  className="relative z-10"
                  style={{
                    transform: isActive ? 'translateY(-1px) scale(1.08)' : 'scale(1)',
                    transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  <Icon
                    style={{
                      width: 20,
                      height: 20,
                      strokeWidth: isActive ? 2.5 : 1.8,
                      transition: 'stroke-width 150ms ease',
                      filter: isActive ? 'drop-shadow(0 0 8px rgba(180, 255, 74, 0.5))' : 'none',
                    }}
                  />
                  {/* Badge vert si séance en cours (sur l'icône Séance) */}
                  {isWorkout && activeWorkoutId && !isActive && (
                    <span
                      className="absolute -top-0.5 -right-0.5 rounded-full"
                      style={{ width: 7, height: 7, background: 'var(--fiq-accent)', boxShadow: '0 0 6px rgba(180,255,74,0.6)' }}
                    />
                  )}
                  {/* Indicateur pulsant si on est dans la séance */}
                  {isWorkout && activeWorkoutId && isActive && (
                    <span
                      className="absolute -top-0.5 -right-0.5 rounded-full animate-pulse"
                      style={{ width: 7, height: 7, background: 'var(--fiq-accent)' }}
                    />
                  )}
                  {/* Badge rouge notifications sur Social */}
                  {item.href === '/social' && notifUnread > 0 && !isActive && (
                    <span
                      className="absolute -top-1 -right-1.5 flex items-center justify-center rounded-full text-[8px] font-black"
                      style={{
                        minWidth: 14,
                        height: 14,
                        background: 'var(--fiq-red)',
                        color: '#fff',
                        padding: '0 3px',
                        boxShadow: '0 0 0 2px var(--bg)',
                      }}
                    >
                      {notifUnread > 9 ? '9+' : notifUnread}
                    </span>
                  )}
                </div>

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

      {/* Modal de confirmation quitter séance */}
      {showQuitModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)' }}
          >
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <FiqAlert size={28} style={{ color: 'var(--fiq-yellow)' }} />
              </div>
              <h3 className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>Séance en cours !</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
                Ta progression est sauvegardée. Tu peux la reprendre en revenant sur &quot;Séance&quot;.
              </p>
            </div>
            <button
              onClick={() => { setShowQuitModal(false); setPendingHref(null) }}
              className="w-full py-3 rounded-2xl font-black text-sm"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              Continuer la séance
            </button>
            <button
              onClick={confirmNavigation}
              className="w-full py-3 rounded-2xl font-semibold text-sm"
              style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
            >
              Mettre en pause et quitter
            </button>
          </div>
        </div>
      )}
    </>
  )
}
