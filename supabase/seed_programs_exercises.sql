-- ============================================================
-- ForgeIQ — Seed exercices dans les programmes
-- Met à jour la colonne structure JSONB avec les exercices réels
-- ============================================================

-- Full Body 3×/semaine (beginner)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Full Body A",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 3, "reps": "8-10", "rest_sec": 120, "note": "Descendre cuisses parallèles, dos droit"},
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Contrôler la descente, barre touche le sternum"},
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Dos à 45°, tirer vers le bas-ventre"},
        {"slug": "barbell-overhead-press", "name_fr": "Développé militaire barre", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Abdos gainés, pousser verticalement"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 3, "reps": "30-60s", "rest_sec": 60, "note": "Corps aligné, respiration régulière"}
      ]
    },
    {
      "name": "Full Body B",
      "exercises": [
        {"slug": "conventional-deadlift", "name_fr": "Soulevé de terre conventionnel", "sets": 3, "reps": "6-8", "rest_sec": 150, "note": "Barre contre le corps, dos plat tout au long"},
        {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné barre", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Banc à 30-45°, poitrine haute"},
        {"slug": "lat-pulldown", "name_fr": "Tirage verticaux poulie haute", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Tirer jusqu''au menton, coudes vers le bas"},
        {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Assis dos droit, contrôle en descente"},
        {"slug": "barbell-curl", "name_fr": "Curl barre", "sets": 3, "reps": "10-12", "rest_sec": 60, "note": "Coudes fixes, contraction au sommet"}
      ]
    },
    {
      "name": "Full Body A",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 3, "reps": "8-10", "rest_sec": 120, "note": "Ajouter du poids si 10 reps réussies"},
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Progression +2.5kg quand 3×10 réussis"},
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Serrer les omoplates en haut du mouvement"},
        {"slug": "barbell-overhead-press", "name_fr": "Développé militaire barre", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Progression linéaire, +2.5kg/semaine"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 3, "reps": "45-60s", "rest_sec": 60, "note": "Corps droit de la tête aux talons"}
      ]
    }
  ]
}'::jsonb WHERE slug = 'full-body-3x';

-- Starting Strength (beginner, strength)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Workout A",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 3, "reps": "5", "rest_sec": 180, "note": "LE mouvement fondamental. +2.5kg à chaque séance."},
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 3, "reps": "5", "rest_sec": 180, "note": "Alternance bench/OHP chaque séance. Progression +2.5kg."},
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 3, "reps": "5", "rest_sec": 150, "note": "Dos à 45°, tirer vers le bas-ventre. +2.5kg/séance."}
      ]
    },
    {
      "name": "Workout B",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 3, "reps": "5", "rest_sec": 180, "note": "Squatter chaque séance est la clé du programme."},
        {"slug": "barbell-overhead-press", "name_fr": "Développé militaire barre", "sets": 3, "reps": "5", "rest_sec": 180, "note": "Alterne avec le développé couché. +2.5kg/séance."},
        {"slug": "conventional-deadlift", "name_fr": "Soulevé de terre conventionnel", "sets": 1, "reps": "5", "rest_sec": 300, "note": "1 série lourde uniquement. +5kg/séance au début."}
      ]
    },
    {
      "name": "Workout A",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 3, "reps": "5", "rest_sec": 180, "note": "Augmenter le poids à chaque séance sans exception."},
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 3, "reps": "5", "rest_sec": 180, "note": "Si tu stales 3 fois, réduire de 10% et repartir."},
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 3, "reps": "5", "rest_sec": 150, "note": "Maîtriser la technique avant d''augmenter le poids."}
      ]
    }
  ]
}'::jsonb WHERE slug = 'starting-strength';

-- Bodyweight Débutant (beginner, no equipment)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Upper Body",
      "exercises": [
        {"slug": "push-up", "name_fr": "Pompe", "sets": 4, "reps": "8-15", "rest_sec": 90, "note": "Corps gainé, mains légèrement plus larges que les épaules"},
        {"slug": "chin-up", "name_fr": "Traction supination", "sets": 3, "reps": "3-8", "rest_sec": 120, "note": "Commencer avec des tractions assistées si besoin"},
        {"slug": "dip", "name_fr": "Dip aux barres parallèles", "sets": 3, "reps": "6-12", "rest_sec": 90, "note": "Légèrement penché pour cibler la poitrine"},
        {"slug": "pike-push-up", "name_fr": "Pompe en V", "sets": 3, "reps": "8-12", "rest_sec": 90, "note": "Position en V, pour cibler les épaules"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 3, "reps": "30-60s", "rest_sec": 60, "note": "Maintenir la position sans cambrer le dos"}
      ]
    },
    {
      "name": "Lower Body",
      "exercises": [
        {"slug": "bodyweight-squat", "name_fr": "Squat au poids du corps", "sets": 4, "reps": "15-20", "rest_sec": 90, "note": "Descendre profond, cuisses parallèles minimum"},
        {"slug": "bulgarian-split-squat", "name_fr": "Squat bulgare", "sets": 3, "reps": "8-12", "rest_sec": 90, "note": "Pied arrière sur chaise/banc, contrôler la descente"},
        {"slug": "barbell-hip-thrust", "name_fr": "Hip thrust barre", "sets": 3, "reps": "12-15", "rest_sec": 90, "note": "Version poids du corps — dos contre canapé/chaise"},
        {"slug": "hyperextension", "name_fr": "Extension du dos", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Au sol en Superman ou sur un banc si dispo"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 3, "reps": "30-45s", "rest_sec": 60, "note": "Gainage latéral aussi pour les obliques"}
      ]
    },
    {
      "name": "Core & Cardio",
      "exercises": [
        {"slug": "crunch", "name_fr": "Crunch", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Lever les épaules, pas la tête. Expirer en montant."},
        {"slug": "russian-twist", "name_fr": "Rotation russe", "sets": 3, "reps": "20", "rest_sec": 60, "note": "Jambes levées pour plus de difficulté"},
        {"slug": "hanging-leg-raise", "name_fr": "Relevé de jambes suspendu", "sets": 3, "reps": "10-15", "rest_sec": 75, "note": "Jambes tendues pour maximiser le travail des abdos"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 3, "reps": "45-60s", "rest_sec": 60, "note": "Gainage planche + gainage latéral"},
        {"slug": "push-up", "name_fr": "Pompe", "sets": 2, "reps": "max", "rest_sec": 90, "note": "Finisher — aller à l''échec sur les 2 dernières séries"}
      ]
    }
  ]
}'::jsonb WHERE slug = 'bodyweight-beginner';

-- Upper/Lower 4×/semaine (intermediate)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Upper A",
      "exercises": [
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 4, "reps": "6-8", "rest_sec": 120, "note": "Mouvement principal force — charge lourde"},
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 4, "reps": "6-8", "rest_sec": 120, "note": "Antagoniste du bench, dos à 45°"},
        {"slug": "barbell-overhead-press", "name_fr": "Développé militaire barre", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Debout, gainé, pousser verticalement"},
        {"slug": "lat-pulldown", "name_fr": "Tirage verticaux poulie haute", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Coudes vers le bas, ne pas balancer"},
        {"slug": "lateral-raise", "name_fr": "Élévations latérales", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Poids léger, contraction à hauteur des épaules"},
        {"slug": "barbell-curl", "name_fr": "Curl barre", "sets": 3, "reps": "10-12", "rest_sec": 60, "note": "Coudes fixes, supiner le poignet"}
      ]
    },
    {
      "name": "Lower A",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 4, "reps": "6-8", "rest_sec": 180, "note": "Mouvement principal — charge maximale contrôlée"},
        {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre roumain", "sets": 3, "reps": "8-10", "rest_sec": 120, "note": "Hanches arrière, tension dans les ischio-jambiers"},
        {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Pieds milieu de la plateforme"},
        {"slug": "leg-extension", "name_fr": "Extension jambes", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Contraction isométrique 1s en haut"},
        {"slug": "calf-raise", "name_fr": "Mollets debout", "sets": 4, "reps": "15-20", "rest_sec": 60, "note": "Descendre sous le niveau pour étirement complet"}
      ]
    },
    {
      "name": "Upper B",
      "exercises": [
        {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné barre", "sets": 4, "reps": "8-10", "rest_sec": 120, "note": "30-45°, cibler le chef claviculaire"},
        {"slug": "one-arm-dumbbell-row", "name_fr": "Rowing unilatéral haltère", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Un genou sur le banc, tirer vers la hanche"},
        {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Plus d''amplitude que la barre, contrôler"},
        {"slug": "cable-fly", "name_fr": "Écarté câble", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Câbles haut, croiser les mains en bas"},
        {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Coudes fixes contre le corps"},
        {"slug": "hammer-curl", "name_fr": "Curl marteau", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Prise neutre, cibler le brachio-radial"}
      ]
    },
    {
      "name": "Lower B",
      "exercises": [
        {"slug": "conventional-deadlift", "name_fr": "Soulevé de terre conventionnel", "sets": 4, "reps": "5-6", "rest_sec": 180, "note": "Charge max — séance force pour le bas du corps"},
        {"slug": "bulgarian-split-squat", "name_fr": "Squat bulgare", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Unilatéral — corriger les déséquilibres"},
        {"slug": "leg-curl", "name_fr": "Flexion jambes couchée", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Descente lente 3-4s, contraction complète"},
        {"slug": "barbell-hip-thrust", "name_fr": "Hip thrust barre", "sets": 3, "reps": "12-15", "rest_sec": 90, "note": "Extension complète des hanches, serrer les fessiers"},
        {"slug": "calf-raise", "name_fr": "Mollets debout", "sets": 4, "reps": "15-20", "rest_sec": 60, "note": "Variation de position des pieds pour cibler tout le mollet"}
      ]
    }
  ]
}'::jsonb WHERE slug = 'upper-lower-4x';

-- PPL 3×/semaine (intermediate)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Push",
      "exercises": [
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 4, "reps": "6-8", "rest_sec": 120, "note": "Mouvement principal push — priorité force"},
        {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné barre", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Poitrine haute, 30-45° d''inclinaison"},
        {"slug": "barbell-overhead-press", "name_fr": "Développé militaire barre", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Debout, core gainé"},
        {"slug": "lateral-raise", "name_fr": "Élévations latérales", "sets": 4, "reps": "15-20", "rest_sec": 60, "note": "Poids léger, 4 séries pour le volume"},
        {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Coudes fixes, extension complète"},
        {"slug": "dip", "name_fr": "Dip aux barres parallèles", "sets": 3, "reps": "8-12", "rest_sec": 75, "note": "En finisher, aller à l''échec si possible"}
      ]
    },
    {
      "name": "Pull",
      "exercises": [
        {"slug": "pull-up", "name_fr": "Traction", "sets": 4, "reps": "5-8", "rest_sec": 120, "note": "Prise pronation large — mouvement principal pull"},
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 4, "reps": "6-8", "rest_sec": 120, "note": "Dos à 45°, tirer vers le bas-ventre"},
        {"slug": "seated-cable-row", "name_fr": "Rowing assis câble", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Dos droit, serrer les omoplates"},
        {"slug": "face-pull", "name_fr": "Face pull câble", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Santé des épaules — ne pas négliger"},
        {"slug": "barbell-curl", "name_fr": "Curl barre", "sets": 3, "reps": "10-12", "rest_sec": 75, "note": "Coudes fixes, contraction maximale"},
        {"slug": "hammer-curl", "name_fr": "Curl marteau", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Prise neutre pour le brachio-radial"}
      ]
    },
    {
      "name": "Legs",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 4, "reps": "6-8", "rest_sec": 180, "note": "Le mouvement roi. Progression obligatoire."},
        {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre roumain", "sets": 3, "reps": "8-10", "rest_sec": 120, "note": "Accent ischio-jambiers, hanches en arrière"},
        {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Volume supplémentaire quads"},
        {"slug": "leg-extension", "name_fr": "Extension jambes", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Isolation quads, contraction 1s en haut"},
        {"slug": "leg-curl", "name_fr": "Flexion jambes couchée", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Descente lente, contraction complète"},
        {"slug": "calf-raise", "name_fr": "Mollets debout", "sets": 4, "reps": "15-20", "rest_sec": 60, "note": "Les mollets récupèrent vite — volume élevé requis"}
      ]
    }
  ]
}'::jsonb WHERE slug = 'ppl-3x';

-- PPL 6×/semaine (intermediate/advanced)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Push A",
      "exercises": [
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 4, "reps": "5-6", "rest_sec": 150, "note": "Séance A = force. Charge maximale sur 5-6 reps."},
        {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné barre", "sets": 3, "reps": "8-10", "rest_sec": 120, "note": "30-45°, chef claviculaire du pectoral"},
        {"slug": "barbell-overhead-press", "name_fr": "Développé militaire barre", "sets": 4, "reps": "6-8", "rest_sec": 120, "note": "Debout, force pure"},
        {"slug": "lateral-raise", "name_fr": "Élévations latérales", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Série drop — diminuer le poids à mi-série"},
        {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Coudes bien collés au corps"}
      ]
    },
    {
      "name": "Pull A",
      "exercises": [
        {"slug": "pull-up", "name_fr": "Traction", "sets": 4, "reps": "5-8", "rest_sec": 150, "note": "Prise pronation — mouvement de force"},
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 4, "reps": "5-6", "rest_sec": 150, "note": "Charge lourde, technique stricte"},
        {"slug": "face-pull", "name_fr": "Face pull câble", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Indispensable pour la santé des épaules"},
        {"slug": "barbell-curl", "name_fr": "Curl barre", "sets": 3, "reps": "8-10", "rest_sec": 75, "note": "Charge lourde sur les biceps"},
        {"slug": "hammer-curl", "name_fr": "Curl marteau", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Brachio-radial + brachialis"}
      ]
    },
    {
      "name": "Legs",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 4, "reps": "6-8", "rest_sec": 180, "note": "Le mouvement roi des jambes"},
        {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Volume supplémentaire quads"},
        {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre roumain", "sets": 3, "reps": "8-10", "rest_sec": 120, "note": "Ischio-jambiers en tension constante"},
        {"slug": "leg-extension", "name_fr": "Extension jambes", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Isolation pure quads"},
        {"slug": "leg-curl", "name_fr": "Flexion jambes couchée", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Descente lente 3-4 secondes"},
        {"slug": "calf-raise", "name_fr": "Mollets debout", "sets": 5, "reps": "15-20", "rest_sec": 60, "note": "Volume élevé nécessaire pour les mollets"}
      ]
    },
    {
      "name": "Push B",
      "exercises": [
        {"slug": "dumbbell-bench-press", "name_fr": "Développé couché haltères", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Séance B = hypertrophie. Amplitude maximale."},
        {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné barre", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Variante du Push A pour stimulus différent"},
        {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères", "sets": 4, "reps": "12-15", "rest_sec": 75, "note": "Amplitude complète, contrôler la descente"},
        {"slug": "cable-fly", "name_fr": "Écarté câble", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Câbles bas pour la partie basse du pectoral"},
        {"slug": "overhead-tricep-extension", "name_fr": "Extension triceps derrière la tête", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Long chef du triceps — étirement maximum"}
      ]
    },
    {
      "name": "Pull B",
      "exercises": [
        {"slug": "one-arm-dumbbell-row", "name_fr": "Rowing unilatéral haltère", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Hypertrophie — reps modérées, amplitude complète"},
        {"slug": "seated-cable-row", "name_fr": "Rowing assis câble", "sets": 4, "reps": "12-15", "rest_sec": 75, "note": "Tension constante grâce au câble"},
        {"slug": "rear-delt-fly", "name_fr": "Oiseau prise inversée", "sets": 4, "reps": "15-20", "rest_sec": 60, "note": "Deltoïdes postérieurs + posture"},
        {"slug": "preacher-curl", "name_fr": "Curl pupitre", "sets": 3, "reps": "10-12", "rest_sec": 75, "note": "Isolation parfaite des biceps"},
        {"slug": "chin-up", "name_fr": "Traction supination", "sets": 3, "reps": "6-10", "rest_sec": 90, "note": "Plus biceps que les tractions pronation"}
      ]
    },
    {
      "name": "Legs B",
      "exercises": [
        {"slug": "conventional-deadlift", "name_fr": "Soulevé de terre conventionnel", "sets": 4, "reps": "5-6", "rest_sec": 180, "note": "Force pure — charge max, jambes B plus force"},
        {"slug": "bulgarian-split-squat", "name_fr": "Squat bulgare", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Unilatéral pour équilibre musculaire"},
        {"slug": "barbell-hip-thrust", "name_fr": "Hip thrust barre", "sets": 4, "reps": "12-15", "rest_sec": 90, "note": "Activation maximale des fessiers"},
        {"slug": "leg-curl", "name_fr": "Flexion jambes couchée", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Ischio-jambiers en isolation"},
        {"slug": "calf-raise", "name_fr": "Mollets debout", "sets": 4, "reps": "15-20", "rest_sec": 60, "note": "Varier la position des pieds (dedans/dehors/neutre)"}
      ]
    }
  ]
}'::jsonb WHERE slug = 'ppl-6x';

-- PHUL — Power Hypertrophy (intermediate)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Upper Power",
      "exercises": [
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 5, "reps": "5", "rest_sec": 180, "note": "Séance force — 85-90% du max, repos complet"},
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 5, "reps": "5", "rest_sec": 180, "note": "Antagoniste du bench, même intensité"},
        {"slug": "barbell-overhead-press", "name_fr": "Développé militaire barre", "sets": 3, "reps": "5", "rest_sec": 150, "note": "Force sur les épaules"},
        {"slug": "pull-up", "name_fr": "Traction", "sets": 3, "reps": "5-8", "rest_sec": 120, "note": "Ajouter du lest si 8 reps deviennent trop faciles"},
        {"slug": "barbell-curl", "name_fr": "Curl barre", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Curl lourd en fin de séance power"}
      ]
    },
    {
      "name": "Lower Power",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 5, "reps": "5", "rest_sec": 240, "note": "Squat lourd — 85-90% du max"},
        {"slug": "conventional-deadlift", "name_fr": "Soulevé de terre conventionnel", "sets": 4, "reps": "5", "rest_sec": 240, "note": "Charge élevée, technique stricte"},
        {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 3, "reps": "8-10", "rest_sec": 120, "note": "Accessoire — quads supplémentaires"},
        {"slug": "leg-extension", "name_fr": "Extension jambes", "sets": 2, "reps": "10-12", "rest_sec": 75, "note": "Finisher isolation quads"}
      ]
    },
    {
      "name": "Upper Hypertrophy",
      "exercises": [
        {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné barre", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Hypertrophie — reps modérées, contraction"},
        {"slug": "one-arm-dumbbell-row", "name_fr": "Rowing unilatéral haltère", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Amplitude maximale, dos solide"},
        {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères", "sets": 4, "reps": "10-12", "rest_sec": 75, "note": "Séance hypertrophie épaules"},
        {"slug": "cable-fly", "name_fr": "Écarté câble", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Étirement en bas, contraction en haut"},
        {"slug": "dumbbell-curl", "name_fr": "Curl haltères", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Supiner le poignet en cours de mouvement"},
        {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Extension complète, coudes fixes"}
      ]
    },
    {
      "name": "Lower Hypertrophy",
      "exercises": [
        {"slug": "bulgarian-split-squat", "name_fr": "Squat bulgare", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Hypertrophie unilatérale — 3 séances après Lower Power"},
        {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre roumain", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Ischio-jambiers — étirement profond"},
        {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 4, "reps": "12-15", "rest_sec": 75, "note": "Volume élevé en hypertrophie"},
        {"slug": "leg-curl", "name_fr": "Flexion jambes couchée", "sets": 3, "reps": "12-15", "rest_sec": 75, "note": "Descente lente 3s"},
        {"slug": "leg-extension", "name_fr": "Extension jambes", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Isolation quads en fin de séance"},
        {"slug": "calf-raise", "name_fr": "Mollets debout", "sets": 5, "reps": "15-20", "rest_sec": 60, "note": "Les mollets se développent avec du volume"}
      ]
    }
  ]
}'::jsonb WHERE slug = 'phul';

-- Home Dumbbell Program (beginner/intermediate)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Upper A",
      "exercises": [
        {"slug": "dumbbell-bench-press", "name_fr": "Développé couché haltères", "sets": 4, "reps": "8-12", "rest_sec": 90, "note": "Sur le sol ou un banc, amplitude complète"},
        {"slug": "one-arm-dumbbell-row", "name_fr": "Rowing unilatéral haltère", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Genou et main sur une chaise pour le support"},
        {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Assis dos droit ou debout"},
        {"slug": "dumbbell-curl", "name_fr": "Curl haltères", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Alterner ou simultané, supiner le poignet"},
        {"slug": "overhead-tricep-extension", "name_fr": "Extension triceps derrière la tête", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Un haltère à deux mains au-dessus de la tête"}
      ]
    },
    {
      "name": "Lower A",
      "exercises": [
        {"slug": "goblet-squat", "name_fr": "Squat goblet", "sets": 4, "reps": "12-15", "rest_sec": 90, "note": "Haltère contre la poitrine, squat profond"},
        {"slug": "dumbbell-lunges", "name_fr": "Fentes haltères", "sets": 3, "reps": "12", "rest_sec": 90, "note": "12 par jambe — genou arrière près du sol"},
        {"slug": "dumbbell-rdl", "name_fr": "Soulevé de terre haltères", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Jambes semi-fléchies, dos droit"},
        {"slug": "calf-raise", "name_fr": "Mollets debout", "sets": 4, "reps": "20", "rest_sec": 60, "note": "Une jambe à la fois sur une marche pour plus d''amplitude"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 3, "reps": "45-60s", "rest_sec": 60, "note": "Corps aligné, respiration régulière"}
      ]
    },
    {
      "name": "Upper B",
      "exercises": [
        {"slug": "push-up", "name_fr": "Pompe", "sets": 4, "reps": "15-20", "rest_sec": 75, "note": "Pied surélevés pour + de difficulté"},
        {"slug": "chin-up", "name_fr": "Traction supination", "sets": 4, "reps": "5-10", "rest_sec": 120, "note": "Prise supination, plus de biceps"},
        {"slug": "rear-delt-fly", "name_fr": "Oiseau prise inversée", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Penché à 90°, poids léger, arc de cercle"},
        {"slug": "hammer-curl", "name_fr": "Curl marteau", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Prise neutre, brachio-radial + brachialis"},
        {"slug": "dip", "name_fr": "Dip aux barres parallèles", "sets": 3, "reps": "8-15", "rest_sec": 75, "note": "Sur deux chaises si pas de barre"}
      ]
    },
    {
      "name": "Lower B",
      "exercises": [
        {"slug": "bulgarian-split-squat", "name_fr": "Squat bulgare", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Pied arrière sur chaise, haltères en mains"},
        {"slug": "barbell-hip-thrust", "name_fr": "Hip thrust barre", "sets": 4, "reps": "15-20", "rest_sec": 90, "note": "Version poids du corps ou haltère sur les hanches"},
        {"slug": "dumbbell-rdl", "name_fr": "Soulevé de terre haltères", "sets": 3, "reps": "12-15", "rest_sec": 75, "note": "Ischio-jambiers — tension à chaque répétition"},
        {"slug": "dumbbell-lunges", "name_fr": "Fentes haltères", "sets": 3, "reps": "12", "rest_sec": 75, "note": "En marchant pour plus de dynamisme"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 3, "reps": "60s", "rest_sec": 60, "note": "Gainage + gainage latéral pour les obliques"}
      ]
    }
  ]
}'::jsonb WHERE slug = 'home-dumbbell';

-- Arnold Split (advanced)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Chest+Back A",
      "exercises": [
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 4, "reps": "6-8", "rest_sec": 120, "note": "Le classique Arnold — poitrine d''abord"},
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 4, "reps": "6-8", "rest_sec": 120, "note": "Superset avec le bench pour le dos"},
        {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné barre", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Chef claviculaire du pectoral"},
        {"slug": "pull-up", "name_fr": "Traction", "sets": 4, "reps": "6-10", "rest_sec": 90, "note": "Prise large, dos complet"},
        {"slug": "cable-fly", "name_fr": "Écarté câble", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Finisher isolation poitrine"},
        {"slug": "one-arm-dumbbell-row", "name_fr": "Rowing unilatéral haltère", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Finisher isolation dos"}
      ]
    },
    {
      "name": "Shoulders+Arms A",
      "exercises": [
        {"slug": "barbell-overhead-press", "name_fr": "Développé militaire barre", "sets": 4, "reps": "6-8", "rest_sec": 120, "note": "Le Arnold Press original — force sur les épaules"},
        {"slug": "lateral-raise", "name_fr": "Élévations latérales", "sets": 4, "reps": "12-15", "rest_sec": 75, "note": "Deltoïdes médians — le détail visuel"},
        {"slug": "rear-delt-fly", "name_fr": "Oiseau prise inversée", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Deltoïdes postérieurs souvent négligés"},
        {"slug": "barbell-curl", "name_fr": "Curl barre", "sets": 4, "reps": "8-10", "rest_sec": 75, "note": "Biceps lourds en début de séance bras"},
        {"slug": "skull-crusher", "name_fr": "Barre au front", "sets": 3, "reps": "10-12", "rest_sec": 75, "note": "Triceps — long chef ciblé"},
        {"slug": "hammer-curl", "name_fr": "Curl marteau", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Finisher biceps/brachio-radial"}
      ]
    },
    {
      "name": "Legs A",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 5, "reps": "6-8", "rest_sec": 180, "note": "Volume élevé en Arnold Split — 5 séries"},
        {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Après les squats, volume supplémentaire"},
        {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre roumain", "sets": 4, "reps": "8-10", "rest_sec": 120, "note": "Ischio-jambiers — profond et contrôlé"},
        {"slug": "leg-extension", "name_fr": "Extension jambes", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Isolation quads finale"},
        {"slug": "leg-curl", "name_fr": "Flexion jambes couchée", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Descente lente 3s"},
        {"slug": "calf-raise", "name_fr": "Mollets debout", "sets": 5, "reps": "20", "rest_sec": 60, "note": "Arnold avait des mollets légendaires — volume requis"}
      ]
    },
    {
      "name": "Chest+Back B",
      "exercises": [
        {"slug": "dumbbell-bench-press", "name_fr": "Développé couché haltères", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Variant B — amplitude maximale avec haltères"},
        {"slug": "lat-pulldown", "name_fr": "Tirage verticaux poulie haute", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Tirer jusqu''au menton, coudes vers le bas"},
        {"slug": "dumbbell-fly", "name_fr": "Écarté haltères", "sets": 3, "reps": "12-15", "rest_sec": 75, "note": "Arc de cercle, légère flexion des coudes"},
        {"slug": "seated-cable-row", "name_fr": "Rowing assis câble", "sets": 3, "reps": "12-15", "rest_sec": 75, "note": "Tension constante, serrer les omoplates"},
        {"slug": "cable-fly", "name_fr": "Écarté câble", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Drop set en finisher"}
      ]
    },
    {
      "name": "Shoulders+Arms B",
      "exercises": [
        {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Le vrai Arnold Press — tourner les poignets en montant"},
        {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble", "sets": 4, "reps": "15-20", "rest_sec": 60, "note": "Tension constante vs haltères"},
        {"slug": "face-pull", "name_fr": "Face pull câble", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Santé des épaules — indispensable en avancé"},
        {"slug": "preacher-curl", "name_fr": "Curl pupitre", "sets": 3, "reps": "10-12", "rest_sec": 75, "note": "Isolation parfaite biceps"},
        {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble", "sets": 4, "reps": "12-15", "rest_sec": 60, "note": "Volume élevé triceps en session B"},
        {"slug": "hammer-curl", "name_fr": "Curl marteau", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Finisher bras"}
      ]
    },
    {
      "name": "Legs B",
      "exercises": [
        {"slug": "conventional-deadlift", "name_fr": "Soulevé de terre conventionnel", "sets": 5, "reps": "5-6", "rest_sec": 240, "note": "Séance B = force sur les legs — deadlift lourd"},
        {"slug": "bulgarian-split-squat", "name_fr": "Squat bulgare", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Unilatéral pour corriger les asymétries"},
        {"slug": "barbell-hip-thrust", "name_fr": "Hip thrust barre", "sets": 4, "reps": "12-15", "rest_sec": 90, "note": "Fessiers — extension complète des hanches"},
        {"slug": "leg-curl", "name_fr": "Flexion jambes couchée", "sets": 3, "reps": "12-15", "rest_sec": 75, "note": "Ischio-jambiers en isolation"},
        {"slug": "calf-raise", "name_fr": "Mollets debout", "sets": 5, "reps": "20", "rest_sec": 60, "note": "Descendre sous le niveau — étirement complet"}
      ]
    }
  ]
}'::jsonb WHERE slug = 'arnolds-split';

-- Bro Split 5×/semaine (advanced)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Chest",
      "exercises": [
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 5, "reps": "6-8", "rest_sec": 120, "note": "Volume maximal sur un seul muscle — chest monday"},
        {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné barre", "sets": 4, "reps": "8-10", "rest_sec": 90, "note": "Chef claviculaire — poitrine haute"},
        {"slug": "dumbbell-bench-press", "name_fr": "Développé couché haltères", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Amplitude maximale avec haltères"},
        {"slug": "cable-fly", "name_fr": "Écarté câble", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Partie basse poitrine — câbles bas"},
        {"slug": "dip", "name_fr": "Dip aux barres parallèles", "sets": 3, "reps": "12-15", "rest_sec": 75, "note": "Finisher poitrine — aller à l''échec"}
      ]
    },
    {
      "name": "Back",
      "exercises": [
        {"slug": "conventional-deadlift", "name_fr": "Soulevé de terre conventionnel", "sets": 4, "reps": "5-6", "rest_sec": 180, "note": "Back day avec deadlift lourd — mouvement roi"},
        {"slug": "pull-up", "name_fr": "Traction", "sets": 4, "reps": "6-10", "rest_sec": 120, "note": "Prise pronation large — dorsaux en V"},
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 4, "reps": "8-10", "rest_sec": 120, "note": "Épaisseur du dos"},
        {"slug": "one-arm-dumbbell-row", "name_fr": "Rowing unilatéral haltère", "sets": 3, "reps": "12-15", "rest_sec": 75, "note": "Unilatéral pour corriger les déséquilibres"},
        {"slug": "face-pull", "name_fr": "Face pull câble", "sets": 3, "reps": "20", "rest_sec": 60, "note": "Santé des épaules — ne jamais sauter"}
      ]
    },
    {
      "name": "Shoulders",
      "exercises": [
        {"slug": "barbell-overhead-press", "name_fr": "Développé militaire barre", "sets": 4, "reps": "6-8", "rest_sec": 120, "note": "Mouvement principal épaules — force"},
        {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Après la barre pour le volume"},
        {"slug": "lateral-raise", "name_fr": "Élévations latérales", "sets": 5, "reps": "15-20", "rest_sec": 60, "note": "5 séries pour les deltoïdes médians — le détail"},
        {"slug": "rear-delt-fly", "name_fr": "Oiseau prise inversée", "sets": 4, "reps": "15-20", "rest_sec": 60, "note": "Deltoïdes postérieurs + posture"},
        {"slug": "front-raise", "name_fr": "Élévations frontales", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Deltoïdes antérieurs — compléter les 3 chefs"}
      ]
    },
    {
      "name": "Arms",
      "exercises": [
        {"slug": "barbell-curl", "name_fr": "Curl barre", "sets": 4, "reps": "8-10", "rest_sec": 90, "note": "Biceps lourds en début de séance arms"},
        {"slug": "skull-crusher", "name_fr": "Barre au front", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Triceps lourds — superset possible avec curl"},
        {"slug": "preacher-curl", "name_fr": "Curl pupitre", "sets": 3, "reps": "10-12", "rest_sec": 75, "note": "Isolation parfaite biceps — pas de triche"},
        {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble", "sets": 4, "reps": "12-15", "rest_sec": 60, "note": "Volume triceps — coudes fixes"},
        {"slug": "hammer-curl", "name_fr": "Curl marteau", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Brachio-radial + brachialis"},
        {"slug": "overhead-tricep-extension", "name_fr": "Extension triceps derrière la tête", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Long chef du triceps en étirement"}
      ]
    },
    {
      "name": "Legs",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 5, "reps": "6-8", "rest_sec": 180, "note": "Le jour jambes du bro split — volume maximum"},
        {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Volume supplémentaire quads"},
        {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre roumain", "sets": 4, "reps": "8-10", "rest_sec": 120, "note": "Ischio-jambiers — profond et contrôlé"},
        {"slug": "leg-extension", "name_fr": "Extension jambes", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Finisher quads"},
        {"slug": "leg-curl", "name_fr": "Flexion jambes couchée", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Finisher ischio"},
        {"slug": "calf-raise", "name_fr": "Mollets debout", "sets": 6, "reps": "20", "rest_sec": 60, "note": "Volume maximal mollets — 6 séries"}
      ]
    }
  ]
}'::jsonb WHERE slug = 'bro-split-5x';

-- Force — Powerlifting (intermediate/advanced)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Squat Focus",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 5, "reps": "5", "rest_sec": 300, "note": "Charge principale — 80-85% du max. Progression hebdomadaire."},
        {"slug": "barbell-front-squat", "name_fr": "Squat avant", "sets": 3, "reps": "3-5", "rest_sec": 180, "note": "Technique et force quads supérieure"},
        {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 3, "reps": "8-10", "rest_sec": 120, "note": "Accessoire squats — volume supplémentaire"},
        {"slug": "leg-extension", "name_fr": "Extension jambes", "sets": 2, "reps": "12-15", "rest_sec": 75, "note": "Isolation quads en fin"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 4, "reps": "60s", "rest_sec": 60, "note": "Core fort = squat plus lourd"}
      ]
    },
    {
      "name": "Bench Focus",
      "exercises": [
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 5, "reps": "5", "rest_sec": 300, "note": "Charge principale bench — 80-85% du max"},
        {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné barre", "sets": 3, "reps": "6-8", "rest_sec": 150, "note": "Accessoire bench — poitrine haute et triceps"},
        {"slug": "dumbbell-bench-press", "name_fr": "Développé couché haltères", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Amplitude et stabilité"},
        {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble", "sets": 4, "reps": "10-12", "rest_sec": 75, "note": "Triceps forts = bench plus lourd"},
        {"slug": "front-raise", "name_fr": "Élévations frontales", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Deltoïdes antérieurs pour la stabilité du bench"}
      ]
    },
    {
      "name": "Deadlift Focus",
      "exercises": [
        {"slug": "conventional-deadlift", "name_fr": "Soulevé de terre conventionnel", "sets": 5, "reps": "3", "rest_sec": 360, "note": "Charge principale deadlift — 85-90% du max"},
        {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre roumain", "sets": 4, "reps": "6-8", "rest_sec": 180, "note": "Accessoire — ischio-jambiers et érecteurs"},
        {"slug": "barbell-hip-thrust", "name_fr": "Hip thrust barre", "sets": 3, "reps": "8-10", "rest_sec": 120, "note": "Fessiers forts pour lockout du deadlift"},
        {"slug": "hyperextension", "name_fr": "Extension du dos", "sets": 3, "reps": "12-15", "rest_sec": 90, "note": "Érecteurs du rachis — clés pour le deadlift"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 3, "reps": "60s", "rest_sec": 60, "note": "Core — indispensable pour la sécurité du deadlift"}
      ]
    },
    {
      "name": "Accessoires",
      "exercises": [
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 4, "reps": "6-8", "rest_sec": 120, "note": "Dos épais — crucial pour les 3 mouvements"},
        {"slug": "lat-pulldown", "name_fr": "Tirage verticaux poulie haute", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Dorsaux — équilibre avec les poussées"},
        {"slug": "barbell-overhead-press", "name_fr": "Développé militaire barre", "sets": 4, "reps": "5-6", "rest_sec": 150, "note": "OHP comme mouvement de force accessoire"},
        {"slug": "barbell-curl", "name_fr": "Curl barre", "sets": 3, "reps": "10-12", "rest_sec": 75, "note": "Biceps pour santé des coudes et traction"},
        {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Volume triceps pour bench"}
      ]
    }
  ]
}'::jsonb WHERE slug = 'strength-powerlifting';

-- Sèche — Cardio + Muscu (all levels, weight_loss)
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Full Body A",
      "exercises": [
        {"slug": "barbell-back-squat", "name_fr": "Squat barre nuque", "sets": 3, "reps": "8-12", "rest_sec": 90, "note": "En sèche — reps modérées, moins de repos pour brûler + de calories"},
        {"slug": "barbell-bench-press", "name_fr": "Développé couché barre", "sets": 3, "reps": "8-12", "rest_sec": 90, "note": "Maintien musculaire en déficit calorique"},
        {"slug": "barbell-row", "name_fr": "Rowing barre", "sets": 3, "reps": "8-12", "rest_sec": 90, "note": "Dos — maintenir la masse musculaire"},
        {"slug": "lat-pulldown", "name_fr": "Tirage verticaux poulie haute", "sets": 3, "reps": "10-12", "rest_sec": 75, "note": "Amplitude dorsaux en sèche"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 3, "reps": "45s", "rest_sec": 45, "note": "Core — circuits possible pour brûler + de calories"}
      ]
    },
    {
      "name": "LISS Cardio",
      "exercises": []
    },
    {
      "name": "Full Body B",
      "exercises": [
        {"slug": "conventional-deadlift", "name_fr": "Soulevé de terre conventionnel", "sets": 3, "reps": "6-8", "rest_sec": 120, "note": "Lourd mais volume réduit en sèche"},
        {"slug": "barbell-overhead-press", "name_fr": "Développé militaire barre", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Épaules — ne pas sacrifier la force"},
        {"slug": "lat-pulldown", "name_fr": "Tirage verticaux poulie haute", "sets": 3, "reps": "10-12", "rest_sec": 75, "note": "Dorsaux en V — préserver la silhouette"},
        {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 3, "reps": "10-15", "rest_sec": 75, "note": "Jambes — reps plus élevées en sèche"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 3, "reps": "45s", "rest_sec": 45, "note": "Finisher core"}
      ]
    },
    {
      "name": "LISS Cardio",
      "exercises": []
    },
    {
      "name": "Full Body C",
      "exercises": [
        {"slug": "bulgarian-split-squat", "name_fr": "Squat bulgare", "sets": 3, "reps": "12", "rest_sec": 75, "note": "Unilatéral — dépense calorique plus élevée"},
        {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné barre", "sets": 3, "reps": "10-12", "rest_sec": 75, "note": "Poitrine haute — variante du Full Body A"},
        {"slug": "one-arm-dumbbell-row", "name_fr": "Rowing unilatéral haltère", "sets": 3, "reps": "12", "rest_sec": 75, "note": "Dos en unilatéral pour finir la semaine"},
        {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre roumain", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Ischio-jambiers + fessiers en sèche"},
        {"slug": "plank", "name_fr": "Gainage", "sets": 3, "reps": "60s", "rest_sec": 45, "note": "Fin de semaine — finisher core intense"}
      ]
    }
  ]
}'::jsonb WHERE slug = 'cut-cardio';
