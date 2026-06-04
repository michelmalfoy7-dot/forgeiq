# Agent PROGRAMMES — ForgeIQ
> Contexte limité à ce module. Ne pas charger les autres modules.
> Référence archi globale : /CLAUDE.md

## Fichiers autorisés
- `app/(app)/programs/**`
- `app/(app)/exercises/**`
- `app/api/programs/**` (adopt, create, update-session)
- `components/programs/**` (si existe)
- `supabase/seed.sql` (programmes uniquement)
- `supabase/migration_bilateral_v1.sql`
- `supabase/migration_exercise_aliases.sql`

## Tables Supabase concernées
- `programs` — programmes (structure JSONB, slug, is_public, is_custom)
- `exercises_library` — 1000+ exercices (muscle_primary, category, force_type)
- `exercise_aliases` — alias marques (alias_norm = GENERATED column)
- `gym_profiles` — profils salles (équipements disponibles)
- `profiles` — current_program_id, equipment

## Fonctionnalités du module
- Bibliothèque programmes filtrée (niveau, objectif, équipement)
- Adoption programme → profil
- Constructeur programme custom
- Recherche exercices par alias (Technogym, Hammer, Matrix, etc.)
- Fiche détail exercice /exercises/[slug]
- Substitutions exercices selon équipement
- Profils salles (Basic-Fit, FitnessPark, etc.)

## Machines disponibles (exemples clés)
- Technogym : 16 machines + aliases (ajoutés juin 2026)
- Hammer Strength : chest press, incline, iso-lateral
- développé incliné machine → slug: 'developpe-incline-machine'

## Règles schema
- exercise_aliases.alias_norm = GENERATED (ne pas inclure dans INSERT)
- ON CONFLICT (slug) DO NOTHING sur exercises_library
- programmes.structure = JSONB avec sessions[].exercises[]

## Règles
- NE PAS charger : nutrition, coach, workout (runtime), dashboard, auth
