import Stripe from 'stripe'

// Initialisation lazy — évite l'erreur au build si STRIPE_SECRET_KEY absent
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquant')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
    })
  }
  return _stripe
}

// IDs des prix Stripe (créés dans le dashboard Stripe)
export const STRIPE_PRICES = {
  monthly:  process.env.STRIPE_PRICE_MONTHLY  ?? '',
  annual:   process.env.STRIPE_PRICE_ANNUAL   ?? '',
  lifetime: process.env.STRIPE_PRICE_LIFETIME ?? '',
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
