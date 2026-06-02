import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, STRIPE_PRICES, APP_URL } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { plan } = await req.json() // 'monthly' | 'annual' | 'lifetime'
    const priceId = STRIPE_PRICES[plan as keyof typeof STRIPE_PRICES]
    if (!priceId) return NextResponse.json({ data: null, error: 'Plan invalide' }, { status: 400 })

    // Récupérer ou créer le customer Stripe
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, display_name')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: profile?.display_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Créer la session Checkout
    const isLifetime = plan === 'lifetime'

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: isLifetime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/dashboard?upgrade=success`,
      cancel_url: `${APP_URL}/dashboard?upgrade=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      subscription_data: isLifetime ? undefined : {
        metadata: { supabase_user_id: user.id, plan },
      },
    })

    return NextResponse.json({ data: { url: session.url }, error: null })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Stripe checkout error:', msg)
    return NextResponse.json({ data: null, error: msg }, { status: 500 })
  }
}
