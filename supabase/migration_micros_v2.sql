-- ════════════════════════════════════════════════════════════
-- Micronutriments étendus v2 (vs Yazio) — 6 nutriments de plus
-- ════════════════════════════════════════════════════════════
-- Données capturées depuis OpenFoodFacts au scan (unités : OFF stocke en
-- grammes → converties en mg/mcg côté API). Colonnes vides pour les aliments
-- du seed local tant qu'ils ne sont pas re-seedés — le scan les remplit.
--
-- À exécuter dans Supabase SQL Editor AVANT de déployer le code v2.

ALTER TABLE foods_library
  ADD COLUMN IF NOT EXISTS vitamin_a_mcg   NUMERIC,   -- rétinol/DRI 900 mcg
  ADD COLUMN IF NOT EXISTS vitamin_b6_mg   NUMERIC,   -- DRI 1.7 mg
  ADD COLUMN IF NOT EXISTS vitamin_b9_mcg  NUMERIC,   -- folates / DRI 400 mcg
  ADD COLUMN IF NOT EXISTS vitamin_b12_mcg NUMERIC,   -- DRI 2.4 mcg
  ADD COLUMN IF NOT EXISTS vitamin_e_mg    NUMERIC,   -- DRI 15 mg
  ADD COLUMN IF NOT EXISTS phosphorus_mg   NUMERIC;   -- DRI 700 mg

ALTER TABLE food_logs
  ADD COLUMN IF NOT EXISTS vitamin_a_mcg   NUMERIC,
  ADD COLUMN IF NOT EXISTS vitamin_b6_mg   NUMERIC,
  ADD COLUMN IF NOT EXISTS vitamin_b9_mcg  NUMERIC,
  ADD COLUMN IF NOT EXISTS vitamin_b12_mcg NUMERIC,
  ADD COLUMN IF NOT EXISTS vitamin_e_mg    NUMERIC,
  ADD COLUMN IF NOT EXISTS phosphorus_mg   NUMERIC;
