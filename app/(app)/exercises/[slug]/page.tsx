import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ExerciseDetailClient } from '@/components/ExerciseDetailClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: ex } = await supabase
    .from('exercises_library')
    .select('name_fr, name')
    .eq('slug', slug)
    .maybeSingle()

  return {
    title: ex ? `${ex.name_fr} — ForgeIQ` : 'Exercice — ForgeIQ',
    description: ex
      ? `Instructions et conseils pour ${ex.name_fr} (${ex.name}).`
      : undefined,
  }
}

export default async function ExerciseDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Charger l'exercice
  const { data: exercise } = await supabase
    .from('exercises_library')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!exercise) notFound()

  // 2. Charger aliases + user + dernière perf en parallèle
  const [{ data: aliases }, { data: { user } }] = await Promise.all([
    supabase
      .from('exercise_aliases')
      .select('alias, brand, alias_type')
      .eq('exercise_id', exercise.id),
    supabase.auth.getUser(),
  ])

  // 3. Dernière performance de l'utilisateur
  let lastPerformance: { weight_kg: number; reps: number; set_date: string; is_pr: boolean }[] = []
  if (user) {
    const { data: sets } = await supabase
      .from('workout_sets')
      .select('weight_kg, reps, created_at, is_pr')
      .eq('user_id', user.id)
      .eq('exercise_id', exercise.id)
      .eq('is_warmup', false)
      .order('created_at', { ascending: false })
      .limit(15)

    lastPerformance = (sets ?? []).map(s => ({
      weight_kg: s.weight_kg,
      reps: s.reps,
      set_date: s.created_at,
      is_pr: s.is_pr ?? false,
    }))
  }

  return (
    <ExerciseDetailClient
      exercise={exercise}
      aliases={aliases ?? []}
      lastPerformance={lastPerformance}
    />
  )
}
