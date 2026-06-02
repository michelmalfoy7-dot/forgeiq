import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProgramsClient } from '@/components/programs/ProgramsClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

export const metadata: Metadata = {
  title: 'Programmes d\'entraînement — PPL, Full Body, Powerlifting',
  description: '19 programmes scientifiques pour tous les niveaux : Full Body, Push Pull Legs, Upper/Lower, Powerlifting, programmes femme. Adaptés à ton équipement et tes objectifs.',
  keywords: [
    'programme musculation', 'programme PPL', 'programme full body', 'programme powerlifting',
    'programme musculation débutant', 'programme musculation avancé', 'programme femme musculation',
    'programme upper lower', 'programme 3 jours', 'programme 6 jours musculation',
  ],
  alternates: { canonical: `${APP_URL}/programs` },
  openGraph: {
    title: '19 programmes de musculation — ForgeIQ',
    description: 'Full Body, PPL, Powerlifting, programmes femme. Tous adaptés à ton niveau, équipement et objectif.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Programmes ForgeIQ' }],
  },
}

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
