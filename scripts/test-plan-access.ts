/**
 * Test script — vérifie que les fonctions plan.ts couvrent tous les cas d'accès.
 * Usage: npx tsx scripts/test-plan-access.ts
 */

import {
  isRealProUser,
  isLifetimeUser,
  isReferralTrial,
  referralDaysLeft,
  isProUser,
  isFreeUser,
  type ProfileForPlan,
} from '../lib/utils/plan'

const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

const profiles: { label: string; profile: ProfileForPlan; expect: Record<string, boolean> }[] = [
  {
    label: 'Pro actif (mensuel)',
    profile: { subscription_status: 'pro', subscription_plan: 'monthly', is_admin: false, referral_pro_until: null },
    expect: { isRealPro: true, isLifetime: false, isReferral: false, isPro: true, isFree: false },
  },
  {
    label: 'Lifetime via status',
    profile: { subscription_status: 'lifetime', subscription_plan: 'lifetime', is_admin: false, referral_pro_until: null },
    expect: { isRealPro: true, isLifetime: true, isReferral: false, isPro: true, isFree: false },
  },
  {
    label: 'Lifetime via plan seul (edge case webhook)',
    profile: { subscription_status: 'free', subscription_plan: 'lifetime', is_admin: false, referral_pro_until: null },
    expect: { isRealPro: true, isLifetime: true, isReferral: false, isPro: true, isFree: false },
  },
  {
    label: 'Admin sans abonnement',
    profile: { subscription_status: 'free', subscription_plan: null, is_admin: true, referral_pro_until: null },
    expect: { isRealPro: true, isLifetime: false, isReferral: false, isPro: true, isFree: false },
  },
  {
    label: 'Referral actif (trial en cours)',
    profile: { subscription_status: 'free', subscription_plan: null, is_admin: false, referral_pro_until: tomorrow },
    expect: { isRealPro: false, isLifetime: false, isReferral: true, isPro: true, isFree: false },
  },
  {
    label: 'Referral expiré',
    profile: { subscription_status: 'free', subscription_plan: null, is_admin: false, referral_pro_until: lastWeek },
    expect: { isRealPro: false, isLifetime: false, isReferral: false, isPro: false, isFree: true },
  },
  {
    label: 'Free pur',
    profile: { subscription_status: 'free', subscription_plan: null, is_admin: false, referral_pro_until: null },
    expect: { isRealPro: false, isLifetime: false, isReferral: false, isPro: false, isFree: true },
  },
  {
    label: 'Null profile',
    profile: null as unknown as ProfileForPlan,
    expect: { isRealPro: false, isLifetime: false, isReferral: false, isPro: false, isFree: true },
  },
]

let passed = 0
let failed = 0

for (const { label, profile, expect: exp } of profiles) {
  const results = {
    isRealPro: isRealProUser(profile),
    isLifetime: isLifetimeUser(profile),
    isReferral: isReferralTrial(profile),
    isPro: isProUser(profile),
    isFree: isFreeUser(profile),
  }

  const errors: string[] = []
  for (const [key, expected] of Object.entries(exp)) {
    const actual = results[key as keyof typeof results]
    if (actual !== expected) {
      errors.push(`  ${key}: expected ${expected}, got ${actual}`)
    }
  }

  if (errors.length === 0) {
    console.log(`✅ ${label}`)
    passed++
  } else {
    console.log(`❌ ${label}`)
    errors.forEach(e => console.log(e))
    failed++
  }
}

// Test referralDaysLeft
const daysLeft = referralDaysLeft({ subscription_status: 'free', referral_pro_until: tomorrow })
if (daysLeft >= 1 && daysLeft <= 2) {
  console.log(`✅ referralDaysLeft (referral actif) = ${daysLeft}`)
  passed++
} else {
  console.log(`❌ referralDaysLeft (referral actif) = ${daysLeft}, expected 1-2`)
  failed++
}

const daysLeftExpired = referralDaysLeft({ subscription_status: 'free', referral_pro_until: lastWeek })
if (daysLeftExpired === 0) {
  console.log(`✅ referralDaysLeft (expiré) = 0`)
  passed++
} else {
  console.log(`❌ referralDaysLeft (expiré) = ${daysLeftExpired}, expected 0`)
  failed++
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
