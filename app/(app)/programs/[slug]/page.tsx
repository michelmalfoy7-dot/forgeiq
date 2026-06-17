import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ProgramDetailClient } from '@/components/programs/ProgramDetailClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

type Props = { params: Promise<{ slug: string }> }

// Génère les métadonnées dynamiques pour chaque programme (SEO + partage social)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: program } = await supabase
    .from('programs')
    .select('name, description, level, goal, sessions_per_week, duration_weeks')
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle()

  if (!program) return { title: 'Programme — ForgeIQ' }

  const levelLabel: Record<string, string> = {
    beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé',
  }
  const goalLabel: Record<string, string> = {
    strength: 'Force', hypertrophy: 'Hypertrophie', endurance: 'Endurance',
    weight_loss: 'Perte de poids', mobility: 'Mobilité', general_fitness: 'Forme générale',
  }

  const level = levelLabel[program.level] ?? program.level
  const goal = goalLabel[program.goal] ?? program.goal
  const desc = program.description
    ?? `Programme ${program.name} — ${level}, objectif ${goal}. ${program.sessions_per_week} séances/semaine sur ${program.duration_weeks ?? 8} semaines.`

  return {
    title: `${program.name} — Programme ${level}`,
    description: desc,
    alternates: { canonical: `${APP_URL}/programs/${slug}` },
    openGraph: {
      title: `${program.name} — ForgeIQ`,
      description: desc,
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  }
}

export default async function ProgramDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: program }, { data: profile }] = await Promise.all([
    supabase.from('programs')
      .select('id, name, slug, description, level, goal, equipment, sessions_per_week, duration_weeks, structure, is_custom')
      .eq('slug', slug)
      .eq('is_public', true)
      .maybeSingle(),
    supabase.from('profiles')
      .select('current_program_id, gym_id, gym_equipment_profiles(tier, name, logo_emoji, features)')
      .eq('id', user.id).maybeSingle(),
  ])

  if (!program) notFound()

  // Résoudre les infos de salle pour adapter les exercices affichés
  type GymRef = { tier: string; name: string; logo_emoji: string; features: string[] } | null
  const gymRef = (profile as unknown as { gym_equipment_profiles?: GymRef })?.gym_equipment_profiles ?? null
  const gymTier = (gymRef?.tier as 'premium' | 'standard' | 'home' | null) ?? null
  const gymName = gymRef?.name ?? null
  const gymEmoji = gymRef?.logo_emoji ?? null
  const gymFeatures = gymRef?.features ?? null

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="pt-4 mb-6">
        <Link
          href="/programs"
          className="text-xs font-semibold flex items-center gap-1 mb-4"
          style={{ color: 'var(--fiq-muted)' }}
        >
          ← Programmes
        </Link>
        <p className="fiq-label">Programme</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>
          {program.name}
        </h1>
      </div>

      <ProgramDetailClient
        program={program}
        currentProgramId={profile?.current_program_id ?? null}
        gymTier={gymTier}
        gymName={gymName}
        gymEmoji={gymEmoji}
        gymFeatures={gymFeatures}
      />
    </div>
  )
}
