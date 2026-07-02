import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PricingClient } from '@/components/pricing/PricingClient'
import { PLAN_SELECT, isRealProUser, isLifetimeUser, type ProfileForPlan } from '@/lib/utils/plan'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tarifs — ForgeIQ',
  description: 'Découvre les plans ForgeIQ : gratuit pour débuter, Pro à $4.99/mois pour un coaching IA complet. Annule à tout moment.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'}/pricing`,
  },
  openGraph: {
    title: 'Tarifs ForgeIQ — Coach IA Fitness',
    description: 'Plan gratuit, Pro mensuel ou annuel. Coaching IA complet, nutrition, programmes personnalisés.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Visiteur non connecté (acquisition — ex. clic depuis TikTok) : on affiche
  // les prix. Le CTA "S'abonner" de PricingClient redirige vers login au moment
  // du checkout (gère déjà l'erreur 'Non authentifié').
  if (!user) {
    return (
      <PricingClient isPro={false} isLifetime={false} subscriptionPlan={null} hasStripeCustomer={false} />
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(`${PLAN_SELECT}, stripe_customer_id`)
    .eq('id', user.id)
    .maybeSingle()

  const planProfile = profile as ProfileForPlan

  return (
    <PricingClient
      isPro={isRealProUser(planProfile)}
      isLifetime={isLifetimeUser(planProfile)}
      subscriptionPlan={profile?.subscription_plan ?? null}
      hasStripeCustomer={!!profile?.stripe_customer_id}
    />
  )
}
