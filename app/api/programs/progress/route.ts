import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { computeProgramProgress, type ProgramSession } from '@/lib/utils/program-progress'

export const dynamic = 'force-dynamic'

/**
 * GET /api/programs/progress
 * Progression du programme actif de l'utilisateur (dérivée des séances complétées).
 * Retourne { active: false } si aucun programme adopté.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_program_id')
      .eq('id', user.id)
      .maybeSingle()

    const programId = profile?.current_program_id
    if (!programId) {
      return NextResponse.json({ data: { active: false }, error: null })
    }

    const { data: program } = await supabase
      .from('programs')
      .select('name, structure')
      .eq('id', programId)
      .maybeSingle()

    if (!program) {
      return NextResponse.json({ data: { active: false }, error: null })
    }

    // Longueur d'un cycle = nombre de séances dans la structure (format v1 string[] ou v2 objets)
    const rawDays: unknown[] = (program.structure as { days?: unknown[] })?.days ?? []
    const cycleLength = rawDays.length

    const { data: workouts } = await supabase
      .from('workouts')
      .select('session_date, total_tonnage_kg')
      .eq('user_id', user.id)
      .eq('program_id', programId)
      .not('completed_at', 'is', null)
      .order('session_date', { ascending: true })

    const sessions: ProgramSession[] = (workouts ?? []).map(w => ({
      session_date: w.session_date as string,
      total_tonnage_kg: w.total_tonnage_kg as number | null,
    }))

    const progress = computeProgramProgress(sessions, cycleLength)

    return NextResponse.json({
      data: { active: true, programName: program.name as string, ...progress },
      error: null,
    })
  } catch (err) {
    console.error('[programs/progress]', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
