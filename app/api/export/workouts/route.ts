import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const EXPORT_LIMIT = 2000

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

// Labels lisibles pour les types de set
const SET_TYPE_LABELS: Record<string, string> = {
  work:      'Travail',
  top_set:   'Top Set',
  backoff:   'Back-off',
  dropset:   'Drop Set',
  failure:   'Échec',
  pause_rep: 'Pause-Rep',
  warmup:    'Échauffement',
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Récupérer toutes les séances terminées avec leurs sets (une ligne par set)
    const { data: workouts, error: workoutError } = await supabase
      .from('workouts')
      .select('id, session_date, session_name, total_tonnage_kg, duration_min')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('session_date', { ascending: false })
      .limit(EXPORT_LIMIT)

    if (workoutError) {
      return NextResponse.json({ error: 'Erreur récupération séances' }, { status: 500 })
    }

    if (!workouts || workouts.length === 0) {
      // Retourner un CSV vide avec les headers
      const empty = toCSV([{
        date: '', seance: '', exercice: '', set: '', type: '',
        poids_kg: '', reps: '', note: '', tonnage_total_kg: '', duree_min: '',
      }]).split('\n')[0]
      const filename = `forgeiq-entrainements-${new Date().toISOString().split('T')[0]}.csv`
      return new NextResponse(empty, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const workoutIds = workouts.map(w => w.id)

    // Récupérer tous les sets pour ces séances
    const { data: sets, error: setsError } = await supabase
      .from('workout_sets')
      .select('workout_id, exercise_name, set_number, set_type, weight_kg, reps, note, is_warmup')
      .in('workout_id', workoutIds)
      .order('workout_id')
      .order('set_number')

    if (setsError) {
      return NextResponse.json({ error: 'Erreur récupération sets' }, { status: 500 })
    }

    // Index des séances par id pour lookup O(1)
    const workoutMap = new Map(workouts.map(w => [w.id, w]))

    // Construire une ligne CSV par set
    const rows = (sets ?? []).map(s => {
      const w = workoutMap.get(s.workout_id)
      const rawType = s.is_warmup ? 'warmup' : (s.set_type ?? 'work')
      return {
        date:             w?.session_date ?? '',
        seance:           w?.session_name ?? '',
        exercice:         s.exercise_name ?? '',
        set:              s.set_number ?? '',
        type:             SET_TYPE_LABELS[rawType] ?? rawType,
        poids_kg:         s.weight_kg ?? '',
        reps:             s.reps ?? '',
        note:             s.note ?? '',
        tonnage_total_kg: w?.total_tonnage_kg ?? '',
        duree_min:        w?.duration_min ?? '',
      }
    })

    const csv = toCSV(rows)
    const filename = `forgeiq-entrainements-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
