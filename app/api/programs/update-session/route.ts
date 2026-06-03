import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// PATCH /api/programs/update-session
// Met à jour la liste d'exercices d'une séance dans program.structure.days
// Body : { workout_id, exercises: [{ exercise_id, name_fr, set_count, reps?, note? }] }

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { workout_id, exercises } = body as {
      workout_id: string
      exercises: { exercise_id: string; name_fr: string; set_count: number; reps?: string; note?: string }[]
    }

    if (!workout_id) return NextResponse.json({ data: null, error: 'workout_id manquant' }, { status: 400 })
    if (!Array.isArray(exercises) || exercises.length === 0)
      return NextResponse.json({ data: null, error: 'Aucun exercice fourni' }, { status: 400 })

    // 1. Récupérer le workout pour avoir program_id + session_name
    const { data: workout } = await supabase
      .from('workouts')
      .select('program_id, session_name')
      .eq('id', workout_id)
      .eq('user_id', user.id)
      .single()

    if (!workout?.program_id) {
      return NextResponse.json({ data: null, error: 'Séance sans programme associé' }, { status: 400 })
    }

    // 2. Récupérer le programme (RLS : seul l'owner ou programme public peut être lu)
    const { data: program } = await supabase
      .from('programs')
      .select('id, structure, created_by')
      .eq('id', workout.program_id)
      .single()

    if (!program) return NextResponse.json({ data: null, error: 'Programme introuvable' }, { status: 404 })

    // 3. Trouver la séance dans structure.days par nom
    type ProgramDay = { name: string; exercises?: object[] }
    const days: ProgramDay[] = program.structure?.days ?? []
    const sessionName = workout.session_name ?? ''

    const dayIndex = days.findIndex(d =>
      (d.name ?? '').toLowerCase() === sessionName.toLowerCase()
    )

    if (dayIndex === -1) {
      return NextResponse.json({ data: null, error: `Séance "${sessionName}" introuvable dans ce programme` }, { status: 404 })
    }

    // 4. Construire la nouvelle liste d'exercices au format programme
    // On récupère les slugs depuis exercises_library pour enrichir la structure
    const exerciseIds = exercises
      .map(e => e.exercise_id)
      .filter(id => id && !id.startsWith('suggested-'))

    const slugMap: Record<string, string> = {}
    if (exerciseIds.length > 0) {
      const { data: libRows } = await supabase
        .from('exercises_library')
        .select('id, slug')
        .in('id', exerciseIds)

      for (const row of libRows ?? []) {
        if (row.slug) slugMap[row.id] = row.slug
      }
    }

    // On tente de conserver les reps/rest_sec/note du programme original pour les exercices inchangés
    const existingByName: Record<string, ProgramDay['exercises'] extends (infer T)[] ? T : never> = {}
    const oldExercises = days[dayIndex].exercises ?? []
    for (const ex of oldExercises) {
      const e = ex as { name_fr?: string; slug?: string }
      const key = (e.name_fr ?? e.slug ?? '').toLowerCase()
      if (key) existingByName[key] = ex as never
    }

    const updatedExercises = exercises.map(ex => {
      const key = ex.name_fr.toLowerCase()
      const existing = existingByName[key] as {
        reps?: string; rest_sec?: number; note?: string
      } | undefined
      const slug = slugMap[ex.exercise_id] ?? undefined

      return {
        ...(slug ? { slug } : {}),
        name_fr: ex.name_fr,
        sets:     ex.set_count,
        reps:     ex.reps ?? existing?.reps ?? '8-12',
        rest_sec: existing?.rest_sec ?? 90,
        note:     ex.note ?? existing?.note ?? '',
      }
    })

    // 5. Mettre à jour la structure
    const updatedDays = [...days]
    updatedDays[dayIndex] = { ...updatedDays[dayIndex], exercises: updatedExercises }

    const { error: updateErr } = await supabase
      .from('programs')
      .update({ structure: { ...program.structure, days: updatedDays } })
      .eq('id', program.id)

    if (updateErr) throw updateErr

    return NextResponse.json({ data: { updated: true, session: sessionName }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
