import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PROTEIN_TARGET = 160
// Limite mensuelle de messages coach (utilisateurs non-Pro)
const FREE_MONTHLY_LIMIT = 30
// Nombre de messages d'historique injectés dans le contexte
const HISTORY_LIMIT = 8

function buildSystemPrompt(ctx: {
  displayName: string
  goal: string
  level: string
  weightTrend: number | null
  weightKg: number | null
  sleepDeepMin: number | null
  sleepTotalMin: number | null
  fatigueScore: number | null
  proteinG: number | null
  steps: number | null
  sysBp: number | null
  recentWorkouts: { session_name: string; session_date: string; total_tonnage_kg: number | null; total_sets: number | null }[]
  topPRs: { exercise_name: string; value: number; unit: string }[]
}) {
  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  const workoutSummary = ctx.recentWorkouts.length
    ? ctx.recentWorkouts.map(w =>
        `- ${w.session_name} (${w.session_date})${w.total_tonnage_kg ? ` · ${w.total_tonnage_kg}kg tonnage` : ''}${w.total_sets ? ` · ${w.total_sets} séries` : ''}`
      ).join('\n')
    : 'Aucune séance récente'

  const prSummary = ctx.topPRs.length
    ? ctx.topPRs.slice(0, 8).map(p => `- ${p.exercise_name} : ${p.value}${p.unit}`).join('\n')
    : 'Aucun PR enregistré'

  const alerts: string[] = []
  if (ctx.sleepDeepMin !== null && ctx.sleepDeepMin < 60)
    alerts.push(`⚠️ Sommeil profond insuffisant (${ctx.sleepDeepMin}min < 60min) → réduire volume -15-20%`)
  if (ctx.proteinG !== null && ctx.proteinG < PROTEIN_TARGET - 20)
    alerts.push(`⚠️ Protéines insuffisantes (${ctx.proteinG}g / objectif ${PROTEIN_TARGET}g) → mentionner`)
  if (ctx.sysBp !== null && ctx.sysBp > 135)
    alerts.push(`🚨 Tension systolique élevée (${ctx.sysBp} mmHg) → recommander bilan médical`)

  return `Tu es le Coach IA de ForgeIQ — un coach fitness personnel bienveillant, expert et direct. Tu parles toujours en français.

## Profil athlète
- Nom : ${ctx.displayName}
- Objectif : ${ctx.goal}
- Niveau : ${ctx.level}
- Date : ${today}

## Données biométriques du jour
- Poids brut : ${ctx.weightKg ?? 'non renseigné'}kg
- Poids lissé (EWMA) : ${ctx.weightTrend ?? 'non renseigné'}kg
- Sommeil profond : ${ctx.sleepDeepMin ?? 'non renseigné'}min
- Sommeil total : ${ctx.sleepTotalMin ? Math.round(ctx.sleepTotalMin / 60) + 'h' : 'non renseigné'}
- Fatigue (1-10) : ${ctx.fatigueScore ?? 'non renseigné'}
- Protéines : ${ctx.proteinG ?? 'non renseigné'}g / objectif ${PROTEIN_TARGET}g
- Pas : ${ctx.steps ?? 'non renseigné'}
- Tension systolique : ${ctx.sysBp ?? 'non renseigné'}

## 7 dernières séances
${workoutSummary}

## Records personnels (top sets)
${prSummary}

## Alertes actives
${alerts.length ? alerts.join('\n') : 'Aucune alerte'}

## Règles impératives
- Réponds toujours en français
- Max 3 paragraphes sauf si l'utilisateur demande plus de détail
- Termine toujours par une action concrète et immédiatement applicable
- Si sommeil profond < 60min → recommande volume -15-20%
- Si protéines < objectif -20g → mentionne comment les atteindre
- Si tension SYS > 135 → recommande de consulter un médecin
- Tu connais les PRs et séances récentes — utilise ces données pour personnaliser
- Sois encourageant mais honnête, jamais condescendant`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const userMessage: string = body.message ?? ''
    if (!userMessage.trim()) return NextResponse.json({ data: null, error: 'Message vide' }, { status: 400 })

    // Vérifier la limite mensuelle de messages coach
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: monthlyCount } = await supabase
      .from('coach_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', startOfMonth.toISOString())

    // Vérifier statut Pro via Stripe (webhook met à jour profiles.subscription_status)
    const { data: subProfile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    const isPro = subProfile?.subscription_status === 'pro' || subProfile?.subscription_status === 'lifetime'
    if (!isPro && (monthlyCount ?? 0) >= FREE_MONTHLY_LIMIT) {
      return NextResponse.json({
        data: null,
        error: `Limite de ${FREE_MONTHLY_LIMIT} messages coach atteinte ce mois-ci. Passez en Pro pour un accès illimité.`,
        limitReached: true,
        count: monthlyCount,
        limit: FREE_MONTHLY_LIMIT,
      }, { status: 429 })
    }

    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    // Charger le contexte utilisateur en parallèle
    const [
      { data: profile },
      { data: todayLog },
      { data: recentWorkouts },
      { data: topPRs },
    ] = await Promise.all([
      supabase.from('profiles')
        .select('display_name, goal, level')
        .eq('id', user.id).single(),
      supabase.from('daily_logs')
        .select('weight_kg, weight_trend, sleep_deep_min, sleep_total_min, fatigue_score, protein_g, steps, sys_bp')
        .eq('user_id', user.id).eq('log_date', today).single(),
      supabase.from('workouts')
        .select('session_name, session_date, total_tonnage_kg, total_sets')
        .eq('user_id', user.id).not('completed_at', 'is', null)
        .gte('session_date', sevenDaysAgo)
        .order('session_date', { ascending: false }).limit(7),
      supabase.from('personal_records')
        .select('exercise_name, value, unit')
        .eq('user_id', user.id).eq('record_type', 'top_set')
        .order('value', { ascending: false }).limit(10),
    ])

    // Récupérer les derniers échanges uniquement (coût tokens maîtrisé)
    const { data: history } = await supabase
      .from('coach_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT)

    const systemPrompt = buildSystemPrompt({
      displayName: profile?.display_name ?? 'Athlète',
      goal: profile?.goal ?? 'non renseigné',
      level: profile?.level ?? 'non renseigné',
      weightKg: todayLog?.weight_kg ?? null,
      weightTrend: todayLog?.weight_trend ?? null,
      sleepDeepMin: todayLog?.sleep_deep_min ?? null,
      sleepTotalMin: todayLog?.sleep_total_min ?? null,
      fatigueScore: todayLog?.fatigue_score ?? null,
      proteinG: todayLog?.protein_g ?? null,
      steps: todayLog?.steps ?? null,
      sysBp: todayLog?.sys_bp ?? null,
      recentWorkouts: recentWorkouts ?? [],
      topPRs: topPRs ?? [],
    })

    // Construire l'historique pour Claude (ordre chronologique, fenêtre glissante)
    const messages: Anthropic.MessageParam[] = [
      ...((history ?? []).reverse().map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))),
      { role: 'user', content: userMessage },
    ]

    // Persister le message utilisateur
    await supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'user',
      content: userMessage,
    })

    // Stream Claude
    const encoder = new TextEncoder()
    let assistantContent = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const claudeStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 800,
            system: systemPrompt,
            messages,
          })

          for await (const chunk of claudeStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const text = chunk.delta.text
              assistantContent += text
              controller.enqueue(encoder.encode(text))
            }
          }

          // Persister la réponse du coach
          await supabase.from('coach_messages').insert({
            user_id: user.id,
            role: 'assistant',
            content: assistantContent,
          })

          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
        // Exposer le compteur mensuel dans les headers pour le client
        'X-Coach-Count': String((monthlyCount ?? 0) + 1),
        'X-Coach-Limit': String(FREE_MONTHLY_LIMIT),
      },
    })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
