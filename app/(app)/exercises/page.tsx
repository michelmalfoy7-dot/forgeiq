import { createClient } from '@/lib/supabase/server'
import { ExerciseBrowser } from '@/components/ExerciseBrowser'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Exercices — ForgeIQ',
  description: 'Bibliothèque de 250+ exercices avec instructions, conseils et suivi de performance.',
}

export default async function ExercisesPage() {
  const supabase = await createClient()

  // Charger exercices + aliases en parallèle
  const [{ data: exercises }, { data: aliases }] = await Promise.all([
    supabase
      .from('exercises_library')
      .select('id, name, name_fr, slug, muscle_primary, muscle_secondary, equipment, category, force_type, difficulty, instructions, tips, is_unilateral')
      .order('name_fr', { ascending: true }),
    supabase
      .from('exercise_aliases')
      .select('exercise_id, alias, brand, alias_type'),
  ])

  // Grouper les aliases par exercise_id
  const aliasMap: Record<string, { alias: string; brand: string | null; alias_type: string }[]> = {}
  for (const a of aliases ?? []) {
    if (!aliasMap[a.exercise_id]) aliasMap[a.exercise_id] = []
    aliasMap[a.exercise_id].push({ alias: a.alias, brand: a.brand, alias_type: a.alias_type })
  }

  // Injecter les aliases dans les exercices
  const exercisesWithAliases = (exercises ?? []).map(ex => ({
    ...ex,
    aliases: aliasMap[ex.id] ?? [],
  }))

  return <ExerciseBrowser exercises={exercisesWithAliases} />
}
