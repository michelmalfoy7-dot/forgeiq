-- ============================================================
-- ForgeIQ — Recettes : colonnes micronutriments
-- Ajoute les 7 colonnes micro à recipes + recipe_ingredients
-- pour aligner sur foods_library / food_logs (Sprint 6)
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS iron_mg_per_serving       numeric(8,4),
  ADD COLUMN IF NOT EXISTS magnesium_mg_per_serving  numeric(8,4),
  ADD COLUMN IF NOT EXISTS zinc_mg_per_serving       numeric(8,4),
  ADD COLUMN IF NOT EXISTS calcium_mg_per_serving    numeric(8,4),
  ADD COLUMN IF NOT EXISTS potassium_mg_per_serving  numeric(8,4),
  ADD COLUMN IF NOT EXISTS vitamin_c_mg_per_serving  numeric(8,4),
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg_per_serving numeric(8,4);

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS iron_mg_per_100g       numeric(8,4),
  ADD COLUMN IF NOT EXISTS magnesium_mg_per_100g  numeric(8,4),
  ADD COLUMN IF NOT EXISTS zinc_mg_per_100g       numeric(8,4),
  ADD COLUMN IF NOT EXISTS calcium_mg_per_100g    numeric(8,4),
  ADD COLUMN IF NOT EXISTS potassium_mg_per_100g  numeric(8,4),
  ADD COLUMN IF NOT EXISTS vitamin_c_mg_per_100g  numeric(8,4),
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg_per_100g numeric(8,4);

SELECT 'recipes micro columns added' AS status;
