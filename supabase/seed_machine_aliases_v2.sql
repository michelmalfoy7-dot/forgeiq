-- ============================================================
-- ForgeIQ — Machines & Aliases marques v2
-- Couverture exhaustive : noms exacts des plaques + toutes marques
-- Objectif : un débutant peut trouver sa machine en tapant
--            exactement ce qui est écrit dessus
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ── 0. Contrainte unique (idempotente) ───────────────────────────────────────
-- Empêche les doublons si le script est relancé
ALTER TABLE exercise_aliases DROP CONSTRAINT IF EXISTS uniq_alias_per_exercise;
ALTER TABLE exercise_aliases
  ADD CONSTRAINT uniq_alias_per_exercise UNIQUE (exercise_id, alias_norm);

-- ── 1. Nouveaux exercices machines ───────────────────────────────────────────

INSERT INTO exercises_library
  (name, name_fr, slug, muscle_primary, muscle_secondary,
   equipment, category, force_type, difficulty, instructions, tips, is_system)
VALUES

  -- ── Hammer Strength — compléments ────────────────────────────────────────
  ('Hammer Strength ISO Lateral Front Lat Pulldown',
   'Tirage Frontal ISO Latéral Hammer Strength',
   'hammer-iso-lat-pulldown',
   ARRAY['latissimus'], ARRAY['biceps','rear_delt','teres_major'],
   'plate_loaded', 'compound', 'pull', 2,
   'Assis face à la machine, règle la hauteur du siège. Attrape les poignées et tire vers les épaules en gardant les coudes pointés vers le bas. Les deux bras travaillent indépendamment.',
   'La traction ISO latérale corrige les déséquilibres entre les deux côtés du dos. Tire avec les coudes, pas avec les mains.',
   TRUE),

  ('Hammer Strength ISO Lateral High Row',
   'Tirage Haut ISO Latéral Hammer Strength',
   'hammer-iso-lat-high-row',
   ARRAY['upper_back','latissimus'], ARRAY['biceps','rear_delt','teres_major'],
   'plate_loaded', 'compound', 'pull', 2,
   'Debout ou assis face à la machine. Tire les poignées vers les hanches en gardant les coudes légèrement écartés. Les deux bras travaillent indépendamment.',
   'Combine les bénéfices du tirage vertical et horizontal. Excellent pour le développement de la largeur et de l''épaisseur du dos.',
   TRUE),

  -- ── Machine Hip Thrust / Glute Drive ─────────────────────────────────────
  ('Hip Thrust Machine',
   'Machine Hip Thrust / Glute Drive',
   'hip-thrust-machine',
   ARRAY['glutes'], ARRAY['hamstrings','lower_back'],
   'machine', 'compound', 'legs', 1,
   'Assis dans la machine, positionne le coussin sur les hanches (pas sur le ventre). Pousse les hanches vers le haut jusqu''à extension complète en contractant les fessiers. Maintiens 1 à 2 secondes en haut. Reviens lentement.',
   'Machine idéale pour isoler les fessiers sans contrainte lombaire. Règle le siège pour que les genoux soient à 90° en position basse.',
   TRUE),

  -- ── Extension du dos ─────────────────────────────────────────────────────
  ('Back Extension Machine',
   'Machine Extension du Dos',
   'back-extension-machine',
   ARRAY['lower_back','glutes'], ARRAY['hamstrings'],
   'machine', 'isolation', 'pull', 1,
   'Assis dans la machine, chevilles bloquées sous les coussins. Penche le buste en avant en contrôlant, puis contracte les lombaires pour revenir à la verticale. Ne dépasse pas la position droite.',
   'Arrête-toi à la position verticale — l''hyperextension n''est pas nécessaire et peut blesser. Ajoute du poids progressivement une fois la technique maîtrisée.',
   TRUE),

  -- ── Abdominaux machine ────────────────────────────────────────────────────
  ('Abdominal Crunch Machine',
   'Machine Abdominaux',
   'abdominal-crunch-machine',
   ARRAY['abs'], ARRAY['hip_flexors'],
   'machine', 'isolation', 'core', 1,
   'Assis, coudes sur les coussins. Contracte les abdominaux pour ramener les coudes vers les genoux. Contrôle le retour lentement sur 2-3 secondes. Expire à la contraction.',
   'Ne tire pas avec les épaules — concentre toute la force sur les abdominaux. Utile en fin de séance pour finir les abdos sans risque.',
   TRUE),

  -- ── Rotation du torse ─────────────────────────────────────────────────────
  ('Rotary Torso Machine',
   'Machine Rotation du Torse',
   'rotary-torso-machine',
   ARRAY['obliques'], ARRAY['abs','core'],
   'machine', 'isolation', 'core', 1,
   'Assis, poignée ou coussin contre la poitrine. Tourne le buste d''un côté contre la résistance de manière contrôlée. Reviens lentement. Travaille les deux côtés de façon symétrique.',
   'Mouvement lent et contrôlé — évite l''élan. Garde les hanches fixes pendant tout le mouvement.',
   TRUE),

  -- ── Deltoïdes postérieurs machine ─────────────────────────────────────────
  ('Rear Delt Machine',
   'Machine Deltoïdes Postérieurs',
   'rear-delt-machine',
   ARRAY['rear_delt'], ARRAY['mid_back','traps'],
   'machine', 'isolation', 'pull', 1,
   'Assis face au dossier, poignées à hauteur des épaules. Tire les poignées vers l''arrière en gardant les bras presque horizontaux. Contraction maximale en fin de mouvement. Reviens lentement.',
   'Muscle souvent négligé mais essentiel pour la santé des épaules et la posture. Utilise des charges légères et concentre-toi sur la contraction.',
   TRUE),

  -- ── Presse horizontale (vs 45°) ───────────────────────────────────────────
  ('Seated Leg Press',
   'Presse à Cuisses Horizontale',
   'seated-leg-press',
   ARRAY['quads','glutes'], ARRAY['hamstrings'],
   'machine', 'compound', 'legs', 1,
   'Assis dos droit contre le dossier, pieds sur la plateforme à largeur d''épaules. Pousse la plateforme vers l''avant jusqu''à quasi-extension — ne verrouille pas les genoux. Reviens lentement jusqu''à 90°.',
   'Position horizontale vs 45° de la presse inclinée classique. Varie l''écartement des pieds : pieds hauts = plus de fessiers, pieds bas = plus de quads.',
   TRUE),

  -- ── GHD ───────────────────────────────────────────────────────────────────
  ('GHD Machine',
   'Machine GHD — Glute Ham Developer',
   'ghd-machine',
   ARRAY['hamstrings','glutes'], ARRAY['lower_back','calves'],
   'machine', 'compound', 'legs', 3,
   'Pieds bloqués dans la machine, hanches sur le coussin. Descends en contrôlant la résistance des ischios, puis remonte en contractant les ischios et les fessiers.',
   'Exercice exigeant — commence avec une assistance élastique si nécessaire. Un des meilleurs exercices de prévention des blessures aux ischios.',
   TRUE),

  -- ── Smith Machine ─────────────────────────────────────────────────────────
  ('Smith Machine Squat',
   'Squat Smith Machine',
   'smith-machine-squat',
   ARRAY['quads','glutes'], ARRAY['hamstrings','lower_back'],
   'machine', 'compound', 'legs', 2,
   'Barre guidée sur rails verticaux. Pieds légèrement devant le corps (plus que pour un squat barre libre). Descends jusqu''aux cuisses parallèles. Décroche la barre en fin de série par rotation.',
   'Idéal pour s''entraîner seul sans pareur. Les pieds plus en avant qu''un squat libre pour compenser le guidage vertical.',
   TRUE),

  ('Smith Machine Bench Press',
   'Développé Couché Smith Machine',
   'smith-machine-bench-press',
   ARRAY['chest'], ARRAY['triceps','front_delt'],
   'machine', 'compound', 'push', 2,
   'Allongé sur le banc, barre guidée sur rails. Même mouvement que le développé couché barre. Décroche et recroche la barre en fin de série par rotation des poignets.',
   'Permet de s''entraîner seul sans pareur. Le guidage réduit le travail des stabilisateurs — bon complément mais pas un remplacement du développé libre.',
   TRUE),

  ('Smith Machine Romanian Deadlift',
   'Soulevé Roumain Smith Machine',
   'smith-machine-rdl',
   ARRAY['hamstrings','glutes'], ARRAY['lower_back'],
   'machine', 'isolation', 'legs', 2,
   'Debout, barre guidée devant les cuisses. Penche-toi en avant avec le dos droit en poussant les hanches vers l''arrière jusqu''à sentir l''étirement des ischios. Reviens en poussant les hanches vers l''avant.',
   'La barre guidée aide à maintenir la trajectoire verticale. Excellent pour apprendre le mouvement de hip hinge.',
   TRUE)

ON CONFLICT (slug) DO NOTHING;

-- Marquer les exercices ISO latéraux comme unilatéraux
UPDATE exercises_library
SET is_unilateral = TRUE
WHERE slug IN (
  'hammer-iso-lat-pulldown',
  'hammer-iso-lat-high-row'
);

-- ── 2. Aliases exhaustifs ─────────────────────────────────────────────────────
-- Noms exacts des plaques + noms marques pour toutes les machines
-- Le débutant tape ce qu'il lit sur la machine → il trouve l'exercice

INSERT INTO exercise_aliases (exercise_id, alias, brand, alias_type)
SELECT e.id, a.alias, a.brand, a.alias_type
FROM exercises_library e
JOIN (VALUES

  -- ══════════════════════════════════════════════════════════════════════════
  -- PRESSE PECTORALE / CHEST PRESS MACHINE
  -- ══════════════════════════════════════════════════════════════════════════
  -- Noms génériques (ce que les gens cherchent)
  ('machine-chest-press',  'Chest Press',              NULL,          'slang'),
  ('machine-chest-press',  'Presse Pectorale',         NULL,          'slang'),
  ('machine-chest-press',  'Chest Press Machine',      NULL,          'slang'),
  ('machine-chest-press',  'Machine Pectoraux',        NULL,          'slang'),
  ('machine-chest-press',  'Machine Poitrine',         NULL,          'slang'),
  -- Life Fitness (texte exact sur la plaque)
  ('machine-chest-press',  'Chest Press',              'life_fitness','brand'),
  ('machine-chest-press',  'G7 Chest Press',           'life_fitness','brand'),
  ('machine-chest-press',  'Signature Chest Press',    'life_fitness','brand'),
  -- Technogym (texte exact)
  ('machine-chest-press',  'Chest Press',              'technogym',   'brand'),
  ('machine-chest-press',  'Selection Chest Press',    'technogym',   'brand'),
  ('machine-chest-press',  'Pure Strength Chest',      'technogym',   'brand'),
  ('machine-chest-press',  'Excite Chest Press',       'technogym',   'brand'),
  -- Matrix
  ('machine-chest-press',  'Chest Press',              'matrix',      'brand'),
  ('machine-chest-press',  'Aura Chest Press',         'matrix',      'brand'),
  ('machine-chest-press',  'Magnum Chest Press',       'matrix',      'brand'),
  -- Precor / Icarian
  ('machine-chest-press',  'Chest Press',              'precor',      'brand'),
  ('machine-chest-press',  'Discovery Chest Press',    'precor',      'brand'),
  ('machine-chest-press',  'Icarian Chest Press',      'precor',      'brand'),
  -- GYM80
  ('machine-chest-press',  'Brust Press',              'gym80',       'brand'),
  ('machine-chest-press',  'GYM80 Chest Press',        'gym80',       'brand'),
  -- Panatta (marque italienne)
  ('machine-chest-press',  'Chest Press',              'panatta',     'brand'),
  ('machine-chest-press',  'Multi Press Panatta',      'panatta',     'brand'),
  -- BH Fitness
  ('machine-chest-press',  'Chest Press',              'bh_fitness',  'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- HAMMER STRENGTH — POITRINE (noms exacts des plaques)
  -- ══════════════════════════════════════════════════════════════════════════
  ('presse-pectorale-hammer-strength', 'ISO LATERAL CHEST PRESS',  'hammer_strength','brand'),
  ('presse-pectorale-hammer-strength', 'Iso Lateral Chest Press',  'hammer_strength','brand'),
  ('presse-pectorale-hammer-strength', 'MTS Chest Press',          'hammer_strength','brand'),
  ('presse-pectorale-hammer-strength', 'HS Chest Press',           'hammer_strength','brand'),
  ('presse-pectorale-hammer-strength', 'Hammer Chest',             'hammer_strength','brand'),
  -- Développé incliné HS
  ('developpe-incline-hammer-strength','ISO LATERAL INCLINE PRESS','hammer_strength','brand'),
  ('developpe-incline-hammer-strength','Iso Lateral Incline Press','hammer_strength','brand'),
  ('developpe-incline-hammer-strength','MTS Incline Press',        'hammer_strength','brand'),
  ('developpe-incline-hammer-strength','HS Incline Press',         'hammer_strength','brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- BUTTERFLY / PEC FLY / PEC DECK
  -- ══════════════════════════════════════════════════════════════════════════
  -- pec-deck (seed_exercises_extra)
  ('pec-deck',  'Pec Deck',            NULL,          'slang'),
  ('pec-deck',  'Butterfly',           NULL,          'slang'),
  ('pec-deck',  'Butterfly Machine',   NULL,          'slang'),
  ('pec-deck',  'Pec Fly Machine',     NULL,          'slang'),
  ('pec-deck',  'Chest Fly Machine',   NULL,          'slang'),
  ('pec-deck',  'Machine Butterfly',   NULL,          'slang'),
  -- Life Fitness
  ('pec-deck',  'Pec Fly',             'life_fitness','brand'),
  ('pec-deck',  'G7 Pec Fly',          'life_fitness','brand'),
  ('pec-deck',  'Signature Pec Fly',   'life_fitness','brand'),
  -- Technogym
  ('pec-deck',  'Butterfly',           'technogym',   'brand'),
  ('pec-deck',  'Selection Butterfly', 'technogym',   'brand'),
  -- Matrix
  ('pec-deck',  'Pec Fly',             'matrix',      'brand'),
  ('pec-deck',  'Chest Fly',           'matrix',      'brand'),
  -- Precor
  ('pec-deck',  'Pec Fly',             'precor',      'brand'),
  -- machine-fly (seed_exercises_v2) — version sans dossier
  ('machine-fly','Pec Deck',           NULL,          'slang'),
  ('machine-fly','Pec Fly',            NULL,          'slang'),
  ('machine-fly','Butterfly',          NULL,          'slang'),
  ('machine-fly','Chest Fly',          NULL,          'slang'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- DÉVELOPPÉ ÉPAULES MACHINE / SHOULDER PRESS MACHINE
  -- ══════════════════════════════════════════════════════════════════════════
  ('machine-shoulder-press',  'Shoulder Press',              NULL,          'slang'),
  ('machine-shoulder-press',  'Overhead Press Machine',      NULL,          'slang'),
  ('machine-shoulder-press',  'Military Press Machine',      NULL,          'slang'),
  ('machine-shoulder-press',  'Machine Épaules',             NULL,          'slang'),
  ('machine-shoulder-press',  'Développé Épaules Machine',   NULL,          'slang'),
  -- Life Fitness
  ('machine-shoulder-press',  'Shoulder Press',              'life_fitness','brand'),
  ('machine-shoulder-press',  'G7 Shoulder Press',           'life_fitness','brand'),
  -- Technogym
  ('machine-shoulder-press',  'Shoulder Press',              'technogym',   'brand'),
  ('machine-shoulder-press',  'Selection Shoulder Press',    'technogym',   'brand'),
  -- Matrix
  ('machine-shoulder-press',  'Shoulder Press',              'matrix',      'brand'),
  ('machine-shoulder-press',  'Aura Shoulder Press',         'matrix',      'brand'),
  -- Precor
  ('machine-shoulder-press',  'Shoulder Press',              'precor',      'brand'),
  -- Hammer Strength (exact plate text)
  ('developpe-epaules-hammer-strength','ISO LATERAL SHOULDER PRESS','hammer_strength','brand'),
  ('developpe-epaules-hammer-strength','Iso Lateral Shoulder Press','hammer_strength','brand'),
  ('developpe-epaules-hammer-strength','MTS Shoulder Press',        'hammer_strength','brand'),
  ('developpe-epaules-hammer-strength','HS Shoulder Press',         'hammer_strength','brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- ÉLÉVATION LATÉRALE MACHINE / LATERAL RAISE MACHINE
  -- ══════════════════════════════════════════════════════════════════════════
  ('machine-lateral-raise',  'Lateral Raise Machine',   NULL,          'slang'),
  ('machine-lateral-raise',  'Shoulder Fly Machine',    NULL,          'slang'),
  ('machine-lateral-raise',  'Side Delt Machine',       NULL,          'slang'),
  ('machine-lateral-raise',  'Machine Élévation',       NULL,          'slang'),
  -- Life Fitness
  ('machine-lateral-raise',  'Lateral Raise',           'life_fitness','brand'),
  -- Technogym
  ('machine-lateral-raise',  'Lateral Raise',           'technogym',   'brand'),
  ('machine-lateral-raise',  'Selection Lateral Raise', 'technogym',   'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- DELTOÏDES POSTÉRIEURS / REAR DELT
  -- ══════════════════════════════════════════════════════════════════════════
  ('rear-delt-machine',  'Rear Delt Machine',    NULL,          'slang'),
  ('rear-delt-machine',  'Rear Delt',            NULL,          'slang'),
  ('rear-delt-machine',  'Reverse Fly Machine',  NULL,          'slang'),
  ('rear-delt-machine',  'Pec Deck Reverse',     NULL,          'slang'),
  ('rear-delt-machine',  'Deltoïdes Arrière',    NULL,          'slang'),
  ('rear-delt-machine',  'Écarté Arrière',       NULL,          'slang'),
  -- Life Fitness
  ('rear-delt-machine',  'Rear Delt',            'life_fitness','brand'),
  ('rear-delt-machine',  'G7 Rear Delt',         'life_fitness','brand'),
  -- Technogym
  ('rear-delt-machine',  'Rear Deltoid',         'technogym',   'brand'),
  ('rear-delt-machine',  'Rear Delt',            'technogym',   'brand'),
  -- Matrix
  ('rear-delt-machine',  'Rear Delt',            'matrix',      'brand'),
  -- Precor
  ('rear-delt-machine',  'Rear Delt',            'precor',      'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- TIRAGE VERTICAL / LAT PULLDOWN
  -- ══════════════════════════════════════════════════════════════════════════
  ('lat-pulldown',  'Lat Pulldown',            NULL,          'slang'),
  ('lat-pulldown',  'Lat Machine',             NULL,          'slang'),
  ('lat-pulldown',  'Pull Down',               NULL,          'slang'),
  ('lat-pulldown',  'Tirage Poulie Haute',     NULL,          'slang'),
  ('lat-pulldown',  'Tirage Vertical Machine', NULL,          'slang'),
  ('lat-pulldown',  'Tirage Poitrine',         NULL,          'slang'),
  ('lat-pulldown',  'Tirage Nuque',            NULL,          'slang'),
  -- Life Fitness
  ('lat-pulldown',  'Lat Pulldown',            'life_fitness','brand'),
  ('lat-pulldown',  'G7 Lat Pulldown',         'life_fitness','brand'),
  ('lat-pulldown',  'Signature Lat Pulldown',  'life_fitness','brand'),
  -- Technogym (ils disent "Lat Machine", pas "Lat Pulldown")
  ('lat-pulldown',  'Lat Machine',             'technogym',   'brand'),
  ('lat-pulldown',  'Selection Lat Machine',   'technogym',   'brand'),
  ('lat-pulldown',  'Pure Strength Pulldown',  'technogym',   'brand'),
  -- Matrix
  ('lat-pulldown',  'Lat Pulldown',            'matrix',      'brand'),
  ('lat-pulldown',  'Aura Lat Pulldown',       'matrix',      'brand'),
  -- Precor / Icarian
  ('lat-pulldown',  'Lat Pulldown',            'precor',      'brand'),
  ('lat-pulldown',  'Icarian Pulldown',        'precor',      'brand'),
  -- GYM80
  ('lat-pulldown',  'GYM80 Lat Pulldown',      'gym80',       'brand'),
  -- Iliac (déjà dans migration_exercise_aliases mais on ajoute des variantes)
  ('tirage-vertical-iliac',  'Iliac Lat Machine',        'iliac','brand'),
  ('tirage-vertical-iliac',  'Iliac Lat Pulldown',       'iliac','brand'),
  ('tirage-vertical-iliac',  'Tirage Iliac',             'iliac','brand'),
  -- Hammer Strength ISO Lateral Pulldown
  ('hammer-iso-lat-pulldown', 'ISO LATERAL FRONT LAT PULLDOWN', 'hammer_strength','brand'),
  ('hammer-iso-lat-pulldown', 'Iso Lateral Front Lat Pulldown', 'hammer_strength','brand'),
  ('hammer-iso-lat-pulldown', 'ISO LATERAL WIDE PULLDOWN',      'hammer_strength','brand'),
  ('hammer-iso-lat-pulldown', 'Iso Lateral Wide Pulldown',      'hammer_strength','brand'),
  ('hammer-iso-lat-pulldown', 'MTS Pulldown',                   'hammer_strength','brand'),
  ('hammer-iso-lat-pulldown', 'HS Pulldown',                    'hammer_strength','brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- ROWING ASSIS / SEATED ROW
  -- ══════════════════════════════════════════════════════════════════════════
  ('seated-cable-row',  'Seated Row',          NULL,          'slang'),
  ('seated-cable-row',  'Low Row',             NULL,          'slang'),
  ('seated-cable-row',  'Cable Row',           NULL,          'slang'),
  ('seated-cable-row',  'Rowing Assis',        NULL,          'slang'),
  ('seated-cable-row',  'Tirage Horizontal',   NULL,          'slang'),
  ('seated-cable-row',  'Tirage Basse Poulie', NULL,          'slang'),
  -- Life Fitness
  ('seated-cable-row',  'Seated Row',          'life_fitness','brand'),
  ('seated-cable-row',  'G7 Seated Row',       'life_fitness','brand'),
  -- Technogym
  ('seated-cable-row',  'Low Row',             'technogym',   'brand'),
  ('seated-cable-row',  'Selection Low Row',   'technogym',   'brand'),
  ('seated-cable-row',  'Rowing',              'technogym',   'brand'),
  -- Matrix
  ('seated-cable-row',  'Seated Row',          'matrix',      'brand'),
  ('seated-cable-row',  'Low Row',             'matrix',      'brand'),
  -- Precor
  ('seated-cable-row',  'Seated Row',          'precor',      'brand'),
  ('seated-cable-row',  'Low Row',             'precor',      'brand'),
  -- GYM80
  ('rowing-assis-gym80', 'Rowing GYM80',       'gym80',       'brand'),
  ('rowing-assis-gym80', 'GYM80 Low Row',      'gym80',       'brand'),
  -- Hammer Strength rows (noms exacts plaques)
  ('tirage-bas-hammer-strength',         'ISO LATERAL LOW ROW',    'hammer_strength','brand'),
  ('tirage-bas-hammer-strength',         'Iso Lateral Low Row',    'hammer_strength','brand'),
  ('tirage-bas-hammer-strength',         'HS Low Row',             'hammer_strength','brand'),
  ('rowing-iso-lateral-hammer-strength', 'ISO LATERAL ROW',        'hammer_strength','brand'),
  ('rowing-iso-lateral-hammer-strength', 'Iso Lateral Row',        'hammer_strength','brand'),
  ('rowing-iso-lateral-hammer-strength', 'MTS Iso Row',            'hammer_strength','brand'),
  ('rowing-dy-hammer-strength',          'DY ROW',                 'hammer_strength','brand'),
  ('rowing-dy-hammer-strength',          'Hammer DY Row',          'hammer_strength','brand'),
  -- Hammer High Row
  ('hammer-iso-lat-high-row', 'ISO LATERAL HIGH ROW',  'hammer_strength','brand'),
  ('hammer-iso-lat-high-row', 'Iso Lateral High Row',  'hammer_strength','brand'),
  ('hammer-iso-lat-high-row', 'MTS High Row',          'hammer_strength','brand'),
  ('hammer-iso-lat-high-row', 'HS High Row',           'hammer_strength','brand'),
  -- Chest-supported row
  ('chest-supported-row', 'Chest Supported Row',       NULL,          'slang'),
  ('chest-supported-row', 'Incline Row Machine',       NULL,          'slang'),
  ('chest-supported-row', 'T-Bar Row Machine',         NULL,          'slang'),
  ('chest-supported-row', 'Rowing Soutenu',            NULL,          'slang'),
  ('chest-supported-row', 'MTS Incline Row',           'hammer_strength','brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- TIRAGE VERTICAL ILIAC UNILATÉRAL
  -- ══════════════════════════════════════════════════════════════════════════
  ('tirage-vertical-iliac-unilateral', 'Iliac Unilatéral',          'iliac','brand'),
  ('tirage-vertical-iliac-unilateral', 'Tirage Iliac Unilateral',   'iliac','brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- TRACTION ASSISTÉE / ASSISTED PULL-UP
  -- ══════════════════════════════════════════════════════════════════════════
  ('assisted-pull-up',  'Assisted Pull-Up',          NULL,          'slang'),
  ('assisted-pull-up',  'Traction Assistée',         NULL,          'slang'),
  ('assisted-pull-up',  'Gravitron',                 NULL,          'slang'),
  ('assisted-pull-up',  'Machine Traction',          NULL,          'slang'),
  ('assisted-pull-up',  'Traction Machine',          NULL,          'slang'),
  ('assisted-pull-up',  'Assisted Chin-Up',          NULL,          'slang'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- CURL BICEPS MACHINE / BICEP CURL MACHINE
  -- ══════════════════════════════════════════════════════════════════════════
  ('machine-curl',  'Bicep Curl Machine',      NULL,          'slang'),
  ('machine-curl',  'Curl Machine',            NULL,          'slang'),
  ('machine-curl',  'Preacher Curl Machine',   NULL,          'slang'),
  ('machine-curl',  'Biceps Machine',          NULL,          'slang'),
  ('machine-curl',  'Machine Curl Biceps',     NULL,          'slang'),
  -- Life Fitness
  ('machine-curl',  'Bicep Curl',              'life_fitness','brand'),
  ('machine-curl',  'G7 Bicep Curl',           'life_fitness','brand'),
  -- Technogym
  ('machine-curl',  'Biceps',                  'technogym',   'brand'),
  ('machine-curl',  'Selection Biceps',        'technogym',   'brand'),
  -- Precor
  ('machine-curl',  'Bicep Curl',              'precor',      'brand'),
  -- Matrix
  ('machine-curl',  'Bicep Curl',              'matrix',      'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- EXTENSION TRICEPS MACHINE / TRICEP MACHINE
  -- ══════════════════════════════════════════════════════════════════════════
  ('tricep-machine',  'Tricep Machine',            NULL,          'slang'),
  ('tricep-machine',  'Tricep Extension Machine',  NULL,          'slang'),
  ('tricep-machine',  'Tricep Press Machine',       NULL,          'slang'),
  ('tricep-machine',  'Machine Triceps',            NULL,          'slang'),
  -- Life Fitness
  ('tricep-machine',  'Tricep Extension',           'life_fitness','brand'),
  ('tricep-machine',  'G7 Tricep Extension',        'life_fitness','brand'),
  -- Technogym
  ('tricep-machine',  'Triceps',                    'technogym',   'brand'),
  ('tricep-machine',  'Selection Triceps',          'technogym',   'brand'),
  -- Precor
  ('tricep-machine',  'Tricep Extension',           'precor',      'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- PRESSE À CUISSES / LEG PRESS
  -- ══════════════════════════════════════════════════════════════════════════
  ('leg-press',  'Leg Press',              NULL,          'slang'),
  ('leg-press',  'Presse Jambes',          NULL,          'slang'),
  ('leg-press',  'Presse à Cuisses',       NULL,          'slang'),
  ('leg-press',  'Machine Leg Press',      NULL,          'slang'),
  ('leg-press',  'Presse Inclinée',        NULL,          'slang'),
  -- Life Fitness
  ('leg-press',  'Leg Press',              'life_fitness','brand'),
  ('leg-press',  'G7 Leg Press',           'life_fitness','brand'),
  ('leg-press',  'Signature Leg Press',    'life_fitness','brand'),
  -- Technogym
  ('leg-press',  'Leg Press',              'technogym',   'brand'),
  ('leg-press',  'Selection Leg Press',    'technogym',   'brand'),
  -- Matrix
  ('leg-press',  'Leg Press',              'matrix',      'brand'),
  ('leg-press',  'Aura Leg Press',         'matrix',      'brand'),
  -- Precor
  ('leg-press',  'Leg Press',              'precor',      'brand'),
  ('leg-press',  'Discovery Leg Press',    'precor',      'brand'),
  -- Hammer Strength (plate-loaded)
  ('presse-cuisses-hammer-strength', 'GROUND BASE LEG PRESS',   'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'Ground Base Leg Press',   'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'ISO LATERAL LEG PRESS',   'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'Iso Lateral Leg Press',   'hammer_strength','brand'),
  ('presse-cuisses-hammer-strength', 'HS Leg Press',            'hammer_strength','brand'),
  -- Seated leg press (horizontal)
  ('seated-leg-press',  'Seated Leg Press',      NULL,          'slang'),
  ('seated-leg-press',  'Leg Press Horizontal',  NULL,          'slang'),
  ('seated-leg-press',  'Presse Horizontale',    NULL,          'slang'),
  ('seated-leg-press',  'Horizontal Leg Press',  NULL,          'slang'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- EXTENSION JAMBES / LEG EXTENSION
  -- ══════════════════════════════════════════════════════════════════════════
  ('leg-extension',  'Leg Extension',              NULL,          'slang'),
  ('leg-extension',  'Extension Jambes',           NULL,          'slang'),
  ('leg-extension',  'Quadriceps Machine',         NULL,          'slang'),
  ('leg-extension',  'Quads Machine',              NULL,          'slang'),
  ('leg-extension',  'Machine Leg Extension',      NULL,          'slang'),
  -- Life Fitness
  ('leg-extension',  'Leg Extension',              'life_fitness','brand'),
  ('leg-extension',  'G7 Leg Extension',           'life_fitness','brand'),
  -- Technogym
  ('leg-extension',  'Leg Extension',              'technogym',   'brand'),
  ('leg-extension',  'Selection Leg Extension',    'technogym',   'brand'),
  -- Matrix
  ('leg-extension',  'Leg Extension',              'matrix',      'brand'),
  -- Precor
  ('leg-extension',  'Leg Extension',              'precor',      'brand'),
  ('leg-extension',  'Discovery Leg Extension',    'precor',      'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- FLEXION JAMBES / LEG CURL
  -- ══════════════════════════════════════════════════════════════════════════
  ('leg-curl',  'Leg Curl',                NULL,          'slang'),
  ('leg-curl',  'Flexion Jambes',          NULL,          'slang'),
  ('leg-curl',  'Hamstring Curl',          NULL,          'slang'),
  ('leg-curl',  'Lying Leg Curl',          NULL,          'slang'),
  ('leg-curl',  'Ischios Machine',         NULL,          'slang'),
  ('leg-curl',  'Machine Leg Curl',        NULL,          'slang'),
  ('leg-curl',  'Leg Curl Machine',        NULL,          'slang'),
  -- Life Fitness
  ('leg-curl',  'Leg Curl',               'life_fitness','brand'),
  ('leg-curl',  'G7 Leg Curl',            'life_fitness','brand'),
  -- Technogym
  ('leg-curl',  'Leg Curl',               'technogym',   'brand'),
  ('leg-curl',  'Selection Leg Curl',     'technogym',   'brand'),
  -- Matrix
  ('leg-curl',  'Leg Curl',               'matrix',      'brand'),
  -- Precor
  ('leg-curl',  'Leg Curl',               'precor',      'brand'),
  ('leg-curl',  'Discovery Leg Curl',     'precor',      'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- HACK SQUAT
  -- ══════════════════════════════════════════════════════════════════════════
  ('hack-squat',         'Hack Squat',          NULL,          'slang'),
  ('hack-squat',         'V-Squat',             NULL,          'slang'),
  ('hack-squat',         'Hack Squat Machine',  NULL,          'slang'),
  ('hack-squat',         'Machine Hack Squat',  NULL,          'slang'),
  ('hack-squat-machine', 'Hack Squat',          NULL,          'slang'),
  ('hack-squat-machine', 'V-Squat',             NULL,          'slang'),
  ('hack-squat-machine', 'Hack Squat Machine',  NULL,          'slang'),
  -- Panatta Hack Squat
  ('hack-squat',         'Hack Squat',          'panatta',     'brand'),
  -- Life Fitness
  ('hack-squat',         'Hack Squat',          'life_fitness','brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- ABDUCTEUR / HIP ABDUCTION MACHINE
  -- ══════════════════════════════════════════════════════════════════════════
  ('abductor-machine',  'Hip Abduction',          NULL,          'slang'),
  ('abductor-machine',  'Abductor Machine',        NULL,          'slang'),
  ('abductor-machine',  'Outer Thigh Machine',     NULL,          'slang'),
  ('abductor-machine',  'Hip Abduction Machine',   NULL,          'slang'),
  ('abductor-machine',  'Machine Abducteur',       NULL,          'slang'),
  ('abductor-machine',  'Abducteur',               NULL,          'slang'),
  -- Life Fitness
  ('abductor-machine',  'Hip Abduction',           'life_fitness','brand'),
  ('abductor-machine',  'Abductor',                'life_fitness','brand'),
  -- Technogym
  ('abductor-machine',  'Abductor',                'technogym',   'brand'),
  ('abductor-machine',  'Hip Abduction',           'technogym',   'brand'),
  ('abductor-machine',  'Selection Abductor',      'technogym',   'brand'),
  -- Matrix
  ('abductor-machine',  'Hip Abduction',           'matrix',      'brand'),
  -- Precor
  ('abductor-machine',  'Hip Abductor',            'precor',      'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- ADDUCTEUR / HIP ADDUCTION MACHINE
  -- ══════════════════════════════════════════════════════════════════════════
  ('adductor-machine',  'Hip Adduction',          NULL,          'slang'),
  ('adductor-machine',  'Adductor Machine',        NULL,          'slang'),
  ('adductor-machine',  'Inner Thigh Machine',     NULL,          'slang'),
  ('adductor-machine',  'Hip Adduction Machine',   NULL,          'slang'),
  ('adductor-machine',  'Machine Adducteur',       NULL,          'slang'),
  ('adductor-machine',  'Adducteur',               NULL,          'slang'),
  -- Life Fitness
  ('adductor-machine',  'Hip Adduction',           'life_fitness','brand'),
  ('adductor-machine',  'Adductor',                'life_fitness','brand'),
  -- Technogym
  ('adductor-machine',  'Adductor',                'technogym',   'brand'),
  ('adductor-machine',  'Hip Adduction',           'technogym',   'brand'),
  ('adductor-machine',  'Selection Adductor',      'technogym',   'brand'),
  -- Matrix
  ('adductor-machine',  'Hip Adduction',           'matrix',      'brand'),
  -- Precor
  ('adductor-machine',  'Hip Adductor',            'precor',      'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- HIP THRUST MACHINE / GLUTE DRIVE
  -- ══════════════════════════════════════════════════════════════════════════
  ('hip-thrust-machine',  'Hip Thrust Machine',   NULL,          'slang'),
  ('hip-thrust-machine',  'Glute Drive',          NULL,          'slang'),
  ('hip-thrust-machine',  'Glute Drive Machine',  NULL,          'slang'),
  ('hip-thrust-machine',  'Machine Fessiers',     NULL,          'slang'),
  ('hip-thrust-machine',  'Fessiers Machine',     NULL,          'slang'),
  ('hip-thrust-machine',  'Glutemaster',          NULL,          'slang'),
  -- Technogym
  ('hip-thrust-machine',  'Glute',                'technogym',   'brand'),
  ('hip-thrust-machine',  'Gluteus',              'technogym',   'brand'),
  -- Life Fitness
  ('hip-thrust-machine',  'Glute Drive',          'life_fitness','brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- MOLLETS DEBOUT / CALF RAISE
  -- ══════════════════════════════════════════════════════════════════════════
  ('calf-raise',  'Calf Raise',              NULL,          'slang'),
  ('calf-raise',  'Standing Calf Raise',     NULL,          'slang'),
  ('calf-raise',  'Mollets Machine',         NULL,          'slang'),
  ('calf-raise',  'Calf Press',              NULL,          'slang'),
  ('calf-raise',  'Machine Mollets',         NULL,          'slang'),
  -- Life Fitness
  ('calf-raise',  'Calf Press',              'life_fitness','brand'),
  -- Technogym
  ('calf-raise',  'Calf Raise',              'technogym',   'brand'),
  ('calf-raise',  'Selection Calf',          'technogym',   'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- MOLLETS ASSIS / SEATED CALF RAISE
  -- ══════════════════════════════════════════════════════════════════════════
  ('seated-calf-raise-machine',  'Seated Calf Raise',      NULL,          'slang'),
  ('seated-calf-raise-machine',  'Seated Calf',            NULL,          'slang'),
  ('seated-calf-raise-machine',  'Mollets Assis',          NULL,          'slang'),
  ('seated-calf-raise-machine',  'Calf Machine Assis',     NULL,          'slang'),
  ('seated-calf-raise-machine',  'Seated Calf Machine',    NULL,          'slang'),
  -- Technogym
  ('seated-calf-raise-machine',  'Seated Calf',            'technogym',   'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- EXTENSION DOS / BACK EXTENSION MACHINE
  -- ══════════════════════════════════════════════════════════════════════════
  ('back-extension-machine',  'Back Extension',           NULL,          'slang'),
  ('back-extension-machine',  'Back Extension Machine',   NULL,          'slang'),
  ('back-extension-machine',  'Lumbar Extension',         NULL,          'slang'),
  ('back-extension-machine',  'Extension Dos Machine',    NULL,          'slang'),
  ('back-extension-machine',  'Roman Chair Machine',      NULL,          'slang'),
  ('back-extension-machine',  'Machine Lombaires',        NULL,          'slang'),
  -- Life Fitness
  ('back-extension-machine',  'Back Extension',           'life_fitness','brand'),
  ('back-extension-machine',  'G7 Back Extension',        'life_fitness','brand'),
  -- Technogym
  ('back-extension-machine',  'Back Extension',           'technogym',   'brand'),
  ('back-extension-machine',  'Back Machine',             'technogym',   'brand'),
  -- Matrix
  ('back-extension-machine',  'Back Extension',           'matrix',      'brand'),
  -- Precor
  ('back-extension-machine',  'Back Extension',           'precor',      'brand'),
  -- hyperextension (banc bodyweight) — lien aussi vers la version bodyweight
  ('hyperextension',  'Back Extension',         NULL,          'slang'),
  ('hyperextension',  'Roman Chair',            NULL,          'slang'),
  ('hyperextension',  'Extension Lombaires',    NULL,           'slang'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- MACHINE ABDOMINAUX / CRUNCH MACHINE
  -- ══════════════════════════════════════════════════════════════════════════
  ('abdominal-crunch-machine',  'Abdominal Machine',      NULL,          'slang'),
  ('abdominal-crunch-machine',  'Crunch Machine',         NULL,          'slang'),
  ('abdominal-crunch-machine',  'Ab Machine',             NULL,          'slang'),
  ('abdominal-crunch-machine',  'Abdominaux Machine',     NULL,          'slang'),
  ('abdominal-crunch-machine',  'Machine Abdominaux',     NULL,          'slang'),
  ('abdominal-crunch-machine',  'Abs Machine',            NULL,          'slang'),
  -- Life Fitness
  ('abdominal-crunch-machine',  'Abdominal',              'life_fitness','brand'),
  ('abdominal-crunch-machine',  'G7 Abdominal',           'life_fitness','brand'),
  -- Technogym
  ('abdominal-crunch-machine',  'Abdominals',             'technogym',   'brand'),
  -- Matrix
  ('abdominal-crunch-machine',  'Abdominal',              'matrix',      'brand'),
  -- Precor
  ('abdominal-crunch-machine',  'Abdominal',              'precor',      'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- ROTATION TORSE / ROTARY TORSO
  -- ══════════════════════════════════════════════════════════════════════════
  ('rotary-torso-machine',  'Rotary Torso',       NULL,          'slang'),
  ('rotary-torso-machine',  'Torso Rotation',     NULL,          'slang'),
  ('rotary-torso-machine',  'Rotation Machine',   NULL,          'slang'),
  ('rotary-torso-machine',  'Oblique Machine',    NULL,          'slang'),
  -- Life Fitness
  ('rotary-torso-machine',  'Rotary Torso',       'life_fitness','brand'),
  -- Technogym
  ('rotary-torso-machine',  'Rotary Torso',       'technogym',   'brand'),
  -- Matrix
  ('rotary-torso-machine',  'Rotary Torso',       'matrix',      'brand'),
  -- Precor
  ('rotary-torso-machine',  'Rotary Torso',       'precor',      'brand'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- GHD MACHINE
  -- ══════════════════════════════════════════════════════════════════════════
  ('ghd-machine',  'GHD',                  NULL,          'slang'),
  ('ghd-machine',  'Glute Ham Developer',  NULL,          'slang'),
  ('ghd-machine',  'Glute Ham Raise',      NULL,          'slang'),
  ('ghd-machine',  'Nordic Bench',         NULL,          'slang'),
  ('ghd-machine',  'Machine GHD',          NULL,          'slang'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- SMITH MACHINE
  -- ══════════════════════════════════════════════════════════════════════════
  ('smith-machine-squat',       'Smith Machine',            NULL,          'slang'),
  ('smith-machine-squat',       'Squat Smith',              NULL,          'slang'),
  ('smith-machine-squat',       'Smith Squat',              NULL,          'slang'),
  ('smith-machine-squat',       'Smith Machine Squat',      NULL,          'slang'),
  ('smith-machine-bench-press', 'Smith Bench',              NULL,          'slang'),
  ('smith-machine-bench-press', 'Smith Machine Bench',      NULL,          'slang'),
  ('smith-machine-bench-press', 'Développé Smith',          NULL,          'slang'),
  ('smith-machine-rdl',         'Smith RDL',                NULL,          'slang'),
  ('smith-machine-rdl',         'RDL Smith Machine',        NULL,          'slang'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- CARDIO MACHINES — noms communs
  -- ══════════════════════════════════════════════════════════════════════════
  ('rowing-machine',  'Rameur',               NULL,          'slang'),
  ('rowing-machine',  'Rowing Machine',       NULL,          'slang'),
  ('rowing-machine',  'Concept2',             NULL,          'slang'),
  ('rowing-machine',  'Ergomètre Aviron',     NULL,          'slang'),
  ('rowing-machine',  'Indoor Rower',         NULL,          'slang'),
  ('stairmaster',     'StepMill',             NULL,          'slang'),
  ('stairmaster',     'Stair Climber',        NULL,          'slang'),
  ('stairmaster',     'Monte Escalier',       NULL,          'slang'),
  ('stairmaster',     'Escalier Cardio',      NULL,           'slang'),
  ('elliptical',      'Elliptique',           NULL,          'slang'),
  ('elliptical',      'Cross Trainer',        NULL,          'slang'),
  ('elliptical',      'Orbital',              NULL,          'slang'),
  ('elliptical',      'Vario',                'technogym',   'brand'),
  ('elliptical',      'Excite',               'technogym',   'brand'),
  ('assault-bike',    'Assault Bike',         NULL,          'slang'),
  ('assault-bike',    'Air Bike',             NULL,          'slang'),
  ('assault-bike',    'Vélo Assault',         NULL,          'slang'),
  ('assault-bike',    'Echo Bike',            NULL,          'slang'),
  ('assault-bike',    'AirDyne',              NULL,          'slang'),

  -- ══════════════════════════════════════════════════════════════════════════
  -- GYM80 — Butterfly (déjà dans migration mais compléments)
  -- ══════════════════════════════════════════════════════════════════════════
  ('butterfly-gym80',  'GYM80 Butterfly',   'gym80',       'brand'),
  ('butterfly-gym80',  'Butterfly GYM80',   'gym80',       'brand'),
  ('butterfly-gym80',  'GYM80 Chest Fly',   'gym80',       'brand'),
  ('butterfly-gym80',  'GYM80 Pec Fly',     'gym80',       'brand')

) AS a(slug, alias, brand, alias_type) ON e.slug = a.slug
ON CONFLICT (exercise_id, alias_norm) DO NOTHING;

-- ── 3. Vérification ───────────────────────────────────────────────────────────
SELECT
  e.name_fr,
  count(a.id) AS nb_aliases
FROM exercises_library e
LEFT JOIN exercise_aliases a ON a.exercise_id = e.id
GROUP BY e.name_fr
HAVING count(a.id) > 0
ORDER BY nb_aliases DESC
LIMIT 35;
