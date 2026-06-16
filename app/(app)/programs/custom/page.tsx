import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CustomProgramBuilder, type BuilderInitialData } from '@/components/programs/CustomProgramBuilder'

export const dynamic = 'force-dynamic'

type ProgramExercise = {
  exercise_id?: string
  slug?: string
  name_fr?: string
  sets?: number
  reps?: string
  by_tier?: Record<string, { name_fr?: string }>
}

type ProgramDay = {
  name: string
  exercises?: ProgramExercise[]
}

export default async function CustomProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { edit: editId } = await searchParams

  const [{ data: exercises }, { data: aliasRows }] = await Promise.all([
    supabase
      .from('exercises_library')
      .select('id, name, name_fr, muscle_primary, equipment, category')
      .order('name_fr', { ascending: true }),
    supabase
      .from('exercise_aliases')
      .select('exercise_id, alias'),
  ])

  const aliasMap: Record<string, { alias: string }[]> = {}
  for (const a of (aliasRows ?? [])) {
    if (!aliasMap[a.exercise_id]) aliasMap[a.exercise_id] = []
    aliasMap[a.exercise_id].push({ alias: a.alias })
  }
  const exercisesWithAliases = (exercises ?? []).map(ex => ({
    ...ex,
    aliases: aliasMap[ex.id] ?? [],
  }))

  // Mode édition — charger le programme existant
  let initialData: BuilderInitialData | undefined

  if (editId) {
    const { data: program } = await supabase
      .from('programs')
      .select('id, name, sessions_per_week, structure')
      .eq('id', editId)
      .eq('created_by', user.id)
      .eq('is_custom', true)
      .maybeSingle()

    if (program) {
      type Structure = { days: (string | ProgramDay)[] }
      const structure = program.structure as Structure

      // Résoudre les exercices de la structure vers les objets complets
      const exById = Object.fromEntries(exercisesWithAliases.map(e => [e.id, e]))
      const exByNameFr = Object.fromEntries(
        exercisesWithAliases
          .filter(e => e.name_fr)
          .map(e => [e.name_fr!.toLowerCase(), e])
      )

      const builderDays = (structure.days ?? []).map((day, i) => {
        const dayName = typeof day === 'string' ? day : day.name
        const rawExercises: ProgramExercise[] = typeof day === 'string' ? [] : (day.exercises ?? [])

        const resolvedExercises = rawExercises
          .map(pex => {
            // Cherche par exercise_id d'abord, puis par name_fr
            if (pex.exercise_id && exById[pex.exercise_id]) return exById[pex.exercise_id]
            const displayName = pex.name_fr ?? pex.by_tier?.standard?.name_fr ?? ''
            if (displayName) return exByNameFr[displayName.toLowerCase()] ?? null
            return null
          })
          .filter(Boolean) as typeof exercisesWithAliases

        return {
          id: `day-${i}-${Date.now()}`,
          name: dayName,
          exercises: resolvedExercises,
        }
      })

      initialData = {
        programId: program.id,
        name: program.name,
        sessionsPerWeek: program.sessions_per_week,
        days: builderDays,
      }
    }
  }

  const isEditing = !!initialData

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-6">
        <p className="fiq-label">Programmes</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>
          {isEditing ? 'Modifier le programme' : 'Programme custom'}
        </h1>
        {isEditing && (
          <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
            Les exercices non reconnus ont été ignorés.
          </p>
        )}
      </div>
      <CustomProgramBuilder exercises={exercisesWithAliases} initialData={initialData} />
    </div>
  )
}
