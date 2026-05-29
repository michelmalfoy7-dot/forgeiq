-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : ajout 3 exercices unilatéraux manquants + marquage is_unilateral
-- Exécuter dans Supabase SQL Editor APRÈS migration_unilateral_v2.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Insérer les exercices manquants ─────────────────────────────────────────

INSERT INTO exercises_library
  (name, name_fr, slug, muscle_primary, muscle_secondary, equipment, category, force_type, difficulty, is_system, is_unilateral)
VALUES
  -- Oiseau Poulie Basse Unilatéral (rear delt / face pull variation)
  ('Rear Delt Cable Fly Unilateral',
   'Oiseau Poulie Basse Unilatéral',
   'oiseau-poulie-basse-unilateral',
   ARRAY['rear_delt'],
   ARRAY['lateral_delt', 'trapezius'],
   'cable', 'isolation', 'pull', 2, TRUE, TRUE),

  -- Tirage Vertical Unilatéral Câble (lat pulldown 1 bras)
  ('Cable Lat Pulldown Unilateral',
   'Tirage Vertical Unilatéral Câble',
   'tirage-vertical-unilateral-cable',
   ARRAY['latissimus'],
   ARRAY['biceps', 'rear_delt'],
   'cable', 'compound', 'pull', 2, TRUE, TRUE),

  -- Élévation Latérale Câble Unilatéral (déjà dans nutrition_favorites_recipes.sql
  --  mais avec slug différent — ajout en sécurité)
  ('Cable Lateral Raise Unilateral',
   'Élévation Latérale Câble Unilatéral',
   'elevation-laterale-cable-unilateral',
   ARRAY['lateral_delt'],
   ARRAY['front_delt'],
   'cable', 'isolation', 'push', 2, TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE
  SET is_unilateral = TRUE,
      name_fr = EXCLUDED.name_fr;

-- ── Vérification ─────────────────────────────────────────────────────────────
SELECT slug, name_fr, is_unilateral
FROM exercises_library
WHERE slug IN (
  'oiseau-poulie-basse-unilateral',
  'tirage-vertical-unilateral-cable',
  'elevation-laterale-cable-unilateral'
)
ORDER BY slug;
