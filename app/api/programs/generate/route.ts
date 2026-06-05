import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  SLOT_MAP, VALID_SLOTS, SPLIT_BY_DAYS, MEV_MRV,
  resolveSlot, type TierKey,
} from '@/lib/programs/slots'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Quota mensuel
const AI_GENERATIONS_PER_MONTH = 3

// ── Types internes ──────────────────────────────────────────────────────────

interface GenerateRequest {
  sessions_per_week: number       // 3-6
  session_duration: number        // minutes : 45, 60, 75, 90
  muscle_priority: string         // slug muscle ou 'none'
}

interface HaikuExercise {
  slot: string
  sets: number
  reps: string
  rest_sec: number
  note: string
}

interface HaikuDay {
  name: string
  focus: string
  exercises: HaikuExercise[]
}

interface HaikuResponse {
  name: string
  rationale: string
  duration_weeks: number
  days: HaikuDay[]
}

// ── Helper : construit l'exercice final avec by_feature + by_tier ───────────

function buildExercise(
  ex: HaikuExercise,
  tier: TierKey | null,
  gymFeatures: string[] | null
) {
  const def = SLOT_MAP[ex.slot]
  if (!def) return null

  const resolved = resolveSlot(ex.slot, tier, gymFeatures)

  return {
    slot:       ex.slot,
    sets:       ex.sets,
    reps:       ex.reps,
    rest_sec:   ex.rest_sec,
    note:       ex.note,
    by_feature: def.by_feature ?? {},
    by_tier:    def.by_tier,
    // Nom affiché = exercice résolu pour la salle de l'utilisateur
    _resolved_name: resolved.name_fr,
  }
}

// ── Prompt Haiku ────────────────────────────────────────────────────────────

function buildPrompt(params: {
  goal: string
  level: string
  gymName: string | null
  gymFeatures: string[]
  sessionsPerWeek: number
  sessionDuration: number
  musclePriority: string
  prs: { exercise: string; weight: number; reps: number }[]
}): string {
  const { goal, level, gymName, gymFeatures, sessionsPerWeek, sessionDuration, musclePriority, prs } = params

  const goalLabel: Record<string, string> = {
    muscle_gain: 'prise de masse', strength: 'force', weight_loss: 'perte de poids',
    endurance: 'endurance', general: 'forme générale',
  }
  const levelLabel: Record<string, string> = {
    beginner: 'débutant', intermediate: 'intermédiaire', advanced: 'avancé',
  }

  const splitReco = SPLIT_BY_DAYS[sessionsPerWeek] ?? SPLIT_BY_DAYS[4]
  const mevTable = MEV_MRV[level] ?? MEV_MRV['intermediate']
  const mevText = Object.entries(mevTable).map(([m, v]) => `${m}: ${v} sets/sem`).join(', ')

  const prsText = prs.length > 0
    ? prs.map(p => `${p.exercise}: ${p.weight}kg × ${p.reps} reps`).join(', ')
    : 'aucun PR enregistré'

  const priorityText = musclePriority !== 'none'
    ? `Priorité musculaire demandée: ${musclePriority} (augmenter le volume sur ce groupe)`
    : 'Aucune priorité musculaire spécifique'

  const gymText = gymName
    ? `${gymName} — équipements disponibles: ${gymFeatures.join(', ')}`
    : `équipements: ${gymFeatures.join(', ') || 'haltères + barres'}`

  return `Tu es un coach expert en programmation musculation (principes RP Strength / Mike Israetel).

PROFIL UTILISATEUR:
- Objectif: ${goalLabel[goal] ?? goal}
- Niveau: ${levelLabel[level] ?? level}
- Salle: ${gymText}

QUESTIONNAIRE:
- Séances/semaine: ${sessionsPerWeek}
- Durée max/séance: ${sessionDuration} minutes
- ${priorityText}

PRs ACTUELS (utilise ces données dans le rationale):
${prsText}

RÈGLES OBLIGATOIRES:
1. Split pour ${sessionsPerWeek} jours/semaine: ${splitReco}
2. Machine > barre pour l'hypertrophie — SAUF: squat barre, RDL (hamstring_hip_hinge), hip thrust (glute_thrust)
3. UNIQUEMENT ces noms de slots (exact): ${VALID_SLOTS.join(', ')}
4. Volume cible pour niveau ${levelLabel[level] ?? level}: ${mevText}
5. Adapte le nombre d'exercices à ${sessionDuration} min (45min=4ex, 60min=5ex, 75min=6ex, 90min=7ex max)
6. Le rationale DOIT citer les PRs réels et justifier le split avec les données de l'utilisateur

RÉPONDS UNIQUEMENT EN JSON VALIDE — aucun texte avant ou après, aucun bloc markdown:
{
  "name": "nom accrocheur du programme (ex: 'Upper/Lower Hypertrophie Pro')",
  "rationale": "3-4 phrases. Cite les PRs réels, justifie le split choisi avec les données, mentionne la salle si pertinent. Tutoie l'utilisateur.",
  "duration_weeks": 12,
  "days": [
    {
      "name": "Nom de la séance (ex: Upper A)",
      "focus": "Muscle1 · Muscle2 · Muscle3",
      "exercises": [
        {
          "slot": "nom_slot_exact",
          "sets": 4,
          "reps": "6-10",
          "rest_sec": 180,
          "note": "conseil technique court (1-2 phrases max)"
        }
      ]
    }
  ]
}`
}

// ── Route principale ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // ── 1. Vérification du plan (Pro/Lifetime uniquement) ──────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, goal, level, gym_id, gym_equipment_profiles(tier, name, features)')
      .eq('id', user.id)
      .single()

    const status = profile?.subscription_status ?? 'free'
    const isPro = status === 'pro' || status === 'lifetime'
    if (!isPro) {
      return NextResponse.json(
        { data: null, error: 'Fonctionnalité réservée aux membres Pro et Lifetime.' },
        { status: 403 }
      )
    }

    // ── 2. Quota mensuel (3/mois) ──────────────────────────────────────────
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: generationsThisMonth } = await supabase
      .from('programs')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .eq('is_ai_generated', true)
      .gte('created_at', startOfMonth.toISOString())

    if ((generationsThisMonth ?? 0) >= AI_GENERATIONS_PER_MONTH) {
      const nextMonth = new Date(startOfMonth)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return NextResponse.json(
        {
          data: null,
          error: `Quota mensuel atteint (${AI_GENERATIONS_PER_MONTH}/mois). Prochain renouvellement le ${nextMonth.toLocaleDateString('fr-FR')}.`,
        },
        { status: 429 }
      )
    }

    // ── 3. Parsing input ────────────────────────────────────────────────────
    const body: GenerateRequest = await req.json()
    const { sessions_per_week, session_duration, muscle_priority } = body

    if (!sessions_per_week || sessions_per_week < 3 || sessions_per_week > 6) {
      return NextResponse.json({ data: null, error: 'sessions_per_week invalide (3-6)' }, { status: 400 })
    }

    // ── 4. Contexte salle ────────────────────────────────────────────────────
    type GymRef = { tier: string; name: string; features: string[] } | null
    const gymRef = (profile as unknown as { gym_equipment_profiles?: GymRef })?.gym_equipment_profiles ?? null
    const gymTier = (gymRef?.tier as TierKey | null) ?? null
    const gymName = gymRef?.name ?? null
    const gymFeatures = gymRef?.features ?? []

    // ── 5. PRs de l'utilisateur ──────────────────────────────────────────────
    const { data: prsRaw } = await supabase
      .from('personal_records')
      .select('top_set_weight, top_set_reps, exercises_library(name_fr)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(8)

    const prs = (prsRaw ?? []).map((pr) => ({
      exercise: (pr.exercises_library as unknown as { name_fr: string } | null)?.name_fr ?? 'Exercice',
      weight:   pr.top_set_weight ?? 0,
      reps:     pr.top_set_reps ?? 0,
    })).filter(pr => pr.weight > 0)

    // ── 6. Appel Haiku ───────────────────────────────────────────────────────
    const prompt = buildPrompt({
      goal:            profile?.goal ?? 'muscle_gain',
      level:           profile?.level ?? 'intermediate',
      gymName,
      gymFeatures,
      sessionsPerWeek: sessions_per_week,
      sessionDuration: session_duration ?? 60,
      musclePriority:  muscle_priority ?? 'none',
      prs,
    })

    const message = await anthropic.messages.create({
      model:      'claude-3-haiku-20240307',
      max_tokens: 2048,
      temperature: 0,
      messages:   [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Nettoyer les éventuels blocs markdown
    const cleaned = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

    let haiku: HaikuResponse
    try {
      haiku = JSON.parse(cleaned)
    } catch {
      console.error('[generate] JSON parse error:', cleaned.slice(0, 200))
      return NextResponse.json({ data: null, error: 'Erreur de génération. Réessaie.' }, { status: 500 })
    }

    // ── 7. Validation basique ─────────────────────────────────────────────────
    if (!haiku.name || !Array.isArray(haiku.days) || haiku.days.length === 0) {
      return NextResponse.json({ data: null, error: 'Programme généré invalide. Réessaie.' }, { status: 500 })
    }

    // ── 8. Résolution des slots → exercices avec by_feature + by_tier ────────
    const resolvedDays = haiku.days.map((day) => ({
      name:  day.name,
      focus: day.focus ?? '',
      exercises: day.exercises
        .map((ex) => buildExercise(ex, gymTier, gymFeatures))
        .filter(Boolean),
    }))

    const structure = { days: resolvedDays }

    // ── 9. Sauvegarde en base ─────────────────────────────────────────────────
    const slug = `ai-${user.id.slice(0, 8)}-${Date.now()}`

    const { data: newProgram, error: insertError } = await supabase
      .from('programs')
      .insert({
        name:             haiku.name,
        slug,
        description:      haiku.rationale,
        level:            [profile?.level ?? 'intermediate'],
        goal:             [profile?.goal ?? 'muscle_gain'],
        equipment:        ['full_gym'],
        sessions_per_week,
        duration_weeks:   haiku.duration_weeks ?? 12,
        structure,
        is_custom:        true,
        is_public:        false,
        is_ai_generated:  true,
        created_by:       user.id,
      })
      .select('id, name, slug, description, sessions_per_week, duration_weeks, structure')
      .single()

    if (insertError || !newProgram) {
      console.error('[generate] Insert error:', insertError)
      return NextResponse.json({ data: null, error: 'Erreur de sauvegarde.' }, { status: 500 })
    }

    // ── 10. Retour avec quota restant ─────────────────────────────────────────
    const generationsLeft = AI_GENERATIONS_PER_MONTH - ((generationsThisMonth ?? 0) + 1)

    return NextResponse.json({
      data: {
        program:          newProgram,
        rationale:        haiku.rationale,
        generationsLeft,
      },
      error: null,
    })
  } catch (err) {
    console.error('[generate] Unexpected error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur.' }, { status: 500 })
  }
}

// ── GET : quota restant ──────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('programs')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .eq('is_ai_generated', true)
      .gte('created_at', startOfMonth.toISOString())

    return NextResponse.json({
      data: {
        used:  count ?? 0,
        limit: AI_GENERATIONS_PER_MONTH,
        left:  AI_GENERATIONS_PER_MONTH - (count ?? 0),
      },
      error: null,
    })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur.' }, { status: 500 })
  }
}
