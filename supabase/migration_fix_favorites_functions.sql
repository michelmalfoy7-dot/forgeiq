-- Fonctions manquantes pour le module nutrition
-- À exécuter dans Supabase SQL Editor

-- 1. Incrément atomique use_count des favoris
CREATE OR REPLACE FUNCTION increment_favorite_count(fav_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE nutrition_favorites
  SET use_count = COALESCE(use_count, 0) + 1,
      last_used_at = now()
  WHERE id = fav_id AND user_id = auth.uid();
END;
$$;

-- 2. Mise à jour atomique du compteur de likes (si pas déjà créée)
CREATE OR REPLACE FUNCTION update_likes_count(share_id UUID, delta INTEGER)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE workout_shares
  SET likes_count = GREATEST(0, COALESCE(likes_count, 0) + delta)
  WHERE id = share_id;
END;
$$;
