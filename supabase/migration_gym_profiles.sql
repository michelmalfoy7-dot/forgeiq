-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION : Table gym_equipment_profiles + colonne gym_id dans profiles
-- Coller dans Supabase SQL Editor et exécuter
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Table gym_equipment_profiles ──────────────────────────────────
CREATE TABLE IF NOT EXISTS gym_equipment_profiles (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT         NOT NULL UNIQUE,
  name         TEXT         NOT NULL,
  tier         TEXT         NOT NULL CHECK (tier IN ('premium', 'standard', 'home')),
  description  TEXT,
  features     TEXT[]       DEFAULT '{}',
  logo_emoji   TEXT         DEFAULT '🏋️',
  sort_order   INT          DEFAULT 99,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Lecture publique (pas de données sensibles)
ALTER TABLE gym_equipment_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read gym profiles" ON gym_equipment_profiles;
CREATE POLICY "Public read gym profiles" ON gym_equipment_profiles FOR SELECT USING (true);

-- ── 2. Données gym ───────────────────────────────────────────────────
-- tier premium  → Hammer Strength + cable stations premium
-- tier standard → Câbles + machines guidées + haltères standards
-- tier home     → Haltères / barre / élastiques
INSERT INTO gym_equipment_profiles
  (slug, name, tier, description, features, logo_emoji, sort_order)
VALUES
  ('fitness-park',
   'Fitness Park',
   'premium',
   'Machines Hammer Strength + Technogym haut de gamme + stations câbles',
   ARRAY['hammer_strength','technogym','cable_station','functional_trainer','plate_loaded'],
   '🔩', 1),

  ('on-air',
   'On Air Fitness',
   'premium',
   'Life Fitness + Hammer Strength, espaces fonctionnels premium',
   ARRAY['hammer_strength','life_fitness','cable_station','plate_loaded'],
   '🌬️', 2),

  ('basic-fit',
   'Basic-Fit',
   'standard',
   'Réseau European #1, machines Life Fitness, câbles, zones libres',
   ARRAY['cable_station','plate_loaded','dumbbells','cardio'],
   '🔵', 3),

  ('keep-cool',
   'Keep Cool',
   'standard',
   'Salle premium accessible, Technogym, espaces bien équipés',
   ARRAY['technogym','cable_station','plate_loaded','dumbbells'],
   '❄️', 4),

  ('neoness',
   'Neoness',
   'standard',
   'Salle tendance Paris, équipement mixte de qualité',
   ARRAY['cable_station','plate_loaded','dumbbells'],
   '🌀', 5),

  ('lappart',
   'L''Appart Fitness',
   'standard',
   'Réseau national, bon rapport qualité-prix, câbles + machines',
   ARRAY['cable_station','plate_loaded','dumbbells'],
   '🏠', 6),

  ('orange-bleue',
   'Orange Bleue',
   'standard',
   'Réseau français, équipement standard complet',
   ARRAY['cable_station','plate_loaded','dumbbells','cardio'],
   '🟠', 7),

  ('home-advanced',
   'Domicile équipé',
   'home',
   'Barre olympique + haltères + barre de traction + éventuellement poulie',
   ARRAY['barbell','dumbbells','pull_up_bar','resistance_bands'],
   '🏡', 8),

  ('home-basic',
   'Domicile basique',
   'home',
   'Haltères ajustables + élastiques de résistance',
   ARRAY['dumbbells','resistance_bands'],
   '🎽', 9)
ON CONFLICT (slug) DO UPDATE
  SET name        = EXCLUDED.name,
      tier        = EXCLUDED.tier,
      description = EXCLUDED.description,
      features    = EXCLUDED.features,
      logo_emoji  = EXCLUDED.logo_emoji,
      sort_order  = EXCLUDED.sort_order;

-- ── 3. Colonne gym_id dans profiles ──────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gym_id UUID
    REFERENCES gym_equipment_profiles(id)
    ON DELETE SET NULL;
