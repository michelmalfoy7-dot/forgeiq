-- ============================================================
-- Migration v1 : is_bilateral_dumbbell + is_unilateral + Smith
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Ajouter les colonnes si elles n'existent pas
ALTER TABLE exercises_library
  ADD COLUMN IF NOT EXISTS is_bilateral_dumbbell BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_unilateral BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Mettre à jour l'enum equipment pour inclure 'smith'
-- Note : si equipment est un CHECK constraint, on le modifie
ALTER TABLE exercises_library
  DROP CONSTRAINT IF EXISTS exercises_library_equipment_check;

ALTER TABLE exercises_library
  ADD CONSTRAINT exercises_library_equipment_check
  CHECK (equipment IN ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell', 'smith'));

-- ============================================================
-- 3. Marquer les exercices bilatéraux haltères existants
-- ============================================================
UPDATE exercises_library SET is_bilateral_dumbbell = TRUE
WHERE is_system = TRUE AND (
  slug IN (
    'developpe-couche-halteres',
    'developpe-incline-halteres',
    'developpe-decline-halteres',
    'developpe-militaire-halteres',
    'arnold-press',
    'ecarte-halteres',
    'ecarte-incline-halteres',
    'ecarte-decline-halteres',
    'curl-halteres',
    'curl-marteau',
    'curl-marteau-halteres',
    'elevation-laterale-halteres',
    'elevation-frontale-halteres',
    'oiseau-halteres',
    'pullover-halteres',
    'extension-triceps-halteres',
    'rowing-halteres-bilatéral',
    'shrug-halteres'
  )
  OR (
    (name ILIKE '%haltère%' OR name ILIKE '%halteres%' OR name_fr ILIKE '%haltère%' OR name_fr ILIKE '%haltères%')
    AND equipment = 'dumbbell'
    AND category = 'compound'
    AND name_fr NOT ILIKE '%unilatéral%'
    AND name_fr NOT ILIKE '%unilatér%'
    AND name NOT ILIKE '%unilateral%'
    AND name NOT ILIKE '%single%'
    AND name NOT ILIKE '%one arm%'
    AND name NOT ILIKE '%one-arm%'
  )
);

-- ============================================================
-- 4. Marquer les exercices unilatéraux câble
-- ============================================================
UPDATE exercises_library SET is_unilateral = TRUE
WHERE is_system = TRUE AND (
  slug IN (
    'curl-poulie-unilateral',
    'kickback-cable-unilateral',
    'rowing-cable-unilateral',
    'elevation-laterale-cable-unilateral',
    'katana-cable',
    'extension-triceps-cable-unilateral'
  )
  OR (
    equipment = 'cable'
    AND (
      name ILIKE '%unilateral%'
      OR name ILIKE '%one arm%'
      OR name ILIKE '%single%'
      OR name_fr ILIKE '%unilatéral%'
    )
  )
);

-- ============================================================
-- 5. Nouveaux exercices — Haltères manquants
-- ============================================================
INSERT INTO exercises_library (name, name_fr, slug, muscle_primary, muscle_secondary, equipment, category, force_type, difficulty, is_system, is_bilateral_dumbbell)
VALUES
  ('Incline Dumbbell Press', 'Développé Incliné Haltères', 'developpe-incline-halteres',
   ARRAY['chest','front_delt'], ARRAY['triceps'], 'dumbbell', 'compound', 'push', 2, TRUE, TRUE),
  ('Decline Dumbbell Press', 'Développé Décliné Haltères', 'developpe-decline-halteres',
   ARRAY['chest'], ARRAY['triceps','front_delt'], 'dumbbell', 'compound', 'push', 3, TRUE, TRUE),
  ('Dumbbell Shoulder Press', 'Développé Militaire Haltères', 'developpe-militaire-halteres',
   ARRAY['front_delt','lateral_delt'], ARRAY['triceps'], 'dumbbell', 'compound', 'push', 2, TRUE, TRUE),
  ('Arnold Press', 'Arnold Press', 'arnold-press',
   ARRAY['front_delt','lateral_delt'], ARRAY['triceps','rear_delt'], 'dumbbell', 'compound', 'push', 3, TRUE, TRUE),
  ('Incline Dumbbell Fly', 'Écarté Incliné Haltères', 'ecarte-incline-halteres',
   ARRAY['chest'], ARRAY['front_delt'], 'dumbbell', 'isolation', 'push', 2, TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  is_bilateral_dumbbell = EXCLUDED.is_bilateral_dumbbell,
  muscle_primary = EXCLUDED.muscle_primary,
  muscle_secondary = EXCLUDED.muscle_secondary;

-- ============================================================
-- 6. Nouveaux exercices — Smith Machine
-- ============================================================
INSERT INTO exercises_library (name, name_fr, slug, muscle_primary, muscle_secondary, equipment, category, force_type, difficulty, is_system, is_bilateral_dumbbell)
VALUES
  ('Smith Machine Bench Press', 'Développé Couché Smith', 'developpe-couche-smith',
   ARRAY['chest'], ARRAY['triceps','front_delt'], 'smith', 'compound', 'push', 1, TRUE, FALSE),
  ('Smith Machine Incline Press', 'Développé Incliné Smith', 'developpe-incline-smith',
   ARRAY['chest','front_delt'], ARRAY['triceps'], 'smith', 'compound', 'push', 1, TRUE, FALSE),
  ('Smith Machine Decline Press', 'Développé Décliné Smith', 'developpe-decline-smith',
   ARRAY['chest'], ARRAY['triceps'], 'smith', 'compound', 'push', 1, TRUE, FALSE),
  ('Smith Machine Shoulder Press', 'Développé Militaire Smith', 'developpe-militaire-smith',
   ARRAY['front_delt','lateral_delt'], ARRAY['triceps'], 'smith', 'compound', 'push', 1, TRUE, FALSE),
  ('Smith Machine Squat', 'Squat Smith', 'squat-smith',
   ARRAY['quadriceps'], ARRAY['glutes','hamstrings'], 'smith', 'compound', 'legs', 1, TRUE, FALSE),
  ('Smith Machine Lunge', 'Fente Smith', 'fente-smith',
   ARRAY['quadriceps','glutes'], ARRAY['hamstrings'], 'smith', 'compound', 'legs', 2, TRUE, FALSE),
  ('Smith Machine Hip Thrust', 'Hip Thrust Smith', 'hip-thrust-smith',
   ARRAY['glutes'], ARRAY['hamstrings'], 'smith', 'compound', 'legs', 1, TRUE, FALSE),
  ('Smith Machine Shrug', 'Shrug Smith', 'shrug-smith',
   ARRAY['trapezius'], ARRAY[]::text[], 'smith', 'isolation', 'pull', 1, TRUE, FALSE),
  ('Smith Machine Romanian Deadlift', 'Soulevé de Terre Roumain Smith', 'sdt-roumain-smith',
   ARRAY['hamstrings','glutes'], ARRAY['lower_back'], 'smith', 'compound', 'pull', 2, TRUE, FALSE),
  ('Smith Machine Bent-Over Row', 'Rowing Penché Smith', 'rowing-penche-smith',
   ARRAY['lats','mid_back'], ARRAY['biceps','rear_delt'], 'smith', 'compound', 'pull', 2, TRUE, FALSE)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 7. Exercices câble unilatéraux
-- ============================================================
INSERT INTO exercises_library (name, name_fr, slug, muscle_primary, muscle_secondary, equipment, category, force_type, difficulty, is_system, is_bilateral_dumbbell, is_unilateral)
VALUES
  ('Cable Lateral Raise Unilateral', 'Élévation Latérale Câble Unilatéral', 'elevation-laterale-cable-unilateral',
   ARRAY['lateral_delt'], ARRAY['front_delt','rear_delt'], 'cable', 'isolation', 'push', 2, TRUE, FALSE, TRUE),
  ('Cable Curl Unilateral', 'Curl Poulie Unilatéral', 'curl-poulie-unilateral',
   ARRAY['biceps'], ARRAY['brachialis'], 'cable', 'isolation', 'pull', 1, TRUE, FALSE, TRUE),
  ('Cable Triceps Kickback Unilateral', 'Kickback Câble Unilatéral', 'kickback-cable-unilateral',
   ARRAY['triceps'], ARRAY[]::text[], 'cable', 'isolation', 'push', 2, TRUE, FALSE, TRUE),
  ('Cable Row Unilateral', 'Rowing Câble Unilatéral', 'rowing-cable-unilateral',
   ARRAY['lats','mid_back'], ARRAY['biceps','rear_delt'], 'cable', 'compound', 'pull', 2, TRUE, FALSE, TRUE),
  ('Cable Katana', 'Katana Câble', 'katana-cable',
   ARRAY['lateral_delt','rear_delt'], ARRAY['trapezius'], 'cable', 'isolation', 'push', 3, TRUE, FALSE, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 8. Vérification rapide
-- ============================================================
SELECT
  COUNT(*) FILTER (WHERE is_bilateral_dumbbell) AS bilateral_count,
  COUNT(*) FILTER (WHERE is_unilateral) AS unilateral_count,
  COUNT(*) FILTER (WHERE equipment = 'smith') AS smith_count,
  COUNT(*) AS total
FROM exercises_library WHERE is_system = TRUE;
