import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProgramsClient } from '@/components/programs/ProgramsClient'

export const dynamic = 'force-dynamic'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: programs }, { data: profile }] = await Promise.all([
    supabase.from('programs')
      .select('id, name, slug, description, level, goal, equipment, sessions_per_week, duration_weeks, structure, is_custom')
      .eq('is_public', true)
      .order('sessions_per_week', { ascending: true }),
    supabase.from('profiles')
      .select('current_program_id, goal, level, equipment, gym_id, gym_equipment_profiles(tier, name, logo_emoji)')
      .eq('id', user.id).single(),
  ])

  // Résoudre le tier de la salle de l'utilisateur
  type GymRef = { tier: string; name: string; logo_emoji: string } | null
  const gymRef = (profile as unknown as { gym_equipment_profiles?: GymRef })?.gym_equipment_profiles ?? null
  const gymTier = (gymRef?.tier as 'premium' | 'standard' | 'home' | null) ?? null
  const gymName = gymRef?.name ?? null
  const gymEmoji = gymRef?.logo_emoji ?? null

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-6">
        <p className="fiq-label">Entraînement</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Programmes</h1>
      </div>
      <ProgramsClient
        programs={programs ?? []}
        currentProgramId={profile?.current_program_id ?? null}
        userGoal={profile?.goal ?? null}
        userLevel={profile?.level ?? null}
        userEquipment={profile?.equipment ?? null}
        gymTier={gymTier}
        gymName={gymName}
        gymEmoji={gymEmoji}
      />
    </div>
  )
}
