-- Migration : élargir le CHECK constraint de food_logs.source
-- pour inclure 'recipe' et 'favorite' (utilisés dans l'app depuis Sprint 11)
-- À exécuter dans Supabase SQL Editor

ALTER TABLE food_logs DROP CONSTRAINT IF EXISTS food_logs_source_check;

ALTER TABLE food_logs
  ADD CONSTRAINT food_logs_source_check
  CHECK (source IN ('barcode', 'photo', 'search', 'manual', 'recipe', 'favorite'));
