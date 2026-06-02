-- ============================================================
-- Migration : correction des slugs exercices dans les programmes
-- Exécuter dans Supabase SQL Editor
-- Date : 2026-06-01
-- ============================================================
--
-- Problème : seed_programs_v2.sql utilise des slugs qui ne correspondent
-- pas aux slugs de exercises_library.
-- Résultat : le logger de séance ne trouve pas les exercices → séances vides.
--
-- Correspondances corrigées :
--   chest-press-machine               → machine-chest-press
--   chest-press-hammer-strength       → machine-chest-press
--   shoulder-press-machine            → machine-shoulder-press
--   shoulder-press-hammer-strength    → machine-shoulder-press
--   incline-chest-press-hammer-strength → incline-barbell-bench-press
--   iso-lateral-row-hammer-strength   → seated-cable-row
--   squat                             → barbell-back-squat
--   bench-press                       → barbell-bench-press
--   overhead-press                    → barbell-overhead-press
--   hip-thrust                        → barbell-hip-thrust
--   overhead-tricep-extension         → cable-overhead-tricep-extension
--   cable-tricep-pushdown             → tricep-pushdown
--   cable-rear-delt-fly               → rear-delt-fly
--   cable-curl                        → barbell-curl
--   concentration-curl                → dumbbell-curl
--   incline-dumbbell-press            → incline-barbell-bench-press
--   incline-dumbbell-row              → incline-barbell-row
--   lying-leg-curl                    → leg-curl
--   nordic-hamstring                  → nordic-curl
--   standing-calf-raise               → calf-raise
--   seated-calf-raise                 → seated-calf-raise-machine
-- ============================================================

UPDATE programs
SET structure = (
  replace(replace(replace(replace(replace(replace(replace(replace(
  replace(replace(replace(replace(replace(replace(replace(replace(
  replace(replace(replace(replace(replace(
    structure::text,
    '"slug": "chest-press-machine"',               '"slug": "machine-chest-press"'),
    '"slug": "chest-press-hammer-strength"',        '"slug": "machine-chest-press"'),
    '"slug": "shoulder-press-machine"',             '"slug": "machine-shoulder-press"'),
    '"slug": "shoulder-press-hammer-strength"',     '"slug": "machine-shoulder-press"'),
    '"slug": "incline-chest-press-hammer-strength"','"slug": "incline-barbell-bench-press"'),
    '"slug": "iso-lateral-row-hammer-strength"',    '"slug": "seated-cable-row"'),
    '"slug": "squat"',                              '"slug": "barbell-back-squat"'),
    '"slug": "bench-press"',                        '"slug": "barbell-bench-press"'),
    '"slug": "overhead-press"',                     '"slug": "barbell-overhead-press"'),
    '"slug": "hip-thrust"',                         '"slug": "barbell-hip-thrust"'),
    '"slug": "overhead-tricep-extension"',           '"slug": "cable-overhead-tricep-extension"'),
    '"slug": "cable-tricep-pushdown"',              '"slug": "tricep-pushdown"'),
    '"slug": "cable-rear-delt-fly"',                '"slug": "rear-delt-fly"'),
    '"slug": "cable-curl"',                         '"slug": "barbell-curl"'),
    '"slug": "concentration-curl"',                 '"slug": "dumbbell-curl"'),
    '"slug": "incline-dumbbell-press"',             '"slug": "incline-barbell-bench-press"'),
    '"slug": "incline-dumbbell-row"',               '"slug": "incline-barbell-row"'),
    '"slug": "lying-leg-curl"',                     '"slug": "leg-curl"'),
    '"slug": "nordic-hamstring"',                   '"slug": "nordic-curl"'),
    '"slug": "standing-calf-raise"',                '"slug": "calf-raise"'),
    '"slug": "seated-calf-raise"',                  '"slug": "seated-calf-raise-machine"')
)::jsonb
WHERE is_custom = false
  AND structure IS NOT NULL;

-- Vérification : affiche les slugs uniques restants dans tous les programmes
-- pour s'assurer qu'il ne reste pas de slugs incorrects
SELECT DISTINCT slug_val
FROM programs,
  jsonb_path_query(structure, '$.sessions[*].exercises[*].by_tier.*.slug') AS slug_val
WHERE is_custom = false
ORDER BY slug_val;
