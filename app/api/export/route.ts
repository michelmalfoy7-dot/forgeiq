import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ExportType = 'workouts' | 'checkins' | 'nutrition'

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    if (v == null) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const type = (request.nextUrl.searchParams.get('type') ?? 'workouts') as ExportType

    let csv = ''
    let filename = ''
    const EXPORT_LIMIT = 5000

    if (type === 'workouts') {
      const { data } = await supabase
        .from('workouts')
        .select('id, session_name, session_date, completed_at, total_tonnage_kg, total_sets, total_reps, duration_min, distance_km, workout_type, rpe_overall, notes')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('session_date', { ascending: false })
        .limit(EXPORT_LIMIT)

      csv = toCSV((data ?? []).map(w => ({
        date:       w.session_date,
        nom:        w.session_name ?? '',
        type:       w.workout_type ?? 'strength',
        tonnage_kg: w.total_tonnage_kg ?? '',
        series:     w.total_sets ?? '',
        reps:       w.total_reps ?? '',
        duree_min:  w.duration_min ?? '',
        distance_km: w.distance_km ?? '',
        rpe:        w.rpe_overall ?? '',
        notes:      w.notes ?? '',
        termine_le: w.completed_at ? new Date(w.completed_at).toISOString() : '',
      })))
      filename = `forgeiq-seances-${new Date().toISOString().split('T')[0]}.csv`

    } else if (type === 'checkins') {
      const { data } = await supabase
        .from('daily_logs')
        .select('log_date, weight_kg, weight_trend, sleep_total_min, sleep_deep_min, fatigue_score, motivation_score, steps, sys_bp, dia_bp, notes')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(EXPORT_LIMIT)

      csv = toCSV((data ?? []).map(l => ({
        date:         l.log_date,
        poids_kg:     l.weight_kg ?? '',
        tendance_kg:  l.weight_trend ?? '',
        sommeil_total_min: l.sleep_total_min ?? '',
        sommeil_profond_min: l.sleep_deep_min ?? '',
        fatigue_1_10: l.fatigue_score ?? '',
        motivation:   l.motivation_score ?? '',
        pas:          l.steps ?? '',
        sys_bp:       l.sys_bp ?? '',
        dia_bp:       l.dia_bp ?? '',
        notes:        l.notes ?? '',
      })))
      filename = `forgeiq-checkins-${new Date().toISOString().split('T')[0]}.csv`

    } else if (type === 'nutrition') {
      const { data } = await supabase
        .from('food_logs')
        .select('log_date, meal_type, food_name, quantity_g, calories, protein_g, carbs_g, fat_g')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(EXPORT_LIMIT)

      csv = toCSV((data ?? []).map(l => ({
        date:       l.log_date,
        repas:      l.meal_type ?? '',
        aliment:    l.food_name ?? '',
        quantite_g: l.quantity_g ?? '',
        calories:   l.calories ?? '',
        proteines_g: l.protein_g ?? '',
        glucides_g: l.carbs_g ?? '',
        lipides_g:  l.fat_g ?? '',
      })))
      filename = `forgeiq-nutrition-${new Date().toISOString().split('T')[0]}.csv`

    } else {
      return NextResponse.json({ error: 'Type inconnu' }, { status: 400 })
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
