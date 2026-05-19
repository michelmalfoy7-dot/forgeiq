import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileClient } from '@/components/profile/ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: profile },
    { data: workoutStats },
    { data: prCount },
    { data: streakData },
  ] = await Promise.all([
    supabase.from('profiles')
      .select('display_name, username, goal, level, equipment, sessions_per_week, age, height_cm, gender, created_at')
      .eq('id', user.id).single(),

    supabase.from('workouts')
      .select('id, total_tonnage_kg')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null),

    supabase.from('personal_records')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('record_type', 'top_set'),

    supabase.from('daily_logs')
      .select('log_date')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(60),
  ])

  // Calculer le streak (jours consécutifs depuis aujourd'hui)
  const streak = calcStreak(streakData?.map(l => l.log_date) ?? [], today)

  const totalSessions = workoutStats?.length ?? 0
  const totalTonnage = workoutStats?.reduce((acc, w) => acc + (w.total_tonnage_kg ?? 0), 0) ?? 0

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-6">
        <p className="fiq-label">Compte</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Mon profil</h1>
      </div>

      <ProfileClient
        profile={profile}
        email={user.email ?? ''}
        stats={{
          totalSessions,
          totalTonnageKg: Math.round(totalTonnage),
          prCount: prCount?.length ?? 0,
          streak,
        }}
      />
    </div>
  )
}

function calcStreak(dates: string[], today: string): number {
  if (!dates.length) return 0
  const sorted = [...new Set(dates)].sort((a, b) => b.localeCompare(a))
  let streak = 0
  let current = today

  for (const date of sorted) {
    if (date === current) {
      streak++
      const d = new Date(current)
      d.setDate(d.getDate() - 1)
      current = d.toISOString().split('T')[0]
    } else if (date < current) {
      break
    }
  }
  return streak
}
