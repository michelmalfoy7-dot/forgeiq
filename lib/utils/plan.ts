export type ProfileForPlan = {
  subscription_status?: string | null
  is_admin?: boolean | null
  referral_pro_until?: string | null
}

/**
 * Retourne true si l'utilisateur a accès aux fonctionnalités Pro.
 * Sources : abonnement Stripe actif, statut lifetime, admin, ou bonus referral valide.
 */
export function isProUser(profile: ProfileForPlan | null | undefined): boolean {
  if (!profile) return false
  if (profile.is_admin) return true
  if (profile.subscription_status === 'pro' || profile.subscription_status === 'lifetime') return true
  if (profile.referral_pro_until) {
    return new Date(profile.referral_pro_until + 'T23:59:59') >= new Date()
  }
  return false
}
