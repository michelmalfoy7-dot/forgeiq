import { createClient } from '@/lib/supabase/server'
import { ExerciseBrowser } from '@/components/ExerciseBrowser'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Exercices — ForgeIQ',
  description: 'Bibliothèque de +250 exercices avec instructions et conseils de coaching.',
}

export default async function ExercisesPage() {
  const supabase = await createClient()

  const { data: exercises } = await supabase
    .from('exercises_library')
    .select('id, name, name_fr, slug, muscle_primary, muscle_secondary, equipment, category, force_type, difficulty, instructions, tips')
    .order('name_fr', { ascending: true })

  return <ExerciseBrowser exercises={exercises ?? []} />
}
