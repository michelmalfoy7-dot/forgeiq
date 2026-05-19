-- ============================================================
-- ForgeIQ — Seed Data
-- Exercices bibliothèque (50+) + Programmes (10+)
-- À exécuter APRÈS schema.sql
-- ============================================================

-- ============================================================
-- EXERCICES — Compound (mouvements de base)
-- ============================================================
INSERT INTO exercises_library (name, name_fr, slug, muscle_primary, muscle_secondary, equipment, category, force_type, difficulty, instructions) VALUES

-- Barbell
('Barbell Back Squat', 'Squat barre nuque', 'barbell-back-squat',
 ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'core', 'lower_back'],
 'barbell', 'compound', 'legs', 3,
 'Position pied largeur épaules, descendre jusqu''à ce que les cuisses soient parallèles au sol. Garder le dos droit.'),

('Barbell Front Squat', 'Squat avant', 'barbell-front-squat',
 ARRAY['quads', 'core'], ARRAY['glutes', 'upper_back'],
 'barbell', 'compound', 'legs', 4,
 'Barre posée sur les deltoïdes antérieurs, coudes hauts. Plus technique que le squat nuque.'),

('Conventional Deadlift', 'Soulevé de terre conventionnel', 'conventional-deadlift',
 ARRAY['hamstrings', 'lower_back', 'glutes'], ARRAY['traps', 'core', 'forearms'],
 'barbell', 'compound', 'legs', 4,
 'Pieds largeur hanches, barre au-dessus des pieds. Tirer en gardant la barre contre le corps.'),

('Romanian Deadlift', 'Soulevé de terre roumain', 'romanian-deadlift',
 ARRAY['hamstrings', 'glutes'], ARRAY['lower_back', 'core'],
 'barbell', 'compound', 'legs', 3,
 'Jambes légèrement fléchies, descendre en poussant les hanches arrière. Accent sur les ischio-jambiers.'),

('Barbell Bench Press', 'Développé couché barre', 'barbell-bench-press',
 ARRAY['chest'], ARRAY['triceps', 'front_delt'],
 'barbell', 'compound', 'push', 2,
 'Couché sur banc, barre à hauteur des yeux. Descendre jusqu''à effleurer la poitrine, pousser.'),

('Incline Barbell Bench Press', 'Développé incliné barre', 'incline-barbell-bench-press',
 ARRAY['upper_chest', 'front_delt'], ARRAY['triceps'],
 'barbell', 'compound', 'push', 3,
 'Banc incliné 30-45°. Met l''accent sur le chef claviculaire du pectoral.'),

('Barbell Overhead Press', 'Développé militaire barre', 'barbell-overhead-press',
 ARRAY['front_delt', 'side_delt'], ARRAY['triceps', 'upper_chest', 'core'],
 'barbell', 'compound', 'push', 3,
 'Debout ou assis, pousser la barre au-dessus de la tête. Rentrer les abdos.'),

('Barbell Row', 'Rowing barre', 'barbell-row',
 ARRAY['lats', 'mid_back'], ARRAY['biceps', 'rear_delt', 'lower_back'],
 'barbell', 'compound', 'pull', 3,
 'Dos parallèle au sol à 45°, tirer la barre vers le bas des abdos. Garder les coudes proches du corps.'),

('Barbell Hip Thrust', 'Hip thrust barre', 'barbell-hip-thrust',
 ARRAY['glutes'], ARRAY['hamstrings', 'core'],
 'barbell', 'compound', 'legs', 2,
 'Dos contre banc, barre sur les hanches. Pousser vers le haut jusqu''à l''extension complète des hanches.'),

-- Dumbbell compound
('Dumbbell Bench Press', 'Développé couché haltères', 'dumbbell-bench-press',
 ARRAY['chest'], ARRAY['triceps', 'front_delt'],
 'dumbbell', 'compound', 'push', 2,
 'Amplitude plus grande qu''avec la barre. Contrôler la descente.'),

('Dumbbell Shoulder Press', 'Développé épaules haltères', 'dumbbell-shoulder-press',
 ARRAY['front_delt', 'side_delt'], ARRAY['triceps'],
 'dumbbell', 'compound', 'push', 2,
 'Assis dos droit, pousser les haltères au-dessus de la tête.'),

('Dumbbell Romanian Deadlift', 'Soulevé de terre haltères', 'dumbbell-rdl',
 ARRAY['hamstrings', 'glutes'], ARRAY['lower_back', 'core'],
 'dumbbell', 'compound', 'legs', 2,
 'Même mouvement que le RDL barre mais avec haltères.'),

('Goblet Squat', 'Squat goblet', 'goblet-squat',
 ARRAY['quads', 'glutes'], ARRAY['core', 'upper_back'],
 'dumbbell', 'compound', 'legs', 1,
 'Tenir un haltère contre la poitrine, squatter profond. Excellent pour les débutants.'),

('Dumbbell Lunges', 'Fentes haltères', 'dumbbell-lunges',
 ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'core'],
 'dumbbell', 'compound', 'legs', 2,
 'Un pas en avant, descendre le genou arrière près du sol. Alterner les jambes.'),

-- Bodyweight compound
('Pull-Up', 'Traction', 'pull-up',
 ARRAY['lats', 'biceps'], ARRAY['mid_back', 'rear_delt', 'core'],
 'bodyweight', 'compound', 'pull', 3,
 'Prise pronation plus large que les épaules. Tirer jusqu''au menton au-dessus de la barre.'),

('Chin-Up', 'Traction supination', 'chin-up',
 ARRAY['biceps', 'lats'], ARRAY['mid_back'],
 'bodyweight', 'compound', 'pull', 2,
 'Prise supination légèrement plus étroite. Plus facile que les tractions, plus biceps.'),

('Push-Up', 'Pompe', 'push-up',
 ARRAY['chest', 'triceps'], ARRAY['front_delt', 'core'],
 'bodyweight', 'compound', 'push', 1,
 'Corps gainé, descendre la poitrine jusqu''au sol, pousser. Mains légèrement plus larges que les épaules.'),

('Pike Push-Up', 'Pompe en V', 'pike-push-up',
 ARRAY['front_delt', 'triceps'], ARRAY['chest'],
 'bodyweight', 'compound', 'push', 2,
 'Position en V inversé, fléchir les coudes pour descendre la tête vers le sol.'),

('Dip', 'Dip aux barres parallèles', 'dip',
 ARRAY['chest', 'triceps'], ARRAY['front_delt'],
 'bodyweight', 'compound', 'push', 3,
 'Sur barres parallèles, descendre jusqu''aux coudes à 90°. Pencher légèrement pour mettre l''accent sur le pectoral.'),

('Bodyweight Squat', 'Squat au poids du corps', 'bodyweight-squat',
 ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'core'],
 'bodyweight', 'compound', 'legs', 1,
 'Descendre jusqu''aux cuisses parallèles. Bon exercice de départ.'),

('Bulgarian Split Squat', 'Squat bulgare', 'bulgarian-split-squat',
 ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'core'],
 'bodyweight', 'compound', 'legs', 3,
 'Pied arrière sur banc, descendre le genou avant vers le sol. Exercice unilateral intense.'),

('Plank', 'Gainage', 'plank',
 ARRAY['core'], ARRAY['glutes', 'shoulders'],
 'bodyweight', 'compound', 'core', 1,
 'Position de pompe sur les avant-bras. Maintenir le corps droit comme une planche.'),

-- ============================================================
-- EXERCICES — Isolation poitrine
-- ============================================================
('Cable Fly', 'Écarté câble', 'cable-fly',
 ARRAY['chest'], ARRAY['front_delt'],
 'cable', 'isolation', 'push', 2,
 'Câbles hauts, croiser les mains devant la poitrine en gardant les coudes légèrement fléchis.'),

('Dumbbell Fly', 'Écarté haltères', 'dumbbell-fly',
 ARRAY['chest'], ARRAY['front_delt'],
 'dumbbell', 'isolation', 'push', 2,
 'Couché sur banc, descendre les haltères en arc de cercle en gardant les coudes légèrement fléchis.'),

('Cable Crossover', 'Croisé câble', 'cable-crossover',
 ARRAY['chest'], ARRAY['front_delt'],
 'cable', 'isolation', 'push', 2,
 'Câbles hauts ou bas selon la partie du pectoral visée.'),

-- ============================================================
-- EXERCICES — Isolation dos
-- ============================================================
('Lat Pulldown', 'Tirage verticaux poulie haute', 'lat-pulldown',
 ARRAY['lats'], ARRAY['biceps', 'mid_back'],
 'cable', 'compound', 'pull', 2,
 'Barre large prise pronation, tirer jusqu''au bas du menton. Garder les coudes pointés vers le bas.'),

('Seated Cable Row', 'Rowing assis câble', 'seated-cable-row',
 ARRAY['mid_back', 'lats'], ARRAY['biceps', 'rear_delt'],
 'cable', 'compound', 'pull', 2,
 'Dos droit, tirer le câble vers le nombril. Serrer les omoplates.'),

('One-Arm Dumbbell Row', 'Rowing unilatéral haltère', 'one-arm-dumbbell-row',
 ARRAY['lats', 'mid_back'], ARRAY['biceps', 'rear_delt'],
 'dumbbell', 'compound', 'pull', 2,
 'Un genou et une main sur le banc, tirer l''haltère vers la hanche.'),

('Face Pull', 'Face pull câble', 'face-pull',
 ARRAY['rear_delt', 'mid_back'], ARRAY['traps', 'rotator_cuff'],
 'cable', 'isolation', 'pull', 2,
 'Câble haut, tirer vers le visage en tournant les épaules vers l''extérieur. Excellent pour la santé des épaules.'),

('Hyperextension', 'Extension du dos', 'hyperextension',
 ARRAY['lower_back', 'glutes'], ARRAY['hamstrings'],
 'bodyweight', 'isolation', 'pull', 1,
 'Sur banc à hyperextension, fléchir et étendre le dos.'),

-- ============================================================
-- EXERCICES — Isolation épaules
-- ============================================================
('Lateral Raise', 'Élévations latérales', 'lateral-raise',
 ARRAY['side_delt'], ARRAY[]::text[],
 'dumbbell', 'isolation', 'push', 1,
 'Lever les haltères sur les côtés jusqu''à hauteur des épaules. Petit angle de rotation du poignet.'),

('Front Raise', 'Élévations frontales', 'front-raise',
 ARRAY['front_delt'], ARRAY[]::text[],
 'dumbbell', 'isolation', 'push', 1,
 'Lever les haltères devant soi jusqu''à hauteur des épaules.'),

('Rear Delt Fly', 'Oiseau prise inversée', 'rear-delt-fly',
 ARRAY['rear_delt'], ARRAY['mid_back'],
 'dumbbell', 'isolation', 'pull', 2,
 'Penché en avant à 90°, lever les haltères sur les côtés en gardant les coudes légèrement fléchis.'),

('Cable Lateral Raise', 'Élévations latérales câble', 'cable-lateral-raise',
 ARRAY['side_delt'], ARRAY[]::text[],
 'cable', 'isolation', 'push', 1,
 'Version câble pour tension constante sur tout le mouvement.'),

-- ============================================================
-- EXERCICES — Isolation bras
-- ============================================================
('Barbell Curl', 'Curl barre', 'barbell-curl',
 ARRAY['biceps'], ARRAY['brachialis', 'forearms'],
 'barbell', 'isolation', 'pull', 1,
 'Debout, barre en supination, fléchir les coudes en gardant les épaules immobiles.'),

('Dumbbell Curl', 'Curl haltères', 'dumbbell-curl',
 ARRAY['biceps'], ARRAY['brachialis'],
 'dumbbell', 'isolation', 'pull', 1,
 'Alterner ou simultané. Supiner le poignet en cours de mouvement.'),

('Hammer Curl', 'Curl marteau', 'hammer-curl',
 ARRAY['brachialis', 'biceps'], ARRAY['forearms'],
 'dumbbell', 'isolation', 'pull', 1,
 'Prise neutre (pouce vers le haut). Met l''accent sur le brachio-radial.'),

('Tricep Pushdown', 'Extension triceps câble', 'tricep-pushdown',
 ARRAY['triceps'], ARRAY[]::text[],
 'cable', 'isolation', 'push', 1,
 'Câble haut, pousser vers le bas en gardant les coudes fixes. Barre droite ou en V.'),

('Overhead Tricep Extension', 'Extension triceps derrière la tête', 'overhead-tricep-extension',
 ARRAY['triceps'], ARRAY[]::text[],
 'dumbbell', 'isolation', 'push', 2,
 'Haltère tenu à deux mains au-dessus de la tête, descendre derrière la nuque.'),

('Skull Crusher', 'Barre au front', 'skull-crusher',
 ARRAY['triceps'], ARRAY[]::text[],
 'barbell', 'isolation', 'push', 3,
 'Couché, barre tenue bras tendus, descendre vers le front en fléchissant seulement les coudes.'),

('Preacher Curl', 'Curl pupitre', 'preacher-curl',
 ARRAY['biceps'], ARRAY['brachialis'],
 'barbell', 'isolation', 'pull', 2,
 'Sur pupitre incliné, isole parfaitement les biceps.'),

-- ============================================================
-- EXERCICES — Isolation jambes
-- ============================================================
('Leg Press', 'Presse à cuisses', 'leg-press',
 ARRAY['quads', 'glutes'], ARRAY['hamstrings'],
 'machine', 'compound', 'legs', 1,
 'Positionner les pieds selon la zone visée. Monter bas pour les fessiers, haut pour les quads.'),

('Leg Extension', 'Extension jambes', 'leg-extension',
 ARRAY['quads'], ARRAY[]::text[],
 'machine', 'isolation', 'legs', 1,
 'Extension complète à chaque répétition, contraction isométrique d''1s en haut.'),

('Leg Curl', 'Flexion jambes couchée', 'leg-curl',
 ARRAY['hamstrings'], ARRAY['glutes'],
 'machine', 'isolation', 'legs', 1,
 'Descendre lentement (3-4s), flexion complète.'),

('Calf Raise', 'Mollets debout', 'calf-raise',
 ARRAY['calves'], ARRAY[]::text[],
 'machine', 'isolation', 'legs', 1,
 'Extension complète, tenir 1s en haut. Descendre sous le niveau de la plateforme.'),

('Glute Kickback', 'Extension fessier câble', 'glute-kickback',
 ARRAY['glutes'], ARRAY['hamstrings'],
 'cable', 'isolation', 'legs', 1,
 'À quatre pattes ou debout au câble, extension de la jambe vers l''arrière.'),

-- ============================================================
-- EXERCICES — Core
-- ============================================================
('Crunch', 'Crunch', 'crunch',
 ARRAY['abs'], ARRAY[]::text[],
 'bodyweight', 'isolation', 'core', 1,
 'Couché sur le dos, lever les épaules en expirant. Garder le bas du dos au sol.'),

('Russian Twist', 'Rotation russe', 'russian-twist',
 ARRAY['obliques', 'abs'], ARRAY[]::text[],
 'bodyweight', 'isolation', 'core', 2,
 'Assis, jambes levées, rotation du buste de gauche à droite.'),

('Hanging Leg Raise', 'Relevé de jambes suspendu', 'hanging-leg-raise',
 ARRAY['abs', 'hip_flexors'], ARRAY[]::text[],
 'bodyweight', 'compound', 'core', 3,
 'Suspendu à une barre, lever les jambes à 90° (ou plus). Contrôler la descente.'),

('Ab Wheel Rollout', 'Roulette abdominale', 'ab-wheel-rollout',
 ARRAY['abs', 'core'], ARRAY['lats', 'shoulders'],
 'bodyweight', 'isolation', 'core', 4,
 'À genoux, rouler vers l''avant en gardant le dos droit, revenir en contractant les abdos.'),

('Mountain Climber', 'Montée de genou', 'mountain-climber',
 ARRAY['core', 'hip_flexors'], ARRAY['shoulders', 'quads'],
 'bodyweight', 'cardio', 'core', 2,
 'Position pompe, alterner les genoux vers la poitrine rapidement.'),

-- ============================================================
-- EXERCICES — Cardio
-- ============================================================
('LISS Cardio', 'Cardio LISS', 'liss-cardio',
 ARRAY['cardio'], ARRAY[]::text[],
 'bodyweight', 'cardio', 'carry', 1,
 '30-60min à 60-70% FCmax. Marche rapide, vélo, elliptique. Optimal pour la récupération active et la perte de graisse.'),

('HIIT Sprint', 'Interval training', 'hiit-sprint',
 ARRAY['cardio', 'quads'], ARRAY[]::text[],
 'bodyweight', 'cardio', 'carry', 3,
 '8-10x (20s sprint / 40s récup). Intensité maximale sur les sprints.');

-- ============================================================
-- PROGRAMMES
-- ============================================================
INSERT INTO programs (name, slug, description, level, goal, equipment, sessions_per_week, duration_weeks, structure, is_custom, is_public) VALUES

('Full Body 3×/semaine', 'full-body-3x',
 '3 séances identiques par semaine. Idéal pour apprendre les mouvements et construire les bases.',
 ARRAY['beginner'], ARRAY['general', 'muscle_gain'], ARRAY['full_gym', 'home_advanced'],
 3, 8,
 '{"days": ["Full Body A", "Full Body B", "Full Body A"]}',
 false, true),

('Starting Strength', 'starting-strength',
 'Le programme de force fondamental. Squat, deadlift, bench, overhead press.',
 ARRAY['beginner'], ARRAY['strength'], ARRAY['full_gym', 'home_advanced'],
 3, 12,
 '{"days": ["Workout A", "Workout B", "Workout A"]}',
 false, true),

('Bodyweight Débutant', 'bodyweight-beginner',
 'Programme sans équipement. Pompes, tractions, squats, gainage. Parfait pour commencer à la maison.',
 ARRAY['beginner'], ARRAY['general', 'endurance'], ARRAY['bodyweight'],
 3, 8,
 '{"days": ["Upper Body", "Lower Body", "Core & Cardio"]}',
 false, true),

('Upper/Lower 4×/semaine', 'upper-lower-4x',
 'Haut du corps / Bas du corps en alternance. Excellent ratio fréquence/récupération.',
 ARRAY['intermediate'], ARRAY['muscle_gain', 'strength'], ARRAY['full_gym'],
 4, 12,
 '{"days": ["Upper A", "Lower A", "Upper B", "Lower B"]}',
 false, true),

('PPL 3×/semaine', 'ppl-3x',
 'Push Pull Legs en 3 séances. Version compact, idéale si tu as 3 jours disponibles.',
 ARRAY['intermediate'], ARRAY['muscle_gain'], ARRAY['full_gym'],
 3, 12,
 '{"days": ["Push", "Pull", "Legs"]}',
 false, true),

('PPL 6×/semaine', 'ppl-6x',
 'Push Pull Legs ×2. Volume élevé, pour les intermédiaires avancés motivés.',
 ARRAY['intermediate', 'advanced'], ARRAY['muscle_gain'], ARRAY['full_gym'],
 6, 12,
 '{"days": ["Push A", "Pull A", "Legs", "Push B", "Pull B", "Legs B"]}',
 false, true),

('PHUL — Power Hypertrophy', 'phul',
 '2 séances force + 2 séances hypertrophie. Développe force ET volume simultanément.',
 ARRAY['intermediate'], ARRAY['strength', 'muscle_gain'], ARRAY['full_gym'],
 4, 12,
 '{"days": ["Upper Power", "Lower Power", "Upper Hypertrophy", "Lower Hypertrophy"]}',
 false, true),

('Home Dumbbell Program', 'home-dumbbell',
 'Programme complet avec haltères uniquement. Adaptable de 5 à 40kg par paire.',
 ARRAY['beginner', 'intermediate'], ARRAY['muscle_gain', 'general'], ARRAY['home_basic', 'home_advanced'],
 4, 10,
 '{"days": ["Upper A", "Lower A", "Upper B", "Lower B"]}',
 false, true),

('Arnold Split', 'arnolds-split',
 'Poitrine+Dos / Épaules+Bras / Jambes, ×2/semaine. Le classique du bodybuilding.',
 ARRAY['advanced'], ARRAY['muscle_gain'], ARRAY['full_gym'],
 6, 12,
 '{"days": ["Chest+Back A", "Shoulders+Arms A", "Legs A", "Chest+Back B", "Shoulders+Arms B", "Legs B"]}',
 false, true),

('Bro Split 5×/semaine', 'bro-split-5x',
 'Un muscle par jour. Chest Monday, Back Tuesday, etc. Volume maximal par groupe.',
 ARRAY['advanced'], ARRAY['muscle_gain'], ARRAY['full_gym'],
 5, 12,
 '{"days": ["Chest", "Back", "Shoulders", "Arms", "Legs"]}',
 false, true),

('Force — Powerlifting', 'strength-powerlifting',
 'Centré sur Squat, Bench, Deadlift avec progression linéaire et accessoires.',
 ARRAY['intermediate', 'advanced'], ARRAY['strength'], ARRAY['full_gym'],
 4, 16,
 '{"days": ["Squat Focus", "Bench Focus", "Deadlift Focus", "Accessoires"]}',
 false, true),

('Sèche — Cardio + Muscu', 'cut-cardio',
 'Maintien musculaire en déficit + cardio LISS. Idéal pour perdre du gras sans perdre le muscle.',
 ARRAY['beginner', 'intermediate', 'advanced'], ARRAY['weight_loss'], ARRAY['full_gym', 'home_basic', 'home_advanced'],
 5, 12,
 '{"days": ["Full Body A", "LISS Cardio", "Full Body B", "LISS Cardio", "Full Body C"]}',
 false, true),

('Programme Personnalisé', 'custom',
 'Crée ton propre programme avec les exercices de ton choix.',
 ARRAY['beginner', 'intermediate', 'advanced'], ARRAY['general'], ARRAY['full_gym', 'home_basic', 'home_advanced', 'bodyweight'],
 3, 8,
 '{"days": ["Séance 1", "Séance 2", "Séance 3"]}',
 true, true);
