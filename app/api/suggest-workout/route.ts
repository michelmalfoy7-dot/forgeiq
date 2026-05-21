import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
        .select('current_program_id, sessions_per_week, goal, level')
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

    if (profile?.current_program_id) {
      const { data: program } = await supabase
        .from('programs').select('name, structure').eq('id', profile.current_program_id).single()

      if (program) {
        programName = program.name
        // Support both old format (string[]) and new format ({name, exercises}[])
        const rawDays: (string | { name: string; exercises?: unknown[] })[] = program.structure?.days ?? []
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
      }
    }

    // Volume adaptation basique
    let volumeAdjustment: 'reduce' | 'normal' | 'increase' = 'normal'
    let adjustmentReason = ''

    if (todayLog) {
      const deepSleep = todayLog.sleep_deep_min ?? 90
      const fatigue = todayLog.fatigue_score ?? 5
      if (deepSleep < 60 || fatigue >= 8) {
        volumeAdjustment = 'reduce'
        adjustmentReason = deepSleep < 60 ? 'Sommeil profond insuffisant' : 'Fatigue élevée'
      } else if (deepSleep > 90 && fatigue <= 4) {
        volumeAdjustment = 'increase'
        adjustmentReason = 'Récupération optimale'
      }
    }

    // Générer la raison narrative avec Claude (non-bloquant si pas de clé)
    let adaptationReason = adjustmentReason || 'Récupération normale'
    let aiExercises: { name: string; sets: number; reps: string; weight_kg: number | null; note: string }[] = []

    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      try {
        const prSummary = (topPRs ?? [])
          .slice(0, 8)
          .map(p => `${p.exercise_name}: ${p.value}${p.unit}`)
          .join(', ')

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
    { "name": "nom exercice", "sets": 4, "reps": "6-8", "weight_kg": 80, "note": "conseil bref" }
  ]
}

Inclure 4-6 exercices adaptés à la séance "${sessionName}". weight_kg basé sur les PRs (environ 75-85% du PR). Si pas de PR disponible, mettre null.`

        const res = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        })

        const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
        const parsed = JSON.parse(raw)
        if (parsed.reason) adaptationReason = parsed.reason
        if (Array.isArray(parsed.exercises)) aiExercises = parsed.exercises
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
