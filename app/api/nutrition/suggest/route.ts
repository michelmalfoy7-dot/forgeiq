import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Carte de mapping objectif → profil nutritionnel lisible
const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'perte de poids (déficit calorique)',
  muscle_gain: 'prise de masse (surplus calorique, haute protéine)',
  strength: 'force (haute protéine, glucides suffisants)',
  endurance: 'endurance (glycogène et récupération)',
  general: 'maintien et santé générale',
}

/**
 * POST /api/nutrition/suggest
 * Génère 3 suggestions de repas adaptées aux macros restantes + contexte utilisateur.
 * Contexte injecté : objectif, dernier workout du jour, heure de la journée.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json() as {
      remaining_calories: number
      remaining_protein_g: number
      remaining_carbs_g: number
      remaining_fat_g: number
      meal_type: string // 'breakfast' | 'lunch' | 'dinner' | 'snack'
      meal_budget?: { min: number; target: number; max: number }
    }

    const { remaining_calories, remaining_protein_g, remaining_carbs_g, remaining_fat_g, meal_type, meal_budget } = body

    // Enrichir le contexte avec le profil + dernier workout du jour
    const today = new Date().toISOString().split('T')[0]
    const [{ data: profile }, { data: todayWorkout }] = await Promise.all([
      supabase.from('profiles').select('goal, weight_kg').eq('id', user.id).single(),
      supabase.from('workouts')
        .select('session_name, total_tonnage_kg')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const goal = profile?.goal ?? 'general'
    const goalLabel = GOAL_LABELS[goal] ?? goal
    const hour = new Date().getHours()
    const mealLabels: Record<string, string> = {
      breakfast: 'petit-déjeuner', lunch: 'déjeuner',
      dinner: 'dîner', snack: 'collation',
    }
    const mealLabel = mealLabels[meal_type] ?? 'repas'

    let workoutContext = ''
    if (todayWorkout) {
      const heavy = (todayWorkout.total_tonnage_kg ?? 0) > 8000
      workoutContext = `L'utilisateur a fait une séance "${todayWorkout.session_name}" aujourd'hui${heavy ? ' (séance lourde — besoins glucidiques élevés)' : ''}.`
    }

    // Budget calorique pour CE repas spécifiquement
    // Si le frontend a envoyé un budget calculé, on l'utilise.
    // Sinon fallback sur 35% du restant (valeur raisonnable pour le déjeuner).
    const budget = meal_budget ?? {
      min:    Math.round(remaining_calories * 0.25),
      target: Math.round(remaining_calories * 0.35),
      max:    Math.round(remaining_calories * 0.45),
    }

    // Macros proportionnelles au budget de CE repas vs total restant
    const ratio = remaining_calories > 0 ? budget.target / remaining_calories : 0.35
    const protTarget = Math.round(remaining_protein_g * ratio)
    const carbTarget = Math.round(remaining_carbs_g * ratio)
    const fatTarget  = Math.round(remaining_fat_g * ratio)

    const prompt = `Tu es un nutritionniste expert en fitness. Propose exactement 3 idées de ${mealLabel} adaptées au budget de CE repas.

Contexte :
- Objectif : ${goalLabel}
- Il est ${hour}h (${mealLabel})
- Budget POUR CE ${mealLabel.toUpperCase()} : ${budget.target} kcal (min ${budget.min} — max ${budget.max})
- Macros cibles pour ce repas : ${protTarget}g protéines · ${carbTarget}g glucides · ${fatTarget}g lipides
- Macros restantes pour TOUTE la journée : ${Math.round(remaining_calories)} kcal (pour info, ne pas tout utiliser)
${workoutContext ? `- ${workoutContext}` : ''}

Règles STRICTES :
- Chaque suggestion DOIT être entre ${budget.min} et ${budget.max} kcal — JAMAIS en dehors
- Minimum ${Math.max(15, Math.round(protTarget * 0.8))}g de protéines
- Aliments simples et accessibles en France
- Pas de menu complet, juste une idée pratique
- Temps de préparation max 30 min
- Si budget < 300 kcal → collations légères uniquement

Retourne UNIQUEMENT ce JSON valide (sans markdown, sans texte avant/après) :
{
  "suggestions": [
    {
      "nom": "Nom du repas",
      "emoji": "🍗",
      "description": "Description courte et appétissante (max 60 chars)",
      "aliments": ["Aliment 1 (quantité)", "Aliment 2 (quantité)"],
      "calories": 450,
      "protein_g": 38,
      "carbs_g": 42,
      "fat_g": 12,
      "prep_time": "5 min"
    }
  ]
}`

    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : ''

    let parsed: { suggestions: unknown[] }
    try {
      parsed = JSON.parse(raw) as { suggestions: unknown[] }
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ data: null, error: 'Réponse IA invalide' }, { status: 500 })
      parsed = JSON.parse(match[0]) as { suggestions: unknown[] }
    }

    return NextResponse.json({ data: parsed, error: null })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ data: null, error: `Erreur: ${detail}` }, { status: 500 })
  }
}
