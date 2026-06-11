-- Migration : streaks persistants + export (Sprint 8)
-- Exécuter dans Supabase SQL Editor

-- 1. Colonnes streak sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS checkin_streak          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checkin_date        DATE,
  ADD COLUMN IF NOT EXISTS training_streak_weeks    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_training_week_iso   TEXT;

-- 2. Table cardio_activities (activité physique non-musculation)
-- Note : les séances cardio rapides restent dans `workouts` (workout_type='cardio').
-- Cette table stocke des sessions détaillées avec données GPS/cardio si besoin.
CREATE TABLE IF NOT EXISTS cardio_activities (
  id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date        DATE    NOT NULL DEFAULT CURRENT_DATE,
  activity_type   TEXT    NOT NULL,
  duration_min    INTEGER,
  distance_km     NUMERIC(6,2),
  calories_burned INTEGER,
  avg_hr          INTEGER,
  effort_score    SMALLINT CHECK (effort_score BETWEEN 1 AND 5),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cardio_activities_user_date
  ON cardio_activities(user_id, log_date DESC);

ALTER TABLE cardio_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cardio_own" ON cardio_activities
  FOR ALL USING (auth.uid() = user_id);
