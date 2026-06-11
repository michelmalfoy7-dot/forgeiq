'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Zap } from 'lucide-react'

export function ReferralTrialBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Ne pas afficher si déjà dismissé aujourd'hui
    const key = 'forgeiq_trial_banner_dismissed'
    if (localStorage.getItem(key) === new Date().toDateString()) {
      setDismissed(true)
      return
    }

    fetch('/api/profile/trial')
      .then(r => r.json())
      .then(({ data }) => {
        if (data?.trial && typeof data.daysLeft === 'number') {
          setDaysLeft(data.daysLeft)
        }
      })
      .catch(() => null)
  }, [])

  function handleDismiss() {
    setDismissed(true)
    try { localStorage.setItem('forgeiq_trial_banner_dismissed', new Date().toDateString()) } catch { /* ignore */ }
  }

  if (dismissed || daysLeft === null) return null

  const urgent = daysLeft <= 3

  return (
    <div
      className="relative flex items-center gap-3 px-4 py-2.5 text-sm"
      style={{
        background: urgent ? '#EF444415' : '#B4FF4A12',
        borderBottom: `1px solid ${urgent ? '#EF444430' : '#B4FF4A30'}`,
      }}
    >
      <Zap className="w-4 h-4 flex-shrink-0" style={{ color: urgent ? 'var(--fiq-red)' : 'var(--fiq-accent)' }} />

      <p className="flex-1 text-xs" style={{ color: 'var(--fiq-text)' }}>
        {urgent
          ? <><strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong> restant{daysLeft > 1 ? 's' : ''} sur ton essai Pro — ne perds pas l&apos;accès.</>
          : <>Essai Pro : encore <strong>{daysLeft} jours</strong>. Le coach IA illimité t&apos;attend.</>
        }
        {' '}
        <Link href="/pricing" className="font-black underline" style={{ color: urgent ? 'var(--fiq-red)' : 'var(--fiq-accent)' }}>
          S&apos;abonner →
        </Link>
      </p>

      <button onClick={handleDismiss} style={{ color: 'var(--fiq-muted)' }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
