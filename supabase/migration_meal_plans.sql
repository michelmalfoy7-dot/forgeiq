-- Table meal_plans — Meal Planner 7 jours (Sprint 15 Vague 3)
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS meal_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date     DATE NOT NULL,
  meal_type     TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name     TEXT NOT NULL,
  food_id       UUID REFERENCES foods_library(id),
  quantity_g    NUMERIC NOT NULL DEFAULT 100,
  calories      NUMERIC,
  protein_g     NUMERIC,
  carbs_g       NUMERIC,
  fat_g         NUMERIC,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_plans_self" ON meal_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS meal_plans_user_date ON meal_plans(user_id, plan_date);
