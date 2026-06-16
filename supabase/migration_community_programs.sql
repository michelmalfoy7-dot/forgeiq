-- Sprint 16 — Community templates
ALTER TABLE programs ADD COLUMN IF NOT EXISTS adopted_count INTEGER DEFAULT 0;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS community_published_at TIMESTAMPTZ;

-- Index pour le tri par popularité sur les programmes communauté
CREATE INDEX IF NOT EXISTS idx_programs_community
  ON programs(is_custom, is_public, adopted_count DESC)
  WHERE is_custom = true AND is_public = true;

-- Fonction d'incrément atomique (ne plante pas si is_custom=false)
CREATE OR REPLACE FUNCTION increment_program_adopted(pid UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE programs
  SET adopted_count = COALESCE(adopted_count, 0) + 1
  WHERE id = pid AND is_custom = true AND is_public = true;
$$;
