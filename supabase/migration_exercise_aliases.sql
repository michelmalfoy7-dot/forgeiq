-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : table exercise_aliases + aliases argot/marques + nouveaux exercices
-- Exécuter dans Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Table exercise_aliases ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercise_aliases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id  UUID NOT NULL REFERENCES exercises_library(id) ON DELETE CASCADE,
  alias        TEXT NOT NULL,
  alias_norm   TEXT GENERATED ALWAYS AS (
    lower(regexp_replace(alias, '[^a-z0-9 ]', '', 'gi'))
  ) STORED,
  brand        TEXT,         -- ex: 'hammer_strength', 'technogym', null pour argot
  alias_type   TEXT NOT NULL DEFAULT 'slang',  -- 'brand' | 'slang' | 'abbreviation'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_aliases_norm ON exercise_aliases (alias_norm);
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_exercise_id ON exercise_aliases (exercise_id);

-- Lecture publique (bibliothèque)
ALTER TABLE exercise_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exercise_aliases_select" ON exercise_aliases;
CREATE POLICY "exercise_aliases_select" ON exercise_aliases FOR SELECT USING (true);

-- ── 2. Nouveaux exercices (marques spécialisées) ────────────────────────────────

INSERT INTO exercises_library
  (name, name_fr, slug, muscle_primary, muscle_secondary, equipment, category, force_type, difficulty, is_system)
VALUES
  -- Hammer Strength plate-loaded
  ('Hammer Strength Chest Press',
   'Presse Pectorale Hammer Strength',
   'presse-pectorale-hammer-strength',
   ARRAY['chest'], ARRAY['front_delt','triceps'],
   'plate_loaded', 'compound', 'push', 2, TRUE),

  ('Hammer Strength Incline Press',
   'Développé Incliné Hammer Strength',
   'developpe-incline-hammer-strength',
   ARRAY['chest'], ARRAY['front_delt','triceps'],
   'plate_loaded', 'compound', 'push', 2, TRUE),

  ('Hammer Strength Low Row',
   'Tirage Bas Hammer Strength',
   'tirage-bas-hammer-strength',
   ARRAY['latissimus'], ARRAY['biceps','rear_delt','mid_back'],
   'plate_loaded', 'compound', 'pull', 2, TRUE),

  ('Hammer Strength ISO-Lateral Row',
   'Rowing ISO-Latéral Hammer Strength',
   'rowing-iso-lateral-hammer-strength',
   ARRAY['latissimus'], ARRAY['biceps','rear_delt','mid_back'],
   'plate_loaded', 'compound', 'pull', 2, TRUE),

  ('Hammer Strength DY Row',
   'Rowing DY Hammer Strength',
   'rowing-dy-hammer-strength',
   ARRAY['latissimus'], ARRAY['rear_delt','teres_major','mid_back'],
   'plate_loaded', 'compound', 'pull', 2, TRUE),

  ('Hammer Strength Shoulder Press',
   'Développé Épaules Hammer Strength',
   'developpe-epaules-hammer-strength',
   ARRAY['front_delt'], ARRAY['lateral_delt','triceps'],
   'plate_loaded', 'compound', 'push', 2, TRUE),

  ('Hammer Strength Leg Press',
   'Presse à Cuisses Hammer Strength',
   'presse-cuisses-hammer-strength',
   ARRAY['quads'], ARRAY['glutes','hamstrings'],
   'plate_loaded', 'compound', 'push', 2, TRUE),

  -- Iliac
  ('Iliac Pulldown',
   'Tirage Vertical Iliac',
   'tirage-vertical-iliac',
   ARRAY['latissimus'], ARRAY['biceps','rear_delt','teres_major'],
   'machine', 'compound', 'pull', 2, TRUE),

  ('Iliac Lat Pulldown Unilateral',
   'Tirage Vertical Iliac Unilatéral',
   'tirage-vertical-iliac-unilateral',
   ARRAY['latissimus'], ARRAY['biceps','rear_delt'],
   'machine', 'compound', 'pull', 2, TRUE),

  -- GYM80 spécifiques
  ('GYM80 Chest Fly',
   'Butterfly GYM80',
   'butterfly-gym80',
   ARRAY['chest'], ARRAY['front_delt'],
   'machine', 'isolation', 'push', 1, TRUE),

  ('GYM80 Seated Row',
   'Rowing Assis GYM80',
   'rowing-assis-gym80',
   ARRAY['mid_back'], ARRAY['biceps','rear_delt','latissimus'],
   'machine', 'compound', 'pull', 2, TRUE)

ON CONFLICT (slug) DO NOTHING;

-- Marquer les nouveaux exercices unilatéraux
UPDATE exercises_library SET is_unilateral = TRUE
WHERE slug IN (
  'rowing-iso-lateral-hammer-strength',
  'tirage-vertical-iliac-unilateral'
);

-- ── 3. Aliases argot + marques ─────────────────────────────────────────────────
-- Insérer les aliases en utilisant les slugs des exercices

INSERT INTO exercise_aliases (exercise_id, alias, brand, alias_type)
SELECT e.id, a.alias, a.brand, a.alias_type
FROM exercises_library e
JOIN (VALUES
  -- ── Argot / abréviations universels ──
  ('squat-barre',                     'squat',              NULL, 'slang'),
  ('squat-barre',                     'back squat',         NULL, 'slang'),
  ('squat-barre',                     'low bar',            NULL, 'slang'),
  ('squat-barre',                     'high bar',           NULL, 'slang'),
  ('soulevé-de-terre',                'deadlift',           NULL, 'slang'),
  ('soulevé-de-terre',                'dl',                 NULL, 'abbreviation'),
  ('soulevé-de-terre-roumain',        'rdl',                NULL, 'abbreviation'),
  ('soulevé-de-terre-roumain',        'romanian deadlift',  NULL, 'slang'),
  ('fente-bulgare',                   'bulgarian split squat', NULL, 'slang'),
  ('fente-bulgare',                   'bulgarian',          NULL, 'slang'),
  ('hip-thrust-barre',                'hip thrust',         NULL, 'slang'),
  ('nordic-curl',                     'nordic',             NULL, 'slang'),
  ('glute-ham-raise',                 'ghr',                NULL, 'abbreviation'),
  ('glute-ham-raise',                 'ghd',                NULL, 'abbreviation'),
  ('développé-couché-barre',          'bench',              NULL, 'slang'),
  ('développé-couché-barre',          'flat bench',         NULL, 'slang'),
  ('développé-couché-barre',          'bp',                 NULL, 'abbreviation'),
  ('développé-incliné-barre',         'incline bench',      NULL, 'slang'),
  ('développé-décliné-barre',         'décline',            NULL, 'slang'),
  ('butterfly-machine',               'pec deck',           NULL, 'slang'),
  ('butterfly-machine',               'peck deck',          NULL, 'slang'),
  ('butterfly-machine',               'butterfly',          NULL, 'slang'),
  ('butterfly-câbles',                'fly cable',          NULL, 'slang'),
  ('tirage-vertical-barre',           'lat pulldown',       NULL, 'slang'),
  ('tirage-vertical-barre',           'pull down',          NULL, 'slang'),
  ('tirage-horizontal-câble',         'seated row',         NULL, 'slang'),
  ('tirage-horizontal-câble',         'cable row',          NULL, 'slang'),
  ('rowing-barre-penché',             't-bar row',          NULL, 'slang'),
  ('rowing-barre-penché',             'pendlay row',        NULL, 'slang'),
  ('rowing-barre-penché',             'meadows row',        NULL, 'slang'),
  ('traction',                        'pull up',            NULL, 'slang'),
  ('traction',                        'pullup',             NULL, 'slang'),
  ('traction',                        'chin up',            NULL, 'slang'),
  ('développé-militaire',             'ohp',                NULL, 'abbreviation'),
  ('développé-militaire',             'overhead press',     NULL, 'slang'),
  ('développé-militaire',             'military press',     NULL, 'slang'),
  ('curl-barre',                      'barbell curl',       NULL, 'slang'),
  ('curl-haltère-alterné',            'dumbbell curl',      NULL, 'slang'),
  ('curl-prise-marteau',              'hammer curl',        NULL, 'slang'),
  ('extension-triceps-barre',         'skull crusher',      NULL, 'slang'),
  ('extension-triceps-barre',         'skullcrusher',       NULL, 'slang'),
  ('extension-triceps-barre',         'french press',       NULL, 'slang'),
  ('dips-triceps',                    'dips',               NULL, 'slang'),
  ('élévation-latérale-haltère',      'lateral raise',      NULL, 'slang'),
  ('face-pull-câble',                 'face pull',          NULL, 'slang'),
  ('shrug-barre',                     'shrug',              NULL, 'slang'),
  ('gainage-planche',                 'planche',            NULL, 'slang'),
  ('crunch-câble',                    'crunch cable',       NULL, 'slang'),

  -- ── Hammer Strength ──
  ('presse-pectorale-hammer-strength', 'hammer chest',      'hammer_strength', 'brand'),
  ('presse-pectorale-hammer-strength', 'hs chest press',    'hammer_strength', 'brand'),
  ('presse-pectorale-hammer-strength', 'mts chest',         'hammer_strength', 'brand'),
  ('developpe-incline-hammer-strength','hammer incline',    'hammer_strength', 'brand'),
  ('developpe-incline-hammer-strength','hs incline',        'hammer_strength', 'brand'),
  ('tirage-bas-hammer-strength',       'hammer low row',    'hammer_strength', 'brand'),
  ('tirage-bas-hammer-strength',       'hs low row',        'hammer_strength', 'brand'),
  ('rowing-iso-lateral-hammer-strength','iso row',          'hammer_strength', 'brand'),
  ('rowing-iso-lateral-hammer-strength','iso lateral row',  'hammer_strength', 'brand'),
  ('rowing-iso-lateral-hammer-strength','hammer iso row',   'hammer_strength', 'brand'),
  ('rowing-dy-hammer-strength',        'dy row',            'hammer_strength', 'brand'),
  ('rowing-dy-hammer-strength',        'hammer dy',         'hammer_strength', 'brand'),
  ('developpe-epaules-hammer-strength','hammer shoulder',   'hammer_strength', 'brand'),
  ('presse-cuisses-hammer-strength',   'hammer leg press',  'hammer_strength', 'brand'),

  -- ── Iliac ──
  ('tirage-vertical-iliac',            'iliac',             'iliac', 'brand'),
  ('tirage-vertical-iliac',            'iliac pulldown',    'iliac', 'brand'),
  ('tirage-vertical-iliac',            'pulldown iliac',    'iliac', 'brand'),
  ('tirage-vertical-iliac-unilateral', 'iliac unilateral',  'iliac', 'brand'),

  -- ── GYM80 ──
  ('butterfly-gym80',                  'gym80 fly',         'gym80', 'brand'),
  ('butterfly-gym80',                  'pec deck gym80',    'gym80', 'brand'),
  ('rowing-assis-gym80',               'gym80 row',         'gym80', 'brand'),
  ('rowing-assis-gym80',               'gym80 seated row',  'gym80', 'brand'),

  -- ── Technogym ──
  ('cable-crossover',                  'kinesis',           'technogym', 'brand'),
  ('cable-crossover',                  'kinesis cable',     'technogym', 'brand'),

  -- ── Life Fitness ──
  ('tirage-vertical-barre',            'g7 pulldown',       'life_fitness', 'brand'),
  ('développé-couché-barre',           'g7 chest press',    'life_fitness', 'brand'),
  ('butterfly-machine',                'g7 pec fly',        'life_fitness', 'brand'),

  -- ── Precor / Icarian ──
  ('soulevé-de-terre-roumain',         'icarian rdl',       'precor', 'brand'),
  ('tirage-vertical-barre',            'icarian pulldown',  'precor', 'brand')

) AS a(slug, alias, brand, alias_type) ON e.slug = a.slug
ON CONFLICT DO NOTHING;

-- ── 4. Vérification ───────────────────────────────────────────────────────────
SELECT
  e.name_fr,
  count(a.id) AS nb_aliases
FROM exercises_library e
LEFT JOIN exercise_aliases a ON a.exercise_id = e.id
WHERE a.id IS NOT NULL
GROUP BY e.name_fr
ORDER BY nb_aliases DESC
LIMIT 20;
