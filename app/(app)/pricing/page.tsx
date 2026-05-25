import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PricingClient } from '@/components/pricing/PricingClient'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/pricing')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_plan, stripe_customer_id')
    .eq('id', user.id)
    .single()

  return (
    <PricingClient
      subscriptionStatus={profile?.subscription_status ?? 'free'}
      subscriptionPlan={profile?.subscription_plan ?? null}
      hasStripeCustomer={!!profile?.stripe_customer_id}
    />
  )
}
