-- ============================================================
-- ForgeIQ — Exercices supplémentaires (Sprint 4)
-- Ajoute ~32 exercices pour atteindre 80+ au total
-- À exécuter APRÈS seed.sql
-- ============================================================

INSERT INTO exercises_library (name, name_fr, slug, muscle_primary, muscle_secondary, equipment, category, force_type, difficulty, instructions)
VALUES

-- ── KETTLEBELL ─────────────────────────────────────────────
('Kettlebell Swing', 'Balancé kettlebell', 'kb-swing',
 ARRAY['glutes', 'hamstrings'], ARRAY['core', 'lower_back', 'shoulders'],
 'kettlebell', 'compound', 'legs', 2,
 'Pieds largeur épaules, balancer la kettlebell entre les jambes puis propulser avec les hanches.'),

('Kettlebell Goblet Squat', 'Squat goblet kettlebell', 'kb-goblet-squat',
 ARRAY['quads', 'glutes'], ARRAY['core', 'upper_back'],
 'kettlebell', 'compound', 'legs', 1,
 'Tenir la kettlebell par les anses contre la poitrine, squatter profond.'),

('Kettlebell Clean & Press', 'Arraché et développé kettlebell', 'kb-clean-press',
 ARRAY['shoulders', 'glutes', 'core'], ARRAY['triceps', 'traps'],
 'kettlebell', 'compound', 'push', 3,
 'Mouvement balistique en deux temps : amener la kettlebell à l''épaule puis pousser au-dessus.'),

('Kettlebell Turkish Get-Up', 'Lever turc', 'kb-turkish-getup',
 ARRAY['core', 'shoulders'], ARRAY['glutes', 'hips', 'triceps'],
 'kettlebell', 'compound', 'core', 4,
 'Se lever du sol à debout en tenant la kettlebell bras tendu. Mouvement en 7 étapes.'),

('Kettlebell Row', 'Rowing kettlebell', 'kb-row',
 ARRAY['lats', 'mid_back'], ARRAY['biceps', 'rear_delt'],
 'kettlebell', 'compound', 'pull', 2,
 'Un genou sur banc, tirer la kettlebell vers la hanche.'),

-- ── BAND / ÉLASTIQUE ────────────────────────────────────────
('Band Pull-Apart', 'Écartement élastique', 'band-pull-apart',
 ARRAY['rear_delt', 'mid_back'], ARRAY['rotator_cuff'],
 'band', 'isolation', 'pull', 1,
 'Tenir l''élastique à bout de bras, écarter horizontalement jusqu''à la poitrine. Excellent pour les épaules.'),

('Band Squat', 'Squat élastique', 'band-squat',
 ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'core'],
 'band', 'compound', 'legs', 1,
 'Élastique sous les pieds, tenir les poignées aux épaules. Squatter normalement.'),

('Band Hip Thrust', 'Hip thrust élastique', 'band-hip-thrust',
 ARRAY['glutes'], ARRAY['hamstrings'],
 'band', 'isolation', 'legs', 1,
 'Dos au sol, élastique sur les hanches. Extension des hanches vers le haut.'),

('Band Bicep Curl', 'Curl biceps élastique', 'band-bicep-curl',
 ARRAY['biceps'], ARRAY['forearms'],
 'band', 'isolation', 'pull', 1,
 'Élastique sous les pieds, curl comme avec haltères. Tension constante.'),

('Band Lateral Walk', 'Pas latéraux élastique', 'band-lateral-walk',
 ARRAY['glutes', 'hip_abductors'], ARRAY[]::text[],
 'band', 'isolation', 'legs', 1,
 'Élastique autour des genoux ou chevilles, pas latéraux en position demi-squat.'),

-- ── MACHINE SUPPLÉMENTAIRES ─────────────────────────────────
('Cable Row High', 'Rowing câble prise haute', 'cable-row-high',
 ARRAY['mid_back', 'rear_delt'], ARRAY['biceps', 'traps'],
 'cable', 'compound', 'pull', 2,
 'Câble haut, tirer vers le visage avec prise large. Accent sur le dos supérieur.'),

('Pec Deck', 'Butterfly machine', 'pec-deck',
 ARRAY['chest'], ARRAY['front_delt'],
 'machine', 'isolation', 'push', 1,
 'Sur machine butterfly, presser les coussins ensemble devant la poitrine.'),

('Hack Squat', 'Squat hack machine', 'hack-squat',
 ARRAY['quads'], ARRAY['glutes', 'hamstrings'],
 'machine', 'compound', 'legs', 2,
 'Dos contre la machine inclinée, descendre jusqu''à 90° et pousser.'),

('Smith Machine Bench Press', 'Développé couché Smith', 'smith-bench-press',
 ARRAY['chest'], ARRAY['triceps', 'front_delt'],
 'machine', 'compound', 'push', 2,
 'Version guidée du développé couché. Bonne option pour s''entraîner seul.'),

('Seated Leg Press Single Leg', 'Presse jambe unilatérale', 'leg-press-single',
 ARRAY['quads', 'glutes'], ARRAY['hamstrings'],
 'machine', 'compound', 'legs', 2,
 'Une jambe à la fois sur la presse. Corrige les déséquilibres gauche/droite.'),

('Seated Calf Raise', 'Mollets assis machine', 'seated-calf-raise',
 ARRAY['calves'], ARRAY[]::text[],
 'machine', 'isolation', 'legs', 1,
 'Assis sur la machine, charge sur les genoux. Accent sur le soléaire.'),

('Chest Supported Row', 'Rowing sur banc incliné', 'chest-supported-row',
 ARRAY['mid_back', 'lats'], ARRAY['biceps', 'rear_delt'],
 'dumbbell', 'compound', 'pull', 2,
 'Allongé face contre un banc incliné, tirage haltères. Élimine la triche du dos.'),

-- ── BARBELL SUPPLÉMENTAIRES ─────────────────────────────────
('Sumo Deadlift', 'Soulevé de terre sumo', 'sumo-deadlift',
 ARRAY['glutes', 'hamstrings', 'quads'], ARRAY['lower_back', 'core'],
 'barbell', 'compound', 'legs', 4,
 'Pieds très écartés, prise entre les jambes. Réduit le chemin de tirage.'),

('Good Morning', 'Good morning', 'good-morning',
 ARRAY['hamstrings', 'lower_back', 'glutes'], ARRAY['core'],
 'barbell', 'compound', 'legs', 3,
 'Barre sur les épaules, se pencher en avant dos droit jusqu''à 90°. Mouvement de charnière.'),

('Barbell Shrug', 'Haussement d''épaules barre', 'barbell-shrug',
 ARRAY['traps'], ARRAY['forearms'],
 'barbell', 'isolation', 'pull', 1,
 'Tenir la barre devant soi, hausser les épaules le plus haut possible. Tenir 1s.'),

('Pendlay Row', 'Rowing Pendlay', 'pendlay-row',
 ARRAY['lats', 'mid_back'], ARRAY['biceps', 'rear_delt', 'lower_back'],
 'barbell', 'compound', 'pull', 3,
 'Dos parallèle au sol, barre remontée depuis le sol. Explosive à la montée.'),

('Zercher Squat', 'Squat Zercher', 'zercher-squat',
 ARRAY['quads', 'glutes', 'core'], ARRAY['biceps', 'upper_back'],
 'barbell', 'compound', 'legs', 4,
 'Barre dans le creux des coudes. Posture très droite requise.'),

-- ── DUMBBELL SUPPLÉMENTAIRES ────────────────────────────────
('Arnold Press', 'Arnold Press', 'arnold-press',
 ARRAY['shoulders'], ARRAY['triceps', 'upper_chest'],
 'dumbbell', 'compound', 'push', 2,
 'Commencer paumes face à soi, tourner en poussant vers le haut. Inventer du Roy).'),

('Incline Dumbbell Curl', 'Curl incliné haltères', 'incline-dumbbell-curl',
 ARRAY['biceps'], ARRAY['brachialis'],
 'dumbbell', 'isolation', 'pull', 2,
 'Assis banc incliné, bras pendants. Curl complet pour plus d''amplitude.'),

('Dumbbell Pullover', 'Pull-over haltère', 'dumbbell-pullover',
 ARRAY['lats', 'chest'], ARRAY['triceps', 'core'],
 'dumbbell', 'compound', 'pull', 2,
 'Couché transversalement sur banc, haltère au-dessus de la poitrine, descendre derrière la tête.'),

('Dumbbell Shrug', 'Haussement d''épaules haltères', 'dumbbell-shrug',
 ARRAY['traps'], ARRAY['forearms'],
 'dumbbell', 'isolation', 'pull', 1,
 'Haltères le long du corps, hausser les épaules. Pas de rotation.'),

('Dumbbell Step-Up', 'Montée sur box haltères', 'dumbbell-step-up',
 ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'core'],
 'dumbbell', 'compound', 'legs', 2,
 'Monter sur une box/banc avec un pied, ramener l''autre. Alterner.'),

-- ── BODYWEIGHT SUPPLÉMENTAIRES ──────────────────────────────
('Muscle-Up', 'Muscle-up', 'muscle-up',
 ARRAY['lats', 'chest', 'triceps'], ARRAY['biceps', 'core', 'shoulders'],
 'bodyweight', 'compound', 'pull', 5,
 'Transition traction → dip au-dessus de la barre. Mouvement complet haut du corps.'),

('L-Sit', 'L-Sit', 'l-sit',
 ARRAY['abs', 'hip_flexors'], ARRAY['triceps', 'shoulders'],
 'bodyweight', 'isolation', 'core', 4,
 'Suspendu ou au sol sur les mains, maintenir les jambes à l''horizontale.'),

('Nordic Hamstring Curl', 'Curl nordique', 'nordic-hamstring-curl',
 ARRAY['hamstrings'], ARRAY['glutes'],
 'bodyweight', 'isolation', 'legs', 4,
 'Genoux au sol, pieds retenus, se pencher vers l''avant le plus lentement possible.'),

('Wall Sit', 'Chaise au mur', 'wall-sit',
 ARRAY['quads'], ARRAY['glutes', 'calves'],
 'bodyweight', 'isolation', 'legs', 1,
 'Dos au mur, cuisses parallèles au sol. Maintenir la position.'),

('Superman', 'Superman', 'superman',
 ARRAY['lower_back', 'glutes'], ARRAY['hamstrings', 'traps'],
 'bodyweight', 'isolation', 'core', 1,
 'À plat ventre, lever bras et jambes simultanément. Maintenir 2s.'),

-- ── CABLE SUPPLÉMENTAIRES ───────────────────────────────────
('Cable Crunch', 'Crunch câble', 'cable-crunch',
 ARRAY['abs'], ARRAY[]::text[],
 'cable', 'isolation', 'core', 2,
 'À genoux, câble haut, fléchir le tronc vers les genoux. Contraction maximale.'),

('Straight-Arm Pulldown', 'Tirage bras tendus câble', 'straight-arm-pulldown',
 ARRAY['lats'], ARRAY['core', 'triceps'],
 'cable', 'isolation', 'pull', 2,
 'Debout, bras tendus, pousser la barre du câble haut vers les cuisses.'),

('Cable Kickback', 'Extension triceps câble buste penché', 'cable-kickback',
 ARRAY['triceps'], ARRAY[]::text[],
 'cable', 'isolation', 'push', 2,
 'Buste penché, bras le long du corps, extension complète derrière soi.'),

('Pallof Press', 'Presse Pallof', 'pallof-press',
 ARRAY['core', 'obliques'], ARRAY['shoulders'],
 'cable', 'isolation', 'core', 2,
 'Côté au câble, pousser et ramener vers la poitrine. Résister à la rotation. Excellent anti-rotation.');
