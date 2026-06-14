-- Migration : timezone utilisateur (Audit qualité — 14 juin 2026)
-- Exécuter dans Supabase SQL Editor

-- Colonne timezone pour les calculs de cron et weekly-recap en heure locale
-- Utilisée par /api/cron/weekly-recap pour calculer weekStart/prevWeekStart
-- dans la timezone de chaque utilisateur (corrige le décalage UTC non-Français)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone VARCHAR DEFAULT 'Europe/Paris';
