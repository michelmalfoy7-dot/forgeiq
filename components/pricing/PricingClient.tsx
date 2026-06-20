'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Zap, Crown, Infinity, ArrowLeft, Loader2, ExternalLink } from 'lucide-react'
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
      'Coach IA — 60 messages/mois',
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
  { label: 'Coach IA', included: false, note: '3 essais offerts' },
  { label: 'Scan code-barres nutrition', included: false },
  { label: 'EWMA & tendances avancées', included: false },
  { label: 'Tous les programmes', included: false },
  { label: 'Photos de progression', included: false },
]

export function PricingClient({
  isPro = false,
  isLifetime = false,
  subscriptionPlan = null,
  hasStripeCustomer = false,
}: {
  isPro?: boolean
  isLifetime?: boolean
  subscriptionPlan?: string | null
  hasStripeCustomer?: boolean
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
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

  async function openBillingPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { data, error: err } = await res.json()
      if (data?.url) window.location.href = data.url
      else setError(err ?? 'Erreur portail')
    } finally {
      setPortalLoading(false)
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
            {isPro ? 'Mon abonnement' : 'Passe à Pro'}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--fiq-muted)' }}>
            Workout · Nutrition · Coach IA — tout en une seule app.
          </p>
          {IS_LAUNCH_PROMO && !isPro && (
            <div className="mt-4 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: '#B4FF4A15', border: '1px solid #B4FF4A40', color: 'var(--fiq-accent)' }}>
              🎁 Offre Fondateur — Prix réduits pour les premiers utilisateurs. Limité dans le temps.
            </div>
          )}
        </div>

        {/* Si déjà abonné → afficher le statut et le bouton portail */}
        {isPro && (
          <div className="space-y-4 mb-8">
            <div className="rounded-2xl p-5"
              style={{
                background: isLifetime ? '#A855F710' : '#B4FF4A10',
                border: `1px solid ${isLifetime ? '#A855F740' : '#B4FF4A40'}`,
              }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: isLifetime ? '#A855F720' : '#B4FF4A20' }}>
                  {isLifetime
                    ? <Infinity className="w-6 h-6" style={{ color: '#A855F7' }} />
                    : <Crown className="w-6 h-6" style={{ color: 'var(--fiq-accent)' }} />}
                </div>
                <div>
                  <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>
                    {isLifetime ? 'Accès à vie' : 'ForgeIQ Pro actif'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                    {isLifetime
                      ? 'Plan Fondateur — Accès permanent garanti'
                      : subscriptionPlan === 'annual'
                        ? 'Plan annuel — Renouvellement automatique'
                        : 'Plan mensuel — Annulable à tout moment'}
                  </p>
                </div>
              </div>

              <ul className="space-y-2 mb-5">
                {['Coach IA illimité', 'Tous les programmes', 'Suivi avancé EWMA', 'Accès prioritaire aux nouveautés', 'Badge Fondateur'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fiq-text)' }}>
                    <Check className="w-4 h-4 flex-shrink-0"
                      style={{ color: isLifetime ? '#A855F7' : 'var(--fiq-accent)' }} />
                    {f}
                  </li>
                ))}
              </ul>

              {hasStripeCustomer && !isLifetime && (
                <button
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  className="w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}>
                  {portalLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><ExternalLink className="w-4 h-4" />Gérer mon abonnement</>
                  }
                </button>
              )}
            </div>

            {/* Option upgrade lifetime si monthly/annual */}
            {!isLifetime && (
              <div className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: '#A855F710', border: '1px solid #A855F730' }}>
                <Infinity className="w-5 h-5 flex-shrink-0" style={{ color: '#A855F7' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Passer à l&apos;accès vie</p>
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                    {IS_LAUNCH_PROMO ? '99€ une fois — Plus jamais de frais' : '149€ une fois — Accès permanent'}
                  </p>
                </div>
                <button
                  onClick={() => handleSubscribe('lifetime')}
                  disabled={!!loading}
                  className="px-4 py-2 rounded-xl text-xs font-black flex-shrink-0 flex items-center gap-1.5"
                  style={{ background: '#A855F7', color: 'white' }}>
                  {loading === 'lifetime' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Upgrader'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Plans (uniquement si pas encore Pro) */}
        {!isPro && (
          <div className="space-y-4 mb-8">
            {PLANS.map((plan) => {
              const Icon = plan.icon
              const isLoadingPlan = loading === plan.id

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
                      opacity: loading && !isLoadingPlan ? 0.5 : 1,
                    }}>
                    {isLoadingPlan
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <>Choisir {plan.name}{IS_LAUNCH_PROMO ? ' — Fondateur' : ''}</>
                    }
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Comparatif Free vs Pro */}
        {!isPro && (
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
        )}

        {error && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm"
            style={{ background: '#EF444418', color: 'var(--fiq-red)', border: '1px solid #EF444444' }}>
            {error}
          </div>
        )}

        <div className="space-y-3">
          {[
            { e: '🔒', t: 'Paiement sécurisé — tes données bancaires ne nous sont jamais transmises.' },
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
