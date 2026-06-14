-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION SPRINT 14 — Social réactions + Badges (14 juin 2026)
-- Exécuter dans Supabase Dashboard → SQL Editor
--
-- BILAN PAR TÂCHE :
--   T1 (Lifetime programmes IA)  → AUCUNE migration nécessaire (code uniquement)
--   T2 (Suggestions follow)      → AUCUNE migration nécessaire (déjà en place)
--   T3 (Voir qui a réagi)        → MIGRATION REQUISE : table reactions (cf. ci-dessous)
--   T4 (Masquer parrainage)      → AUCUNE migration nécessaire (code uniquement)
--   T5 (Badges / Grades)         → AUCUNE migration nécessaire (colonnes existantes)
--
-- COLONNES EXISTANTES UTILISÉES PAR T5 :
--   profiles.checkin_streak          → ajouté Sprint 8 (migration_streaks_export.sql)
--   profiles.training_streak_weeks   → ajouté Sprint 8 (migration_streaks_export.sql)
--   workouts.total_tonnage_kg        → présent depuis schema.sql
--   personal_records                 → présent depuis schema.sql
-- ══════════════════════════════════════════════════════════════════════════════


-- ── 1. TABLE : social_profiles ─────────────────────────────────────────────
-- Utilisée massivement depuis Sprint 5 (profils publics, feed, mentions).
-- Aucun fichier de migration existant n'a été trouvé — IF NOT EXISTS est sûr.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_profiles (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT        UNIQUE,
  display_name    TEXT,
  bio             TEXT,
  avatar_url      TEXT,
  followers_count INTEGER     DEFAULT 0,
  following_count INTEGER     DEFAULT 0,
  is_public       BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;

-- Lecture : profil public ou propre profil
DROP POLICY IF EXISTS "social_profiles_select" ON social_profiles;
CREATE POLICY "social_profiles_select" ON social_profiles
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- Création / modification : uniquement le propriétaire
DROP POLICY IF EXISTS "social_profiles_insert" ON social_profiles;
CREATE POLICY "social_profiles_insert" ON social_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "social_profiles_update" ON social_profiles;
CREATE POLICY "social_profiles_update" ON social_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_social_profiles_username
  ON social_profiles(username) WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_social_profiles_public
  ON social_profiles(followers_count DESC) WHERE is_public = true;


-- ── 2. COLONNE : workout_shares.is_public ──────────────────────────────────
-- Requête feed utilise .eq('is_public', true).
-- Ajouté ici pour les cas où la colonne serait absente.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE workout_shares
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Tous les partages existants sont publics par défaut
UPDATE workout_shares SET is_public = true WHERE is_public IS NULL;

CREATE INDEX IF NOT EXISTS idx_workout_shares_public_created
  ON workout_shares(created_at DESC) WHERE is_public = true;


-- ── 3. TABLE : reactions ───────────────────────────────────────────────────
-- CRITIQUE pour T3 — le code l'indique explicitement :
--   "Table absente (pas encore migrée) → réponse vide gracieuse"
-- Sans cette table : réactions non fonctionnelles (boutons présents mais no-op).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reactions (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id   UUID        NOT NULL REFERENCES workout_shares(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  emoji      TEXT        NOT NULL CHECK (emoji IN ('🔥', '💪', '⚡')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(share_id, user_id, emoji)
);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Lecture : tout le monde peut voir les réactions (noms affichés via detail=true)
DROP POLICY IF EXISTS "reactions_select" ON reactions;
CREATE POLICY "reactions_select" ON reactions
  FOR SELECT USING (true);

-- Ajout : uniquement le propriétaire
DROP POLICY IF EXISTS "reactions_insert" ON reactions;
CREATE POLICY "reactions_insert" ON reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Suppression : uniquement le propriétaire (toggle off)
DROP POLICY IF EXISTS "reactions_delete" ON reactions;
CREATE POLICY "reactions_delete" ON reactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reactions_share
  ON reactions(share_id);

CREATE INDEX IF NOT EXISTS idx_reactions_user
  ON reactions(user_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLES POTENTIELLEMENT ABSENTES (hors Sprint 14, à vérifier séparément)
-- Ces tables sont référencées dans le code mais aucun fichier de migration
-- ne les crée. La plupart ont des fallbacks gracieux dans les routes API.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── A. TABLE : notifications ───────────────────────────────────────────────
-- Utilisée par /api/social/notifications (Sprint 9 push notifs).
-- Le code a un fallback : "Table peut ne pas encore exister"
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,  -- 'like', 'comment', 'follow', 'reaction'
  actor_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reference_id UUID,                  -- share_id, workout_id, etc.
  is_read      BOOLEAN     DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true);  -- SECURITY DEFINER via fonctions ou service role

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, created_at DESC) WHERE is_read = false;


-- ── B. TABLE : push_subscriptions ─────────────────────────────────────────
-- Utilisée par /api/social/push (Sprint 9 push notifs VAPID).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subs_own" ON push_subscriptions;
CREATE POLICY "push_subs_own" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);


-- ── C. TABLE : fasting_sessions ───────────────────────────────────────────
-- Utilisée par /api/nutrition (tracker jeûne intermittent, Sprint 6).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fasting_sessions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ,
  target_hours  NUMERIC(4,1),
  is_completed  BOOLEAN     DEFAULT false,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fasting_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fasting_own" ON fasting_sessions;
CREATE POLICY "fasting_own" ON fasting_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fasting_user_date
  ON fasting_sessions(user_id, log_date DESC);


-- ══════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION FINALE
-- ══════════════════════════════════════════════════════════════════════════════
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'social_profiles',
    'workout_shares',
    'reactions',
    'notifications',
    'push_subscriptions',
    'fasting_sessions',
    'follows',
    'likes'
  )
ORDER BY tablename;
