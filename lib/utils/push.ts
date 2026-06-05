import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Initialiser web-push avec les clés VAPID
const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY  ?? ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? ''
const vapidSubject    = process.env.VAPID_SUBJECT      ?? 'mailto:hello@getforgeiq.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * Envoie une push notification à tous les appareils d'un utilisateur.
 * Silencieux si les clés VAPID ne sont pas configurées.
 * Supprime automatiquement les abonnements expirés.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) return // VAPID non configuré

  try {
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) return

    const expiredIds: string[] = []

    await Promise.allSettled(
      subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
            { TTL: 86400 } // 24h max
          )
        } catch (err: unknown) {
          // 404 ou 410 = abonnement expiré → supprimer
          const status = (err as { statusCode?: number })?.statusCode
          if (status === 404 || status === 410) {
            expiredIds.push(sub.id)
          }
        }
      })
    )

    // Nettoyage des abonnements expirés
    if (expiredIds.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('id', expiredIds)
    }
  } catch {
    /* silencieux — le push ne doit jamais bloquer l'action principale */
  }
}
