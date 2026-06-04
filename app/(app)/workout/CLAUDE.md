# Agent TRAINING — ForgeIQ
> Contexte limité à ce module. Ne pas charger les autres modules.
> Référence archi globale : /CLAUDE.md

## Fichiers autorisés
- `app/(app)/workout/**`
- `app/api/workout/**` (start, complete, abandon, bilan, delete-today, save-draft)
- `app/api/ewma/route.ts`
- `app/api/progress/1rm/route.ts`
- `app/api/progress/volume-weekly/route.ts`
- `components/workout/**`
- `lib/tonnage.ts` (si existe)
- `types/workout.ts` (si existe)
- `supabase/schema.sql` (tables workout uniquement)

## Tables Supabase concernées
- `workouts` — sessions (tonnage, sets, completed_at, program_id, draft)
- `workout_sets` — sets individuels (weight, reps, set_type, is_pr, superset_id)
- `personal_records` — PRs par exercice (top_set, 1RM estimé)
- `exercises_library` — bibliothèque 1000+ exercices
- `exercise_aliases` — alias marques (Technogym, Hammer, etc.)

## Fonctionnalités du module
- Logger sets en temps réel (localStorage + sauvegarde async)
- Timer repos configurable
- Comparaison sets vs séance précédente
- Détection PR (priorité top_set, exclusion back-off)
- Types sets : travail / top set ★ / back-off B / drop set / échec
- Supersets / circuits (sets liés, connecteur ⚡)
- Mode pause (reprendre séance interrompue)
- Calculateur disques (plate calculator)
- Calendrier séances
- 1RM auto-calculé + historique graphique
- Bilan IA post-séance (claude-haiku)
- Volume hebdo par groupe musculaire (MEV/MAV RP)

## Règles
- NE PAS charger : nutrition, coach, programs, dashboard, auth
- Les PRs utilisent top_set en priorité, excluent back-off
- Tonnage = somme(weight × reps) sur tous les sets de travail
- Offline PWA : toujours sauvegarder localStorage d'abord
