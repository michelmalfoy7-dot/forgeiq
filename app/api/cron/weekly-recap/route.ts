import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { AI_MODELS } from '@/lib/utils/ai-models'
import { sendPushToUser } from '@/lib/utils/push'

export const dynamic   = 'force-dynamic'
export const maxDuration = 60

const RESEND_API_KEY   = process.env.RESEND_API_KEY
const APP_URL          = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'
const CRON_SECRET      = process.env.CRON_SECRET

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Supabase admin (service role — accès toutes les tables) ────────────────
function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Semaine ISO (lundi → dimanche) dans la timezone de l'utilisateur ─────
// Utilise Intl pour obtenir la date locale réelle, évitant les décalages UTC
// (ex. lundi 00:30 Paris = dimanche 22:30 UTC → weekStart erroné sans tz)
function getWeekBounds(tz: string = 'Europe/Paris') {
  const now = new Date()

  // Date locale dans la timezone cible
  const localStr = now.toLocaleDateString('en-CA', { timeZone: tz }) // 'YYYY-MM-DD'
  const [year, month, day] = localStr.split('-').map(Number)
  const localDate = new Date(year, month - 1, day)
  const dow = localDate.getDay() // 0=dim

  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(localDate)
  monday.setDate(localDate.getDate() + mondayOffset)

  const prevMonday = new Date(monday)
  prevMonday.setDate(monday.getDate() - 7)

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return {
    weekStart:     toDateStr(monday),
    prevWeekStart: toDateStr(prevMonday),
    prevWeekEnd:   toDateStr(monday),
  }
}

// ── Template email recap ───────────────────────────────────────────────────
function buildRecapEmail(opts: {
  firstName:       string
  workoutCount:    number
  weekGoal:        number
  totalTonnage:    number
  prevTonnage:     number
  bestPR:          { exercise: string; value: number; unit: string } | null
  avgProtein:      number
  proteinGoal:     number
  weightStart:     number | null
  weightEnd:       number | null
  aiMessage:       string
}): string {
  const {
    firstName, workoutCount, weekGoal, totalTonnage, prevTonnage,
    bestPR, avgProtein, proteinGoal, weightStart, weightEnd, aiMessage,
  } = opts

  const tonnageDiff   = prevTonnage > 0 ? totalTonnage - prevTonnage : 0
  const tonnageSign   = tonnageDiff >= 0 ? '+' : ''
  const tonnageColor  = tonnageDiff >= 0 ? '#B4FF4A' : '#EF4444'
  const proteinPct    = proteinGoal > 0 ? Math.round((avgProtein / proteinGoal) * 100) : 0
  const weightDiff    = weightStart && weightEnd ? Math.round((weightEnd - weightStart) * 10) / 10 : null

  const seanceLabel   = workoutCount > 1 ? 'séances' : 'séance'
  const goalLabel     = workoutCount >= weekGoal ? '✓ Objectif atteint !' : `${weekGoal - workoutCount} restante${weekGoal - workoutCount > 1 ? 's' : ''} cette semaine`
  const goalColor     = workoutCount >= weekGoal ? '#B4FF4A' : '#F59E0B'

  const rows = [
    bestPR ? [
      '🏆', 'Meilleur PR',
      `${bestPR.exercise} — ${bestPR.value}${bestPR.unit}`,
    ] : null,
    totalTonnage > 0 ? [
      '⚖️', 'Tonnage total',
      `${Math.round(totalTonnage).toLocaleString('fr-FR')} kg${prevTonnage > 0 ? ` <span style="color:${tonnageColor};font-weight:900;">(${tonnageSign}${Math.round(tonnageDiff)} kg)</span>` : ''}`,
    ] : null,
    avgProtein > 0 ? [
      '🥩', 'Protéines moy.',
      `${Math.round(avgProtein)} g/j — ${proteinPct}% de l'objectif`,
    ] : null,
    weightDiff !== null ? [
      '📉', 'Poids',
      `${weightDiff >= 0 ? '+' : ''}${weightDiff} kg cette semaine`,
    ] : null,
  ].filter(Boolean) as [string, string, string][]

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0C0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0C0F;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111318;border-radius:16px;border:1px solid #1F242E;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#B4FF4A;padding:20px 28px;">
            <p style="margin:0;font-size:10px;font-weight:700;color:#0A0C0F;opacity:0.6;letter-spacing:0.1em;text-transform:uppercase;">FORGEIQ — RECAP HEBDO</p>
            <h1 style="margin:4px 0 0;font-size:22px;font-weight:900;color:#0A0C0F;letter-spacing:-0.02em;">
              ${firstName}, voici ta semaine
            </h1>
          </td>
        </tr>

        <!-- Séances bloc -->
        <tr>
          <td style="padding:24px 28px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1A1F2A;border-radius:12px;padding:16px 20px;text-align:center;">
                  <p style="margin:0;font-size:48px;font-weight:900;color:#F0F2F5;line-height:1;font-variant-numeric:tabular-nums;">
                    ${workoutCount}
                  </p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">
                    ${seanceLabel} cette semaine
                  </p>
                  <p style="margin:6px 0 0;font-size:12px;font-weight:800;color:${goalColor};">
                    ${goalLabel}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Stats rows -->
        ${rows.length > 0 ? `
        <tr>
          <td style="padding:16px 28px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#161A21;border-radius:12px;overflow:hidden;">
              ${rows.map(([ico, label, value], i) => `
              <tr>
                <td style="padding:12px 16px;${i < rows.length - 1 ? 'border-bottom:1px solid #1F242E;' : ''}">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:28px;font-size:16px;">${ico}</td>
                      <td style="font-size:12px;color:#6B7280;width:110px;">${label}</td>
                      <td style="font-size:13px;font-weight:700;color:#F0F2F5;">${value}</td>
                    </tr>
                  </table>
                </td>
              </tr>`).join('')}
            </table>
          </td>
        </tr>` : ''}

        <!-- Message IA coach -->
        <tr>
          <td style="padding:16px 28px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#0D1117;border-radius:12px;border-left:3px solid #B4FF4A;padding:0;">
              <tr>
                <td style="padding:14px 16px;">
                  <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#B4FF4A;text-transform:uppercase;letter-spacing:0.1em;">
                    Coach IA
                  </p>
                  <p style="margin:0;font-size:13px;color:#D1D5DB;line-height:1.6;">
                    ${aiMessage}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:20px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${APP_URL}/dashboard"
                    style="display:inline-block;background:#B4FF4A;color:#0A0C0F;font-size:14px;font-weight:900;text-decoration:none;padding:13px 36px;border-radius:10px;letter-spacing:-0.01em;">
                    Voir mon dashboard →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #1F242E;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6B7280;">
              © 2025 ForgeIQ ·
              <a href="${APP_URL}" style="color:#B4FF4A;text-decoration:none;">getforgeiq.com</a>
              &nbsp;·&nbsp;
              <a href="${APP_URL}/profile" style="color:#6B7280;text-decoration:none;">Se désabonner</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Générer le message coach IA ────────────────────────────────────────────
async function generateCoachMessage(opts: {
  firstName:    string
  workoutCount: number
  weekGoal:     number
  bestPR:       { exercise: string; value: number; unit: string } | null
  tonnageDiff:  number
  avgProtein:   number
  proteinGoal:  number
}): Promise<string> {
  const { firstName, workoutCount, weekGoal, bestPR, tonnageDiff, avgProtein, proteinGoal } = opts

  try {
    const prompt = `Tu es un coach fitness encourageant. Écris un message personnalisé de 2 phrases maximum pour le recap hebdo de ${firstName}.

Données de la semaine :
- Séances faites : ${workoutCount}/${weekGoal} (objectif)
- ${bestPR ? `Meilleur PR : ${bestPR.exercise} à ${bestPR.value}${bestPR.unit}` : 'Aucun PR cette semaine'}
- Tonnage vs semaine précédente : ${tonnageDiff >= 0 ? `+${Math.round(tonnageDiff)} kg` : `${Math.round(tonnageDiff)} kg`}
- Protéines moyennes : ${Math.round(avgProtein)}g/${Math.round(proteinGoal)}g objectif

Règles :
- Maximum 2 phrases courtes, ton motivant mais réaliste
- Mentionne un point spécifique (PR, séances, protéines...)
- Jamais "Claude", "IA", "Anthropic"
- En français, tutoyer`

    const res = await anthropic.messages.create({
      model: AI_MODELS.summary,
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })

    return res.content[0].type === 'text'
      ? res.content[0].text.trim()
      : 'Belle semaine ! Continue sur cette lancée la semaine prochaine.'
  } catch {
    // Fallback si l'IA échoue
    const fallbacks = [
      `${workoutCount >= weekGoal ? 'Objectif de la semaine atteint, bravo !' : 'Chaque séance compte — tu construis quelque chose de solide.'} Reste régulier la semaine prochaine.`,
      bestPR ? `Nouveau PR sur ${bestPR.exercise} — c'est du travail payant. Continue.` : 'Continuité et régularité, voilà la clé. Belle semaine.',
    ]
    return fallbacks[Math.floor(Math.random() * fallbacks.length)]
  }
}

// ── Route principale ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Vérification sécurité — Vercel envoie Authorization: Bearer CRON_SECRET
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY manquant' }, { status: 500 })
  }

  const supabase = createAdminClient()
  // Bornes globales (UTC+1/+2) pour le premier filtre d'activité — affinage par user ensuite
  const { weekStart, prevWeekStart, prevWeekEnd } = getWeekBounds('Europe/Paris')

  // 1. Trouver tous les users actifs cette semaine (au moins 1 séance OU 1 check-in)
  const [{ data: activeWorkoutUsers }, { data: activeCheckinUsers }] = await Promise.all([
    supabase
      .from('workouts')
      .select('user_id')
      .gte('session_date', weekStart)
      .not('completed_at', 'is', null),
    supabase
      .from('daily_logs')
      .select('user_id')
      .gte('log_date', weekStart),
  ])

  const activeIds = new Set([
    ...(activeWorkoutUsers ?? []).map(r => r.user_id),
    ...(activeCheckinUsers ?? []).map(r => r.user_id),
  ])

  if (activeIds.size === 0) {
    return NextResponse.json({ data: { sent: 0, reason: 'Aucun user actif' }, error: null })
  }

  // 2. Charger les profils de ces users (email via auth.users)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, goal, sessions_per_week, custom_protein_g, weight_kg, timezone')
    .in('id', [...activeIds])

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ data: { sent: 0 }, error: null })
  }

  // 3. Récupérer les emails via auth.users (admin API)
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))

  let sent  = 0
  let errors = 0

  // 4. Pour chaque user actif → stats + email
  for (const profile of profiles) {
    const email = emailMap.get(profile.id)
    if (!email) continue

    try {
      // Bornes de semaine dans la timezone du user (fallback Europe/Paris)
      const userTz = profile.timezone ?? 'Europe/Paris'
      const { weekStart: userWeekStart, prevWeekStart: userPrevWeekStart, prevWeekEnd: userPrevWeekEnd } =
        getWeekBounds(userTz)

      // Stats semaine en cours
      const [
        { data: weekWorkouts },
        { data: weekPRs },
        { data: weekLogs },
        { data: prevWorkouts },
      ] = await Promise.all([
        supabase
          .from('workouts')
          .select('total_tonnage_kg, session_name')
          .eq('user_id', profile.id)
          .gte('session_date', userWeekStart)
          .not('completed_at', 'is', null)
          .not('session_name', 'in', '("Jour de repos","Repos actif","Repos complet")'),

        supabase
          .from('personal_records')
          .select('exercise_name, value, unit')
          .eq('user_id', profile.id)
          .gte('created_at', userWeekStart + 'T00:00:00')
          .order('value', { ascending: false })
          .limit(1),

        supabase
          .from('daily_logs')
          .select('protein_g, weight_trend')
          .eq('user_id', profile.id)
          .gte('log_date', userWeekStart),

        supabase
          .from('workouts')
          .select('total_tonnage_kg')
          .eq('user_id', profile.id)
          .gte('session_date', userPrevWeekStart)
          .lt('session_date', userPrevWeekEnd)
          .not('completed_at', 'is', null),
      ])

      // Calculs
      const workoutCount = weekWorkouts?.length ?? 0
      if (workoutCount === 0 && (weekLogs?.length ?? 0) === 0) continue // skip si vraiment rien

      const totalTonnage = (weekWorkouts ?? []).reduce((s, w) => s + (w.total_tonnage_kg ?? 0), 0)
      const prevTonnage  = (prevWorkouts ?? []).reduce((s, w) => s + (w.total_tonnage_kg ?? 0), 0)
      const bestPR       = weekPRs?.[0] ? {
        exercise: weekPRs[0].exercise_name,
        value:    weekPRs[0].value,
        unit:     weekPRs[0].unit ?? 'kg',
      } : null

      const logsWithProtein = (weekLogs ?? []).filter(l => l.protein_g !== null)
      const avgProtein = logsWithProtein.length > 0
        ? logsWithProtein.reduce((s, l) => s + (l.protein_g ?? 0), 0) / logsWithProtein.length
        : 0

      // Objectif protéines (simplifié : 2g/kg poids déclaré si pas de custom)
      const proteinGoal = profile.custom_protein_g ?? Math.round((profile.weight_kg ?? 75) * 2)

      // Évolution poids (premier et dernier log de la semaine)
      const logsWithWeight = (weekLogs ?? []).filter(l => l.weight_trend !== null)
      const weightStart = logsWithWeight[logsWithWeight.length - 1]?.weight_trend ?? null
      const weightEnd   = logsWithWeight[0]?.weight_trend ?? null

      const firstName  = profile.display_name?.split(' ')[0] ?? email.split('@')[0]
      const weekGoal   = profile.sessions_per_week ?? 3
      const tonnageDiff = totalTonnage - prevTonnage

      // Message IA (1 appel Haiku par user) — partagé entre email et push
      const aiMessage = await generateCoachMessage({
        firstName, workoutCount, weekGoal, bestPR, tonnageDiff, avgProtein, proteinGoal,
      })

      const html = buildRecapEmail({
        firstName, workoutCount, weekGoal, totalTonnage, prevTonnage,
        bestPR, avgProtein, proteinGoal, weightStart, weightEnd, aiMessage,
      })

      // Générer le résumé push Haiku + envoi push en parallèle de l'email
      // Promise.allSettled garantit qu'une erreur push ne bloque pas l'email
      const [emailResult] = await Promise.allSettled([
        // Envoi Resend
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'ForgeIQ <noreply@getforgeiq.com>',
            to:   [email],
            subject: `${firstName}, ton recap de la semaine 💪`,
            html,
          }),
        }),

        // Push Haiku hebdo — résumé court + 1 action concrète
        (async () => {
          try {
            const avgCheckinScore = weekLogs && weekLogs.length > 0
              ? Math.round(
                  (weekLogs as Array<{ protein_g: number | null; weight_trend: number | null }>)
                    .filter(l => l.protein_g !== null).length / weekLogs.length * 10
                )
              : null

            const pushPrompt = `Coach fitness — résumé hebdo de ${firstName}.
Données semaine :
- Séances : ${workoutCount}/${weekGoal}
- Tonnage total : ${Math.round(totalTonnage)} kg (${tonnageDiff >= 0 ? '+' : ''}${Math.round(tonnageDiff)} kg vs sem. préc.)
- Poids EWMA : ${weightEnd ?? 'N/A'} kg (début sem. ${weightStart ?? 'N/A'} kg)
- Protéines moy : ${Math.round(avgProtein)}g/j (objectif ${Math.round(proteinGoal)}g)
${avgCheckinScore !== null ? `- Check-ins complétés : ${avgCheckinScore}/10` : ''}

Écris 3 phrases max : bilan factuel + 1 point d'amélioration + 1 action concrète semaine suivante.
Jamais "Claude", "IA", "Anthropic". En français, tutoyer.`

            const resp = await anthropic.messages.create({
              model: AI_MODELS.summary,
              max_tokens: 150,
              messages: [{ role: 'user', content: pushPrompt }],
            })

            const pushBody = resp.content[0]?.type === 'text'
              ? resp.content[0].text.trim()
              : aiMessage // fallback : réutiliser le message email

            await sendPushToUser(profile.id, {
              title: 'ForgeIQ — Récap de ta semaine 📊',
              body:  pushBody,
              url:   '/dashboard',
              tag:   'weekly-recap',
            })
          } catch (pushErr) {
            // Non-bloquant — erreur push loggée mais silencieuse
            console.error(`[weekly-recap] Push failed for ${profile.id}:`, pushErr)
          }
        })(),
      ])

      // Vérification résultat email uniquement (le push est best-effort)
      if (emailResult.status === 'fulfilled' && emailResult.value.ok) {
        sent++
      } else {
        const reason = emailResult.status === 'rejected'
          ? emailResult.reason
          : await (emailResult.value as Response).text()
        console.error(`Recap email failed for ${profile.id}:`, reason)
        errors++
      }

      // Throttle — éviter de saturer Resend (10 req/s max sur free plan)
      await new Promise(r => setTimeout(r, 120))

    } catch (err) {
      console.error(`Error processing recap for ${profile.id}:`, err)
      errors++
    }
  }

  console.log(`Weekly recap: ${sent} sent, ${errors} errors`)
  return NextResponse.json({
    data: { sent, errors, total: profiles.length },
    error: null,
  })
}
