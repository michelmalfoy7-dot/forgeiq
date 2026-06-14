import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProfileClient } from '@/components/profile/ProfileClient'
import { Users, ClipboardList } from 'lucide-react'
import { FiqDumbbell } from '@/components/ui/FiqIcons'
import { categorizeBig5 } from '@/lib/utils/big5'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: profile },
    { data: workoutStats },
    { data: allPRs },
    { data: streakData },
    { data: gymProfiles },
  ] = await Promise.all([
    supabase.from('profiles')
      .select('display_name, username, avatar_url, goal, level, equipment, sessions_per_week, age, height_cm, gender, weight_kg, macro_mode, custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g, steps_goal, target_weight_kg, created_at, subscription_status, subscription_plan, stripe_customer_id, include_warmup_in_tonnage, gym_id, is_admin, checkin_streak, training_streak_weeks')
      .eq('id', user.id).single(),

    supabase.from('workouts')
      .select('id, total_tonnage_kg')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null),

    // Récupérer TOUS les PRs top_set triés par valeur DESC pour le Big 5
    supabase.from('personal_records')
      .select('value, exercise_name, exercises_library(name, name_fr)')
      .eq('user_id', user.id)
      .eq('record_type', 'top_set')
      .order('value', { ascending: false }),

    supabase.from('daily_logs')
      .select('log_date')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(60),

    // Liste des salles disponibles pour le sélecteur
    supabase.from('gym_equipment_profiles')
      .select('id, slug, name, tier, logo_emoji')
      .order('sort_order', { ascending: true }),
  ])

  // Calculer le streak (jours consécutifs depuis aujourd'hui)
  const streak = calcStreak(streakData?.map(l => l.log_date) ?? [], today)

  // Catégoriser les PRs en Big 5 mouvements fondamentaux
  const big5 = categorizeBig5(
    (allPRs ?? []).map(pr => ({
      value: pr.value,
      exercise_name: pr.exercise_name,
      exercises_library: pr.exercises_library as unknown as { name: string; name_fr: string | null } | null,
    }))
  )

  const totalSessions = workoutStats?.length ?? 0
  const totalTonnage = workoutStats?.reduce((acc, w) => acc + (w.total_tonnage_kg ?? 0), 0) ?? 0

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-6">
        <p className="fiq-label">Compte</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Mon profil</h1>
      </div>

      {/* Raccourcis rapides */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Link
          href="/exercises"
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
        >
          <FiqDumbbell size={28} style={{ color: 'var(--fiq-accent)' }} />
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Exercices</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>1000+ exercices</p>
          </div>
        </Link>
        <Link
          href="/programs"
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
        >
          <ClipboardList className="w-7 h-7" style={{ color: 'var(--fiq-blue)' }} />
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Programmes</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Entraînements guidés</p>
          </div>
        </Link>
      </div>

      {/* Accès Communauté */}
      <Link
        href="/social"
        className="flex items-center gap-4 p-4 rounded-2xl mb-6 transition-all"
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#B4FF4A18' }}
        >
          <Users className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Communauté</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Feed · Profil public · Suivre des athlètes</p>
        </div>
        <span style={{ color: 'var(--fiq-muted)', fontSize: 18 }}>›</span>
      </Link>

      <ProfileClient
        profile={profile}
        email={user.email ?? ''}
        stats={{
          totalSessions,
          totalTonnageKg: Math.round(totalTonnage),
          prCount: allPRs?.length ?? 0,
          streak,
          checkinStreak: (profile as unknown as { checkin_streak?: number | null })?.checkin_streak ?? streak,
          trainingStreakWeeks: (profile as unknown as { training_streak_weeks?: number | null })?.training_streak_weeks ?? 0,
        }}
        big5={big5}
        subscriptionStatus={profile?.subscription_status ?? 'free'}
        subscriptionPlan={profile?.subscription_plan ?? null}
        hasStripeCustomer={!!profile?.stripe_customer_id}
        isAdmin={!!(profile as unknown as { is_admin?: boolean | null })?.is_admin}
        gymId={(profile as unknown as { gym_id?: string | null })?.gym_id ?? null}
        gymProfiles={gymProfiles ?? []}
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
