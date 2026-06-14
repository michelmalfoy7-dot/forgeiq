import { createClient } from '@/lib/supabase/server'

export type ChallengeType = 'tonnage_weekly' | 'streak_weekly' | 'sessions_monthly' | 'tonnage_monthly'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

// Calcule la valeur courante d'un participant selon le type de défi
export async function calcChallengeValue(
  supabase: SupabaseServerClient,
  userId: string,
  type: ChallengeType,
  startDate: string,
  endDate: string
): Promise<number> {
  if (type === 'tonnage_weekly' || type === 'tonnage_monthly') {
    const { data } = await supabase
      .from('workouts')
      .select('total_tonnage_kg')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('session_date', startDate)
      .lte('session_date', endDate)
    return (data ?? []).reduce(
      (acc: number, w: { total_tonnage_kg: number | null }) => acc + (w.total_tonnage_kg ?? 0),
      0
    )
  }

  if (type === 'sessions_monthly') {
    const { count } = await supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('session_date', startDate)
      .lte('session_date', endDate)
    return count ?? 0
  }

  if (type === 'streak_weekly') {
    // Nombre de jours d'entraînement distincts sur la période
    const { data } = await supabase
      .from('workouts')
      .select('session_date')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('session_date', startDate)
      .lte('session_date', endDate)
    return new Set(
      (data ?? []).map((w: { session_date: string | null }) => w.session_date).filter(Boolean)
    ).size
  }

  return 0
}
