import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ProgramDetailClient } from '@/components/programs/ProgramDetailClient'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export default async function ProgramDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: program }, { data: profile }] = await Promise.all([
    supabase.from('programs')
      .select('id, name, slug, description, level, goal, equipment, sessions_per_week, duration_weeks, structure, is_custom')
      .eq('slug', slug)
      .single(),
    supabase.from('profiles')
      .select('current_program_id')
      .eq('id', user.id).single(),
  ])

  if (!program) notFound()

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
      />
    </div>
  )
}
