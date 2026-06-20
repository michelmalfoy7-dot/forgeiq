export type ProfileForPlan = {
  subscription_status?: string | null
  subscription_plan?: string | null
  is_admin?: boolean | null
  referral_pro_until?: string | null
}

export const PLAN_SELECT = 'subscription_status, subscription_plan, is_admin, referral_pro_until' as const

/** Abonnement payant actif (Stripe Pro/Lifetime) ou admin. */
export function isRealProUser(profile: ProfileForPlan | null | undefined): boolean {
  if (!profile) return false
  if (profile.is_admin) return true
  return (
    profile.subscription_status === 'pro' ||
    profile.subscription_status === 'lifetime' ||
    profile.subscription_plan === 'lifetime'
  )
}

/** Lifetime spécifiquement (pour le styling UI). */
export function isLifetimeUser(profile: ProfileForPlan | null | undefined): boolean {
  if (!profile) return false
  return profile.subscription_status === 'lifetime' || profile.subscription_plan === 'lifetime'
}

/** Trial referral en cours (pas encore abonné). */
export function isReferralTrial(profile: ProfileForPlan | null | undefined): boolean {
  if (!profile) return false
  if (isRealProUser(profile)) return false
  if (!profile.referral_pro_until) return false
  return new Date(profile.referral_pro_until + 'T23:59:59') >= new Date()
}

/** Jours restants du trial referral (0 si expiré ou pas de trial). */
export function referralDaysLeft(profile: ProfileForPlan | null | undefined): number {
  if (!isReferralTrial(profile)) return 0
  const until = new Date(profile!.referral_pro_until! + 'T23:59:59')
  return Math.max(0, Math.ceil((until.getTime() - Date.now()) / 86400000))
}

/**
 * Accès Pro complet (features non-coûteuses) :
 * abonné réel OU trial referral valide.
 */
export function isProUser(profile: ProfileForPlan | null | undefined): boolean {
  return isRealProUser(profile) || isReferralTrial(profile)
}

/** Free pur : aucun accès Pro, aucun trial. */
export function isFreeUser(profile: ProfileForPlan | null | undefined): boolean {
  return !isProUser(profile)
}
