# Agent COACH IA — ForgeIQ
> Contexte limité à ce module. Ne pas charger les autres modules.
> Référence archi globale : /CLAUDE.md

## Fichiers autorisés
- `app/(app)/coach/**`
- `app/api/coach/route.ts`
- `app/api/suggest-workout/route.ts`
- `app/api/workout/bilan/route.ts`
- `components/ui/PaywallModal.tsx`

## Tables Supabase concernées
- `coach_messages` — historique chat (role, content, created_at)
- `profiles` — subscription_status, is_admin, goal, weight_kg
- `daily_logs` — contexte coach (sommeil, fatigue, protéines, steps)
- `workouts` — dernière séance pour contexte
- `personal_records` — PRs injectés dans prompt

## Modèles IA
- Chat coach : `claude-sonnet-4-6` (ou haiku pour alertes)
- Photo repas : `claude-haiku-4-5` (nutrition uniquement)
- Bilan post-séance : `claude-haiku-4-5`
- JAMAIS claude-opus (trop cher)

## Limites par plan
- Free : **5 messages TOTAL à vie** (plus de trial 30j)
- Pro mensuel : 60/mois calendaire
- Pro annuel + Lifetime + is_admin : illimité
- Photo IA : Free = 0 (payant uniquement)

## Paywall
- `PaywallModal` déclenché sur 429/403 (jamais message d'erreur dans le chat)
- trigger="coach" | "photo" | "general"

## Fonctionnalités
- Chat streaming (SSE)
- Contexte injecté : profil + EWMA + sommeil + fatigue + séances + PRs + volume
- Bilan IA post-séance auto
- Suggestions séance adaptatives
- Alertes contextuelles dashboard (cache 4h)

## Règles coach (system prompt)
- Sommeil profond < 60min → volume -15-20%
- Protéines < objectif → mentionner
- Tension SYS > 135 → recommander bilan médical
- Max 3 paragraphes sauf demande explicite
- Jamais mentionner Claude, Anthropic, OpenAI

## Règles
- NE PAS charger : nutrition (sauf contexte macros), workout, programs
