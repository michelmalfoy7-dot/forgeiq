-- ============================================================
-- ForgeIQ — Schéma complet Supabase / PostgreSQL
-- À exécuter dans l'éditeur SQL de Supabase (ordre important)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE : profiles
-- ============================================================
CREATE TABLE profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  age int,
  height_cm numeric,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  goal text CHECK (goal IN ('weight_loss', 'muscle_gain', 'strength', 'endurance', 'general')),
  level text CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  equipment text CHECK (equipment IN ('full_gym', 'home_basic', 'home_advanced', 'bodyweight')),
  sessions_per_week int CHECK (sessions_per_week BETWEEN 2 AND 6),
  current_program_id uuid,
  onboarding_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur voit son propre profil"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Utilisateur modifie son propre profil"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Utilisateur insère son propre profil"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger : créer un profil vide à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE : exercises_library
-- ============================================================
CREATE TABLE exercises_library (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  name_fr text,
  slug text UNIQUE,
  muscle_primary text[],
  muscle_secondary text[],
  equipment text CHECK (equipment IN ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell')),
  category text CHECK (category IN ('compound', 'isolation', 'cardio', 'mobility')),
  force_type text CHECK (force_type IN ('push', 'pull', 'legs', 'core', 'carry')),
  difficulty int CHECK (difficulty BETWEEN 1 AND 5),
  instructions text,
  tips text,
  video_url text,
  is_system boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exercises_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde lit les exercices système"
  ON exercises_library FOR SELECT USING (is_system = true OR created_by = auth.uid());

CREATE POLICY "Utilisateur crée ses exercices custom"
  ON exercises_library FOR INSERT WITH CHECK (auth.uid() = created_by AND is_system = false);

-- ============================================================
-- TABLE : programs
-- ============================================================
CREATE TABLE programs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  level text[],
  goal text[],
  equipment text[],
  sessions_per_week int,
  duration_weeks int,
  structure jsonb,
  is_custom boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde lit les programmes publics"
  ON programs FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Utilisateur crée ses programmes custom"
  ON programs FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Utilisateur modifie ses programmes"
  ON programs FOR UPDATE USING (auth.uid() = created_by);

-- Clé étrangère pour current_program_id dans profiles
ALTER TABLE profiles ADD CONSTRAINT profiles_current_program_id_fkey
  FOREIGN KEY (current_program_id) REFERENCES programs(id);

-- ============================================================
-- TABLE : daily_logs
-- ============================================================
CREATE TABLE daily_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  log_date date NOT NULL,
  weight_kg numeric(5,2),
  weight_trend numeric(5,2),
  sys_bp int,
  dia_bp int,
  steps int,
  sleep_total_min int,
  sleep_deep_min int,
  sleep_light_min int,
  sleep_rem_min int,
  sleep_awake_min int,
  calories int,
  protein_g numeric(6,1),
  carbs_g numeric(6,1),
  fat_g numeric(6,1),
  fatigue_score int CHECK (fatigue_score BETWEEN 1 AND 10),
  motivation_score int CHECK (motivation_score BETWEEN 1 AND 10),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, log_date)
);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses logs quotidiens"
  ON daily_logs FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- TABLE : workouts
-- ============================================================
CREATE TABLE workouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  program_id uuid REFERENCES programs(id),
  session_name text,
  session_date date NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  total_tonnage_kg numeric(10,2),
  total_sets int,
  total_reps int,
  notes text,
  rpe_overall int CHECK (rpe_overall BETWEEN 1 AND 10),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses séances"
  ON workouts FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- TABLE : workout_sets
-- ============================================================
CREATE TABLE workout_sets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES exercises_library(id),
  exercise_name text NOT NULL,
  set_number int NOT NULL,
  weight_kg numeric(6,2),
  reps int,
  rpe int CHECK (rpe BETWEEN 1 AND 10),
  is_warmup boolean DEFAULT false,
  is_dropset boolean DEFAULT false,
  is_failure boolean DEFAULT false,
  rest_sec int,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses séries"
  ON workout_sets FOR ALL
  USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));

-- ============================================================
-- TABLE : personal_records
-- ============================================================
CREATE TABLE personal_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  exercise_id uuid REFERENCES exercises_library(id),
  exercise_name text NOT NULL,
  record_type text CHECK (record_type IN ('top_set', '1rm_estimated', 'max_reps', 'max_volume')) NOT NULL,
  value numeric(8,2) NOT NULL,
  unit text CHECK (unit IN ('kg', 'reps')) DEFAULT 'kg',
  achieved_date date NOT NULL,
  workout_id uuid REFERENCES workouts(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, exercise_id, record_type)
);

ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses PRs"
  ON personal_records FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- TABLE : coach_messages
-- ============================================================
CREATE TABLE coach_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  role text CHECK (role IN ('user', 'assistant')) NOT NULL,
  content text NOT NULL,
  context_snapshot jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses messages coach"
  ON coach_messages FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- INDEX pour les performances
-- ============================================================
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, log_date DESC);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, session_date DESC);
CREATE INDEX idx_workout_sets_workout ON workout_sets(workout_id);
CREATE INDEX idx_personal_records_user ON personal_records(user_id, exercise_id);
CREATE INDEX idx_coach_messages_user ON coach_messages(user_id, created_at DESC);
