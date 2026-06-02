import { createClient } from '@/lib/supabase/server'
import { ExerciseBrowser } from '@/components/ExerciseBrowser'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

export const metadata: Metadata = {
  title: 'Bibliothèque d\'exercices — 1000+ mouvements',
  description: 'Explore plus de 1000 exercices de musculation, cardio et mobilité. Instructions détaillées, muscles ciblés, équipement requis. Recherche par groupe musculaire ou équipement.',
  keywords: [
    'exercices musculation', 'bibliothèque exercices fitness', 'squat technique',
    'développé couché', 'exercices maison', 'exercices salle', 'programme musculation exercices',
    'guide exercices musculation', 'muscles dos exercices', 'exercices jambes',
  ],
  alternates: { canonical: `${APP_URL}/exercises` },
  openGraph: {
    title: '1000+ exercices de musculation & fitness — ForgeIQ',
    description: 'Bibliothèque complète : instructions, muscles ciblés, variantes. Tous les niveaux, tout l\'équipement.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Bibliothèque exercices ForgeIQ' }],
  },
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
