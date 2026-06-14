-- Migration : mémoire persistante cross-sessions du coach IA (Sprint 14)
-- Exécuter dans Supabase SQL Editor

CREATE TYPE IF NOT EXISTS coach_memory_category AS ENUM (
  'injury',      -- Blessures et douleurs
  'goal',        -- Objectifs déclarés
  'preference',  -- Préférences personnelles
  'milestone',   -- Réussites et étapes importantes
  'note'         -- Notes générales
);

CREATE TABLE IF NOT EXISTS coach_memory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    coach_memory_category NOT NULL,
  content     TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'auto',  -- 'auto' | 'manual'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ          -- NULL = permanent
);

-- Index pour chargement rapide par user (tri anti-chronologique)
CREATE INDEX IF NOT EXISTS coach_memory_user_idx
  ON coach_memory(user_id, created_at DESC);

-- RLS
ALTER TABLE coach_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_memory_select" ON coach_memory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "coach_memory_insert" ON coach_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coach_memory_update" ON coach_memory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "coach_memory_delete" ON coach_memory
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION update_coach_memory_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER coach_memory_updated_at
  BEFORE UPDATE ON coach_memory
  FOR EACH ROW EXECUTE FUNCTION update_coach_memory_updated_at();
