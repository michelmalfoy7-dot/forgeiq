import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
      .select('display_name, username, goal, level, equipment, sessions_per_week, age, height_cm, gender, weight_kg, macro_mode, custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g, steps_goal, target_weight_kg, created_at, subscription_status, subscription_plan, stripe_customer_id')
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

      {/* Raccourcis rapides */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/exercises"
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
        >
          <span className="text-2xl">🏋️</span>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Exercices</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>230+ exercices</p>
          </div>
        </Link>
        <Link
          href="/programs"
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
        >
          <span className="text-2xl">📋</span>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Programmes</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Entraînements guidés</p>
          </div>
        </Link>
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
        subscriptionStatus={profile?.subscription_status ?? 'free'}
        subscriptionPlan={profile?.subscription_plan ?? null}
        hasStripeCustomer={!!profile?.stripe_customer_id}
      />
    </div>
  )
}

function calcStreak(dates: string[], today: string): number {
  if (!dates.length) return 0
  const sorted = [...new Set(dates)].sort((a, b) => b.localeCompare(a))

  // Le streak peut commencer aujourd'hui OU hier (on ne pénalise pas si pas encore fait le check-in aujourd'hui)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const mostRecent = sorted[0]
  if (mostRecent !== today && mostRecent !== yesterdayStr) return 0

  let streak = 0
  let current = mostRecent

  for (const date of sorted) {
    if (date === current) {
      streak++
      const d = new Date(current)
      d.setDate(d.getDate() - 1)
      current = d.toISOString().split('T')[0]
    } else {
      break
    }
  }
  return streak
}
