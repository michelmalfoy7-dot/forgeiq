-- ============================================================
-- ForgeIQ — MIGRATION COMPLÈTE DE SYNCHRONISATION
-- Applique TOUTES les migrations manquantes en production
-- Toutes les opérations sont idempotentes (IF NOT EXISTS)
-- À exécuter dans Supabase Dashboard → SQL Editor
-- Généré le 2026-06-15
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. COLONNES MANQUANTES SUR PROFILES
-- ════════════════════════════════════════════════════════════

-- Sprint 1-4 : Stripe + macros custom + préférences
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_plan      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_ends_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS macro_mode             TEXT DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS custom_calories        INTEGER,
  ADD COLUMN IF NOT EXISTS custom_protein_g       NUMERIC,
  ADD COLUMN IF NOT EXISTS custom_carbs_g         NUMERIC,
  ADD COLUMN IF NOT EXISTS custom_fat_g           NUMERIC,
  ADD COLUMN IF NOT EXISTS water_goal_ml          INTEGER DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS steps_goal             INTEGER DEFAULT 8000,
  ADD COLUMN IF NOT EXISTS target_weight_kg       NUMERIC,
  ADD COLUMN IF NOT EXISTS weight_kg              NUMERIC,
  ADD COLUMN IF NOT EXISTS welcome_email_sent     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS include_warmup_in_tonnage BOOLEAN DEFAULT FALSE;

-- admin_flag.sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- migration_streaks_export.sql (Sprint 8)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS checkin_streak         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checkin_date      DATE,
  ADD COLUMN IF NOT EXISTS training_streak_weeks  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_training_week_iso TEXT;

-- migration_referral.sql (Sprint 9)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code           TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by             TEXT,
  ADD COLUMN IF NOT EXISTS referral_count          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_pro_until      DATE,
  ADD COLUMN IF NOT EXISTS referral_reward_granted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON profiles(referral_code);

-- Sprint 10 : identité + gym
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gym_id   UUID,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- social_schema.sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio             TEXT,
  ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- migration_audit_timezone.sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone VARCHAR DEFAULT 'Europe/Paris';


-- ════════════════════════════════════════════════════════════
-- 2. COLONNES MANQUANTES SUR WORKOUTS
-- ════════════════════════════════════════════════════════════

ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS duration_min     NUMERIC,
  ADD COLUMN IF NOT EXISTS distance_km      NUMERIC,
  ADD COLUMN IF NOT EXISTS workout_type     TEXT DEFAULT 'strength',
  ADD COLUMN IF NOT EXISTS paused_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pause_duration_sec INTEGER DEFAULT 0;


-- ════════════════════════════════════════════════════════════
-- 3. COLONNES MANQUANTES SUR WORKOUT_SETS
-- ════════════════════════════════════════════════════════════

ALTER TABLE workout_sets
  ADD COLUMN IF NOT EXISTS set_type        TEXT DEFAULT 'work',
  ADD COLUMN IF NOT EXISTS is_pr           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS superset_group  INTEGER,
  ADD COLUMN IF NOT EXISTS superset_index  INTEGER;


-- ════════════════════════════════════════════════════════════
-- 4. COLONNES MANQUANTES SUR DAILY_LOGS
-- ════════════════════════════════════════════════════════════

ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS water_ml   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mood_score INTEGER;


-- ════════════════════════════════════════════════════════════
-- 5. COLONNES MANQUANTES SUR EXERCISES_LIBRARY
-- ════════════════════════════════════════════════════════════

ALTER TABLE exercises_library
  ADD COLUMN IF NOT EXISTS is_bilateral_dumbbell BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_unilateral         BOOLEAN NOT NULL DEFAULT FALSE;


-- ════════════════════════════════════════════════════════════
-- 6. COLONNES MANQUANTES SUR PERSONAL_RECORDS
-- ════════════════════════════════════════════════════════════

ALTER TABLE personal_records
  ADD COLUMN IF NOT EXISTS reps INTEGER;


-- ════════════════════════════════════════════════════════════
-- 7. COLONNES MANQUANTES SUR PROGRAMS
-- ════════════════════════════════════════════════════════════

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;


-- ════════════════════════════════════════════════════════════
-- 8. NUTRITION — foods_library + food_logs (tables + micros)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS foods_library (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name      TEXT NOT NULL,
  name_fr   TEXT,
  brand     TEXT,
  barcode   TEXT UNIQUE,
  calories  FLOAT,
  protein_g FLOAT,
  carbs_g   FLOAT,
  fat_g     FLOAT,
  fiber_g   FLOAT,
  sugar_g   FLOAT,
  sodium_mg FLOAT,
  source    TEXT DEFAULT 'manual' CHECK (source IN ('openfoodfacts', 'ai_photo', 'manual')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE foods_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "foods_library_public_read" ON foods_library;
CREATE POLICY "foods_library_public_read" ON foods_library FOR SELECT USING (true);
DROP POLICY IF EXISTS "foods_library_insert" ON foods_library;
CREATE POLICY "foods_library_insert" ON foods_library FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS foods_library_barcode_idx ON foods_library(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS foods_library_name_idx ON foods_library USING gin(to_tsvector('french', coalesce(name_fr, name)));

CREATE TABLE IF NOT EXISTS food_logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID REFERENCES auth.users NOT NULL,
  log_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) DEFAULT 'snack',
  food_id   UUID REFERENCES foods_library(id) ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  quantity_g FLOAT NOT NULL DEFAULT 100,
  calories  FLOAT,
  protein_g FLOAT,
  carbs_g   FLOAT,
  fat_g     FLOAT,
  fiber_g   FLOAT,
  source    TEXT DEFAULT 'manual' CHECK (source IN ('barcode', 'photo', 'search', 'manual', 'recipe', 'favorite', 'url')),
  photo_url TEXT,
  ai_note   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "food_logs_select" ON food_logs;
CREATE POLICY "food_logs_select" ON food_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "food_logs_insert" ON food_logs;
CREATE POLICY "food_logs_insert" ON food_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "food_logs_update" ON food_logs;
CREATE POLICY "food_logs_update" ON food_logs FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "food_logs_delete" ON food_logs;
CREATE POLICY "food_logs_delete" ON food_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS food_logs_user_date_idx ON food_logs(user_id, log_date DESC);

-- Micronutriments Sprint 6
ALTER TABLE foods_library
  ADD COLUMN IF NOT EXISTS iron_mg       FLOAT,
  ADD COLUMN IF NOT EXISTS magnesium_mg  FLOAT,
  ADD COLUMN IF NOT EXISTS zinc_mg       FLOAT,
  ADD COLUMN IF NOT EXISTS calcium_mg    FLOAT,
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg FLOAT,
  ADD COLUMN IF NOT EXISTS potassium_mg  FLOAT,
  ADD COLUMN IF NOT EXISTS vitamin_c_mg  FLOAT;

ALTER TABLE food_logs
  ADD COLUMN IF NOT EXISTS iron_mg       FLOAT,
  ADD COLUMN IF NOT EXISTS magnesium_mg  FLOAT,
  ADD COLUMN IF NOT EXISTS zinc_mg       FLOAT,
  ADD COLUMN IF NOT EXISTS calcium_mg    FLOAT,
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg FLOAT,
  ADD COLUMN IF NOT EXISTS potassium_mg  FLOAT,
  ADD COLUMN IF NOT EXISTS vitamin_c_mg  FLOAT;


-- ════════════════════════════════════════════════════════════
-- 9. NUTRITION — food_favorites + recipes + recipe_ingredients
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS food_favorites (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_id     UUID REFERENCES foods_library(id) ON DELETE CASCADE,
  food_name   TEXT NOT NULL,
  quantity_g  FLOAT DEFAULT 100,
  calories    FLOAT,
  protein_g   FLOAT,
  carbs_g     FLOAT,
  fat_g       FLOAT,
  fiber_g     FLOAT,
  use_count   INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, food_name)
);

ALTER TABLE food_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "favorites_own" ON food_favorites;
CREATE POLICY "favorites_own" ON food_favorites FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS recipes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT,
  total_servings INTEGER DEFAULT 1,
  calories_per_serving    NUMERIC(8,2),
  protein_per_serving     NUMERIC(8,2),
  carbs_per_serving       NUMERIC(8,2),
  fat_per_serving         NUMERIC(8,2),
  fiber_per_serving       NUMERIC(8,2),
  iron_mg_per_serving       NUMERIC(8,4),
  magnesium_mg_per_serving  NUMERIC(8,4),
  zinc_mg_per_serving       NUMERIC(8,4),
  calcium_mg_per_serving    NUMERIC(8,4),
  potassium_mg_per_serving  NUMERIC(8,4),
  vitamin_c_mg_per_serving  NUMERIC(8,4),
  vitamin_d_mcg_per_serving NUMERIC(8,4),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recipes_own" ON recipes;
CREATE POLICY "recipes_own" ON recipes FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id      UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  food_name      TEXT NOT NULL,
  food_id        UUID,
  quantity_g     NUMERIC(8,2) NOT NULL,
  calories_per_100g   NUMERIC(8,2),
  protein_per_100g    NUMERIC(8,2),
  carbs_per_100g      NUMERIC(8,2),
  fat_per_100g        NUMERIC(8,2),
  fiber_per_100g      NUMERIC(8,2),
  iron_mg_per_100g       NUMERIC(8,4),
  magnesium_mg_per_100g  NUMERIC(8,4),
  zinc_mg_per_100g       NUMERIC(8,4),
  calcium_mg_per_100g    NUMERIC(8,4),
  potassium_mg_per_100g  NUMERIC(8,4),
  vitamin_c_mg_per_100g  NUMERIC(8,4),
  vitamin_d_mcg_per_100g NUMERIC(8,4),
  sort_order     INTEGER DEFAULT 0
);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recipe_ingredients_own" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_own" ON recipe_ingredients
  FOR ALL USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

-- Pour les tables déjà créées sans les colonnes micro
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS iron_mg_per_serving       NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS magnesium_mg_per_serving  NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS zinc_mg_per_serving       NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS calcium_mg_per_serving    NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS potassium_mg_per_serving  NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS vitamin_c_mg_per_serving  NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg_per_serving NUMERIC(8,4);

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS iron_mg_per_100g       NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS magnesium_mg_per_100g  NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS zinc_mg_per_100g       NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS calcium_mg_per_100g    NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS potassium_mg_per_100g  NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS vitamin_c_mg_per_100g  NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg_per_100g NUMERIC(8,4);


-- ════════════════════════════════════════════════════════════
-- 10. EXERCISE_ALIASES
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS exercise_aliases (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES exercises_library(id) ON DELETE CASCADE,
  alias       TEXT NOT NULL,
  alias_norm  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exercise_id, alias_norm)
);

ALTER TABLE exercise_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aliases_public_read" ON exercise_aliases;
CREATE POLICY "aliases_public_read" ON exercise_aliases FOR SELECT USING (true);
DROP POLICY IF EXISTS "aliases_admin_insert" ON exercise_aliases;
CREATE POLICY "aliases_admin_insert" ON exercise_aliases FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS exercise_aliases_norm_idx ON exercise_aliases(alias_norm);


-- ════════════════════════════════════════════════════════════
-- 11. PROGRESS_PHOTOS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS progress_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  storage_path TEXT NOT NULL,
  note         TEXT,
  weight_kg    NUMERIC(5,2),
  is_private   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS progress_photos_user_date ON progress_photos(user_id, photo_date DESC);
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progress_photos_owner_only" ON progress_photos;
CREATE POLICY "progress_photos_owner_only" ON progress_photos FOR ALL USING (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════
-- 12. GYM_EQUIPMENT_PROFILES
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gym_equipment_profiles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  tier        TEXT        NOT NULL CHECK (tier IN ('premium', 'standard', 'home')),
  description TEXT,
  features    TEXT[]      DEFAULT '{}',
  logo_emoji  TEXT        DEFAULT '🏋️',
  sort_order  INT         DEFAULT 99,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gym_equipment_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gym_profiles_public_read" ON gym_equipment_profiles;
CREATE POLICY "gym_profiles_public_read" ON gym_equipment_profiles FOR SELECT USING (true);

-- Lien gym_id sur profiles (après création de la table gym_equipment_profiles)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_gym_id_fkey;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES gym_equipment_profiles(id);


-- ════════════════════════════════════════════════════════════
-- 13. SOCIAL — follows, workout_shares, likes, social_profiles
-- ════════════════════════════════════════════════════════════

-- Mise à jour RLS profiles pour profils publics
DROP POLICY IF EXISTS "Utilisateur voit son propre profil" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (is_public = true OR auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS follows (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follows_select" ON follows;
CREATE POLICY "follows_select" ON follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "follows_insert" ON follows;
CREATE POLICY "follows_insert" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "follows_delete" ON follows;
CREATE POLICY "follows_delete" ON follows FOR DELETE USING (auth.uid() = follower_id);

CREATE TABLE IF NOT EXISTS workout_shares (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_id     UUID REFERENCES workouts(id) ON DELETE CASCADE,
  caption        TEXT,
  likes_count    INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_public      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workout_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shares_select" ON workout_shares;
CREATE POLICY "shares_select" ON workout_shares
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.is_public = true));
DROP POLICY IF EXISTS "shares_insert" ON workout_shares;
CREATE POLICY "shares_insert" ON workout_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "shares_delete" ON workout_shares;
CREATE POLICY "shares_delete" ON workout_shares FOR DELETE USING (auth.uid() = user_id);

-- Colonne is_public si table existait sans elle
ALTER TABLE workout_shares
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS likes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_id   UUID REFERENCES workout_shares(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, share_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "likes_select" ON likes;
CREATE POLICY "likes_select" ON likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "likes_insert" ON likes;
CREATE POLICY "likes_insert" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "likes_delete" ON likes;
CREATE POLICY "likes_delete" ON likes FOR DELETE USING (auth.uid() = user_id);

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
DROP POLICY IF EXISTS "social_profiles_select" ON social_profiles;
CREATE POLICY "social_profiles_select" ON social_profiles
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "social_profiles_insert" ON social_profiles;
CREATE POLICY "social_profiles_insert" ON social_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "social_profiles_update" ON social_profiles;
CREATE POLICY "social_profiles_update" ON social_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Fonctions atomiques (compteurs)
CREATE OR REPLACE FUNCTION increment_social_counter(p_user_id uuid, p_column text, p_delta integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_column = 'followers_count' THEN
    UPDATE profiles SET followers_count = GREATEST(0, followers_count + p_delta) WHERE id = p_user_id;
  ELSIF p_column = 'following_count' THEN
    UPDATE profiles SET following_count = GREATEST(0, following_count + p_delta) WHERE id = p_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION increment_likes_count(p_share_id uuid, p_delta integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE workout_shares SET likes_count = GREATEST(0, likes_count + p_delta) WHERE id = p_share_id;
END;
$$;


-- ════════════════════════════════════════════════════════════
-- 14. NOTIFICATIONS + PUSH_SUBSCRIPTIONS + REACTIONS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifs_own" ON notifications;
CREATE POLICY "notifs_own" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subs_own" ON push_subscriptions;
CREATE POLICY "push_subs_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS reactions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_id   UUID REFERENCES workout_shares(id) ON DELETE CASCADE NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '💪',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, share_id, emoji)
);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reactions_select" ON reactions;
CREATE POLICY "reactions_select" ON reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "reactions_insert" ON reactions;
CREATE POLICY "reactions_insert" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reactions_delete" ON reactions;
CREATE POLICY "reactions_delete" ON reactions FOR DELETE USING (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════
-- 15. FASTING_SESSIONS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fasting_sessions (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ,
  target_hours NUMERIC(4,1),
  is_completed BOOLEAN     DEFAULT false,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fasting_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fasting_own" ON fasting_sessions;
CREATE POLICY "fasting_own" ON fasting_sessions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS fasting_user_date_idx ON fasting_sessions(user_id, log_date DESC);


-- ════════════════════════════════════════════════════════════
-- 16. CARDIO_ACTIVITIES
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cardio_activities (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type   TEXT NOT NULL,
  duration_min    INTEGER,
  distance_km     NUMERIC(6,2),
  calories_burned INTEGER,
  avg_hr          INTEGER,
  effort_score    SMALLINT CHECK (effort_score BETWEEN 1 AND 5),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cardio_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cardio_own" ON cardio_activities;
CREATE POLICY "cardio_own" ON cardio_activities FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS cardio_user_date_idx ON cardio_activities(user_id, log_date DESC);


-- ════════════════════════════════════════════════════════════
-- 17. COACH_MEMORY
-- ════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE coach_memory_category AS ENUM ('injury', 'goal', 'preference', 'milestone', 'note');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS coach_memory (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   coach_memory_category NOT NULL,
  content    TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE coach_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_memory_own" ON coach_memory;
CREATE POLICY "coach_memory_own" ON coach_memory FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS coach_memory_user_idx ON coach_memory(user_id, created_at DESC);


-- ════════════════════════════════════════════════════════════
-- 18. FONCTION REFERRAL
-- ════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════
-- 19. VÉRIFICATION FINALE
-- ════════════════════════════════════════════════════════════

SELECT 'profiles'            AS table_name, COUNT(*) AS rows FROM profiles
UNION ALL SELECT 'workouts',               COUNT(*) FROM workouts
UNION ALL SELECT 'workout_sets',           COUNT(*) FROM workout_sets
UNION ALL SELECT 'daily_logs',             COUNT(*) FROM daily_logs
UNION ALL SELECT 'exercises_library',      COUNT(*) FROM exercises_library
UNION ALL SELECT 'exercise_aliases',       COUNT(*) FROM exercise_aliases
UNION ALL SELECT 'foods_library',          COUNT(*) FROM foods_library
UNION ALL SELECT 'food_logs',              COUNT(*) FROM food_logs
UNION ALL SELECT 'food_favorites',         COUNT(*) FROM food_favorites
UNION ALL SELECT 'recipes',                COUNT(*) FROM recipes
UNION ALL SELECT 'recipe_ingredients',     COUNT(*) FROM recipe_ingredients
UNION ALL SELECT 'follows',                COUNT(*) FROM follows
UNION ALL SELECT 'workout_shares',         COUNT(*) FROM workout_shares
UNION ALL SELECT 'likes',                  COUNT(*) FROM likes
UNION ALL SELECT 'social_profiles',        COUNT(*) FROM social_profiles
UNION ALL SELECT 'push_subscriptions',     COUNT(*) FROM push_subscriptions
UNION ALL SELECT 'notifications',          COUNT(*) FROM notifications
UNION ALL SELECT 'fasting_sessions',       COUNT(*) FROM fasting_sessions
UNION ALL SELECT 'progress_photos',        COUNT(*) FROM progress_photos
UNION ALL SELECT 'gym_equipment_profiles', COUNT(*) FROM gym_equipment_profiles
UNION ALL SELECT 'cardio_activities',      COUNT(*) FROM cardio_activities
UNION ALL SELECT 'coach_memory',           COUNT(*) FROM coach_memory
ORDER BY table_name;
