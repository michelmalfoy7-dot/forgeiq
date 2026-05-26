-- ============================================================
-- ForgeIQ — Social Features Schema
-- A executer dans Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Colonnes sociales sur profiles ─────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio               text,
  ADD COLUMN IF NOT EXISTS is_public         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS followers_count   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count   integer DEFAULT 0;

-- Politique : les profils publics sont lisibles par tout le monde
-- (supprime d'abord l'ancienne politique SELECT si elle existe)
DROP POLICY IF EXISTS "Utilisateur voit son propre profil" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (is_public = true OR auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── 2. follows ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS follows (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select"  ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert"  ON follows FOR INSERT  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete"  ON follows FOR DELETE  USING (auth.uid() = follower_id);

-- ── 3. workout_shares ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_shares (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id)  ON DELETE CASCADE NOT NULL,
  workout_id     uuid REFERENCES workouts(id)    ON DELETE CASCADE,
  caption        text,
  likes_count    integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE workout_shares ENABLE ROW LEVEL SECURITY;

-- Seuls les partages d'utilisateurs publics sont visibles (+ les propres)
CREATE POLICY "shares_select" ON workout_shares
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_id AND p.is_public = true
    )
  );

CREATE POLICY "shares_insert" ON workout_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shares_delete" ON workout_shares
  FOR DELETE USING (auth.uid() = user_id);

-- ── 4. likes ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS likes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id)       ON DELETE CASCADE NOT NULL,
  share_id   uuid REFERENCES workout_shares(id)   ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, share_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_select" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON likes FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON likes FOR DELETE  USING (auth.uid() = user_id);

-- ── 5. Fonctions atomiques (SECURITY DEFINER) ─────────────────

-- Incrémente followers_count ou following_count (jamais < 0)
CREATE OR REPLACE FUNCTION increment_social_counter(
  p_user_id uuid,
  p_column  text,
  p_delta   integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_column = 'followers_count' THEN
    UPDATE profiles
      SET followers_count = GREATEST(0, followers_count + p_delta)
      WHERE id = p_user_id;
  ELSIF p_column = 'following_count' THEN
    UPDATE profiles
      SET following_count = GREATEST(0, following_count + p_delta)
      WHERE id = p_user_id;
  END IF;
END;
$$;

-- Incrémente likes_count sur workout_shares (jamais < 0)
CREATE OR REPLACE FUNCTION increment_likes_count(
  p_share_id uuid,
  p_delta    integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE workout_shares
    SET likes_count = GREATEST(0, likes_count + p_delta)
    WHERE id = p_share_id;
END;
$$;

-- ── 6. Personal records : ajouter colonne reps ────────────────

ALTER TABLE personal_records
  ADD COLUMN IF NOT EXISTS reps integer;

-- Mettre a jour les PRs existants de type max_reps
-- (la valeur est dans le champ value, on peut la copier dans reps)
UPDATE personal_records
  SET reps = value::integer
  WHERE record_type = 'max_reps' AND reps IS NULL;

-- ── 7. Verification ───────────────────────────────────────────

SELECT 'follows'        AS table_name, COUNT(*) AS rows FROM follows
UNION ALL
SELECT 'workout_shares',               COUNT(*) FROM workout_shares
UNION ALL
SELECT 'likes',                        COUNT(*) FROM likes
UNION ALL
SELECT 'personal_records_avec_reps',   COUNT(*) FROM personal_records WHERE reps IS NOT NULL;
