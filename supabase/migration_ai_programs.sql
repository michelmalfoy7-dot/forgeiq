-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION : Générateur IA de programmes
-- Ajoute is_ai_generated sur la table programs
-- Exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Index pour compter rapidement les générations du mois
CREATE INDEX IF NOT EXISTS idx_programs_ai_generated
  ON programs (created_by, is_ai_generated, created_at)
  WHERE is_ai_generated = true;
