import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/progress/1rm
// Sans paramètre  → liste des exercices de l'utilisateur avec leur 1RM estimé actuel
// ?exercise_id=xx → historique des 1RM estimés par séance pour cet exercice

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const exerciseId = req.nextUrl.searchParams.get('exercise_id')

    // ── Liste des exercices avec 1RM actuel ─────────────────────────────
    if (!exerciseId) {
      const { data } = await supabase
        .from('personal_records')
        .select('exercise_id, exercise_name, value')
        .eq('user_id', user.id)
        .eq('record_type', '1rm_estimated')
        .order('value', { ascending: false })

      return NextResponse.json({ data: data ?? [], error: null })
    }

    // ── Historique 1RM pour un exercice ─────────────────────────────────
    // 1) Récupérer tous les workouts complétés de l'utilisateur (12 derniers mois)
    const since = new Date()
    since.setFullYear(since.getFullYear() - 1)
    const sinceStr = since.toISOString().split('T')[0]

    const { data: workouts } = await supabase
      .from('workouts')
      .select('id, session_date')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .gte('session_date', sinceStr)
      .order('session_date', { ascending: true })

    if (!workouts || workouts.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    const wIds = workouts.map(w => w.id)
    const dateMap = new Map(workouts.map(w => [w.id, w.session_date]))

    // 2) Récupérer les sets de travail pour cet exercice dans ces séances
    const { data: sets } = await supabase
      .from('workout_sets')
      .select('weight_kg, reps, set_type, workout_id')
      .eq('exercise_id', exerciseId)
      .in('workout_id', wIds)
      .eq('is_warmup', false)
      .gt('weight_kg', 0)
      .gt('reps', 0)

    if (!sets || sets.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // 3) Grouper par date, calculer le max 1RM Epley (exclure back-off)
    const byDate = new Map<string, number>()
    for (const s of sets) {
      if (s.set_type === 'backoff') continue
      const date = dateMap.get(s.workout_id)
      if (!date) continue
      const epley = s.weight_kg * (1 + s.reps / 30)
      const prev = byDate.get(date) ?? 0
      if (epley > prev) byDate.set(date, epley)
    }

    const history = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, epley]) => ({
        date: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
          .format(new Date(date + 'T12:00:00')),
        raw_date: date,
        value_kg: Math.round(epley * 10) / 10,
      }))

    return NextResponse.json({ data: history, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
