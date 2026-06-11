-- Migration : système de referral (Sprint 9)
-- Exécuter dans Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code             TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by               TEXT,
  ADD COLUMN IF NOT EXISTS referral_count            INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_pro_until        DATE,
  ADD COLUMN IF NOT EXISTS referral_reward_granted   BOOLEAN DEFAULT false;

-- Index pour lookup rapide par code
CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON profiles(referral_code);

-- Fonction pour générer un code unique (8 chars alphanumériques)
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
