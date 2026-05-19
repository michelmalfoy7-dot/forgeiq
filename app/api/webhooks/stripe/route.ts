import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Ne pas parser le body — Stripe a besoin du raw body pour vérifier la signature
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature invalide:', err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {

      // Abonnement créé ou mis à jour
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        const isActive = sub.status === 'active' || sub.status === 'trialing'
        const plan = sub.metadata?.plan ?? 'monthly'

        await supabase.from('profiles').update({
          subscription_status: isActive ? 'pro' : 'free',
          subscription_plan: plan,
          stripe_subscription_id: sub.id,
          subscription_ends_at: isActive && sub.items?.data?.[0]?.current_period_end
            ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
            : null,
        }).eq('id', userId)

        break
      }

      // Abonnement annulé ou expiré
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        await supabase.from('profiles').update({
          subscription_status: 'free',
          subscription_plan: null,
          stripe_subscription_id: null,
          subscription_ends_at: null,
        }).eq('id', userId)

        break
      }

      // Paiement unique (lifetime)
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'payment') break

        const userId = session.metadata?.supabase_user_id
        if (!userId) break

        await supabase.from('profiles').update({
          subscription_status: 'lifetime',
          subscription_plan: 'lifetime',
          subscription_ends_at: null, // pas d'expiration
        }).eq('id', userId)

        break
      }

      // Paiement échoué — notifier l'utilisateur (futur)
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.warn('Paiement échoué pour customer:', invoice.customer)
        break
      }

      default:
        // Événement non géré — OK
        break
    }
  } catch (err) {
    console.error('Erreur traitement webhook:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
