-- ──────────────────────────────────────────────────────────────────
-- Comptes admin / bêta illimités — ForgeIQ
-- À coller dans Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────

-- 1. Ajouter le flag is_admin sur la table profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Activer ton compte (remplace par ton user_id Supabase)
--    Supabase Dashboard → Authentication → Users → copie l'UUID
-- UPDATE profiles SET is_admin = TRUE WHERE id = 'TON-UUID-ICI';

-- 3. Activer un compte beta (ta sœur, testeurs...)
-- UPDATE profiles SET is_admin = TRUE WHERE id = 'UUID-DE-TON-COMPTE';

-- Pour révoquer :
-- UPDATE profiles SET is_admin = FALSE WHERE id = 'UUID';

-- Pour voir tous les admins :
-- SELECT id, display_name, is_admin FROM profiles WHERE is_admin = TRUE;
