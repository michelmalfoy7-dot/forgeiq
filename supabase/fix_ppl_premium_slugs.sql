-- ═══════════════════════════════════════════════════════════════════════
-- FIX : Slugs incorrects dans le PPL Hypertrophie 6× (tier premium)
-- Problème : des exercices machine avaient des slugs barre (barbell)
-- Coller dans Supabase SQL Editor et exécuter
-- ═══════════════════════════════════════════════════════════════════════

-- Push A (day 0, exercise 1) : chest_incline
-- incline-barbell-bench-press → developpe-incline-hammer-strength
UPDATE programs
SET structure = jsonb_set(
  structure,
  '{days,0,exercises,1,by_tier,premium}',
  '{"slug": "developpe-incline-hammer-strength", "name_fr": "Développé Incliné Hammer Strength"}'::jsonb
)
WHERE slug = 'ppl-hypertrophie-6x';

-- Pull A (day 1, exercise 1) : back_horizontal_row
-- seated-cable-row (nommé "Iso-Lateral Row") → rowing-iso-lateral-hammer-strength
UPDATE programs
SET structure = jsonb_set(
  structure,
  '{days,1,exercises,1,by_tier,premium}',
  '{"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing ISO-Latéral Hammer Strength"}'::jsonb
)
WHERE slug = 'ppl-hypertrophie-6x';

-- Pull B (day 4, exercise 0) : back_horizontal_row
-- même fix
UPDATE programs
SET structure = jsonb_set(
  structure,
  '{days,4,exercises,0,by_tier,premium}',
  '{"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing ISO-Latéral Hammer Strength"}'::jsonb
)
WHERE slug = 'ppl-hypertrophie-6x';

-- ── Vérification ─────────────────────────────────────────────────────────────
-- Décommenter pour vérifier les exercices corrigés :
-- SELECT
--   day_idx,
--   ex_idx,
--   ex->'by_tier'->'premium'->>'slug'   AS slug_premium,
--   ex->'by_tier'->'premium'->>'name_fr' AS name_premium
-- FROM programs,
--   jsonb_array_elements(structure->'days') WITH ORDINALITY AS d(day, day_idx),
--   jsonb_array_elements(day->'exercises') WITH ORDINALITY AS e(ex, ex_idx)
-- WHERE slug = 'ppl-hypertrophie-6x'
--   AND ex->'by_tier'->'premium' IS NOT NULL;
