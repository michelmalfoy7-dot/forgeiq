import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isReferralTrial, referralDaysLeft } from '@/lib/utils/plan'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: null })

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, is_admin, referral_pro_until')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ data: null, error: null })

    const trial = isReferralTrial(profile)
    const daysLeft = referralDaysLeft(profile)

    return NextResponse.json({ data: { trial, daysLeft }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: null })
  }
}
