'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Zap, Crown, Infinity, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ── Toggle promo ───────────────────────────────────────────────
// true  → Prix Fondateur : 4,99€/mois · 39,99€/an · 99€ à vie
// false → Prix normaux   : 9,99€/mois · 69,99€/an · 149€ à vie
const IS_LAUNCH_PROMO = true

const PLANS = [
  {
    id: 'monthly',
    name: 'Mensuel',
    price: IS_LAUNCH_PROMO ? '4,99' : '9,99',
    originalPrice: IS_LAUNCH_PROMO ? '9,99' : null,
    period: '/ mois',
    priceNote: IS_LAUNCH_PROMO ? '🎁 Prix Fondateur · Offre limitée' : 'Annulable à tout moment',
    icon: Zap,
    color: 'var(--fiq-blue)',
    colorHex: '#3D8BFF',
    popular: false,
    features: [
      'Logger tes séances complètes',
      'Suivi nutrition + scan code-barres',
      'Coach IA — 30 messages/mois',
      'Suivi EWMA du poids',
      'Historique complet',
      'Tous les programmes inclus',
    ],
  },
  {
    id: 'annual',
    name: 'Annuel',
    price: IS_LAUNCH_PROMO ? '39,99' : '69,99',
    originalPrice: IS_LAUNCH_PROMO ? '69,99' : null,
    period: '/ an',
    priceNote: IS_LAUNCH_PROMO ? '🎁 3,33€/mois · Prix Fondateur' : '5,83€/mois · Économise 42%',
    icon: Crown,
    color: 'var(--fiq-accent)',
    colorHex: '#B4FF4A',
    popular: true,
    features: [
      'Tout le plan Mensuel',
      'Coach IA — messages illimités',
      'Analyse photo nutrition IA',
      IS_LAUNCH_PROMO ? 'Économise 53% vs mensuel' : 'Économise 42% vs mensuel',
      'Accès prioritaire aux nouveautés',
      'Badge Fondateur exclusif',
    ],
  },
  {
    id: 'lifetime',
    name: 'À vie',
    price: IS_LAUNCH_PROMO ? '99' : '149',
    originalPrice: IS_LAUNCH_PROMO ? '149' : null,
    period: 'une fois',
    priceNote: 'Accès permanent · Jamais de frais',
    icon: Infinity,
    color: '#A855F7',
    colorHex: '#A855F7',
    popular: false,
    features: [
      'Tout le plan Annuel',
      'Accès à vie garanti',
      'Toutes les futures fonctionnalités',
      'Badge Fondateur permanent',
      IS_LAUNCH_PROMO ? 'Rentabilisé en 20 mois vs mensuel' : 'Rentabilisé en 15 mois',
    ],
  },
]

const FREE_FEATURES = [
  { label: 'Logger tes séances', included: true },
  { label: 'Nutrition basique (log manuel)', included: true },
  { label: 'Suivi du poids', included: true },
  { label: 'Coach IA', included: false, note: '5 messages/mois' },
  { label: 'Analyse photo IA', included: false },
  { label: 'Scan code-barres', included: false },
  { label: 'EWMA & tendances avancées', included: false },
  { label: 'Tous les programmes', included: false },
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
      window.location.href = data.url
    } catch {
      setError('Erreur réseau. Vérifie ta connexion et réessaie.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen p-4 pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="pt-6 mb-8">
          <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm mb-6"
            style={{ color: 'var(--fiq-muted)' }}>
            <ArrowLeft className="w-4 h-4" />Retour
          </Link>
          <p className="fiq-label">Abonnement</p>
          <h1 className="text-3xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>
            Passe à Pro
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--fiq-muted)' }}>
            Workout · Nutrition · Coach IA — tout en une seule app.
          </p>
          {IS_LAUNCH_PROMO && (
            <div className="mt-4 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: '#B4FF4A15', border: '1px solid #B4FF4A40', color: 'var(--fiq-accent)' }}>
              🎁 Offre Fondateur — Prix réduits pour les premiers utilisateurs. Limité dans le temps.
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="space-y-4 mb-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const isLoading = loading === plan.id

            return (
              <div key={plan.id} className="rounded-2xl p-5 relative"
                style={{
                  background: plan.popular ? `${plan.colorHex}10` : 'var(--fiq-card)',
                  border: `1px solid ${plan.popular ? `${plan.colorHex}60` : 'var(--fiq-border)'}`,
                }}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black"
                    style={{ background: plan.colorHex, color: 'var(--bg)', whiteSpace: 'nowrap' }}>
                    ⭐ Meilleure offre
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${plan.colorHex}20` }}>
                      <Icon className="w-5 h-5" style={{ color: plan.color }} />
                    </div>
                    <div>
                      <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>{plan.name}</p>
                      <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{plan.priceNote}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {plan.originalPrice && (
                      <p className="text-xs line-through" style={{ color: 'var(--fiq-muted)' }}>
                        {plan.originalPrice}€
                      </p>
                    )}
                    <span className="text-2xl font-black fiq-data" style={{ color: plan.color }}>
                      {plan.price}€
                    </span>
                    <span className="text-xs ml-1" style={{ color: 'var(--fiq-muted)' }}>{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fiq-text)' }}>
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={!!loading}
                  className="w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2"
                  style={{
                    background: plan.popular ? plan.colorHex : 'var(--fiq-faint)',
                    color: plan.popular ? 'var(--bg)' : 'var(--fiq-text)',
                    border: plan.popular ? 'none' : `1px solid var(--fiq-border)`,
                    opacity: loading && !isLoading ? 0.5 : 1,
                  }}>
                  {isLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <>Choisir {plan.name}{IS_LAUNCH_PROMO ? ' — Fondateur' : ''}</>
                  }
                </button>
              </div>
            )
          })}
        </div>

        {/* Comparatif Free vs Pro */}
        <div className="fiq-card mb-6">
          <p className="font-bold mb-4" style={{ color: 'var(--fiq-text)' }}>Gratuit vs Pro</p>
          <div className="space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <div key={f.label} className="flex items-center justify-between text-sm">
                <span style={{ color: f.included ? 'var(--fiq-text)' : 'var(--fiq-muted)' }}>{f.label}</span>
                {f.included
                  ? <span className="text-xs font-semibold" style={{ color: 'var(--fiq-accent)' }}>✓ Gratuit</span>
                  : f.note
                    ? <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{f.note}</span>
                    : <span className="text-xs font-semibold" style={{ color: '#A855F7' }}>Pro ⚡</span>
                }
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm"
            style={{ background: '#EF444418', color: 'var(--fiq-red)', border: '1px solid #EF444444' }}>
            {error}
          </div>
        )}

        <div className="space-y-3">
          {[
            { e: '🔒', t: 'Paiement sécurisé par Stripe — tes données bancaires ne nous sont jamais transmises.' },
            { e: '↩️', t: 'Résilie à tout moment depuis ton profil, sans frais ni engagement (mensuel/annuel).' },
            { e: '🆓', t: 'Les fonctionnalités de base restent gratuites pour toujours.' },
          ].map((item) => (
            <p key={item.e} className="flex items-start gap-2 text-xs" style={{ color: 'var(--fiq-muted)' }}>
              <span>{item.e}</span><span>{item.t}</span>
            </p>
          ))}
        </div>

      </div>
    </div>
  )
}
