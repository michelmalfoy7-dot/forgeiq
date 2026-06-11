'use client'

import { useEffect, useState } from 'react'
import { X, Share2 } from 'lucide-react'

type Props = {
  streak: number
  type: 'checkin' | 'training'
  onClose: () => void
}

const MILESTONE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  // check-in (jours)
  'checkin-7':   { emoji: '🔥', label: '7 jours d\'affilée', color: '#FF6B35' },
  'checkin-30':  { emoji: '⚡', label: '30 jours d\'affilée', color: '#B4FF4A' },
  'checkin-100': { emoji: '💎', label: '100 jours d\'affilée', color: '#3D8BFF' },
  // training (semaines)
  'training-4':  { emoji: '🔥', label: '4 semaines d\'entraînement', color: '#FF6B35' },
  'training-12': { emoji: '⚡', label: '3 mois d\'entraînement', color: '#B4FF4A' },
  'training-52': { emoji: '💎', label: '1 an d\'entraînement', color: '#FFD700' },
}

export function StreakMilestoneModal({ streak, type, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const cfg = MILESTONE_CONFIG[`${type}-${streak}`] ?? { emoji: '🏆', label: `${streak} ${type === 'checkin' ? 'jours' : 'semaines'}`, color: '#B4FF4A' }
  const typeLabel = type === 'checkin' ? 'check-ins' : "semaines d'entraînement"

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  async function handleShare() {
    const text = `${cfg.emoji} ${streak} ${typeLabel} consécutifs sur ForgeIQ ! #ForgeIQ #fitness`
    if (navigator.share) {
      await navigator.share({ text }).catch(() => null)
    } else {
      await navigator.clipboard.writeText(text).catch(() => null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
      onClick={handleClose}
    >
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }, (_, i) => (
          <span
            key={i}
            className="confetti-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.8}s`,
              background: [cfg.color, '#fff', '#FFD700', cfg.color + '99'][i % 4],
            }}
          />
        ))}
      </div>

      <div
        className="relative w-full max-w-sm rounded-3xl p-8 text-center"
        style={{
          background: 'var(--fiq-card)',
          border: `2px solid ${cfg.color}44`,
          boxShadow: `0 0 60px ${cfg.color}33`,
          transform: visible ? 'scale(1)' : 'scale(0.85)',
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4"
          style={{ color: 'var(--fiq-muted)' }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge "Milestone" */}
        <div
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest mb-6"
          style={{ background: cfg.color + '22', color: cfg.color, border: `1px solid ${cfg.color}44` }}
        >
          MILESTONE
        </div>

        {/* Emoji géant */}
        <div className="text-7xl mb-4 milestone-bounce">{cfg.emoji}</div>

        {/* Chiffre */}
        <div
          className="text-8xl font-black leading-none mb-2"
          style={{ color: cfg.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em' }}
        >
          {streak}
        </div>
        <p className="text-lg font-bold mb-1" style={{ color: 'var(--fiq-text)' }}>
          {cfg.label}
        </p>
        <p className="text-sm mb-8" style={{ color: 'var(--fiq-muted)' }}>
          {streak} {typeLabel} consécutifs. Exceptionnel.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black transition-all active:scale-95"
            style={{ background: cfg.color, color: '#0A0C0F' }}
          >
            <Share2 className="w-4 h-4" />
            Partager
          </button>
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
          >
            Continuer
          </button>
        </div>
      </div>

      <style>{`
        .confetti-particle {
          position: absolute;
          top: -10px;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          animation: confetti-fall 2.5s ease-in forwards;
        }
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .milestone-bounce {
          animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
        }
        @keyframes bounce-in {
          0%   { transform: scale(0); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
