import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const { data, error } = await supabase
      .from('programs')
      .select('id, name, slug, description, level, goal, equipment, sessions_per_week, duration_weeks, structure, is_custom, is_public, created_by')
      .eq('id', id)
      .eq('created_by', user.id)
      .eq('is_custom', true)
      .maybeSingle()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ data: null, error: 'Programme introuvable' }, { status: 404 })

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { name, sessions_per_week, days } = body

    if (!name?.trim()) return NextResponse.json({ data: null, error: 'Nom requis' }, { status: 400 })
    if (!Array.isArray(days) || days.length === 0) return NextResponse.json({ data: null, error: 'Au moins une séance requise' }, { status: 400 })

    // Vérifier que l'user est bien l'auteur
    const { data: existing } = await supabase
      .from('programs')
      .select('id')
      .eq('id', id)
      .eq('created_by', user.id)
      .eq('is_custom', true)
      .maybeSingle()

    if (!existing) return NextResponse.json({ data: null, error: 'Programme introuvable ou non autorisé' }, { status: 403 })

    // Résoudre les noms d'exercices
    type DayInput = { name: string; exercise_ids?: string[] }
    const allExerciseIds = (days as DayInput[]).flatMap(d => d.exercise_ids ?? [])
    const exMap: Record<string, { name_fr: string | null; name: string }> = {}
    if (allExerciseIds.length > 0) {
      const { data: exRows } = await supabase
        .from('exercises_library')
        .select('id, name, name_fr')
        .in('id', allExerciseIds)
      for (const ex of exRows ?? []) exMap[ex.id] = ex
    }

    const structureDays = (days as DayInput[]).map(d => ({
      name: d.name,
      exercises: (d.exercise_ids ?? []).map(eid => ({
        exercise_id: eid,
        name_fr: exMap[eid]?.name_fr ?? exMap[eid]?.name ?? 'Exercice',
        sets: 4,
        reps: '8-12',
      })),
    }))

    const { error } = await supabase
      .from('programs')
      .update({
        name: name.trim(),
        description: `Programme personnalisé · ${sessions_per_week} séances/semaine`,
        sessions_per_week,
        structure: { days: structureDays },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

    return NextResponse.json({ data: { id, name: name.trim() }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
