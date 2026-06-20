import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GenerateProgramClient } from '@/components/programs/GenerateProgramClient'
import { PLAN_SELECT, isProUser, isLifetimeUser, type ProfileForPlan } from '@/lib/utils/plan'

export const dynamic = 'force-dynamic'

export default async function GenerateProgramPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Vérification plan + contexte salle
  const { data: profile } = await supabase
    .from('profiles')
    .select(`${PLAN_SELECT}, gym_id, gym_equipment_profiles(tier, name, logo_emoji, features)`)
    .eq('id', user.id)
    .maybeSingle()

  const planProfile = profile as ProfileForPlan
  const isPro = isProUser(planProfile)

  type GymRef = { tier: string; name: string; logo_emoji: string; features: string[] } | null
  const gymRef = (profile as unknown as { gym_equipment_profiles?: GymRef })?.gym_equipment_profiles ?? null
  const gymTier = (gymRef?.tier as 'premium' | 'standard' | 'home' | null) ?? null
  const gymName = gymRef?.name ?? null
  const gymFeatures = gymRef?.features ?? null

  const unlimitedGenerations = !!planProfile?.is_admin || isLifetimeUser(planProfile)

  // Quota du mois (uniquement pour les non-Lifetime / non-Admin)
  let generationsLeft = 999
  if (!unlimitedGenerations) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: usedThisMonth } = await supabase
      .from('programs')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .eq('is_ai_generated', true)
      .gte('created_at', startOfMonth.toISOString())

    generationsLeft = Math.max(0, 3 - (usedThisMonth ?? 0))
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="pt-4 mb-6">
        <Link href="/programs"
          className="text-xs font-semibold flex items-center gap-1 mb-4"
          style={{ color: 'var(--fiq-muted)' }}>
          ← Programmes
        </Link>
        <p className="fiq-label">Pro</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>
          Génère ton programme
        </h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
          Un programme sur mesure basé sur tes PRs, ta salle et tes objectifs.
        </p>
      </div>

      {/* Accès refusé si pas Pro */}
      {!isPro ? (
        <div className="space-y-4">
          <div className="rounded-2xl p-6 text-center space-y-4"
            style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
            <p className="text-4xl">✨</p>
            <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>
              Fonctionnalité Pro
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
              Le générateur IA de programmes est réservé aux membres Pro et Lifetime.
              Passe au Pro pour obtenir ton programme personnalisé.
            </p>
            <Link href="/pricing"
              className="block w-full py-3 rounded-xl font-black text-sm text-center"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
              Passer au Pro →
            </Link>
          </div>
        </div>
      ) : (
        <GenerateProgramClient
          gymTier={gymTier}
          gymFeatures={gymFeatures}
          gymName={gymName}
          generationsLeft={generationsLeft}
        />
      )}
    </div>
  )
}
