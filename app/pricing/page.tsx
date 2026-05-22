'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Zap, Crown, Infinity, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const PLANS = [
  {
    id: 'monthly',
    name: 'Mensuel',
    price: '4,99',
    period: '/ mois',
    priceNote: 'Annulable à tout moment',
    icon: Zap,
    color: 'var(--fiq-blue)',
    colorAlpha: '#3D8BFF',
    popular: false,
    features: [
      'Coach IA illimité',
      'Analyse photo nutrition',
      'Scan code-barres',
      'Suivi EWMA du poids',
      'Historique complet',
      'Tous les programmes',
    ],
  },
  {
    id: 'annual',
    name: 'Annuel',
    price: '39,99',
    period: '/ an',
    priceNote: '→ 3,33€/mois · Économise 33%',
    icon: Crown,
    color: 'var(--fiq-accent)',
    colorAlpha: '#B4FF4A',
    popular: true,
    features: [
      'Tout le plan Mensuel',
      '2 mois offerts vs mensuel',
      'Accès prioritaire aux nouveautés',
      'Support prioritaire',
    ],
  },
  {
    id: 'lifetime',
    name: 'À vie',
    price: '99,99',
    period: 'une fois',
    priceNote: 'Accès permanent · Jamais de frais',
    icon: Infinity,
    color: '#A855F7',
    colorAlpha: '#A855F7',
    popular: false,
    features: [
      'Tout le plan Annuel',
      'Accès à vie garanti',
      'Toutes les futures fonctionnalités',
      'Badge Fondateur exclusif',
    ],
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubscribe(planId: string) {
    setError(null)
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const { data, error: err } = await res.json()

      if (err === 'Non authentifié') {
        router.push('/login?redirect=/pricing')
        return
      }
      if (err || !data?.url) {
        setError(err ?? 'Erreur lors de la création du paiement. Réessaie.')
        return
      }
      // Rediriger vers Stripe Checkout
      window.location.href = data.url
    } catch {
      setError('Erreur réseau. Vérifie ta connexion et réessaie.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen p-4 pb-12" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="pt-6 mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm mb-6"
            style={{ color: 'var(--fiq-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <p className="fiq-label">Abonnement</p>
          <h1 className="text-3xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>
            Passe à Pro
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--fiq-muted)' }}>
            Moins cher qu&apos;une seule séance avec un coach humain. Pour toujours.
          </p>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const isLoading = loading === plan.id

            return (
              <div
                key={plan.id}
                className="rounded-2xl p-5 relative"
                style={{
                  background: plan.popular ? `${plan.colorAlpha}10` : 'var(--fiq-card)',
                  border: `1px solid ${plan.popular ? `${plan.colorAlpha}60` : 'var(--fiq-border)'}`,
                }}
              >
                {plan.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black"
                    style={{ background: plan.colorAlpha, color: 'var(--bg)', whiteSpace: 'nowrap' }}
                  >
                    ⭐ Meilleure offre
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${plan.colorAlpha}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: plan.color }} />
                    </div>
                    <div>
                      <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>{plan.name}</p>
                      <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{plan.priceNote}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black fiq-data" style={{ color: plan.color }}>
                      {plan.price}€
                    </span>
                    <span className="text-xs ml-1" style={{ color: 'var(--fiq-muted)' }}>{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fiq-text)' }}>
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={!!loading}
                  className="w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2"
                  style={{
                    background: plan.popular ? plan.colorAlpha : 'var(--fiq-faint)',
                    color: plan.popular ? 'var(--bg)' : 'var(--fiq-text)',
                    border: plan.popular ? 'none' : `1px solid var(--fiq-border)`,
                    opacity: loading && !isLoading ? 0.5 : 1,
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Choisir {plan.name}</>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div
            className="mt-4 rounded-xl px-4 py-3 text-sm"
            style={{ background: '#EF444418', color: 'var(--fiq-red)', border: '1px solid #EF444444' }}
          >
            {error}
          </div>
        )}

        {/* Reassurance */}
        <div className="mt-8 space-y-3">
          {[
            { emoji: '🔒', text: 'Paiement sécurisé par Stripe — tes données bancaires ne nous sont jamais transmises.' },
            { emoji: '↩️', text: 'Résilie à tout moment depuis ton profil, sans frais ni engagement.' },
            { emoji: '🆓', text: 'Toutes les fonctionnalités de base restent gratuites pour toujours.' },
          ].map((item) => (
            <p key={item.emoji} className="flex items-start gap-2 text-xs" style={{ color: 'var(--fiq-muted)' }}>
              <span>{item.emoji}</span>
              <span>{item.text}</span>
            </p>
          ))}
        </div>

      </div>
    </div>
  )
}
