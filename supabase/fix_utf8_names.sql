-- ============================================================
-- ForgeIQ — Fix encodage UTF-8 exercises_library
-- À exécuter dans Supabase SQL Editor si name_fr est corrompu
-- (ex: "DÃ©veloppÃ©" au lieu de "Développé")
-- Utilise le slug (ASCII) pour identifier chaque exercice
-- ============================================================

UPDATE exercises_library SET name_fr = 'Squat barre nuque' WHERE slug = 'barbell-back-squat';
UPDATE exercises_library SET name_fr = 'Squat avant' WHERE slug = 'barbell-front-squat';
UPDATE exercises_library SET name_fr = 'Soulevé de terre conventionnel' WHERE slug = 'conventional-deadlift';
UPDATE exercises_library SET name_fr = 'Soulevé de terre roumain' WHERE slug = 'romanian-deadlift';
UPDATE exercises_library SET name_fr = 'Développé couché barre' WHERE slug = 'barbell-bench-press';
UPDATE exercises_library SET name_fr = 'Développé incliné barre' WHERE slug = 'incline-barbell-bench-press';
UPDATE exercises_library SET name_fr = 'Développé militaire barre' WHERE slug = 'barbell-overhead-press';
UPDATE exercises_library SET name_fr = 'Rowing barre' WHERE slug = 'barbell-row';
UPDATE exercises_library SET name_fr = 'Hip thrust barre' WHERE slug = 'barbell-hip-thrust';
UPDATE exercises_library SET name_fr = 'Développé couché haltères' WHERE slug = 'dumbbell-bench-press';
UPDATE exercises_library SET name_fr = 'Développé épaules haltères' WHERE slug = 'dumbbell-shoulder-press';
UPDATE exercises_library SET name_fr = 'Soulevé de terre haltères' WHERE slug = 'dumbbell-rdl';
UPDATE exercises_library SET name_fr = 'Squat goblet' WHERE slug = 'goblet-squat';
UPDATE exercises_library SET name_fr = 'Fentes haltères' WHERE slug = 'dumbbell-lunges';
UPDATE exercises_library SET name_fr = 'Traction' WHERE slug = 'pull-up';
UPDATE exercises_library SET name_fr = 'Traction supination' WHERE slug = 'chin-up';
UPDATE exercises_library SET name_fr = 'Pompe' WHERE slug = 'push-up';
UPDATE exercises_library SET name_fr = 'Pompe en V' WHERE slug = 'pike-push-up';
UPDATE exercises_library SET name_fr = 'Dip aux barres parallèles' WHERE slug = 'dip';
UPDATE exercises_library SET name_fr = 'Squat au poids du corps' WHERE slug = 'bodyweight-squat';
UPDATE exercises_library SET name_fr = 'Squat bulgare' WHERE slug = 'bulgarian-split-squat';
UPDATE exercises_library SET name_fr = 'Gainage' WHERE slug = 'plank';
UPDATE exercises_library SET name_fr = 'Écarté câble' WHERE slug = 'cable-fly';
UPDATE exercises_library SET name_fr = 'Écarté haltères' WHERE slug = 'dumbbell-fly';
UPDATE exercises_library SET name_fr = 'Croisé câble' WHERE slug = 'cable-crossover';
UPDATE exercises_library SET name_fr = 'Tirage verticaux poulie haute' WHERE slug = 'lat-pulldown';
UPDATE exercises_library SET name_fr = 'Rowing assis câble' WHERE slug = 'seated-cable-row';
UPDATE exercises_library SET name_fr = 'Rowing unilatéral haltère' WHERE slug = 'one-arm-dumbbell-row';
UPDATE exercises_library SET name_fr = 'Face pull câble' WHERE slug = 'face-pull';
UPDATE exercises_library SET name_fr = 'Extension du dos' WHERE slug = 'hyperextension';
UPDATE exercises_library SET name_fr = 'Élévations latérales' WHERE slug = 'lateral-raise';
UPDATE exercises_library SET name_fr = 'Élévations frontales' WHERE slug = 'front-raise';
UPDATE exercises_library SET name_fr = 'Oiseau prise inversée' WHERE slug = 'rear-delt-fly';
UPDATE exercises_library SET name_fr = 'Élévations latérales câble' WHERE slug = 'cable-lateral-raise';
UPDATE exercises_library SET name_fr = 'Curl barre' WHERE slug = 'barbell-curl';
UPDATE exercises_library SET name_fr = 'Curl haltères' WHERE slug = 'dumbbell-curl';
UPDATE exercises_library SET name_fr = 'Curl marteau' WHERE slug = 'hammer-curl';
UPDATE exercises_library SET name_fr = 'Extension triceps câble' WHERE slug = 'tricep-pushdown';
UPDATE exercises_library SET name_fr = 'Extension triceps derrière la tête' WHERE slug = 'overhead-tricep-extension';
UPDATE exercises_library SET name_fr = 'Barre au front' WHERE slug = 'skull-crusher';
UPDATE exercises_library SET name_fr = 'Curl pupitre' WHERE slug = 'preacher-curl';
UPDATE exercises_library SET name_fr = 'Presse à cuisses' WHERE slug = 'leg-press';
UPDATE exercises_library SET name_fr = 'Extension jambes' WHERE slug = 'leg-extension';
UPDATE exercises_library SET name_fr = 'Flexion jambes couchée' WHERE slug = 'leg-curl';
UPDATE exercises_library SET name_fr = 'Mollets debout' WHERE slug = 'calf-raise';
UPDATE exercises_library SET name_fr = 'Extension fessier câble' WHERE slug = 'glute-kickback';
UPDATE exercises_library SET name_fr = 'Crunch' WHERE slug = 'crunch';
UPDATE exercises_library SET name_fr = 'Rotation russe' WHERE slug = 'russian-twist';
UPDATE exercises_library SET name_fr = 'Relevé de jambes suspendu' WHERE slug = 'hanging-leg-raise';
UPDATE exercises_library SET name_fr = 'Roulette abdominale' WHERE slug = 'ab-wheel-rollout';
UPDATE exercises_library SET name_fr = 'Montée de genou' WHERE slug = 'mountain-climber';
UPDATE exercises_library SET name_fr = 'Cardio LISS' WHERE slug = 'liss-cardio';
UPDATE exercises_library SET name_fr = 'Interval training' WHERE slug = 'hiit-sprint';

-- Exercices seed_exercises_v2 avec accents (si ce fichier a été exécuté)
UPDATE exercises_library SET name_fr = 'Squat sumo' WHERE slug = 'sumo-squat';
UPDATE exercises_library SET name_fr = 'Fentes avant' WHERE slug = 'forward-lunge';
UPDATE exercises_library SET name_fr = 'Fentes arrière' WHERE slug = 'reverse-lunge';
UPDATE exercises_library SET name_fr = 'Step-up haltères' WHERE slug = 'step-up';
UPDATE exercises_library SET name_fr = 'Presse épaules machine' WHERE slug = 'machine-shoulder-press';
UPDATE exercises_library SET name_fr = 'Développé couché prise serrée' WHERE slug = 'close-grip-bench-press';
UPDATE exercises_library SET name_fr = 'Tirage horizontal barre' WHERE slug = 'pendlay-row';
UPDATE exercises_library SET name_fr = 'Tirage à la poulie basse' WHERE slug = 'low-cable-row';
UPDATE exercises_library SET name_fr = 'Élévations latérales machine' WHERE slug = 'machine-lateral-raise';
UPDATE exercises_library SET name_fr = 'Curl incliné haltères' WHERE slug = 'incline-dumbbell-curl';
UPDATE exercises_library SET name_fr = 'Extension triceps à la barre' WHERE slug = 'tricep-bar-extension';
UPDATE exercises_library SET name_fr = 'Gainage latéral' WHERE slug = 'side-plank';
UPDATE exercises_library SET name_fr = 'Relevé de bassin' WHERE slug = 'glute-bridge';
UPDATE exercises_library SET name_fr = 'Relevé de jambes allongé' WHERE slug = 'lying-leg-raise';
UPDATE exercises_library SET name_fr = 'Vélo elliptique' WHERE slug = 'elliptical';
UPDATE exercises_library SET name_fr = 'Rameur' WHERE slug = 'rowing-machine';
UPDATE exercises_library SET name_fr = 'Corde à sauter' WHERE slug = 'jump-rope';

-- Vérification : afficher les exercices avec des caractères potentiellement corrompus
-- (décommente pour diagnostic)
-- SELECT slug, name_fr FROM exercises_library
-- WHERE name_fr LIKE '%Ã%' OR name_fr LIKE '%Â%' OR name_fr LIKE '%Ã©%'
-- ORDER BY slug;
