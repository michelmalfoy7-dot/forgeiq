import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { AI_MODELS } from '@/lib/utils/ai-models'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Génération IA bilan — Vercel

type BilanInsight = {
  emoji: string
  title: string
  text: string
}

type BilanSuggestion = {
  emoji: string
  action: string   // court, commence par un verbe : "Augmenter le bench", "Viser 150g de protéines"
  detail: string   // 1 phrase concrète, chiffre si possible
}

type BilanResponse = {
  congrats: string
  insights: BilanInsight[]
  suggestions?: BilanSuggestion[]
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { workout_id } = await req.json()
    if (!workout_id) return NextResponse.json({ data: null, error: 'workout_id manquant' }, { status: 400 })

    // Vérifier le plan — bilan IA réservé aux abonnés Pro/Lifetime
    const { data: sub } = await supabase
      .from('profiles')
      .select('subscription_status, is_admin, referral_pro_until')
      .eq('id', user.id)
      .maybeSingle()
    const { isProUser } = await import('@/lib/utils/plan')
    const isPro = isProUser(sub)
    if (!isPro) return NextResponse.json({ data: null, error: 'Bilan IA réservé au plan Pro', paywall: true }, { status: 403 })

    // ── 1. Données de la séance actuelle ────────────────────────────────
    const [
      { data: workout },
      { data: profile },
      { data: lastCheckin },
      { data: workoutSets },
    ] = await Promise.all([
      supabase
        .from('workouts')
        .select('session_name, total_tonnage_kg, total_sets, total_reps, duration_min, completed_at, session_date')
        .eq('id', workout_id)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('goal, level, weight_kg')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('daily_logs')
        .select('fatigue_score, sleep_total_min, sleep_deep_min, steps, protein_g')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('workout_sets')
        .select('exercise_id, exercise_name, weight_kg, reps, is_warmup, set_type')
        .eq('workout_id', workout_id)
        .eq('user_id', user.id)
        .order('set_number'),
    ])

    // Durée moyenne sur les 10 dernières séances (pour comparaison)
    const { data: avgDurationRows } = await supabase
      .from('workouts')
      .select('duration_min')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .not('duration_min', 'is', null)
      .neq('id', workout_id)
      .order('session_date', { ascending: false })
      .limit(10)

    const avgDuration = avgDurationRows && avgDurationRows.length > 0
      ? Math.round(avgDurationRows.reduce((sum, w) => sum + (w.duration_min ?? 0), 0) / avgDurationRows.length)
      : null

    if (!workout) return NextResponse.json({ data: null, error: 'Séance introuvable' }, { status: 404 })

    const workingSets = (workoutSets ?? []).filter(s => !s.is_warmup)
    const exerciseIds = [...new Set(workingSets.map(s => s.exercise_id).filter(Boolean))] as string[]
    const topExercises = [...new Set(workingSets.map(s => s.exercise_name))].slice(0, 5)

    // ── 2. Contexte historique (3 dernières séances par exercice) ────────
    // Récupérer les workout_ids des 10 dernières séances complétées (avant celle-ci)
    const { data: recentWorkouts } = await supabase
      .from('workouts')
      .select('id, session_date, total_tonnage_kg')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .neq('id', workout_id)
      .order('session_date', { ascending: false })
      .limit(10)

    const recentWIds = (recentWorkouts ?? []).map(w => w.id)
    const tonnageTrend = (recentWorkouts ?? []).slice(0, 4).map(w => w.total_tonnage_kg ?? 0).reverse()

    // Historique des sets pour les mêmes exercices (dans les 10 dernières séances)
    let exerciseTrends: Record<string, { weight_kg: number; reps: number; session_date: string }[]> = {}
    if (exerciseIds.length > 0 && recentWIds.length > 0) {
      const { data: historySets } = await supabase
        .from('workout_sets')
        .select('exercise_id, exercise_name, weight_kg, reps, workout_id, set_type')
        .in('exercise_id', exerciseIds)
        .in('workout_id', recentWIds)
        .not('is_warmup', 'eq', true)
        .order('weight_kg', { ascending: false })

      for (const s of historySets ?? []) {
        if (!s.exercise_id) continue
        if (s.set_type === 'backoff') continue
        if (!exerciseTrends[s.exercise_id]) exerciseTrends[s.exercise_id] = []
        const wDate = recentWorkouts?.find(w => w.id === s.workout_id)?.session_date
        if (wDate && exerciseTrends[s.exercise_id].length < 3) {
          exerciseTrends[s.exercise_id].push({ weight_kg: s.weight_kg, reps: s.reps, session_date: wDate })
        }
      }
    }

    // ── 3. PRs de l'utilisateur pour ces exercices ───────────────────────
    let prMap: Record<string, number> = {}
    if (exerciseIds.length > 0) {
      const { data: prs } = await supabase
        .from('personal_records')
        .select('exercise_id, value')
        .eq('user_id', user.id)
        .eq('record_type', 'top_set')
        .in('exercise_id', exerciseIds)

      for (const pr of prs ?? []) prMap[pr.exercise_id] = pr.value
    }

    // ── 3b. Groupes musculaires des exercices (pour le groupe dominant) ─
    let muscleMap: Record<string, string[]> = {}
    if (exerciseIds.length > 0) {
      const { data: exoRows } = await supabase
        .from('exercises_library')
        .select('id, muscle_primary')
        .in('id', exerciseIds)

      for (const ex of exoRows ?? []) {
        if (ex.id && Array.isArray(ex.muscle_primary)) {
          muscleMap[ex.id] = ex.muscle_primary as string[]
        }
      }
    }

    // Calcul du groupe musculaire dominant (nb de sets par muscle primaire)
    const muscleSetCount: Record<string, number> = {}
    for (const s of workingSets) {
      if (!s.exercise_id || s.is_warmup) continue
      const muscles = muscleMap[s.exercise_id] ?? []
      for (const m of muscles.slice(0, 1)) {  // Premier muscle primaire seulement
        muscleSetCount[m] = (muscleSetCount[m] ?? 0) + 1
      }
    }
    const dominantMuscleEntry = Object.entries(muscleSetCount).sort((a, b) => b[1] - a[1])[0]
    const dominantMuscle = dominantMuscleEntry
      ? { name: dominantMuscleEntry[0], sets: dominantMuscleEntry[1], total: workingSets.length }
      : null

    const muscleNamesFR: Record<string, string> = {
      chest: 'Pectoraux', lats: 'Dos (Dorsaux)', mid_back: 'Dos (Milieu)',
      upper_back: 'Dos (Haut)', lower_back: 'Bas du dos', shoulders: 'Épaules',
      front_delt: 'Deltoïde avant', side_delt: 'Deltoïde latéral', rear_delt: 'Deltoïde arrière',
      biceps: 'Biceps', triceps: 'Triceps', quads: 'Quadriceps', hamstrings: 'Ischio-jambiers',
      glutes: 'Fessiers', calves: 'Mollets', abs: 'Abdominaux', core: 'Gainage',
      obliques: 'Obliques', forearms: 'Avant-bras', traps: 'Trapèzes', neck: 'Cou',
    }

    // ── 4. Composition du contexte enrichi ───────────────────────────────
    const goalLabels: Record<string, string> = {
      weight_loss: 'perte de poids', muscle_gain: 'prise de muscle',
      strength: 'force', maintenance: 'maintien', endurance: 'endurance',
    }
    const levelLabels: Record<string, string> = {
      beginner: 'débutant', intermediate: 'intermédiaire', advanced: 'avancé',
    }

    // Sets de travail groupés par exercice pour la séance actuelle
    const currentByExercise: Record<string, { maxWeight: number; maxReps: number; sets: number; prBefore: number | null }> = {}
    for (const s of workingSets) {
      if (!s.exercise_id || s.set_type === 'backoff') continue
      if (!currentByExercise[s.exercise_id]) {
        currentByExercise[s.exercise_id] = { maxWeight: 0, maxReps: 0, sets: 0, prBefore: prMap[s.exercise_id] ?? null }
      }
      const e = currentByExercise[s.exercise_id]
      if ((s.weight_kg ?? 0) > e.maxWeight) { e.maxWeight = s.weight_kg ?? 0; e.maxReps = s.reps ?? 0 }
      e.sets++
    }

    // Lignes de tendance par exercice (enrichies : % du PR all-time)
    const trendLines: string[] = []
    for (const [exId, cur] of Object.entries(currentByExercise)) {
      const name = workingSets.find(s => s.exercise_id === exId)?.exercise_name ?? exId
      const history = exerciseTrends[exId] ?? []
      const prevBest = history[0]?.weight_kg ?? null
      const pr = cur.prBefore
      const newPR = pr !== null && cur.maxWeight > pr
      const prPct = pr !== null && pr > 0 && !newPR
        ? Math.round(cur.maxWeight / pr * 100)
        : null

      let line = `${name} : ${cur.maxWeight}kg×${cur.maxReps} (${cur.sets} séries)`
      if (newPR) line += ' — 🏆 NOUVEAU PR'
      else if (prevBest !== null) {
        const delta = Math.round((cur.maxWeight - prevBest) * 100) / 100
        if (delta !== 0) line += ` (${delta > 0 ? '+' : ''}${parseFloat(delta.toFixed(2))}kg vs séance préc.)`
        else line += ` (stable vs séance préc.)`
      }
      if (pr !== null) line += ` | PR all-time : ${pr}kg${prPct !== null ? ` (à ${prPct}% du max)` : ''}`
      trendLines.push(line)
    }

    const lastTonnage = tonnageTrend[tonnageTrend.length - 1] ?? 0
    const tonnageDelta = tonnageTrend.length >= 2 && lastTonnage > 0
      ? Math.round(((workout.total_tonnage_kg ?? 0) - lastTonnage) / lastTonnage * 100)
      : null

    // Durée vs moyenne
    const durationLine = workout.duration_min
      ? avgDuration !== null
        ? `Durée : ${workout.duration_min} min (moyenne : ${avgDuration} min)`
        : `Durée : ${workout.duration_min} min`
      : null

    // Groupe musculaire dominant
    const dominantMuscleLine = dominantMuscle
      ? `Muscle dominant : ${muscleNamesFR[dominantMuscle.name] ?? dominantMuscle.name} (${Math.round(dominantMuscle.sets / Math.max(1, dominantMuscle.total) * 100)}% du volume)`
      : null

    const context = [
      `Séance : ${workout.session_name ?? 'Libre'}`,
      `Date : ${workout.session_date}`,
      `Tonnage : ${workout.total_tonnage_kg ?? 0} kg${tonnageDelta !== null ? ` (${tonnageDelta > 0 ? '+' : ''}${tonnageDelta}% vs séance préc.)` : ''}`,
      `Séries de travail : ${workout.total_sets ?? workingSets.length}`,
      durationLine,
      dominantMuscleLine,
      trendLines.length > 0 ? `\nPerformances par exercice :\n${trendLines.join('\n')}` : null,
      profile?.goal ? `Objectif : ${goalLabels[profile.goal] ?? profile.goal}` : null,
      profile?.level ? `Niveau : ${levelLabels[profile.level] ?? profile.level}` : null,
      lastCheckin?.fatigue_score != null ? `Fatigue : ${lastCheckin.fatigue_score}/10` : null,
      lastCheckin?.sleep_total_min ? `Sommeil : ${Math.round(lastCheckin.sleep_total_min / 60 * 10) / 10}h (${lastCheckin.sleep_deep_min ?? '?'}min profond)` : null,
      lastCheckin?.protein_g ? `Protéines aujourd'hui : ${Math.round(lastCheckin.protein_g)}g` : null,
    ].filter(Boolean).join('\n')

    // ── 5. Appel Haiku ───────────────────────────────────────────────────
    const prompt = `Tu es le coach IA de ForgeIQ. Génère un bilan post-séance percutant ET une suggestion concrète en JSON.

DONNÉES CONTEXTUELLES :
${context}

Génère exactement ce JSON (rien d'autre) :
{
  "congrats": "Accroche dynamique et motivante (15 mots max, factuelle — cite un chiffre réel si possible)",
  "insights": [
    { "emoji": "💪", "title": "Titre court", "text": "Performance clé : top set d'un exercice avec % du PR all-time si dispo (max 45 mots)" },
    { "emoji": "🎯", "title": "Titre court", "text": "Muscle dominant de la séance + comparaison durée vs moyenne si dispo (max 45 mots)" },
    { "emoji": "📈", "title": "Titre court", "text": "Tendance tonnage ou progression détectée sur les dernières séances (max 45 mots)" }
  ],
  "suggestions": [
    { "emoji": "🎯", "action": "Action courte (5 mots max)", "detail": "UNE seule action concrète pour la PROCHAINE séance — avec chiffres précis (max 40 mots)" }
  ]
}

Règles :
- Ne jamais mentionner Claude, Anthropic, OpenAI
- La suggestion = 1 seule action précise pour la prochaine séance (commence par un verbe : "Augmenter...", "Viser...", "Essayer...")
- Utiliser les données historiques pour être précis (noms d'exercices, kg, reps, % du PR)
- Si nouveau PR → l'accroche doit le mentionner explicitement
- Adapter selon l'objectif (force ≠ prise de muscle ≠ perte de poids)
- Ton : coach expert, direct, bienveillant. Pas de point d'exclamation excessifs`

    const message = await anthropic.messages.create({
      model: AI_MODELS.summary,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    let bilan: BilanResponse
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('no JSON found')
      bilan = JSON.parse(jsonMatch[0]) as BilanResponse
      if (!bilan.insights || !Array.isArray(bilan.insights)) throw new Error('invalid structure')
    } catch (parseErr) {
      console.error('[bilan] JSON parse failed, using fallback. Raw:', rawText.slice(0, 200), parseErr)
      bilan = {
        congrats: 'Belle séance — continue sur cette lancée.',
        insights: [
          { emoji: '💪', title: 'Tonnage réalisé', text: `${workout.total_tonnage_kg ?? 0} kg soulevés en ${workout.total_sets ?? 0} séries.` },
          {
            emoji: '🎯',
            title: dominantMuscle ? `Focus ${muscleNamesFR[dominantMuscle.name] ?? dominantMuscle.name}` : 'Récupération',
            text: dominantMuscle
              ? `Séance dominante ${muscleNamesFR[dominantMuscle.name] ?? dominantMuscle.name} (${Math.round(dominantMuscle.sets / Math.max(1, dominantMuscle.total) * 100)}% du volume).${durationLine ? ` ${durationLine}.` : ''}`
              : 'Hydrate-toi et vise 40g de protéines dans les 2h post-séance.',
          },
          { emoji: '📈', title: 'Progression', text: 'Note tes sensations pour mieux calibrer la prochaine séance.' },
        ],
        suggestions: [
          { emoji: '🥩', action: 'Viser les protéines', detail: 'Prends 30-40g de protéines dans l\'heure post-séance pour optimiser la récupération musculaire.' },
        ],
      }
    }

    return NextResponse.json({ data: bilan, error: null })
  } catch (err) {
    console.error('[bilan] Erreur serveur:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
