import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChallengesClient } from './ChallengesClient'

export const dynamic = 'force-dynamic'

// Server Component — vérification auth avant de rendre le client
export default async function ChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <ChallengesClient />
}
