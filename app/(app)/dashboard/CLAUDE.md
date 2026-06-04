# Agent DASHBOARD — ForgeIQ
> Contexte limité à ce module. Ne pas charger les autres modules.
> Référence archi globale : /CLAUDE.md

## Fichiers autorisés
- `app/(app)/dashboard/**`
- `components/dashboard/**`
  - UpgradeBanner.tsx (post-Stripe success/cancelled)
  - ProBanner.tsx (free users → upgrade)
  - VolumeHebdoWidget.tsx
  - CancelWorkoutButton.tsx
- `components/ui/AlertBar.tsx`
- `components/ui/StatCard.tsx`
- `components/ui/ProgressBar.tsx`
- `app/api/suggest-workout/route.ts`
- `lib/utils/tdee.ts` (calcDailyTarget — lecture seule)

## Tables lues (lecture seule pour KPIs)
- `profiles` — subscription_status, is_admin, goal, steps_goal
- `daily_logs` — poids EWMA, sommeil, fatigue, steps, protéines, water_ml
- `workouts` — séance du jour, séances semaine
- `food_logs` — calories/macros du jour
- `personal_records` — PRs récents

## Fonctionnalités du module
- KPIs : poids EWMA, sommeil profond, protéines, steps
- Alertes IA contextuelles (Haiku, cache 4h)
- 4 états séance : programme fait / libre fait / en cours / rien fait
- Widget nutrition (macros du jour, indicateurs repas)
- Widget volume musculaire hebdo (MEV/MAV)
- ProBanner (free users) → CTA upgrade
- UpgradeBanner (post-Stripe retour)

## Règles freemium dashboard
- ProBanner affiché si subscription_status = 'free' ET is_admin = false
- Admin bypass tout (is_admin = true → pas de banner)

## Règles
- NE PAS charger : nutrition/workout (code), coach, programs, auth
- Le dashboard est READ-ONLY — ne jamais écrire depuis ce module
- TDEE : utiliser calcDailyTarget() depuis lib/utils/tdee.ts uniquement
