-- ============================================================
-- ForgeIQ — Exercices & Aliases Sprint 7b
-- Ajouts : Squat Pendule, Hammer Strength machines jambes ISO
--          + aliases courts "hammer" / "hs" pour toutes HS machines
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ── 1. Nouveaux exercices ─────────────────────────────────────────────────────

INSERT INTO exercises_library
  (name, name_fr, slug, muscle_primary, muscle_secondary,
   equipment, category, force_type, difficulty, instructions, tips, is_system)
VALUES

  -- ── Squat Pendule (Pendulum Squat) ───────────────────────────────────────
  ('Pendulum Squat',
   'Squat Pendule',
   'squat-pendule',
   ARRAY['quads','glutes'], ARRAY['hamstrings'],
   'plate_loaded', 'compound', 'legs', 2,
   'Debout sur la plateforme, dos contre le dossier incliné, épaules sous les coussins. Descends en flexion complète en laissant les genoux avancer — la mécanique pendulaire centre la charge. Remonte en poussant avec les talons.',
   'Contrairement au hack squat, le squat pendule permet une flexion plus profonde avec moins de contrainte lombaire. La machine GYM80 est la référence. Pieds à largeur d''épaules, pointes légèrement tournées vers l''extérieur.',
   TRUE),

  -- ── Hammer Strength ISO Lateral Leg Press ────────────────────────────────
  ('Hammer Strength ISO Lateral Leg Press',
   'Presse Cuisses ISO Latérale Hammer Strength',
   'presse-cuisses-hammer-strength',
   ARRAY['quads','glutes'], ARRAY['hamstrings'],
   'plate_loaded', 'compound', 'legs', 2,
   'Assis, dos contre le dossier, pieds sur les plateformes. Les deux jambes travaillent indépendamment (ISO latéral). Pousse jusqu''à quasi-extension, reviens jusqu''à 90° ou plus selon ta mobilité.',
   'La presse ISO latérale corrige les déséquilibres entre jambes droite et gauche. Varie la position des pieds pour cibler quads (pieds bas) ou fessiers (pieds hauts). Machine plate-loaded — charge en kg de chaque côté.',
   TRUE),

  -- ── Hammer Strength ISO Lateral Leg Curl ─────────────────────────────────
  ('Hammer Strength ISO Lateral Lying Leg Curl',
   'Leg Curl Couché ISO Latéral Hammer Strength',
   'hammer-iso-leg-curl',
   ARRAY['hamstrings'], ARRAY['glutes','calves'],
   'plate_loaded', 'isolation', 'legs', 2,
   'Allongé face vers le bas, chevilles sous les coussins. Les deux jambes travaillent indépendamment. Fléchis les genoux jusqu''à 90° ou plus en contractant les ischios. Descends lentement sur 3 secondes.',
   'La version ISO latérale corrige les asymétries ischiotibiales fréquentes chez les sportifs. Plus stable que la version machine classique. La qualité de la contraction excentrique (descente) est aussi importante que la montée.',
   TRUE),

  -- ── Hammer Strength ISO Lateral Leg Extension ────────────────────────────
  ('Hammer Strength ISO Lateral Leg Extension',
   'Extension Jambes ISO Latérale Hammer Strength',
   'hammer-iso-leg-extension',
   ARRAY['quads'], ARRAY[]::text[],
   'plate_loaded', 'isolation', 'legs', 2,
   'Assis, dos contre le dossier, chevilles sous les coussins. Les deux jambes travaillent indépendamment. Tends les jambes jusqu''à verrouillage en contractant les quadriceps. Maintiens 1 seconde en haut.',
   'Isole parfaitement les quadriceps sans compensation. La version ISO latérale corrige les déséquilibres quad. Commence avec le même poids des deux côtés, ajuste si tu détectes un côté plus faible.',
   TRUE),

  -- ── Hammer Strength ISO Lateral Seated Leg Curl ──────────────────────────
  ('Hammer Strength ISO Lateral Seated Leg Curl',
   'Leg Curl Assis ISO Latéral Hammer Strength',
   'hammer-iso-seated-leg-curl',
   ARRAY['hamstrings'], ARRAY['glutes'],
   'plate_loaded', 'isolation', 'legs', 2,
   'Assis, dos droit, chevilles sur les rouleaux. Les deux jambes travaillent indépendamment. Fléchis les genoux vers le bas contre la résistance en contractant les ischios.',
   'La position assise étire les ischios différemment de la version couchée (le genou est déjà fléchi en haut). Combiné avec le curl couché pour un développement complet des ischios.',
   TRUE)

ON CONFLICT (slug) DO NOTHING;

-- Marquer les nouvelles machines ISO comme unilatérales
UPDATE exercises_library
SET is_unilateral = TRUE
WHERE slug IN (
  'presse-cuisses-hammer-strength',
  'hammer-iso-leg-curl',
  'hammer-iso-leg-extension',
  'hammer-iso-seated-leg-curl'
);

-- ── 2. Aliases ────────────────────────────────────────────────────────────────

INSERT INTO exercise_aliases (exercise_id, alias, brand, alias_type)
SELECT e.id, a.alias, a.brand, a.alias_type
FROM exercises_library e
JOIN (VALUES

  -- ── Squat Pendule — noms exacts des plaques + recherche intuitive ─────────
  ('squat-pendule', 'Squat Pendule',             NULL,          'slang'),
  ('squat-pendule', 'Pendulum Squat',             NULL,          'slang'),
  ('squat-pendule', 'Pendule Squat',              NULL,          'slang'),
  ('squat-pendule', 'Pendulum',                   NULL,          'slang'),
  ('squat-pendule', 'Squat Pendulum',             NULL,          'slang'),
  -- GYM80 (texte exact de la machine)
  ('squat-pendule', 'PENDULUM SQUAT',             'gym80',       'brand'),
  ('squat-pendule', 'Pendulum Squat',             'gym80',       'brand'),
  ('squat-pendule', 'GYM80 Pendulum',             'gym80',       'brand'),
  ('squat-pendule', 'GYM80 Squat Pendule',        'gym80',       'brand'),
  -- Autres marques qui ont un pendulum squat
  ('squat-pendule', 'Pendulum Squat',             'hammer_strength', 'brand'),
  ('squat-pendule', 'HS Pendulum',                'hammer_strength', 'brand'),

  -- ── Presse Cuisses ISO Latérale Hammer Strength ───────────────────────────
  ('presse-cuisses-hammer-strength', 'Hammer',                    'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'HS',                        'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'Hammer Strength',           'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'Hammer Leg Press',          'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'HS Leg Press',              'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'ISO LATERAL LEG PRESS',     'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'Iso Lateral Leg Press',     'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'GROUND BASE LEG PRESS',     'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'Ground Base Leg Press',     'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'Presse Cuisses Hammer',     NULL,             'slang'),
  ('presse-cuisses-hammer-strength', 'Hammer Presse',             NULL,             'slang'),

  -- ── Leg Curl Couché ISO Hammer ────────────────────────────────────────────
  ('hammer-iso-leg-curl', 'Hammer',                        'hammer_strength','brand'),
  ('hammer-iso-leg-curl', 'HS',                            'hammer_strength','brand'),
  ('hammer-iso-leg-curl', 'Hammer Strength',               'hammer_strength','brand'),
  ('hammer-iso-leg-curl', 'Hammer Leg Curl',               'hammer_strength','brand'),
  ('hammer-iso-leg-curl', 'HS Leg Curl',                   'hammer_strength','brand'),
  ('hammer-iso-leg-curl', 'ISO LATERAL LYING LEG CURL',    'hammer_strength','brand'),
  ('hammer-iso-leg-curl', 'Iso Lateral Lying Leg Curl',    'hammer_strength','brand'),
  ('hammer-iso-leg-curl', 'LYING LEG CURL',                'hammer_strength','brand'),
  ('hammer-iso-leg-curl', 'Leg Curl Couché Hammer',        NULL,             'slang'),
  ('hammer-iso-leg-curl', 'Ischios Hammer',                NULL,             'slang'),

  -- ── Extension Jambes ISO Hammer ───────────────────────────────────────────
  ('hammer-iso-leg-extension', 'Hammer',                          'hammer_strength','brand'),
  ('hammer-iso-leg-extension', 'HS',                              'hammer_strength','brand'),
  ('hammer-iso-leg-extension', 'Hammer Strength',                 'hammer_strength','brand'),
  ('hammer-iso-leg-extension', 'Hammer Leg Extension',            'hammer_strength','brand'),
  ('hammer-iso-leg-extension', 'HS Leg Extension',                'hammer_strength','brand'),
  ('hammer-iso-leg-extension', 'ISO LATERAL LEG EXTENSION',       'hammer_strength','brand'),
  ('hammer-iso-leg-extension', 'Iso Lateral Leg Extension',       'hammer_strength','brand'),
  ('hammer-iso-leg-extension', 'Extension Quads Hammer',          NULL,             'slang'),
  ('hammer-iso-leg-extension', 'Quads Hammer',                    NULL,             'slang'),

  -- ── Leg Curl Assis ISO Hammer ─────────────────────────────────────────────
  ('hammer-iso-seated-leg-curl', 'Hammer',                           'hammer_strength','brand'),
  ('hammer-iso-seated-leg-curl', 'HS',                               'hammer_strength','brand'),
  ('hammer-iso-seated-leg-curl', 'Hammer Strength',                  'hammer_strength','brand'),
  ('hammer-iso-seated-leg-curl', 'Hammer Seated Leg Curl',           'hammer_strength','brand'),
  ('hammer-iso-seated-leg-curl', 'HS Seated Leg Curl',               'hammer_strength','brand'),
  ('hammer-iso-seated-leg-curl', 'ISO LATERAL SEATED LEG CURL',      'hammer_strength','brand'),
  ('hammer-iso-seated-leg-curl', 'Iso Lateral Seated Leg Curl',      'hammer_strength','brand'),
  ('hammer-iso-seated-leg-curl', 'Leg Curl Assis Hammer',            NULL,             'slang'),
  ('hammer-iso-seated-leg-curl', 'Ischios Assis Hammer',             NULL,             'slang'),

  -- ── Aliases courts "hammer" / "hs" sur toutes les machines Hammer ─────────
  -- (permet de trouver n'importe quelle machine en tapant juste "hammer" ou "hs")
  ('presse-pectorale-hammer-strength',  'Hammer',  'hammer_strength','brand'),
  ('presse-pectorale-hammer-strength',  'HS',      'hammer_strength','brand'),
  ('developpe-incline-hammer-strength', 'Hammer',  'hammer_strength','brand'),
  ('developpe-incline-hammer-strength', 'HS',      'hammer_strength','brand'),
  ('developpe-epaules-hammer-strength', 'Hammer',  'hammer_strength','brand'),
  ('developpe-epaules-hammer-strength', 'HS',      'hammer_strength','brand'),
  ('hammer-iso-lat-pulldown',           'Hammer',  'hammer_strength','brand'),
  ('hammer-iso-lat-pulldown',           'HS',      'hammer_strength','brand'),
  ('hammer-iso-lat-high-row',           'Hammer',  'hammer_strength','brand'),
  ('hammer-iso-lat-high-row',           'HS',      'hammer_strength','brand')

) AS a(slug, alias, brand, alias_type)
  ON e.slug = a.slug
ON CONFLICT (exercise_id, alias_norm) DO NOTHING;
