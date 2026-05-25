-- ============================================================
-- ForgeIQ — Nutrition : Favoris + Recettes + Bilatéral
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. exercises_library — colonnes bilatéral/unilatéral + Smith ──

ALTER TABLE exercises_library
  ADD COLUMN IF NOT EXISTS is_bilateral_dumbbell BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_unilateral BOOLEAN NOT NULL DEFAULT FALSE;

-- Étendre l'enum equipment pour accepter 'smith'
ALTER TABLE exercises_library
  DROP CONSTRAINT IF EXISTS exercises_library_equipment_check;
ALTER TABLE exercises_library
  ADD CONSTRAINT exercises_library_equipment_check
  CHECK (equipment IN ('barbell','dumbbell','machine','cable','bodyweight','band','kettlebell','smith'));

-- Marquer les haltères bilatéraux existants
UPDATE exercises_library SET is_bilateral_dumbbell = TRUE
WHERE is_system = TRUE AND equipment = 'dumbbell'
  AND name NOT ILIKE '%unilateral%' AND name NOT ILIKE '%single%' AND name NOT ILIKE '%one arm%' AND name NOT ILIKE '%one-arm%'
  AND name_fr NOT ILIKE '%unilatér%';

-- Nouveaux exercices Smith
INSERT INTO exercises_library (name,name_fr,slug,muscle_primary,muscle_secondary,equipment,category,force_type,difficulty,is_system)
VALUES
  ('Smith Machine Bench Press','Développé Couché Smith','developpe-couche-smith',ARRAY['chest'],ARRAY['triceps','front_delt'],'smith','compound','push',1,TRUE),
  ('Smith Machine Incline Press','Développé Incliné Smith','developpe-incline-smith',ARRAY['chest','front_delt'],ARRAY['triceps'],'smith','compound','push',1,TRUE),
  ('Smith Machine Decline Press','Développé Décliné Smith','developpe-decline-smith',ARRAY['chest'],ARRAY['triceps'],'smith','compound','push',1,TRUE),
  ('Smith Machine Shoulder Press','Développé Militaire Smith','developpe-militaire-smith',ARRAY['front_delt','lateral_delt'],ARRAY['triceps'],'smith','compound','push',1,TRUE),
  ('Smith Machine Squat','Squat Smith','squat-smith',ARRAY['quadriceps'],ARRAY['glutes','hamstrings'],'smith','compound','legs',1,TRUE),
  ('Smith Machine Lunge','Fente Smith','fente-smith',ARRAY['quadriceps','glutes'],ARRAY['hamstrings'],'smith','compound','legs',2,TRUE),
  ('Smith Machine Hip Thrust','Hip Thrust Smith','hip-thrust-smith',ARRAY['glutes'],ARRAY['hamstrings'],'smith','compound','legs',1,TRUE),
  ('Smith Machine Shrug','Shrug Smith','shrug-smith',ARRAY['trapezius'],ARRAY[]::text[],'smith','isolation','pull',1,TRUE),
  ('Smith Machine Romanian Deadlift','Soulevé de Terre Roumain Smith','sdt-roumain-smith',ARRAY['hamstrings','glutes'],ARRAY['lower_back'],'smith','compound','pull',2,TRUE),
  ('Incline Dumbbell Press','Développé Incliné Haltères','developpe-incline-halteres',ARRAY['chest','front_delt'],ARRAY['triceps'],'dumbbell','compound','push',2,TRUE),
  ('Decline Dumbbell Press','Développé Décliné Haltères','developpe-decline-halteres',ARRAY['chest'],ARRAY['triceps','front_delt'],'dumbbell','compound','push',3,TRUE),
  ('Dumbbell Shoulder Press','Développé Militaire Haltères','developpe-militaire-halteres',ARRAY['front_delt','lateral_delt'],ARRAY['triceps'],'dumbbell','compound','push',2,TRUE),
  ('Arnold Press','Arnold Press','arnold-press',ARRAY['front_delt','lateral_delt'],ARRAY['triceps','rear_delt'],'dumbbell','compound','push',3,TRUE),
  ('Incline Dumbbell Fly','Écarté Incliné Haltères','ecarte-incline-halteres',ARRAY['chest'],ARRAY['front_delt'],'dumbbell','isolation','push',2,TRUE),
  ('Cable Lateral Raise Unilateral','Élévation Latérale Câble Unilatéral','elevation-laterale-cable-unilateral',ARRAY['lateral_delt'],ARRAY['front_delt'],'cable','isolation','push',2,TRUE)
ON CONFLICT (slug) DO UPDATE SET
  is_bilateral_dumbbell = CASE
    WHEN EXCLUDED.equipment = 'dumbbell' AND EXCLUDED.name NOT ILIKE '%unilateral%' AND EXCLUDED.name NOT ILIKE '%single%' THEN TRUE
    ELSE FALSE
  END;

-- ── 2. food_favorites — aliments favoris par utilisateur ──────

CREATE TABLE IF NOT EXISTS food_favorites (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_name      text NOT NULL,
  food_id        uuid,                    -- référence foods_library si connu
  brand          text,
  calories_per_100g   numeric(8,2),
  protein_per_100g    numeric(8,2),
  carbs_per_100g      numeric(8,2),
  fat_per_100g        numeric(8,2),
  fiber_per_100g      numeric(8,2),
  default_quantity_g  integer DEFAULT 100,
  use_count      integer DEFAULT 0,       -- pour trier par fréquence
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE food_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_own" ON food_favorites FOR ALL USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS food_favorites_user_name_idx
  ON food_favorites(user_id, lower(food_name));

-- ── 3. recipes — recettes perso ───────────────────────────────

CREATE TABLE IF NOT EXISTS recipes (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name           text NOT NULL,
  description    text,
  total_servings integer DEFAULT 1,
  -- Macros calculées automatiquement par portion
  calories_per_serving    numeric(8,2),
  protein_per_serving     numeric(8,2),
  carbs_per_serving       numeric(8,2),
  fat_per_serving         numeric(8,2),
  fiber_per_serving       numeric(8,2),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes_own" ON recipes FOR ALL USING (auth.uid() = user_id);

-- ── 4. recipe_ingredients — ingrédients des recettes ──────────

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id      uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  food_name      text NOT NULL,
  food_id        uuid,
  quantity_g     numeric(8,2) NOT NULL,
  calories_per_100g   numeric(8,2),
  protein_per_100g    numeric(8,2),
  carbs_per_100g      numeric(8,2),
  fat_per_100g        numeric(8,2),
  fiber_per_100g      numeric(8,2),
  sort_order     integer DEFAULT 0
);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_ingredients_own" ON recipe_ingredients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
  );

-- ── 5. Vérification ───────────────────────────────────────────
SELECT 'food_favorites' AS table_name, COUNT(*) FROM food_favorites
UNION ALL SELECT 'recipes', COUNT(*) FROM recipes
UNION ALL SELECT 'recipe_ingredients', COUNT(*) FROM recipe_ingredients;
