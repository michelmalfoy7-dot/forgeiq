-- ──────────────────────────────────────────────────────────────────────
-- Photos de progression — ForgeIQ
-- Opt-in uniquement. Données entièrement privées (RLS strict).
-- À coller dans Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────────

-- Table
CREATE TABLE IF NOT EXISTS progress_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  storage_path    TEXT NOT NULL,           -- Chemin dans Supabase Storage (bucket: progress-photos)
  note            TEXT,                    -- Note optionnelle (ex: "Après 8 semaines de bulk")
  weight_kg       NUMERIC(5,2),            -- Poids du jour (optionnel, pour corrélation)
  is_private      BOOLEAN NOT NULL DEFAULT TRUE, -- Toujours privée par défaut
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS progress_photos_user_date ON progress_photos(user_id, photo_date DESC);

-- RLS
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Politique : chaque utilisateur ne voit et ne modifie QUE ses propres photos
CREATE POLICY "progress_photos_owner_only"
  ON progress_photos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────────────────
-- Storage bucket (à créer manuellement dans Supabase Dashboard)
-- Nom : progress-photos
-- Public : NON (privé)
-- Policies Storage :
--   SELECT : bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]
--   INSERT : bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]
--   DELETE : bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]
-- ──────────────────────────────────────────────────────────────────────
