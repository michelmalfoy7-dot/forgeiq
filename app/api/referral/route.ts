import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_REFERRAL_REWARDS = 3 // max 3 mois Pro gratuits via referral

function makeAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const fmt = (d: Date) => d.toISOString().split('T')[0]

// GET — récupère (ou génère) le code referral de l'utilisateur connecté
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, referral_count')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.referral_code) {
      return NextResponse.json({ data: { code: profile.referral_code, count: profile.referral_count ?? 0, max: MAX_REFERRAL_REWARDS }, error: null })
    }

    const admin = makeAdminClient()
    let code = generateCode()
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await admin.from('profiles').select('id').eq('referral_code', code).maybeSingle()
      if (!existing) break
      code = generateCode()
      attempts++
    }

    await supabase.from('profiles').update({ referral_code: code }).eq('id', user.id)

    return NextResponse.json({ data: { code, count: 0, max: MAX_REFERRAL_REWARDS }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — enregistre le code referral à l'inscription
// Donne 14j Pro au filleul immédiatement.
// Le parrain reçoit son mois seulement quand le filleul fait sa 1ère vraie action.
export async function POST(request: Request) {
  try {
    const { code } = await request.json() as { code?: string }
    if (!code) return NextResponse.json({ data: null, error: 'Code requis' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const admin = makeAdminClient()

    const { data: referrer } = await admin
      .from('profiles')
      .select('id, referral_count')
      .eq('referral_code', code.toUpperCase())
      .maybeSingle()

    if (!referrer) return NextResponse.json({ data: null, error: 'Code invalide' }, { status: 404 })
    if (referrer.id === user.id) return NextResponse.json({ data: null, error: 'Tu ne peux pas utiliser ton propre code' }, { status: 400 })

    const { data: myProfile } = await supabase.from('profiles').select('referred_by').eq('id', user.id).maybeSingle()
    if (myProfile?.referred_by) return NextResponse.json({ data: { already_applied: true }, error: null })

    // Filleul : 14 jours Pro offerts immédiatement
    const filleulUntil = new Date()
    filleulUntil.setDate(filleulUntil.getDate() + 14)

    await supabase.from('profiles').update({
      referred_by: code.toUpperCase(),
      referral_pro_until: fmt(filleulUntil),
      referral_reward_granted: false, // le parrain n'a pas encore été récompensé
    }).eq('id', user.id)

    return NextResponse.json({ data: { applied: true, pro_days: 14 }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Récompense différée du parrain — appelée après la 1ère vraie action du filleul.
 * Anti-abus : nécessite une action réelle, plafonnée à MAX_REFERRAL_REWARDS mois.
 */
export async function grantReferralRewardIfEligible(userId: string): Promise<void> {
  try {
    const admin = makeAdminClient()

    // Vérifier si le filleul a un parrain et que la récompense n'a pas encore été accordée
    const { data: filleul } = await admin
      .from('profiles')
      .select('referred_by, referral_reward_granted')
      .eq('id', userId)
      .maybeSingle()

    if (!filleul?.referred_by || filleul.referral_reward_granted) return

    // Trouver le parrain
    const { data: referrer } = await admin
      .from('profiles')
      .select('id, referral_count, referral_pro_until')
      .eq('referral_code', filleul.referred_by)
      .maybeSingle()

    if (!referrer) return

    // Cap : max MAX_REFERRAL_REWARDS mois gratuits
    if ((referrer.referral_count ?? 0) >= MAX_REFERRAL_REWARDS) {
      // Marquer quand même comme traité pour ne plus recheck
      await admin.from('profiles').update({ referral_reward_granted: true }).eq('id', userId)
      return
    }

    const today = new Date()
    const base = referrer.referral_pro_until
      ? new Date(Math.max(today.getTime(), new Date(referrer.referral_pro_until).getTime()))
      : today
    const referrerUntil = new Date(base)
    referrerUntil.setDate(referrerUntil.getDate() + 30)

    await Promise.all([
      // Marquer le filleul comme "récompense accordée"
      admin.from('profiles').update({ referral_reward_granted: true }).eq('id', userId),
      // Accorder +30j Pro au parrain + incrémenter compteur
      admin.from('profiles').update({
        referral_count: (referrer.referral_count ?? 0) + 1,
        referral_pro_until: fmt(referrerUntil),
      }).eq('id', referrer.id),
    ])
  } catch {
    /* silencieux — ne bloque jamais l'action principale */
  }
}
