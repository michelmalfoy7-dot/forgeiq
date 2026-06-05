'use client'

import Link from 'next/link'
import { X, Zap, Camera, Brain, TrendingUp, Infinity } from 'lucide-react'

type Props = {
  onClose: () => void
  trigger?: 'coach' | 'photo' | 'general'
}

const FEATURES = [
  { icon: Brain,     label: 'Coach IA illimité',          sub: 'Recommandations personnalisées chaque jour' },
  { icon: Camera,    label: 'Scan photo repas',            sub: 'Analyse nutrition instantanée par IA' },
  { icon: TrendingUp,label: 'Historique complet',          sub: 'Progression sur 1 an, graphiques avancés' },
  { icon: Infinity,  label: 'Tout à vie',                  sub: 'Une fois payé, jamais plus' },
]

const MESSAGES: Record<string, { title: string; sub: string; emoji: string }> = {
  coach: {
    emoji: '🤖',
    title: 'Tes 5 messages offerts sont utilisés',
    sub: 'Le Coach IA analyse ton sommeil, ta nutrition et tes PRs pour te donner des conseils sur mesure. Passe en Pro pour un accès illimité.',
  },
  photo: {
    emoji: '📸',
    title: 'Analyse photo réservée aux Pro',
    sub: 'Prends en photo n\'importe quel repas — l\'IA identifie les aliments et estime les macros en 5 secondes.',
  },
  general: {
    emoji: '⚡',
    title: 'Feature Pro',
    sub: 'Passe en Pro pour débloquer toutes les fonctionnalités de ForgeIQ.',
  },
}

export function PaywallModal({ onClose, trigger = 'general' }: Props) {
  const msg = MESSAGES[trigger]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[480px] rounded-t-3xl pb-safe"
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--fiq-border)' }} />
        </div>

        <div className="px-5 pt-2 pb-6">
          {/* Close */}
          <div className="flex justify-end mb-2">
            <button onClick={onClose} style={{ color: 'var(--fiq-muted)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Emoji + titre */}
          <div className="text-center mb-5">
            <div className="text-5xl mb-3">{msg.emoji}</div>
            <h2 className="text-xl font-black leading-tight" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.02em' }}>
              {msg.title}
            </h2>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
              {msg.sub}
            </p>
          </div>

          {/* Features Pro */}
          <div className="rounded-2xl p-4 mb-5 space-y-3"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#B4FF4A22' }}>
                  <Icon className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Prix */}
          <div className="text-center mb-4">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--fiq-muted)' }}>
              Prix fondateur
            </p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
                4,99€
              </span>
              <span className="text-base" style={{ color: 'var(--fiq-muted)' }}>/mois</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
              ou 39,99€/an · Accès à vie 99€
            </p>
          </div>

          {/* CTA */}
          <Link
            href="/pricing"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-base"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            <Zap className="w-5 h-5" />
            Passer en Pro
          </Link>

          <p className="text-center text-xs mt-3" style={{ color: 'var(--fiq-muted)' }}>
            Annulation à tout moment · Paiement sécurisé Stripe
          </p>
        </div>
      </div>
    </div>
  )
}
