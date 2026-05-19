'use client'

import { useState } from 'react'
import { Check, Zap, Crown, Infinity } from 'lucide-react'

const FEATURES_FREE = [
  '5 messages coach IA / mois',
  'Logger des séances illimité',
  'Bilan quotidien (check-in)',
  'Dashboard & graphiques',
  '89 exercices + 12 programmes',
]

const FEATURES_PRO = [
  'Coach IA illimité',
  'Suggestions de séances adaptatives',
  'Alertes IA contextuelles',
  'Constructeur de programme custom',
  'Historique complet illimité',
  'Priorité support',
]

const PLANS = [
  {
    id: 'monthly' as const,
    label: 'Pro Mensuel',
    price: '$7.99',
    sub: 'par mois',
    badge: null,
    icon: Zap,
    color: '#B4FF4A',
  },
  {
    id: 'annual' as const,
    label: 'Pro Annuel',
    price: '$59.99',
    sub: 'par an · soit $5/mois',
    badge: '−37% 🔥',
    icon: Crown,
    color: '#3D8BFF',
  },
  {
    id: 'lifetime' as const,
    label: 'Lifetime',
    price: '$149',
    sub: 'paiement unique · à vie',
    badge: 'Best value',
    icon: Infinity,
    color: '#FF6B35',
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleCheckout(plan: 'monthly' | 'annual' | 'lifetime') {
    setLoading(plan)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      if (!data?.url) throw new Error('URL de paiement manquante')
      window.location.href = data.url
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Checkout error:', msg)
      setErrorMsg('Erreur : ' + msg)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="fiq-label mb-2" style={{ color: 'var(--fiq-accent)' }}>Abonnement</p>
        <h1
          className="text-3xl font-black mb-3"
          style={{ letterSpacing: '-0.03em', color: 'var(--fiq-text)' }}
        >
          Passe en <span style={{ color: 'var(--fiq-accent)' }}>Pro</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
          Un vrai coach IA sans abonnement à $200/mois.
        </p>
      </div>

      {/* Comparaison Free vs Pro */}
      <div
        className="rounded-2xl p-4 mb-6"
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Free */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--fiq-muted)' }}>
              Gratuit
            </p>
            {FEATURES_FREE.map(f => (
              <div key={f} className="flex items-start gap-2 mb-2">
                <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--fiq-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{f}</span>
              </div>
            ))}
          </div>
          {/* Pro */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--fiq-accent)' }}>
              Pro ⚡
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--fiq-muted)' }}>
              Tout le gratuit, plus :
            </p>
            {FEATURES_PRO.map(f => (
              <div key={f} className="flex items-start gap-2 mb-2">
                <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
                <span className="text-xs" style={{ color: 'var(--fiq-text)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {errorMsg && (
        <div
          className="rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: '#EF444415', border: '1px solid #EF444433', color: '#EF4444' }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Plans */}
      <div className="flex flex-col gap-3">
        {PLANS.map(plan => {
          const Icon = plan.icon
          const isLoading = loading === plan.id
          return (
            <button
              key={plan.id}
              onClick={() => handleCheckout(plan.id)}
              disabled={!!loading}
              className="w-full rounded-2xl p-4 text-left relative disabled:opacity-60 transition-opacity"
              style={{ background: 'var(--fiq-card)', border: `1px solid ${plan.color}44` }}
            >
              {plan.badge && (
                <span
                  className="absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: plan.color + '22', color: plan.color }}
                >
                  {plan.badge}
                </span>
              )}
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: plan.color + '20' }}
                >
                  <Icon className="w-4 h-4" style={{ color: plan.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
                    {plan.label}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{plan.sub}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-lg" style={{ color: plan.color, letterSpacing: '-0.03em' }}>
                    {isLoading ? '...' : plan.price}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Garantie */}
      <p className="text-center text-xs mt-6" style={{ color: 'var(--fiq-muted)' }}>
        ✓ Annulation en 1 clic · Aucun engagement · Paiement sécurisé Stripe
      </p>
    </div>
  )
}
