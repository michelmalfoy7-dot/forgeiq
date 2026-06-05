'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Brain, Camera, TrendingUp, Zap } from 'lucide-react'

const PERKS = [
  { icon: Brain,     text: 'Coach IA illimité' },
  { icon: Camera,    text: 'Scan photo repas' },
  { icon: TrendingUp,text: 'Historique complet' },
]

export function ProBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #B4FF4A18 0%, #3D8BFF12 100%)',
        border: '1px solid #B4FF4A33',
      }}
    >
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3"
        style={{ color: 'var(--fiq-muted)' }}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pr-6">
        <Zap className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)', fill: 'var(--fiq-accent)' }} />
        <p className="text-sm font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.01em' }}>
          Passe en Pro — dès 4,99€/mois
        </p>
      </div>

      {/* Perks inline */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {PERKS.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--fiq-muted)' }}>{text}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link
        href="/pricing"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-sm"
        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
      >
        Voir les offres →
      </Link>
    </div>
  )
}
