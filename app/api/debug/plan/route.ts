import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Endpoint temporaire de debug — à supprimer après diagnostic
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, subscription_status, subscription_plan, is_admin, referral_pro_until')
    .eq('id', user.id)
    .single()

  // Test sans referral_pro_until
  const { data: profileBasic, error: errorBasic } = await supabase
    .from('profiles')
    .select('id, display_name, subscription_status, subscription_plan, is_admin')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ user_id: user.id, profile, error, profileBasic, errorBasic })
}
