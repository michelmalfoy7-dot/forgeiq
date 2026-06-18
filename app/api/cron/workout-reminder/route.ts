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

// Calcul du score de récupération simplifié (identique push-insight)
function calcRecoveryScore(log: {
  sleep_deep_min: number | null
  sleep_total_min: number | null
  fatigue_score:  number | null
  steps:          number | null
  motivation_score: number | null
}): number {
  let pts = 0
  if (log.sleep_deep_min !== null) {
    if (log.sleep_deep_min >= 90) pts += 1.5
    else if (log.sleep_deep_min >= 60) pts += 1
  }
  if (log.sleep_total_min !== null) {
    if (log.sleep_total_min >= 420) pts += 2
    else if (log.sleep_total_min >= 360) pts += 1
  }
  if (log.fatigue_score !== null) {
    if (log.fatigue_score <= 2) pts += 2
    else if (log.fatigue_score <= 5) pts += 1
  }
  if (log.steps !== null) {
    const ratio = log.steps / 8000
    if (ratio >= 1) pts += 1.5
    else if (ratio >= 0.7) pts += 1
  }
  if (log.motivation_score !== null) {
    if (log.motivation_score >= 7) pts += 1
    else if (log.motivation_score >= 5) pts += 0.5
  }
  return Math.min(10, Math.max(0, Math.round(pts)))
}

// Construit un message push personnalisé selon le score de récupération
function buildReminderBody(
  displayName: string | null,
  recoveryScore: number | null,
): { title: string; body: string } {
  const title = 'ForgeIQ — Séance du jour 🏋️'
  const prefix = displayName ? `${displayName.split(' ')[0]}, ` : ''

  if (recoveryScore === null) {
    // Pas de check-in du jour — message générique
    const generics = [
      'Ta séance du jour t\'attend. 20 min suffisent pour faire la différence.',
      'Tu n\'as pas encore entraîné aujourd\'hui. Lance-toi !',
      'Ton programme attend. Une séance de plus pour tenir ton streak !',
      'Le meilleur moment pour s\'entraîner, c\'est maintenant.',
    ]
    return { title, body: prefix + generics[Math.floor(Math.random() * generics.length)] }
  }

  if (recoveryScore >= 7) {
    return { title, body: `${prefix}ton score récup est au top aujourd'hui — parfait pour t'entraîner 💪` }
  }
  if (recoveryScore >= 4) {
    return { title, body: `${prefix}séance légère ou modérée conseillée aujourd'hui 🧘` }
  }
  return { title, body: `${prefix}récupération active ou repos — écoute ton corps aujourd'hui 😴` }
}

export async function GET(req: NextRequest) {
  // Vérification CRON_SECRET (Vercel l'envoie dans Authorization)
  const auth = req.headers.get('authorization')
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
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

  // Requêtes parallèles : séances du jour + daily_log du jour + profils (display_name)
  const [
    { data: todayWorkouts },
    { data: todayLogs },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from('workouts')
      .select('user_id')
      .eq('status', 'completed')
      .gte('completed_at', `${today}T00:00:00`)
      .lte('completed_at', `${today}T23:59:59`)
      .in('user_id', userIds),

    supabase
      .from('daily_logs')
      .select('user_id, sleep_deep_min, sleep_total_min, fatigue_score, steps, motivation_score')
      .eq('log_date', today)
      .in('user_id', userIds),

    supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds),
  ])

  const alreadyDone = new Set((todayWorkouts ?? []).map((w: { user_id: string }) => w.user_id))

  // Index daily_log par user_id (maybeSingle via map — une seule ligne par user+date)
  const logByUser = new Map(
    (todayLogs ?? []).map((l: {
      user_id: string
      sleep_deep_min: number | null
      sleep_total_min: number | null
      fatigue_score: number | null
      steps: number | null
      motivation_score: number | null
    }) => [l.user_id, l])
  )

  // Index profil par user_id
  const profileByUser = new Map(
    (profiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p])
  )

  // Cibler uniquement ceux qui n'ont pas encore fait de séance
  const targets = userIds.filter(uid => !alreadyDone.has(uid))

  let sent = 0
  await Promise.allSettled(
    targets.map(async (uid) => {
      // Récupère le log du jour si présent, calcule le score (null si absent → fallback générique)
      const log = logByUser.get(uid) ?? null
      const recoveryScore = log ? calcRecoveryScore(log) : null
      const displayName = profileByUser.get(uid)?.display_name ?? null

      const msg = buildReminderBody(displayName, recoveryScore)
      await sendPushToUser(uid, { ...msg, url: '/workout', tag: 'workout-reminder' })
      sent++
    })
  )

  return NextResponse.json({ data: { sent, total: userIds.length, skipped: alreadyDone.size }, error: null })
}
