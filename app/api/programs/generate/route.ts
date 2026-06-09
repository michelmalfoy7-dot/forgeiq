import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  SLOT_MAP, VALID_SLOTS, SPLIT_BY_DAYS, MEV_MRV,
  resolveSlot, type TierKey,
} from '@/lib/programs/slots'

export const dynamic     = 'force-dynamic'
export const maxDuration = 60   // génération Haiku peut prendre 20-30s

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const AI_GENERATIONS_PER_MONTH = 3

// ── Types ────────────────────────────────────────────────────────────────────

interface GenerateRequest {
  sessions_per_week: number
  session_duration:  number
  muscle_priority:   string
}

interface HaikuExercise {
  slot:     string
  sets:     number
  reps:     string
  rest_sec: number
  note:     string
}

interface HaikuDay {
  name:      string
  focus:     string
  exercises: HaikuExercise[]
}

interface HaikuResponse {
  name:           string
  rationale:      string
  duration_weeks: number
  days:           HaikuDay[]
}

// ── Helper : résout un slot en exercice final ─────────────────────────────────

function buildExercise(
  ex:          HaikuExercise,
  tier:        TierKey | null,
  gymFeatures: string[] | null
) {
  const def = SLOT_MAP[ex.slot]
  if (!def) return null

  const resolved = resolveSlot(ex.slot, tier, gymFeatures)

  return {
    slot:           ex.slot,
    sets:           ex.sets,
    reps:           ex.reps,
    rest_sec:       ex.rest_sec,
    note:           ex.note,
    by_feature:     def.by_feature ?? {},
    by_tier:        def.by_tier,
    _resolved_name: resolved.name_fr,
  }
}

// ── Extraction JSON robuste ───────────────────────────────────────────────────
/**
 * Extrait le premier objet JSON complet d'une chaîne de texte.
 * Gère les cas où Haiku entoure le JSON de texte ou de blocs markdown.
 */
function extractJSON(text: string): string | null {
  // Trouver la première {
  let start = -1
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { start = i; break }
  }
  if (start === -1) return null

  // Suivre la profondeur pour trouver la } correspondante
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escape)          { escape = false; continue }
    if (c === '\\')      { escape = true;  continue }
    if (c === '"')       { inString = !inString; continue }
    if (inString)        continue
    if (c === '{')       depth++
    else if (c === '}')  { depth--; if (depth === 0) return text.slice(start, i + 1) }
  }
  return null
}

// ── Prompt Haiku ─────────────────────────────────────────────────────────────

function buildPrompt(params: {
  goal:            string
  level:           string
  gymName:         string | null
  gymFeatures:     string[]
  sessionsPerWeek: number
  sessionDuration: number
  musclePriority:  string
  prs:             { exercise: string; weight: number; reps: number }[]
}): string {
  const { goal, level, gymName, gymFeatures, sessionsPerWeek, sessionDuration, musclePriority, prs } = params

  const goalLabel:  Record<string, string> = {
    muscle_gain: 'prise de masse', strength: 'force', weight_loss: 'perte de poids',
    endurance: 'endurance', general: 'forme générale',
  }
  const levelLabel: Record<string, string> = {
    beginner: 'débutant', intermediate: 'intermédiaire', advanced: 'avancé',
  }

  const splitReco = SPLIT_BY_DAYS[sessionsPerWeek] ?? SPLIT_BY_DAYS[4]
  const mevTable  = MEV_MRV[level]            ?? MEV_MRV['intermediate']
  const mevText   = Object.entries(mevTable).map(([m, v]) => `${m}: ${v} sets/sem`).join(', ')

  const prsText     = prs.length > 0
    ? prs.map(p => `${p.exercise}: ${p.weight}kg × ${p.reps} reps`).join(', ')
    : 'aucun PR enregistré'
  const priorityText = musclePriority !== 'none'
    ? `Priorité musculaire demandée: ${musclePriority} (augmenter le volume sur ce groupe)`
    : 'Aucune priorité musculaire spécifique'
  const gymText     = gymName
    ? `${gymName} — équipements: ${gymFeatures.join(', ') || 'haltères + barres'}`
    : `équipements: ${gymFeatures.join(', ') || 'haltères + barres'}`

  return `Tu es un coach expert en hypertrophie (principes RP Strength / Mike Israetel).

PROFIL:
- Objectif: ${goalLabel[goal] ?? goal}
- Niveau: ${levelLabel[level] ?? level}
- Salle: ${gymText}

QUESTIONNAIRE:
- Séances/semaine: ${sessionsPerWeek}
- Durée max/séance: ${sessionDuration} min
- ${priorityText}

PRs ACTUELS:
${prsText}

RÈGLES:
1. Split ${sessionsPerWeek}j/sem: ${splitReco}
2. Machine > barre pour l'hypertrophie (sauf squat, RDL, hip thrust)
3. UNIQUEMENT ces slots (exact): ${VALID_SLOTS.join(', ')}
4. Volume: ${mevText}
5. ${sessionDuration} min = ${sessionDuration <= 45 ? 4 : sessionDuration <= 60 ? 5 : sessionDuration <= 75 ? 6 : 7} exercices max/séance
6. Le rationale cite les PRs réels et justifie le split

RÉPONDS UNIQUEMENT EN JSON VALIDE, zéro texte avant ou après:
{"name":"...","rationale":"3-4 phrases qui tutoient l'utilisateur, citent ses PRs réels, justifient le split","duration_weeks":12,"days":[{"name":"Push A","focus":"Pectoraux · Épaules · Triceps","exercises":[{"slot":"chest_horizontal","sets":4,"reps":"8-10","rest_sec":120,"note":"conseil court"}]}]}`
}

// ── POST — Génération ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })
  }

  try {
    // ── 2. Plan check ───────────────────────────────────────────────────────────
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('subscription_status, is_admin, goal, level, gym_id, gym_equipment_profiles(tier, name, features)')
      .eq('id', user.id)
      .single()

    if (profileErr) {
      console.error('[generate] Profile error:', profileErr.message)
      return NextResponse.json({ data: null, error: 'Erreur profil.' }, { status: 500 })
    }

    const status  = profile?.subscription_status ?? 'free'
    const isAdmin = (profile as unknown as { is_admin?: boolean })?.is_admin ?? false
    const isPro   = isAdmin || status === 'pro' || status === 'lifetime'

    if (!isPro) {
      return NextResponse.json(
        { data: null, error: 'Fonctionnalité réservée aux membres Pro et Lifetime.' },
        { status: 403 }
      )
    }

    // ── 3. Quota mensuel ────────────────────────────────────────────────────────
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Ignorer les erreurs quota (colonne is_ai_generated peut ne pas exister)
    let generationsThisMonth = 0
    try {
      const { count } = await supabase
        .from('programs')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('is_ai_generated', true)
        .gte('created_at', startOfMonth.toISOString())
      generationsThisMonth = count ?? 0
    } catch { /* colonne manquante — on passe */ }

    if (generationsThisMonth >= AI_GENERATIONS_PER_MONTH) {
      const nextMonth = new Date(startOfMonth)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return NextResponse.json(
        {
          data:  null,
          error: `Quota mensuel atteint (${AI_GENERATIONS_PER_MONTH}/mois). Renouvellement le ${nextMonth.toLocaleDateString('fr-FR')}.`,
        },
        { status: 429 }
      )
    }

    // ── 4. Body ─────────────────────────────────────────────────────────────────
    let body: GenerateRequest
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ data: null, error: 'Corps de requête invalide.' }, { status: 400 })
    }

    const { sessions_per_week, session_duration, muscle_priority } = body
    if (!sessions_per_week || sessions_per_week < 3 || sessions_per_week > 6) {
      return NextResponse.json({ data: null, error: 'sessions_per_week invalide (3-6).' }, { status: 400 })
    }

    // ── 5. Contexte salle ───────────────────────────────────────────────────────
    type GymRef = { tier: string; name: string; features: string[] } | null
    const gymRef      = (profile as unknown as { gym_equipment_profiles?: GymRef })?.gym_equipment_profiles ?? null
    const gymTier     = (gymRef?.tier as TierKey | null) ?? null
    const gymName     = gymRef?.name ?? null
    const gymFeatures = Array.isArray(gymRef?.features) ? (gymRef?.features ?? []) : []

    // ── 6. PRs ──────────────────────────────────────────────────────────────────
    let prs: { exercise: string; weight: number; reps: number }[] = []
    try {
      const { data: prsRaw } = await supabase
        .from('personal_records')
        .select('top_set_weight, top_set_reps, exercises_library(name_fr)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(8)

      prs = (prsRaw ?? [])
        .map((pr) => ({
          exercise: (pr.exercises_library as unknown as { name_fr: string } | null)?.name_fr ?? 'Exercice',
          weight:   (pr.top_set_weight as number | null) ?? 0,
          reps:     (pr.top_set_reps  as number | null) ?? 0,
        }))
        .filter((pr) => pr.weight > 0)
    } catch { /* PRs non critiques */ }

    // ── 7. Appel Haiku ──────────────────────────────────────────────────────────
    const prompt = buildPrompt({
      goal:            profile?.goal ?? 'muscle_gain',
      level:           profile?.level ?? 'intermediate',
      gymName,
      gymFeatures,
      sessionsPerWeek: sessions_per_week,
      sessionDuration: session_duration ?? 60,
      musclePriority:  muscle_priority  ?? 'none',
      prs,
    })

    let rawText = ''
    try {
      const message = await anthropic.messages.create({
        model:      'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages:   [{ role: 'user', content: prompt }],
      })
      const textBlock = message.content.find((b) => b.type === 'text')
      rawText = textBlock?.type === 'text' ? textBlock.text : ''
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr)
      console.error('[generate] Anthropic API error:', msg)
      return NextResponse.json(
        { data: null, error: `Erreur IA : ${msg.slice(0, 120)}` },
        { status: 500 }
      )
    }

    if (!rawText) {
      console.error('[generate] Empty response from Haiku')
      return NextResponse.json({ data: null, error: 'Réponse IA vide. Réessaie.' }, { status: 500 })
    }

    // ── 8. Extraction JSON robuste ───────────────────────────────────────────────
    const jsonStr = extractJSON(rawText)
    if (!jsonStr) {
      console.error('[generate] No JSON found in response:', rawText.slice(0, 300))
      return NextResponse.json({ data: null, error: 'Format IA invalide. Réessaie.' }, { status: 500 })
    }

    let haiku: HaikuResponse
    try {
      haiku = JSON.parse(jsonStr) as HaikuResponse
    } catch (parseErr) {
      console.error('[generate] JSON parse error:', parseErr, '| Raw:', jsonStr.slice(0, 200))
      return NextResponse.json({ data: null, error: 'JSON invalide. Réessaie.' }, { status: 500 })
    }

    if (!haiku.name || !Array.isArray(haiku.days) || haiku.days.length === 0) {
      console.error('[generate] Invalid program structure:', JSON.stringify(haiku).slice(0, 200))
      return NextResponse.json({ data: null, error: 'Programme généré incomplet. Réessaie.' }, { status: 500 })
    }

    // ── 9. Résolution slots ──────────────────────────────────────────────────────
    const resolvedDays = haiku.days.map((day) => ({
      name:      day.name,
      focus:     day.focus ?? '',
      exercises: (day.exercises ?? [])
        .map((ex) => buildExercise(ex, gymTier, gymFeatures))
        .filter(Boolean),
    }))

    const structure = { days: resolvedDays }

    // ── 10. Sauvegarde en base ───────────────────────────────────────────────────
    const slug = `ai-${user.id.slice(0, 8)}-${Date.now()}`

    const insertPayload = {
      name:             haiku.name,
      slug,
      description:      haiku.rationale,
      level:            [profile?.level ?? 'intermediate'],
      goal:             [profile?.goal  ?? 'muscle_gain'],
      equipment:        ['full_gym'],
      sessions_per_week,
      duration_weeks:   haiku.duration_weeks ?? 12,
      structure,
      is_custom:        true,
      is_public:        false,
      created_by:       user.id,
    }

    // Tentative avec is_ai_generated (peut ne pas exister si migration pas lancée)
    let newProgram = null
    let insertError = null

    const res1 = await supabase
      .from('programs')
      .insert({ ...insertPayload, is_ai_generated: true })
      .select('id, name, slug, description, sessions_per_week, duration_weeks, structure')
      .single()

    if (res1.error) {
      // Si la colonne n'existe pas, on réessaie sans elle
      if (res1.error.message?.includes('is_ai_generated') || res1.error.code === '42703') {
        console.warn('[generate] is_ai_generated column missing — retrying without it')
        const res2 = await supabase
          .from('programs')
          .insert(insertPayload)
          .select('id, name, slug, description, sessions_per_week, duration_weeks, structure')
          .single()
        newProgram  = res2.data
        insertError = res2.error
      } else {
        insertError = res1.error
      }
    } else {
      newProgram = res1.data
    }

    if (insertError || !newProgram) {
      console.error('[generate] Insert error:', insertError?.message, insertError?.code)
      return NextResponse.json(
        { data: null, error: `Erreur sauvegarde : ${insertError?.message ?? 'inconnue'}` },
        { status: 500 }
      )
    }

    // ── 11. Retour ───────────────────────────────────────────────────────────────
    const generationsLeft = Math.max(0, AI_GENERATIONS_PER_MONTH - (generationsThisMonth + 1))

    return NextResponse.json({
      data: {
        program:          newProgram,
        rationale:        haiku.rationale,
        generationsLeft,
      },
      error: null,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generate] Unhandled error:', msg)
    return NextResponse.json(
      { data: null, error: `Erreur inattendue : ${msg.slice(0, 150)}` },
      { status: 500 }
    )
  }
}

// ── GET — Quota restant ───────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    let used = 0
    try {
      const { count } = await supabase
        .from('programs')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('is_ai_generated', true)
        .gte('created_at', startOfMonth.toISOString())
      used = count ?? 0
    } catch { /* colonne manquante */ }

    return NextResponse.json({
      data:  { used, limit: AI_GENERATIONS_PER_MONTH, left: AI_GENERATIONS_PER_MONTH - used },
      error: null,
    })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur.' }, { status: 500 })
  }
}
