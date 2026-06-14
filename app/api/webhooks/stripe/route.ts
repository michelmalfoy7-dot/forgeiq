import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const RESEND_API_KEY  = process.env.RESEND_API_KEY
const ADMIN_EMAIL     = process.env.ADMIN_EMAIL
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

// ── Notification admin ─────────────────────────────────────────────────────
async function notifyAdmin(subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ForgeIQ <noreply@getforgeiq.com>',
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    })
  } catch (err) {
    // Non-bloquant — le webhook continue même si l'email échoue
    console.error('Admin notification error:', err)
  }
}

function buildSubscriptionEmail(opts: {
  type: 'new_pro' | 'new_lifetime'
  userEmail: string
  userName: string
  plan: string
  amount?: string
}): string {
  const { type, userEmail, userName, plan, amount } = opts
  const isPro = type === 'new_pro'
  const icon  = isPro ? '🎉' : '💎'
  const badge = isPro ? '#3D8BFF' : '#B4FF4A'
  const title = isPro ? 'Nouveau abonné Pro !' : 'Nouvel achat Lifetime !'
  const now   = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Paris',
  }).format(new Date())

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px 20px;background:#0A0C0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#111318;border-radius:16px;border:1px solid #1F242E;overflow:hidden;">
    <tr>
      <td style="background:${badge};padding:20px 28px;">
        <h1 style="margin:0;font-size:20px;font-weight:900;color:#0A0C0F;">${icon} ${title}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${[
            ['Utilisateur', userName || '(inconnu)'],
            ['Email', userEmail],
            ['Plan', plan],
            ...(amount ? [['Montant', amount]] : []),
            ['Date', now],
          ].map(([label, value]) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #1F242E;font-size:12px;color:#6B7280;width:100px;">${label}</td>
            <td style="padding:8px 0;border-bottom:1px solid #1F242E;font-size:13px;font-weight:700;color:#F0F2F5;">${value}</td>
          </tr>`).join('')}
        </table>
        <div style="margin-top:20px;text-align:center;">
          <a href="${APP_URL}/api/admin/stats" style="display:inline-block;background:#1A1F2A;color:#B4FF4A;font-size:12px;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:8px;border:1px solid #B4FF4A33;">
            Voir les stats admin →
          </a>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
}

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

        // Ne jamais écraser un statut lifetime avec un événement d'abonnement
        const { data: existing } = await supabase
          .from('profiles').select('subscription_status').eq('id', userId).single()
        if (existing?.subscription_status === 'lifetime') break

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

        // Notifier l'admin uniquement à la création (pas aux updates)
        if (event.type === 'customer.subscription.created' && isActive) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', userId)
            .single()

          // Récupérer l'email depuis Stripe customer
          let userEmail = ''
          try {
            const customer = await getStripe().customers.retrieve(sub.customer as string) as Stripe.Customer
            userEmail = customer.email ?? ''
          } catch { /* non bloquant */ }

          const planLabel = plan === 'annual' ? 'Pro Annuel (39.99€/an)' : 'Pro Mensuel (4.99€/mois)'
          await notifyAdmin(
            `🎉 Nouveau Pro — ${userEmail || userId}`,
            buildSubscriptionEmail({
              type: 'new_pro',
              userEmail,
              userName: profile?.display_name ?? '',
              plan: planLabel,
            })
          )
        }

        break
      }

      // Abonnement annulé ou expiré
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        // Ne jamais rétrograder un lifetime — il n'a pas d'abonnement récurrent
        const { data: existingDel } = await supabase
          .from('profiles').select('subscription_status').eq('id', userId).single()
        if (existingDel?.subscription_status === 'lifetime') break

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

        // Notifier l'admin — achat lifetime
        const { data: profileL } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', userId)
          .single()

        const amountLifetime = session.amount_total
          ? `${(session.amount_total / 100).toFixed(2)} ${(session.currency ?? 'eur').toUpperCase()}`
          : undefined

        await notifyAdmin(
          `💎 Nouveau Lifetime — ${session.customer_details?.email || userId}`,
          buildSubscriptionEmail({
            type: 'new_lifetime',
            userEmail: session.customer_details?.email ?? '',
            userName: profileL?.display_name ?? '',
            plan: 'Lifetime (paiement unique)',
            amount: amountLifetime,
          })
        )

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
