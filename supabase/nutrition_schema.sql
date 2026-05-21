-- ============================================================
-- ForgeIQ — Module Nutrition
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Bibliothèque d'aliments (open food facts + IA + manual)
CREATE TABLE IF NOT EXISTS foods_library (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  name_fr       TEXT,
  brand         TEXT,
  barcode       TEXT UNIQUE,
  -- Macros pour 100g
  calories      FLOAT,
  protein_g     FLOAT,
  carbs_g       FLOAT,
  fat_g         FLOAT,
  fiber_g       FLOAT,
  sugar_g       FLOAT,
  sodium_mg     FLOAT,
  -- Métadonnées
  source        TEXT DEFAULT 'manual' CHECK (source IN ('openfoodfacts', 'ai_photo', 'manual')),
  image_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index barcode pour lookup rapide
CREATE INDEX IF NOT EXISTS foods_library_barcode_idx ON foods_library(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS foods_library_name_idx ON foods_library USING gin(to_tsvector('french', coalesce(name_fr, name)));

-- Journal alimentaire journalier
CREATE TABLE IF NOT EXISTS food_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users NOT NULL,
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type   TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) DEFAULT 'snack',
  -- Aliment (soit depuis la bibliothèque, soit saisi manuellement)
  food_id     UUID REFERENCES foods_library(id) ON DELETE SET NULL,
  food_name   TEXT NOT NULL,
  -- Quantité et macros calculés
  quantity_g  FLOAT NOT NULL DEFAULT 100,
  calories    FLOAT,
  protein_g   FLOAT,
  carbs_g     FLOAT,
  fat_g       FLOAT,
  fiber_g     FLOAT,
  -- Source (scan, photo, search, manual)
  source      TEXT DEFAULT 'manual' CHECK (source IN ('barcode', 'photo', 'search', 'manual')),
  -- Photo originale si analyse IA (URL Supabase Storage)
  photo_url   TEXT,
  -- Note IA si estimation (ex: "Estimation basée sur la photo")
  ai_note     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS food_logs_user_date_idx ON food_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS food_logs_user_meal_idx ON food_logs(user_id, log_date, meal_type);

-- RLS — chaque user ne voit que ses propres logs
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "food_logs_select" ON food_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "food_logs_insert" ON food_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "food_logs_update" ON food_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "food_logs_delete" ON food_logs FOR DELETE USING (auth.uid() = user_id);

-- foods_library est publique en lecture (pas de données privées)
ALTER TABLE foods_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "foods_library_public_read" ON foods_library FOR SELECT USING (true);
CREATE POLICY "foods_library_insert" ON foods_library FOR INSERT WITH CHECK (true);

-- Vue agrégée : totaux journaliers par user
CREATE OR REPLACE VIEW daily_nutrition_totals AS
SELECT
  user_id,
  log_date,
  ROUND(SUM(calories)::numeric, 1)   AS total_calories,
  ROUND(SUM(protein_g)::numeric, 1)  AS total_protein_g,
  ROUND(SUM(carbs_g)::numeric, 1)    AS total_carbs_g,
  ROUND(SUM(fat_g)::numeric, 1)      AS total_fat_g,
  ROUND(SUM(fiber_g)::numeric, 1)    AS total_fiber_g,
  COUNT(*)                            AS entries_count
FROM food_logs
GROUP BY user_id, log_date;
