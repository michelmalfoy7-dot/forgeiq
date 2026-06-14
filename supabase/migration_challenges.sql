-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION CHALLENGES — Défis hebdomadaires & mensuels (14 juin 2026)
-- Exécuter dans Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════


-- ── 1. TABLE : challenges ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  type         TEXT        NOT NULL CHECK (type IN (
    'tonnage_weekly', 'streak_weekly', 'sessions_monthly', 'tonnage_monthly'
  )),
  target_value NUMERIC,
  start_date   DATE        NOT NULL,
  end_date     DATE        NOT NULL,
  is_public    BOOLEAN     DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT challenges_dates_check CHECK (end_date > start_date)
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Lecture : challenge public, créé par le user, ou rejoint par le user
DROP POLICY IF EXISTS "challenges_select" ON challenges;
CREATE POLICY "challenges_select" ON challenges
  FOR SELECT USING (
    is_public = true
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM challenge_participants
      WHERE challenge_id = challenges.id AND user_id = auth.uid()
    )
  );

-- Création : utilisateur authentifié uniquement, doit être le créateur
DROP POLICY IF EXISTS "challenges_insert" ON challenges;
CREATE POLICY "challenges_insert" ON challenges
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Suppression : créateur uniquement
DROP POLICY IF EXISTS "challenges_delete" ON challenges;
CREATE POLICY "challenges_delete" ON challenges
  FOR DELETE USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_challenges_created_by
  ON challenges(created_by);
CREATE INDEX IF NOT EXISTS idx_challenges_end_date
  ON challenges(end_date DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_public
  ON challenges(is_public, end_date DESC) WHERE is_public = true;


-- ── 2. TABLE : challenge_participants ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_participants (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id  UUID        NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ DEFAULT now(),
  current_value NUMERIC     DEFAULT 0,
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Lecture : participants d'un challenge visible par le user
DROP POLICY IF EXISTS "challenge_participants_select" ON challenge_participants;
CREATE POLICY "challenge_participants_select" ON challenge_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM challenges c
      WHERE c.id = challenge_id
        AND (
          c.is_public = true
          OR c.created_by = auth.uid()
          OR user_id = auth.uid()
        )
    )
  );

-- Participation : le user lui-même uniquement
DROP POLICY IF EXISTS "challenge_participants_insert" ON challenge_participants;
CREATE POLICY "challenge_participants_insert" ON challenge_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mise à jour valeur courante : le user lui-même (rafraîchissement à la demande)
DROP POLICY IF EXISTS "challenge_participants_update" ON challenge_participants;
CREATE POLICY "challenge_participants_update" ON challenge_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Quitter un challenge : le user lui-même
DROP POLICY IF EXISTS "challenge_participants_delete" ON challenge_participants;
CREATE POLICY "challenge_participants_delete" ON challenge_participants
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge
  ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user
  ON challenge_participants(user_id);
