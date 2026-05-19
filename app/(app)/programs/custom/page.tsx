import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CustomProgramBuilder } from '@/components/programs/CustomProgramBuilder'

export const dynamic = 'force-dynamic'

export default async function CustomProgramPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: exercises } = await supabase
    .from('exercises_library')
    .select('id, name, name_fr, muscle_primary, equipment, category')
    .order('name_fr', { ascending: true })

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-6">
        <p className="fiq-label">Programmes</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>
          Programme custom
        </h1>
      </div>
      <CustomProgramBuilder exercises={exercises ?? []} />
    </div>
  )
}
