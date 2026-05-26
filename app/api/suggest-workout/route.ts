import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Cache journalier par user — 1 seule génération IA / utilisateur / jour
// Évite de rappeler Haiku à chaque ouverture de /workout
import { unstable_cache } from 'next/cache'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]

    // Charger profil + programme + log du jour + PRs en parallèle
    const [
      { data: profile },
      { data: todayLog },
      { data: topPRs },
    ] = await Promise.all([
      supabase.from('profiles')
        .select('current_program_id, sessions_per_week, goal, level, weight_kg')
        .eq('id', user.id).single(),
      supabase.from('daily_logs')
        .select('sleep_deep_min, fatigue_score, weight_trend')
        .eq('user_id', user.id).eq('log_date', today).single(),
      supabase.from('personal_records')
        .select('exercise_name, value, unit, record_type')
        .eq('user_id', user.id).eq('record_type', 'top_set')
        .order('value', { ascending: false }).limit(15),
    ])

    // Rotation de séance dans le programme
    let sessionName = 'Séance libre'
    let programName = ''
    let nextIndex = 0
    let totalSessions = 0

    // Exercices du programme pour la séance suivante (si définis dans la structure)
    type ProgramExercise = { slug: string; name_fr: string; sets: number; reps: string; rest_sec?: number; note?: string }
    let programExercises: ProgramExercise[] = []

    if (profile?.current_program_id) {
      const { data: program } = await supabase
        .from('programs').select('name, structure').eq('id', profile.current_program_id).single()

      if (program) {
        programName = program.name
        // Support both old format (string[]) and new format ({name, exercises}[])
        const rawDays: (string | { name: string; exercises?: ProgramExercise[] })[] = program.structure?.days ?? []
        totalSessions = rawDays.length
        const dayNames: string[] = rawDays.map((d) => (typeof d === 'string' ? d : d.name))

        const { data: lastWorkout } = await supabase
          .from('workouts').select('session_name')
          .eq('user_id', user.id).eq('program_id', profile.current_program_id)
          .not('completed_at', 'is', null)
          .order('session_date', { ascending: false }).limit(1).single()

        if (lastWorkout) {
          const lastIdx = dayNames.indexOf(lastWorkout.session_name)
          nextIndex = lastIdx >= 0 ? (lastIdx + 1) % dayNames.length : 0
        }
        sessionName = dayNames[nextIndex] ?? 'Séance libre'

        // Récupérer les exercices de la séance si définis dans la structure
        const nextDay = rawDays[nextIndex]
        if (nextDay && typeof nextDay !== 'string' && Array.isArray(nextDay.exercises) && nextDay.exercises.length > 0) {
          programExercises = nextDay.exercises
        }
      }
    }

    // Volume adaptation — sommeil, fatigue ET tendance poids (perte rapide = récupération diminuée)
    let volumeAdjustment: 'reduce' | 'normal' | 'increase' = 'normal'
    const adjustmentReasons: string[] = []

    if (todayLog) {
      const deepSleep = todayLog.sleep_deep_min ?? 90
      const fatigue = todayLog.fatigue_score ?? 5
      const weightTrend = todayLog.weight_trend ?? null

      if (deepSleep < 60) adjustmentReasons.push('Sommeil profond insuffisant')
      if (fatigue >= 8) adjustmentReasons.push('Fatigue élevée')
      // Perte de poids > 0.5kg/semaine = catabolisme potentiel → volume réduit
      if (weightTrend !== null && profile?.weight_kg && profile.weight_kg - weightTrend > 0.5) {
        adjustmentReasons.push('Perte de poids rapide')
      }

      if (adjustmentReasons.length > 0) {
        volumeAdjustment = 'reduce'
      } else if (deepSleep > 90 && fatigue <= 4) {
        volumeAdjustment = 'increase'
        adjustmentReasons.push('Récupération optimale')
      }
    }
    const adjustmentReason = adjustmentReasons.join(' · ')

    // Raison narrative distincte du badge d'ajustement (évite la duplication)
    const adaptationDefaults: Record<string, string> = {
      'Récupération optimale': 'Conditions idéales — repousse tes limites aujourd\'hui',
      'Sommeil profond insuffisant': 'Privilégie la technique sur le volume',
      'Fatigue élevée': 'Séance allégée pour ne pas s\'épuiser',
      'Perte de poids rapide': 'Préserve la masse musculaire en déficit',
    }
    let adaptationReason = adaptationDefaults[adjustmentReason] ?? adjustmentReason ?? 'Séance adaptée à tes données du jour'
    let aiExercises: { name: string; slug?: string; sets: number; reps: string; weight_kg: number | null; note: string }[] = []

    // Pré-charger les exercices du programme comme base
    if (programExercises.length > 0) {
      aiExercises = programExercises.map(ex => ({
        name: ex.name_fr,
        slug: ex.slug, // Slug pour matching robuste (insensible à la corruption UTF-8)
        sets: ex.sets,
        reps: ex.reps,
        weight_kg: null, // Sera rempli par les PRs dans le logger
        note: ex.note ?? '',
      }))
    }

    // Utiliser l'IA uniquement si le programme n'a pas d'exercices définis
    // Ou pour enrichir la raison narrative + les poids suggérés
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      try {
        const prSummary = (topPRs ?? [])
          .slice(0, 8)
          .map(p => `${p.exercise_name}: ${p.value}${p.unit}`)
          .join(', ')

        if (programExercises.length > 0) {
          // Programme avec exercices — IA génère uniquement la raison narrative + les poids suggérés
          const exoList = programExercises.map(e => e.name_fr).join(', ')
          const prompt = `Tu es un coach fitness. Suggère des poids pour cette séance en JSON.

Séance: ${sessionName} (${programName})
Exercices: ${exoList}
Ajustement: ${volumeAdjustment} — ${adjustmentReason || 'normal'}
PRs: ${prSummary || 'aucun'}

JSON uniquement (sans markdown):
{
  "reason": "adaptation du jour en 10 mots max",
  "weights": { "nom_exercice": 80 }
}
weights = 75-85% du PR si disponible, sinon null.`

          const getCachedReason = unstable_cache(
            () => anthropic.messages.create({
              model: 'claude-haiku-4-20250514',
              max_tokens: 300,
              messages: [{ role: 'user', content: prompt }],
            }),
            [`reason-${user.id}-${sessionName}-${today}`],
            { revalidate: 24 * 3600 }
          )
          const res = await getCachedReason()
          const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
          let parsed: Record<string, unknown>
          try { parsed = JSON.parse(raw) } catch {
            const m = raw.match(/\{[\s\S]*\}/)
            parsed = m ? JSON.parse(m[0]) : {}
          }
          if (parsed.reason && typeof parsed.reason === 'string') adaptationReason = parsed.reason
          // Appliquer les poids suggérés sur les exercices du programme
          if (parsed.weights && typeof parsed.weights === 'object') {
            const weights = parsed.weights as Record<string, number | null>
            aiExercises = aiExercises.map(ex => ({
              ...ex,
              weight_kg: weights[ex.name] ?? ex.weight_kg,
            }))
          }
        } else {
          // Séance libre — IA génère les exercices complets
          const prompt = `Tu es un coach fitness expert. Génère une suggestion de séance courte en JSON.

Contexte:
- Séance: ${sessionName}
- Programme: ${programName || 'Libre'}
- Objectif: ${profile?.goal ?? 'force'}
- Niveau: ${profile?.level ?? 'intermédiaire'}
- Sommeil profond: ${todayLog?.sleep_deep_min ?? 'inconnu'}min
- Fatigue: ${todayLog?.fatigue_score ?? 'inconnue'}/10
- Ajustement volume: ${volumeAdjustment}
- PRs actuels: ${prSummary || 'aucun'}

Réponds UNIQUEMENT avec ce JSON (sans markdown):
{
  "reason": "phrase courte expliquant l'adaptation du jour (max 15 mots)",
  "exercises": [
    { "name": "nom exercice en français", "sets": 4, "reps": "6-8", "weight_kg": 80, "note": "conseil bref" }
  ]
}

Inclure 4-6 exercices adaptés à la séance "${sessionName}". weight_kg basé sur les PRs (environ 75-85% du PR). Si pas de PR disponible, mettre null.`

          // Cache 24h par user+séance — 1 génération IA max par jour
          const getCachedSuggestion = unstable_cache(
            () => anthropic.messages.create({
              model: 'claude-haiku-4-20250514',
              max_tokens: 600,
              messages: [{ role: 'user', content: prompt }],
            }),
            [`suggest-${user.id}-${sessionName}-${today}`],
            { revalidate: 24 * 3600 }
          )
          const res = await getCachedSuggestion()

          const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
          // JSON.parse avec fallback regex si Claude ajoute du markdown
          let parsed: Record<string, unknown>
          try {
            parsed = JSON.parse(raw)
          } catch {
            const m = raw.match(/\{[\s\S]*\}/)
            parsed = m ? JSON.parse(m[0]) : {}
          }
          if (parsed.reason && typeof parsed.reason === 'string') adaptationReason = parsed.reason
          if (Array.isArray(parsed.exercises)) aiExercises = parsed.exercises
        }
      } catch {
        // Fallback silencieux si Claude échoue
      }
    }

    return NextResponse.json({
      data: {
        program_id: profile?.current_program_id ?? null,
        program_name: programName,
        session_name: sessionName,
        session_index: nextIndex,
        total_sessions: totalSessions,
        volume_adjustment: volumeAdjustment,
        adjustment_reason: adjustmentReason,
        adaptation_reason: adaptationReason,
        exercises: aiExercises,
      },
      error: null,
    })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
