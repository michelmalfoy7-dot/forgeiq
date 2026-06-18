-- Migration: Clubs / Groupes communautaires
-- À exécuter dans Supabase SQL Editor

-- Clubs
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🏋️',
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT true,
  member_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clubs_public_read" ON clubs FOR SELECT USING (is_public = true);
CREATE POLICY "clubs_auth_insert" ON clubs FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "clubs_creator_update" ON clubs FOR UPDATE USING (auth.uid() = creator_id);

-- Membres
CREATE TABLE IF NOT EXISTS club_members (
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (club_id, user_id)
);
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_members_read" ON club_members FOR SELECT USING (true);
CREATE POLICY "club_members_insert" ON club_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "club_members_delete" ON club_members FOR DELETE USING (auth.uid() = user_id);
