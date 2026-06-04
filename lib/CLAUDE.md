# Agent CORE — ForgeIQ
> Fonctions partagées entre tous les modules.
> Référence archi globale : /CLAUDE.md

## Fichiers autorisés
- `lib/**`
- `types/**`
- `middleware.ts`
- `app/layout.tsx`
- `app/(app)/layout.tsx`
- `tailwind.config.ts`
- `app/globals.css`
- `next.config.ts`
- `.env.local` (structure seulement, jamais les valeurs)

## Fonctions clés

### TDEE (SOURCE UNIQUE)
`lib/utils/tdee.ts` → `calcDailyTarget()`
- Appelée depuis : dashboard, nutrition
- NE PAS dupliquer cette logique ailleurs

### Supabase
- `lib/supabase/client.ts` → client-side (use client)
- `lib/supabase/server.ts` → server-side (use server)
- `lib/supabase/middleware.ts` → routes publiques/protégées

### Utils
- `lib/utils/numbers.ts` → formatWeight, round, formatTonnage
- `lib/utils/sleep.ts` → formatSleep, formatSleepShort
- `lib/formatSleep.ts` → alias formatSleep

### PostHog (analytics)
- `lib/posthog.tsx` → lazy import (ne pas charger au LCP)

## Variables d'environnement requises
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY
NEXT_PUBLIC_STRIPE_PRICE_ANNUAL
NEXT_PUBLIC_STRIPE_PRICE_LIFETIME
RESEND_API_KEY
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
```

## Routes publiques (middleware.ts)
`/` `/login` `/register` `/auth/**` `/onboarding`
`/forgot-password` `/install` `/pricing` `/privacy`

## Règles
- Ne jamais dupliquer calcDailyTarget() ou la logique TDEE
- Supabase client = @supabase/ssr (jamais @supabase/supabase-js direct)
- TypeScript strict — pas de `any`
