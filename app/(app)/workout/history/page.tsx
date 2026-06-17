import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WorkoutHistoryClient } from '@/components/workout/WorkoutHistoryClient'

export const dynamic = 'force-dynamic'

export default async function WorkoutHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Charger les 100 dernières séances avec leurs sets (pagination côté client par 20)
  const { data: workouts } = await supabase
    .from('workouts')
    .select(`
      id, session_name, session_date, total_tonnage_kg, total_sets,
      completed_at, started_at, notes, program_id,
      workout_sets (
        id, exercise_id, exercise_name, set_number, weight_kg, reps, rpe, is_warmup, set_type, note
      )
    `)
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .order('session_date', { ascending: false })
    .limit(100)

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="pt-4 mb-6">
        <p className="fiq-label">Entraînement</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>
          Historique
        </h1>
      </div>
      <WorkoutHistoryClient workouts={workouts ?? []} />
    </div>
  )
}
