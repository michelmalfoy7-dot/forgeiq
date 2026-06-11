import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function makeAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I, O, 0, 1 (confusion visuelle)
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

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
      .single()

    if (profile?.referral_code) {
      return NextResponse.json({ data: { code: profile.referral_code, count: profile.referral_count ?? 0 }, error: null })
    }

    // Générer un code unique
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

    return NextResponse.json({ data: { code, count: 0 }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — applique un code referral (appelé lors de l'onboarding)
export async function POST(request: Request) {
  try {
    const { code } = await request.json() as { code?: string }
    if (!code) return NextResponse.json({ data: null, error: 'Code requis' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const admin = makeAdminClient()

    // Trouver le parrain
    const { data: referrer } = await admin
      .from('profiles')
      .select('id, referral_count')
      .eq('referral_code', code.toUpperCase())
      .maybeSingle()

    if (!referrer) return NextResponse.json({ data: null, error: 'Code invalide' }, { status: 404 })
    if (referrer.id === user.id) return NextResponse.json({ data: null, error: 'Tu ne peux pas utiliser ton propre code' }, { status: 400 })

    // Vérifier que le filleul n'a pas déjà un referred_by
    const { data: myProfile } = await supabase.from('profiles').select('referred_by').eq('id', user.id).single()
    if (myProfile?.referred_by) return NextResponse.json({ data: { already_applied: true }, error: null })

    // Appliquer : marquer le filleul + incrémenter compteur parrain
    await Promise.all([
      supabase.from('profiles').update({ referred_by: code.toUpperCase() }).eq('id', user.id),
      admin.from('profiles').update({ referral_count: (referrer.referral_count ?? 0) + 1 }).eq('id', referrer.id),
    ])

    return NextResponse.json({ data: { applied: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
