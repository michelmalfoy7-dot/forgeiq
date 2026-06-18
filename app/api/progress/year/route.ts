import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/progress/year?year=2026
// Calcule le récapitulatif annuel sans aucune nouvelle colonne DB
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const url = new URL(request.url)
    const year = Number(url.searchParams.get('year') ?? new Date().getFullYear())
    if (isNaN(year) || year < 2020 || year > 2030) {
      return NextResponse.json({ data: null, error: 'Année invalide' }, { status: 400 })
    }

    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    // ── 1. Workouts de l'année ─────────────────────────────────────────────
    const { data: workoutsRaw } = await supabase
      .from('workouts')
      .select('id, session_date, total_tonnage_kg, session_name, completed_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .gte('session_date', yearStart)
      .lte('session_date', yearEnd)
      .order('session_date', { ascending: true })

    const workouts = workoutsRaw ?? []
    const totalSessions = workouts.length
    const totalTonnage = workouts.reduce((sum, w) => sum + (w.total_tonnage_kg ?? 0), 0)

    // Meilleure séance (tonnage max)
    let bestSession: { date: string; name: string; tonnage: number } | null = null
    for (const w of workouts) {
      if (w.total_tonnage_kg && (!bestSession || w.total_tonnage_kg > bestSession.tonnage)) {
        bestSession = {
          date: w.session_date,
          name: w.session_name ?? 'Séance libre',
          tonnage: w.total_tonnage_kg,
        }
      }
    }

    // Semaine la plus chargée
    const tonnageByWeek: Record<string, { tonnage: number; weekStart: string }> = {}
    for (const w of workouts) {
      if (!w.total_tonnage_kg) continue
      const d = new Date(w.session_date + 'T12:00:00')
      const weekKey = getISOWeek(d)
      const monday = getMondayOfISOWeek(d)
      if (!tonnageByWeek[weekKey]) {
        tonnageByWeek[weekKey] = { tonnage: 0, weekStart: monday }
      }
      tonnageByWeek[weekKey].tonnage += w.total_tonnage_kg
    }

    let bestWeek: { weekLabel: string; tonnage: number } | null = null
    for (const [, v] of Object.entries(tonnageByWeek)) {
      if (!bestWeek || v.tonnage > bestWeek.tonnage) {
        bestWeek = {
          weekLabel: formatDateFR(new Date(v.weekStart + 'T12:00:00')),
          tonnage: Math.round(v.tonnage),
        }
      }
    }

    // ── 2. Streak de semaines consécutives ────────────────────────────────
    const isoWeeksWithSession = new Set(
      workouts.map(w => getISOWeek(new Date(w.session_date + 'T12:00:00')))
    )
    // Calcul du plus long streak de semaines consécutives
    let longestWeekStreak = 0
    let currentStreak = 0
    let prevWeekNum: number | null = null
    let prevWeekYear: number | null = null
    const sortedWeeks = Array.from(isoWeeksWithSession).sort()
    for (const w of sortedWeeks) {
      const [wYear, wWeek] = w.split('-W').map(Number)
      if (
        prevWeekNum !== null &&
        prevWeekYear !== null &&
        isNextISOWeek(prevWeekYear, prevWeekNum, wYear, wWeek)
      ) {
        currentStreak++
      } else {
        currentStreak = 1
      }
      if (currentStreak > longestWeekStreak) longestWeekStreak = currentStreak
      prevWeekNum = wWeek
      prevWeekYear = wYear
    }

    // ── 3. Exercices : workout_sets de l'année ────────────────────────────
    const workoutIds = workouts.map(w => w.id)
    let topExercise: { name: string; count: number } | null = null
    let topMuscle: string | null = null

    if (workoutIds.length > 0) {
      // Récupérer workout_sets pour ces séances (en batch de 200 max)
      const { data: setsRaw } = await supabase
        .from('workout_sets')
        .select('exercise_id, exercise_name, set_type')
        .in('workout_id', workoutIds)
        .not('weight_kg', 'is', null)

      const sets = setsRaw ?? []

      // Exercice le plus pratiqué (working sets uniquement)
      const workingSets = sets.filter(s => !s.set_type || s.set_type === 'work' || s.set_type === 'top_set')
      const exerciseCount: Record<string, number> = {}
      for (const s of workingSets) {
        if (!s.exercise_name) continue
        exerciseCount[s.exercise_name] = (exerciseCount[s.exercise_name] ?? 0) + 1
      }
      const topExerciseEntry = Object.entries(exerciseCount).sort(([, a], [, b]) => b - a)[0]
      if (topExerciseEntry) {
        topExercise = { name: topExerciseEntry[0], count: topExerciseEntry[1] }
      }

      // Groupe musculaire le plus travaillé : join exercises_library
      const exerciseIds = [...new Set(sets.map(s => s.exercise_id).filter(Boolean))]
      if (exerciseIds.length > 0) {
        const { data: exercisesRaw } = await supabase
          .from('exercises_library')
          .select('id, muscle_primary')
          .in('id', exerciseIds)

        const muscleById: Record<string, string> = {}
        for (const ex of exercisesRaw ?? []) {
          if (ex.id && ex.muscle_primary?.[0]) muscleById[ex.id] = ex.muscle_primary[0]
        }

        const muscleCount: Record<string, number> = {}
        for (const s of workingSets) {
          if (!s.exercise_id) continue
          const muscle = muscleById[s.exercise_id]
          if (!muscle) continue
          muscleCount[muscle] = (muscleCount[muscle] ?? 0) + 1
        }
        const topMuscleEntry = Object.entries(muscleCount).sort(([, a], [, b]) => b - a)[0]
        if (topMuscleEntry) topMuscle = topMuscleEntry[0]
      }
    }

    // ── 4. Progression 1RM : personal_records filtrés sur l'année ─────────
    const { data: prsRaw } = await supabase
      .from('personal_records')
      .select('exercise_name, value, achieved_date')
      .eq('user_id', user.id)
      .eq('record_type', 'top_set')
      .gte('achieved_date', yearStart)
      .lte('achieved_date', yearEnd)
      .order('achieved_date', { ascending: true })

    const prs = prsRaw ?? []
    // Pour chaque exercice, trouver premier et dernier PR de l'année → gain max
    const prByExercise: Record<string, { first: number; last: number }> = {}
    for (const pr of prs) {
      if (!pr.exercise_name || !pr.value) continue
      if (!prByExercise[pr.exercise_name]) {
        prByExercise[pr.exercise_name] = { first: pr.value, last: pr.value }
      } else {
        prByExercise[pr.exercise_name].last = pr.value
      }
    }

    let biggestPRGain: { name: string; start: number; end: number; gain: number } | null = null
    for (const [name, { first, last }] of Object.entries(prByExercise)) {
      const gain = last - first
      if (gain > 0 && (!biggestPRGain || gain > biggestPRGain.gain)) {
        biggestPRGain = { name, start: first, end: last, gain }
      }
    }

    // ── 5. Nutrition ──────────────────────────────────────────────────────
    const { data: foodLogsRaw } = await supabase
      .from('food_logs')
      .select('log_date, protein_g')
      .eq('user_id', user.id)
      .gte('log_date', yearStart)
      .lte('log_date', yearEnd)

    const foodLogs = foodLogsRaw ?? []
    const nutritionDays = new Set(foodLogs.map(f => f.log_date)).size
    const totalProtein = foodLogs.reduce((sum, f) => sum + (f.protein_g ?? 0), 0)
    const avgProtein = nutritionDays > 0 ? Math.round(totalProtein / nutritionDays) : null

    // ── 6. Check-ins + poids ──────────────────────────────────────────────
    const { data: dailyLogsRaw } = await supabase
      .from('daily_logs')
      .select('log_date, weight_trend')
      .eq('user_id', user.id)
      .gte('log_date', yearStart)
      .lte('log_date', yearEnd)
      .not('weight_trend', 'is', null)
      .order('log_date', { ascending: true })

    const dailyLogs = dailyLogsRaw ?? []
    const totalCheckins = dailyLogs.length
    const weightStart = dailyLogs.length > 0 ? dailyLogs[0].weight_trend : null
    const weightEnd = dailyLogs.length > 0 ? dailyLogs[dailyLogs.length - 1].weight_trend : null
    const weightDelta =
      weightStart != null && weightEnd != null
        ? Math.round((weightEnd - weightStart) * 10) / 10
        : null

    return NextResponse.json({
      data: {
        year,
        workouts: {
          total: totalSessions,
          totalTonnage: Math.round(totalTonnage),
          bestSession,
          topMuscle,
          bestWeek,
        },
        streaks: {
          longestWeekStreak,
        },
        exercises: {
          topExercise,
          biggestPRGain,
        },
        nutrition: {
          daysLogged: nutritionDays,
          avgProtein,
        },
        checkins: {
          total: totalCheckins,
          weightStart: weightStart != null ? Math.round(weightStart * 10) / 10 : null,
          weightEnd: weightEnd != null ? Math.round(weightEnd * 10) / 10 : null,
          weightDelta,
        },
      },
      error: null,
    })
  } catch (err) {
    console.error('[year] error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  )
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getMondayOfISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  return d.toISOString().split('T')[0]
}

function formatDateFR(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(date)
}

function isNextISOWeek(y1: number, w1: number, y2: number, w2: number): boolean {
  if (y1 === y2) return w2 === w1 + 1
  // Semaine qui change d'année : W53→W01 ou W52→W01
  if (y2 === y1 + 1 && w2 === 1 && (w1 === 52 || w1 === 53)) return true
  return false
}
