import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { name, sessions_per_week, days } = body

    if (!name?.trim()) return NextResponse.json({ data: null, error: 'Nom requis' }, { status: 400 })
    if (!Array.isArray(days) || days.length === 0) return NextResponse.json({ data: null, error: 'Au moins une séance requise' }, { status: 400 })

    const slug = `custom-${user.id.slice(0, 8)}-${Date.now()}`

    // Résoudre les noms d'exercices pour les stocker dans la structure
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
      exercises: (d.exercise_ids ?? []).map(id => ({
        exercise_id: id,
        name_fr: exMap[id]?.name_fr ?? exMap[id]?.name ?? 'Exercice',
        sets: 4,
        reps: '8-12',
      })),
    }))

    const { data: program, error } = await supabase
      .from('programs')
      .insert({
        name: name.trim(),
        slug,
        description: `Programme personnalisé · ${sessions_per_week} séances/semaine`,
        level: ['beginner', 'intermediate', 'advanced'],
        goal: ['general'],
        equipment: ['full_gym', 'home_basic', 'home_advanced', 'bodyweight'],
        sessions_per_week,
        duration_weeks: 8,
        structure: { days: structureDays },
        is_custom: true,
        is_public: false,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

    // Adopter le programme immédiatement
    await supabase.from('profiles')
      .update({ current_program_id: program.id, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json({ data: { id: program.id, name }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
