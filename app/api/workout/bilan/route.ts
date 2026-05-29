import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

type BilanInsight = {
  emoji: string
  title: string
  text: string
}

type BilanResponse = {
  congrats: string
  insights: BilanInsight[]
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { workout_id } = await req.json()
    if (!workout_id) return NextResponse.json({ data: null, error: 'workout_id manquant' }, { status: 400 })

    // Récupérer les données en parallèle
    const [
      { data: workout },
      { data: profile },
      { data: lastCheckin },
      { data: workoutSets },
    ] = await Promise.all([
      supabase
        .from('workouts')
        .select('session_name, total_tonnage_kg, total_sets, total_reps, duration_min, completed_at')
        .eq('id', workout_id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('profiles')
        .select('goal, experience_level, weight_kg')
        .eq('id', user.id)
        .single(),
      supabase
        .from('daily_logs')
        .select('fatigue_level, sleep_hours, deep_sleep_min, steps')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('workout_sets')
        .select('exercise_name, weight_kg, reps, is_warmup')
        .eq('workout_id', workout_id)
        .eq('user_id', user.id)
        .order('set_number'),
    ])

    if (!workout) return NextResponse.json({ data: null, error: 'Séance introuvable' }, { status: 404 })

    // Analyser les groupes musculaires travaillés
    const workingSets = (workoutSets ?? []).filter(s => !s.is_warmup)
    const topExercises = [...new Set(workingSets.map(s => s.exercise_name))].slice(0, 5)
    const heaviestSet = workingSets.reduce(
      (best, s) => (s.weight_kg ?? 0) > (best?.weight_kg ?? 0) ? s : best,
      null as (typeof workingSets)[0] | null
    )

    // Objectif humain
    const goalLabels: Record<string, string> = {
      weight_loss: 'perte de poids',
      muscle_gain: 'prise de muscle',
      strength: 'force',
      maintenance: 'maintien',
      endurance: 'endurance',
    }
    const levelLabels: Record<string, string> = {
      beginner: 'débutant',
      intermediate: 'intermédiaire',
      advanced: 'avancé',
    }

    const context = [
      `Séance : ${workout.session_name ?? 'Libre'}`,
      `Tonnage : ${workout.total_tonnage_kg ?? 0} kg`,
      `Séries travaillées : ${workout.total_sets ?? workingSets.length}`,
      `Répétitions : ${workout.total_reps ?? 0}`,
      workout.duration_min ? `Durée : ${workout.duration_min} min` : null,
      topExercises.length > 0 ? `Exercices : ${topExercises.join(', ')}` : null,
      heaviestSet ? `Charge max : ${heaviestSet.weight_kg}kg × ${heaviestSet.reps} reps (${heaviestSet.exercise_name})` : null,
      profile?.goal ? `Objectif : ${goalLabels[profile.goal] ?? profile.goal}` : null,
      profile?.experience_level ? `Niveau : ${levelLabels[profile.experience_level] ?? profile.experience_level}` : null,
      lastCheckin?.fatigue_level != null ? `Fatigue au check-in : ${lastCheckin.fatigue_level}/10` : null,
      lastCheckin?.sleep_hours ? `Sommeil : ${lastCheckin.sleep_hours}h (${lastCheckin.deep_sleep_min ?? '?'}min profond)` : null,
    ].filter(Boolean).join('\n')

    const prompt = `Tu es le coach IA de ForgeIQ. Génère un bilan post-séance court et percutant en JSON.

DONNÉES DE LA SÉANCE :
${context}

Génère exactement ce JSON (rien d'autre) :
{
  "congrats": "Message d'accroche dynamique et motivant (1 phrase, 15 mots max, sans majuscule initiale forcée)",
  "insights": [
    { "emoji": "💪", "title": "Titre court", "text": "Observation concrète sur la performance (max 50 mots)" },
    { "emoji": "🔄", "title": "Titre court", "text": "Conseil récupération ou nutrition post-séance (max 50 mots)" },
    { "emoji": "📈", "title": "Titre court", "text": "Piste de progression pour la prochaine séance (max 50 mots)" }
  ]
}

Règles strictes :
- Jamais mentionner Claude, Anthropic, OpenAI, GPT
- Adapter les emojis au contenu réel (pas forcément 💪🔄📈)
- Personnaliser selon le tonnage, la fatigue et l'objectif
- Être factuel et précis sur les chiffres
- Ton : coach expert, direct, bienveillant`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Parser le JSON retourné par Claude
    let bilan: BilanResponse
    try {
      // Extraire le JSON si Claude a mis du texte autour
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('no JSON found')
      bilan = JSON.parse(jsonMatch[0]) as BilanResponse
      // Valider la structure minimale
      if (!bilan.insights || !Array.isArray(bilan.insights)) throw new Error('invalid structure')
    } catch {
      // Fallback si le parsing échoue
      bilan = {
        congrats: 'Belle séance ! Continue comme ça. 🔥',
        insights: [
          {
            emoji: '💪',
            title: 'Tonnage réalisé',
            text: `${workout.total_tonnage_kg ?? 0} kg soulevés au total en ${workout.total_sets ?? 0} séries. Belle session de travail.`,
          },
          {
            emoji: '🔄',
            title: 'Récupération',
            text: 'Assure-toi de bien t\'hydrater et de prendre des protéines dans l\'heure qui suit.',
          },
          {
            emoji: '📈',
            title: 'Prochaine séance',
            text: 'Note tes sensations maintenant pendant qu\'elles sont fraîches pour mieux progresser.',
          },
        ],
      }
    }

    return NextResponse.json({ data: bilan, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
