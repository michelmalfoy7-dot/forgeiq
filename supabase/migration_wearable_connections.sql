-- Table wearable_connections — Connexions wearables OAuth2
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS wearable_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('google_fit', 'fitbit', 'garmin', 'polar', 'withings')),
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at    TIMESTAMPTZ DEFAULT now(),
  last_synced_at  TIMESTAMPTZ,
  UNIQUE(user_id, provider)
);

ALTER TABLE wearable_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wearable_self" ON wearable_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
