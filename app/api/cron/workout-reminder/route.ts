import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/utils/push'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET

function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  // Vérification CRON_SECRET (Vercel l'envoie dans Authorization)
  const auth = req.headers.get('authorization')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Utilisateurs avec push subscriptions actives
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id')

  if (!subs || subs.length === 0) {
    return NextResponse.json({ data: { sent: 0 }, error: null })
  }

  const userIds = [...new Set(subs.map((s: { user_id: string }) => s.user_id))]

  // Parmi eux, ceux qui ont déjà une séance aujourd'hui
  const { data: todayWorkouts } = await supabase
    .from('workouts')
    .select('user_id')
    .eq('status', 'completed')
    .gte('completed_at', `${today}T00:00:00`)
    .lte('completed_at', `${today}T23:59:59`)
    .in('user_id', userIds)

  const alreadyDone = new Set((todayWorkouts ?? []).map((w: { user_id: string }) => w.user_id))

  // Cibler uniquement ceux qui n'ont pas encore fait de séance
  const targets = userIds.filter(uid => !alreadyDone.has(uid))

  const messages = [
    { title: '🏋️ ForgeIQ', body: 'Ta séance du jour t\'attend. 20 min suffisent pour faire la différence.' },
    { title: '💪 ForgeIQ', body: 'Tu n\'as pas encore entraîné aujourd\'hui. Lance-toi !' },
    { title: '🔥 ForgeIQ', body: 'Ton programme attend. Une séance de plus pour tenir ton streak !' },
    { title: '⚡ ForgeIQ', body: 'Le meilleur moment pour s\'entraîner, c\'est maintenant.' },
  ]

  let sent = 0
  await Promise.allSettled(
    targets.map(async (uid) => {
      const msg = messages[Math.floor(Math.random() * messages.length)]
      await sendPushToUser(uid, { ...msg, url: '/workout', tag: 'workout-reminder' })
      sent++
    })
  )

  return NextResponse.json({ data: { sent, total: userIds.length, skipped: alreadyDone.size }, error: null })
}
