import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/utils/push'
import { AI_MODELS } from '@/lib/utils/ai-models'

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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Taille du batch pour éviter le timeout Vercel (10s max par user × 10 users = ~100s < 60s edge)
const BATCH_SIZE = 10

// Délai minimum de check-in pour considérer l'user actif (3 jours)
const MAX_INACTIVITY_DAYS = 3

export async function GET(req: NextRequest) {
  // Vérification CRON_SECRET (Vercel l'envoie dans Authorization)
  const auth = req.headers.get('authorization')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  // Seuil d'inactivité : pas de check-in depuis 3 jours → ne pas envoyer
  const inactivityThreshold = new Date(Date.now() - MAX_INACTIVITY_DAYS * 86400000).toISOString().split('T')[0]

  // Récupérer tous les users avec push subscriptions actives (dédupliqué par user_id)
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id')

  if (!subs || subs.length === 0) {
    return NextResponse.json({ data: { sent: 0, skipped: 0 }, error: null })
  }

  const allUserIds = [...new Set(subs.map((s: { user_id: string }) => s.user_id))]

  // Récupérer le dernier check-in de chaque user (pour filtrer les inactifs et calculer le score)
  const { data: recentLogs } = await supabase
    .from('daily_logs')
    .select('user_id, log_date, weight_trend, sleep_deep_min, sleep_total_min, fatigue_score, steps, mood_score')
    .in('user_id', allUserIds)
    .gte('log_date', inactivityThreshold)
    .order('log_date', { ascending: false })

  // Grouper les logs par user (premier = plus récent)
  const logByUser = new Map<string, {
    log_date: string
    weight_trend: number | null
    sleep_deep_min: number | null
    sleep_total_min: number | null
    fatigue_score: number | null
    steps: number | null
    mood_score: number | null
  }>()
  for (const log of recentLogs ?? []) {
    if (!logByUser.has(log.user_id)) {
      logByUser.set(log.user_id, log)
    }
  }

  // Récupérer la dernière séance pour chaque user (48h)
  const twoDaysAgo = new Date(Date.now() - 48 * 3600000).toISOString().split('T')[0]
  const { data: recentWorkouts } = await supabase
    .from('workouts')
    .select('user_id, session_name, total_tonnage_kg, session_date')
    .in('user_id', allUserIds)
    .gte('session_date', twoDaysAgo)
    .not('completed_at', 'is', null)
    .order('session_date', { ascending: false })

  const workoutByUser = new Map<string, { session_name: string; total_tonnage_kg: number | null }>()
  for (const w of recentWorkouts ?? []) {
    if (!workoutByUser.has(w.user_id)) {
      workoutByUser.set(w.user_id, w)
    }
  }

  // Filtrer : users actifs uniquement (check-in récent)
  const activeUserIds = allUserIds.filter(uid => logByUser.has(uid))
  const skipped = allUserIds.length - activeUserIds.length

  // Traitement en batches de BATCH_SIZE pour éviter le timeout
  let sent = 0
  for (let i = 0; i < activeUserIds.length; i += BATCH_SIZE) {
    const batch = activeUserIds.slice(i, i + BATCH_SIZE)
    await Promise.allSettled(
      batch.map(async (uid) => {
        try {
          const log = logByUser.get(uid)!
          const workout = workoutByUser.get(uid) ?? null

          // Calcul score de récupération simplifié (identique dashboard)
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
          if (log.mood_score !== null) {
            if (log.mood_score >= 7) pts += 1
            else if (log.mood_score >= 5) pts += 0.5
          }
          const recoveryScore = Math.min(10, Math.max(0, Math.round(pts)))

          // Générer l'insight avec Haiku — court (max 60 tokens, 1 phrase)
          const context = [
            `Score récupération : ${recoveryScore}/10`,
            log.fatigue_score !== null ? `Fatigue : ${log.fatigue_score}/10` : null,
            log.sleep_total_min !== null ? `Sommeil : ${Math.round(log.sleep_total_min / 60)}h` : null,
            log.sleep_deep_min !== null ? `Sommeil profond : ${log.sleep_deep_min}min` : null,
            log.steps !== null ? `Pas hier : ${log.steps.toLocaleString('fr-FR')}` : null,
            workout ? `Dernière séance : ${workout.session_name}${workout.total_tonnage_kg ? ` (${workout.total_tonnage_kg}kg)` : ''}` : 'Aucune séance récente',
          ].filter(Boolean).join(' · ')

          const resp = await anthropic.messages.create({
            model: AI_MODELS.alerts,
            max_tokens: 60,
            messages: [{
              role: 'user',
              content: `Tu es un coach fitness. Génère un insight matinal court (1 phrase, max 12 mots, en français, emoji final) pour cet athlète : ${context}. Exemples : "Récupération optimale — pousse fort aujourd'hui 💪" ou "Fatigue détectée — séance légère recommandée 🧘"`,
            }],
          })

          const insight = resp.content[0]?.type === 'text'
            ? resp.content[0].text.trim()
            : `Score récupération ${recoveryScore}/10 — bonne journée 💪`

          await sendPushToUser(uid, {
            title: 'ForgeIQ — Ton insight du jour',
            body: insight,
            url: '/dashboard',
            tag: 'daily-insight',
          })
          sent++
        } catch (err) {
          // Non-bloquant — l'erreur d'un user ne doit pas bloquer les autres
          console.error(`[push-insight] Error for user ${uid}:`, err)
        }
      })
    )
  }

  return NextResponse.json({ data: { sent, skipped, total: allUserIds.length }, error: null })
}
