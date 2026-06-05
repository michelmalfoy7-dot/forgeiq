-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION v3 — Refonte complète des programmes
-- • by_feature : exercices adaptés à l'équipement réel de chaque salle
--   Cascade : by_feature[feature] → by_tier[tier] → name_fr
-- • Descriptions pédagogiques : pourquoi ce programme, pour qui, principes
-- • Machine > Barre pour l'hypertrophie (Israetel / Nippard / Schoenfeld)
--   Exception : squat barre, RDL, hip thrust, press militaire
-- • Barbell réservé aux mouvements fondamentaux et à la force
--
-- Features disponibles dans gym_equipment_profiles.features :
--   hammer_strength     → Hammer Strength plate-loaded
--   technogym           → Technogym sélectorisé
--   life_fitness        → Life Fitness
--   cable_station       → Stations câbles classiques
--   functional_trainer  → Double poulie fonctionnelle
--   plate_loaded        → Zone poids libres (barres + haltères)
--   dumbbells           → Haltères uniquement
--
-- Exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════════
-- PROGRAMME 1 : Full Body Débutant 3×/semaine
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE programs SET
  description = '3 séances par semaine couvrant tout le corps à chaque fois. C''est la fréquence idéale pour débuter : tu pratiques chaque mouvement 3 fois par semaine, ce qui accélère l''apprentissage moteur et la progression. L''alternance A/B assure que chaque muscle est sollicité sous deux angles différents. Règle d''or : si tu réussis toutes les répétitions, tu augmentes la charge de 2,5 kg à la prochaine séance. Simple, prouvé, efficace. À faire pendant 8 semaines avant de passer à un programme 4 jours.'
WHERE slug = 'full-body-debutant-3x';

UPDATE programs SET structure = $fb3x${
  "days": [
    {
      "name": "Full Body A",
      "focus": "Quads · Pecto · Dos vertical · Épaules",
      "exercises": [
        {
          "slot": "legs_squat",
          "sets": 3, "reps": "8-12", "rest_sec": 120,
          "note": "Mouvement roi. Descends les cuisses au moins parallèles au sol, genoux dans l'axe des pieds. Progression : +2,5 kg si 3×12 réussis.",
          "by_tier": {
            "premium":  {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
            "standard": {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
            "home":     {"slug": "goblet-squat",       "name_fr": "Goblet Squat haltère"}
          }
        },
        {
          "slot": "chest_horizontal",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Amplitude complète — étirement du pectoral en bas, contraction en haut. La machine est recommandée pour débuter.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-chest-press", "name_fr": "Chest Press Hammer Strength"},
            "technogym":       {"slug": "machine-chest-press", "name_fr": "Chest Press Technogym"},
            "life_fitness":    {"slug": "machine-chest-press", "name_fr": "Chest Press Life Fitness"},
            "plate_loaded":    {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"},
            "dumbbells":       {"slug": "dumbbell-bench-press","name_fr": "Développé couché haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "standard": {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "home":     {"slug": "dumbbell-bench-press", "name_fr": "Développé couché haltères"}
          }
        },
        {
          "slot": "back_vertical_pull",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Tirer les coudes vers les hanches, pas vers l'arrière. Contrôler la descente. Si tu ne fais pas encore des tractions, utilise la poulie avec assistance.",
          "by_tier": {
            "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
            "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
            "home":     {"slug": "pull-up",      "name_fr": "Traction pronation"}
          }
        },
        {
          "slot": "shoulder_press",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Coudes légèrement devant le corps (pas directement sur les côtés). Ne bloque pas les coudes en haut.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-shoulder-press",   "name_fr": "Press Épaules Hammer Strength"},
            "technogym":       {"slug": "machine-shoulder-press",   "name_fr": "Press Épaules Technogym"},
            "life_fitness":    {"slug": "machine-shoulder-press",   "name_fr": "Press Épaules Life Fitness"},
            "plate_loaded":    {"slug": "barbell-overhead-press",   "name_fr": "Press Militaire Barre"},
            "dumbbells":       {"slug": "dumbbell-shoulder-press",  "name_fr": "Développé Épaules Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "standard": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé Épaules Haltères"}
          }
        },
        {
          "slot": "hamstring_hip_hinge",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Charnière hanches-bassin, barre ou haltères proches du corps. Léger fléchissement des genoux, étirer les ischios en descente.",
          "by_tier": {
            "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
          }
        }
      ]
    },
    {
      "name": "Full Body B",
      "focus": "Fessiers · Pecto incliné · Dos horizontal · Delts",
      "exercises": [
        {
          "slot": "legs_press",
          "sets": 3, "reps": "10-15", "rest_sec": 120,
          "note": "Pieds à largeur d'épaules, descendre jusqu'à 90°. Ne verrouille pas les genoux en haut. La presse permet de charger lourd en toute sécurité.",
          "by_tier": {
            "premium":  {"slug": "leg-press",           "name_fr": "Leg Press"},
            "standard": {"slug": "leg-press",           "name_fr": "Leg Press"},
            "home":     {"slug": "bulgarian-split-squat","name_fr": "Fente bulgare haltères"}
          }
        },
        {
          "slot": "chest_incline",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Angle 30-45°, travaille le pectoral haut (faisceau claviculaire). Descendre les haltères à hauteur d'épaule.",
          "by_feature": {
            "hammer_strength": {"slug": "developpe-incline-hammer-strength", "name_fr": "Développé Incliné Hammer Strength"},
            "technogym":       {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Technogym"},
            "life_fitness":    {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Life Fitness"},
            "cable_station":   {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Haltères"},
            "plate_loaded":    {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Barre"},
            "dumbbells":       {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "developpe-incline-hammer-strength", "name_fr": "Développé Incliné machine"},
            "standard": {"slug": "incline-barbell-bench-press",       "name_fr": "Développé Incliné haltères"},
            "home":     {"slug": "incline-barbell-bench-press",       "name_fr": "Développé Incliné haltères"}
          }
        },
        {
          "slot": "back_horizontal_row",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Dos droit, tirer le coude vers la hanche. Pause 1 seconde en position contractée. Le rowing est essentiel pour la posture.",
          "by_feature": {
            "hammer_strength": {"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing ISO-Latéral Hammer Strength"},
            "technogym":       {"slug": "chest-supported-row",                "name_fr": "Rowing Soutenu Technogym"},
            "life_fitness":    {"slug": "chest-supported-row",                "name_fr": "Rowing Soutenu Life Fitness"},
            "cable_station":   {"slug": "seated-cable-row",                   "name_fr": "Rowing Horizontal Câble"},
            "functional_trainer": {"slug": "seated-cable-row",               "name_fr": "Rowing Horizontal Câble"},
            "plate_loaded":    {"slug": "barbell-row",                        "name_fr": "Rowing Barre"},
            "dumbbells":       {"slug": "dumbbell-row",                       "name_fr": "Rowing Haltère Unilatéral"}
          },
          "by_tier": {
            "premium":  {"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing machine"},
            "standard": {"slug": "seated-cable-row",                   "name_fr": "Rowing horizontal câble"},
            "home":     {"slug": "dumbbell-row",                       "name_fr": "Rowing haltère unilatéral"}
          }
        },
        {
          "slot": "delt_lateral",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Légère flexion du coude, pousser jusqu'à l'horizontale. Le câble crée une tension constante, idéale pour ce muscle.",
          "by_feature": {
            "cable_station":      {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "functional_trainer": {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "dumbbells":          {"slug": "lateral-raise",       "name_fr": "Élévations Latérales Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "home":     {"slug": "lateral-raise",       "name_fr": "Élévations latérales haltères"}
          }
        },
        {
          "slot": "glute_thrust",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Extension complète des hanches en haut, serrer les fessiers 1 seconde. Dos appuyé sur un banc, pieds à 90°.",
          "by_tier": {
            "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "home":     {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust haltère"}
          }
        }
      ]
    },
    {
      "name": "Full Body A",
      "focus": "Quads · Pecto · Dos vertical · Épaules",
      "exercises": [
        {
          "slot": "legs_squat",
          "sets": 3, "reps": "8-12", "rest_sec": 120,
          "note": "Même séance que J1. Si tu as réussi 3×12 la dernière fois, augmente de 2,5 kg aujourd'hui.",
          "by_tier": {
            "premium":  {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
            "standard": {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
            "home":     {"slug": "goblet-squat",       "name_fr": "Goblet Squat haltère"}
          }
        },
        {
          "slot": "chest_horizontal",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Amplitude complète. Progression si 3×15 réussis.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-chest-press", "name_fr": "Chest Press Hammer Strength"},
            "technogym":       {"slug": "machine-chest-press", "name_fr": "Chest Press Technogym"},
            "life_fitness":    {"slug": "machine-chest-press", "name_fr": "Chest Press Life Fitness"},
            "plate_loaded":    {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"},
            "dumbbells":       {"slug": "dumbbell-bench-press","name_fr": "Développé couché haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "standard": {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "home":     {"slug": "dumbbell-bench-press", "name_fr": "Développé couché haltères"}
          }
        },
        {
          "slot": "back_vertical_pull",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Dos engagé. Essaie d'augmenter la charge par rapport à la séance A précédente.",
          "by_tier": {
            "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
            "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
            "home":     {"slug": "pull-up",      "name_fr": "Traction pronation"}
          }
        },
        {
          "slot": "shoulder_press",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Coudes légèrement devant. Progresser sur la charge.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-shoulder-press",   "name_fr": "Press Épaules Hammer Strength"},
            "technogym":       {"slug": "machine-shoulder-press",   "name_fr": "Press Épaules Technogym"},
            "life_fitness":    {"slug": "machine-shoulder-press",   "name_fr": "Press Épaules Life Fitness"},
            "plate_loaded":    {"slug": "barbell-overhead-press",   "name_fr": "Press Militaire Barre"},
            "dumbbells":       {"slug": "dumbbell-shoulder-press",  "name_fr": "Développé Épaules Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "standard": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé Épaules Haltères"}
          }
        },
        {
          "slot": "hamstring_hip_hinge",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Charnière hanches. Progression si 3×15 réussis.",
          "by_tier": {
            "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
          }
        }
      ]
    }
  ]
}$fb3x$::jsonb
WHERE slug = 'full-body-debutant-3x';


-- ══════════════════════════════════════════════════════════════════════════════
-- PROGRAMME 2 : Upper/Lower Hypertrophie 4×/semaine
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE programs SET
  description = '4 séances par semaine : 2 haut du corps (Upper) et 2 bas du corps (Lower). Chaque groupe musculaire est travaillé 2× par semaine — session A plus lourde/composée, session B plus légère/isolation. C''est le premier pas vers une vraie spécialisation après le Full Body. Prérequis : avoir maîtrisé les mouvements fondamentaux sur un programme 3 jours. Les exercices sont automatiquement adaptés à l''équipement de ta salle.'
WHERE slug = 'upper-lower-hypertrophie-4x';

UPDATE programs SET structure = $ul4x${
  "days": [
    {
      "name": "Upper A",
      "focus": "Pecto heavy · Dos vertical · Épaules · Triceps",
      "exercises": [
        {
          "slot": "chest_horizontal",
          "sets": 4, "reps": "6-10", "rest_sec": 180,
          "note": "Mouvement principal — charge maximale avec bonne technique. La machine permet de charger lourd seul en sécurité. Progressivité obligatoire.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-chest-press", "name_fr": "Chest Press Hammer Strength"},
            "technogym":       {"slug": "machine-chest-press", "name_fr": "Chest Press Technogym"},
            "life_fitness":    {"slug": "machine-chest-press", "name_fr": "Chest Press Life Fitness"},
            "plate_loaded":    {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"},
            "dumbbells":       {"slug": "dumbbell-bench-press","name_fr": "Développé couché haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "standard": {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "home":     {"slug": "barbell-bench-press",  "name_fr": "Développé couché barre"}
          }
        },
        {
          "slot": "back_vertical_pull",
          "sets": 4, "reps": "8-12", "rest_sec": 150,
          "note": "Tirer les coudes vers les hanches, contrôler la descente 2 secondes. Mouvement antagoniste au développé.",
          "by_tier": {
            "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
            "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
            "home":     {"slug": "pull-up",      "name_fr": "Traction pronation lestée"}
          }
        },
        {
          "slot": "chest_incline",
          "sets": 3, "reps": "10-15", "rest_sec": 120,
          "note": "Angle 30-45°, focus pectoral haut. Volume secondaire après le développé principal.",
          "by_feature": {
            "hammer_strength": {"slug": "developpe-incline-hammer-strength", "name_fr": "Développé Incliné Hammer Strength"},
            "technogym":       {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Technogym"},
            "life_fitness":    {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Life Fitness"},
            "cable_station":   {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Haltères"},
            "plate_loaded":    {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Barre"},
            "dumbbells":       {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "developpe-incline-hammer-strength", "name_fr": "Développé incliné machine"},
            "standard": {"slug": "incline-barbell-bench-press",       "name_fr": "Développé incliné haltères"},
            "home":     {"slug": "incline-barbell-bench-press",       "name_fr": "Développé incliné haltères"}
          }
        },
        {
          "slot": "back_horizontal_row",
          "sets": 3, "reps": "10-15", "rest_sec": 120,
          "note": "Dos droit, tirer le coude vers la hanche. Compression des scapulas en fin de mouvement.",
          "by_feature": {
            "hammer_strength": {"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing ISO-Latéral Hammer Strength"},
            "technogym":       {"slug": "chest-supported-row",                "name_fr": "Rowing Soutenu Technogym"},
            "life_fitness":    {"slug": "chest-supported-row",                "name_fr": "Rowing Soutenu Life Fitness"},
            "cable_station":   {"slug": "seated-cable-row",                   "name_fr": "Rowing Horizontal Câble"},
            "functional_trainer": {"slug": "seated-cable-row",               "name_fr": "Rowing Câble"},
            "plate_loaded":    {"slug": "barbell-row",                        "name_fr": "Rowing Barre"}
          },
          "by_tier": {
            "premium":  {"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing machine"},
            "standard": {"slug": "seated-cable-row",                   "name_fr": "Rowing câble"},
            "home":     {"slug": "barbell-row",                        "name_fr": "Rowing barre"}
          }
        },
        {
          "slot": "delt_lateral",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Isolation delt médian. Légère flexion du coude, pousser jusqu'à l'horizontale.",
          "by_feature": {
            "cable_station":      {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "functional_trainer": {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "dumbbells":          {"slug": "lateral-raise",       "name_fr": "Élévations Latérales Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "home":     {"slug": "lateral-raise",       "name_fr": "Élévations latérales haltères"}
          }
        },
        {
          "slot": "tricep_pushdown",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Coudes fixes au corps, extension complète en bas. Les triceps représentent 2/3 du volume du bras.",
          "by_feature": {
            "cable_station":      {"slug": "tricep-pushdown", "name_fr": "Extension Triceps Poulie Corde"},
            "functional_trainer": {"slug": "tricep-pushdown", "name_fr": "Extension Triceps Câble"},
            "dumbbells":          {"slug": "skull-crusher",   "name_fr": "Barre au Front Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "tricep-pushdown", "name_fr": "Extension triceps poulie"},
            "standard": {"slug": "tricep-pushdown", "name_fr": "Extension triceps poulie"},
            "home":     {"slug": "skull-crusher",   "name_fr": "Barre au front haltères"}
          }
        }
      ]
    },
    {
      "name": "Lower A",
      "focus": "Quads heavy · Ischios · Fessiers · Mollets",
      "exercises": [
        {
          "slot": "legs_squat",
          "sets": 4, "reps": "6-10", "rest_sec": 240,
          "note": "Le squat est l'exception à la règle machine>barre. Son ROM complet et sa charge axiale sont inégalables. Descendre sous le parallèle. Ceinture recommandée au-delà de 80% de ton max.",
          "by_tier": {
            "premium":  {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
            "standard": {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
            "home":     {"slug": "barbell-back-squat", "name_fr": "Squat barre"}
          }
        },
        {
          "slot": "legs_press",
          "sets": 3, "reps": "10-15", "rest_sec": 150,
          "note": "Volume quad/fessiers après le squat. Pieds hauts pour plus de fessiers, pieds bas pour plus de quads.",
          "by_tier": {
            "premium":  {"slug": "leg-press",            "name_fr": "Leg Press"},
            "standard": {"slug": "leg-press",            "name_fr": "Leg Press"},
            "home":     {"slug": "walking-lunge",        "name_fr": "Fente marchée haltères"}
          }
        },
        {
          "slot": "quad_isolation",
          "sets": 3, "reps": "12-20", "rest_sec": 90,
          "note": "Extension complète en haut, descente contrôlée. Excellent finisher quad et bon pour la santé des genoux.",
          "by_tier": {
            "premium":  {"slug": "leg-extension",        "name_fr": "Extension jambes machine"},
            "standard": {"slug": "leg-extension",        "name_fr": "Extension jambes machine"},
            "home":     {"slug": "bulgarian-split-squat","name_fr": "Fente bulgare haltères"}
          }
        },
        {
          "slot": "hamstring_isolation",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Leg curl allongé — tension maximale en étirement. Contrôle la descente sur 2 secondes. Pied fléchi en haut.",
          "by_tier": {
            "premium":  {"slug": "leg-curl",   "name_fr": "Leg Curl allongé"},
            "standard": {"slug": "leg-curl",   "name_fr": "Leg Curl allongé"},
            "home":     {"slug": "nordic-curl","name_fr": "Nordic Hamstring Curl"}
          }
        },
        {
          "slot": "glute_thrust",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Hip Thrust : meilleur exercice fessiers en contraction courte. Extension complète des hanches, serrer 1 seconde.",
          "by_tier": {
            "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "home":     {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust haltère"}
          }
        },
        {
          "slot": "calf_raise",
          "sets": 4, "reps": "15-20", "rest_sec": 60,
          "note": "Amplitude totale : descendre le talon sous la marche, monter sur la pointe. Pause 1s en bas.",
          "by_tier": {
            "premium":  {"slug": "calf-raise", "name_fr": "Mollets debout machine"},
            "standard": {"slug": "calf-raise", "name_fr": "Mollets debout machine"},
            "home":     {"slug": "calf-raise", "name_fr": "Mollets debout marche"}
          }
        }
      ]
    },
    {
      "name": "Upper B",
      "focus": "Épaules heavy · Dos horizontal · Pecto isolation · Biceps",
      "exercises": [
        {
          "slot": "shoulder_press",
          "sets": 4, "reps": "8-12", "rest_sec": 180,
          "note": "Jour épaules — mouvement principal. Dépasser la charge d'Upper A si possible.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Hammer Strength"},
            "technogym":       {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Technogym"},
            "life_fitness":    {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Life Fitness"},
            "plate_loaded":    {"slug": "barbell-overhead-press",  "name_fr": "Press Militaire Barre"},
            "dumbbells":       {"slug": "dumbbell-shoulder-press", "name_fr": "Développé Épaules Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "standard": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
          }
        },
        {
          "slot": "back_horizontal_row",
          "sets": 4, "reps": "8-12", "rest_sec": 150,
          "note": "Rowing lourd — mouvement principal dos. Compression maximale des scapulas.",
          "by_feature": {
            "hammer_strength": {"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing ISO-Latéral Hammer Strength"},
            "technogym":       {"slug": "chest-supported-row",                "name_fr": "Rowing Soutenu Technogym"},
            "life_fitness":    {"slug": "chest-supported-row",                "name_fr": "Rowing Soutenu Life Fitness"},
            "cable_station":   {"slug": "seated-cable-row",                   "name_fr": "Rowing Horizontal Câble"},
            "functional_trainer": {"slug": "seated-cable-row",               "name_fr": "Rowing Câble"},
            "plate_loaded":    {"slug": "barbell-row",                        "name_fr": "Rowing Barre"}
          },
          "by_tier": {
            "premium":  {"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing machine"},
            "standard": {"slug": "seated-cable-row",                   "name_fr": "Rowing câble"},
            "home":     {"slug": "barbell-row",                        "name_fr": "Rowing barre"}
          }
        },
        {
          "slot": "chest_fly",
          "sets": 3, "reps": "12-20", "rest_sec": 90,
          "note": "Isolation pectorale en étirement — la meilleure tension est en position allongée (câble bas→haut ou pec deck).",
          "by_feature": {
            "hammer_strength": {"slug": "pec-deck",       "name_fr": "Butterfly Hammer Strength"},
            "technogym":       {"slug": "pec-deck",       "name_fr": "Butterfly Technogym"},
            "life_fitness":    {"slug": "pec-deck",       "name_fr": "Butterfly Life Fitness"},
            "cable_station":   {"slug": "cable-crossover","name_fr": "Écarté Câble"},
            "functional_trainer": {"slug": "cable-crossover", "name_fr": "Écarté Câble"},
            "dumbbells":       {"slug": "dumbbell-fly",   "name_fr": "Écarté Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "pec-deck",       "name_fr": "Butterfly machine"},
            "standard": {"slug": "cable-crossover","name_fr": "Écarté câble"},
            "home":     {"slug": "dumbbell-fly",   "name_fr": "Écarté haltères"}
          }
        },
        {
          "slot": "delt_rear",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Face pull ou oiseau — vital pour l'équilibre de l'épaule et la posture. Ne jamais zapper cet exercice.",
          "by_feature": {
            "cable_station":      {"slug": "face-pull",     "name_fr": "Face Pull Câble"},
            "functional_trainer": {"slug": "face-pull",     "name_fr": "Face Pull Câble"},
            "dumbbells":          {"slug": "rear-delt-fly", "name_fr": "Oiseau Haltères Incliné"}
          },
          "by_tier": {
            "premium":  {"slug": "face-pull",     "name_fr": "Face Pull câble"},
            "standard": {"slug": "face-pull",     "name_fr": "Face Pull câble"},
            "home":     {"slug": "rear-delt-fly", "name_fr": "Oiseau haltères"}
          }
        },
        {
          "slot": "bicep_compound",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Curl composé — supination complète en haut, contrôler la descente. Coudes fixes.",
          "by_feature": {
            "hammer_strength": {"slug": "preacher-curl",       "name_fr": "Curl Pupitre"},
            "cable_station":   {"slug": "barbell-curl",        "name_fr": "Curl Barre Câble"},
            "functional_trainer": {"slug": "barbell-curl",    "name_fr": "Curl Câble"},
            "plate_loaded":    {"slug": "barbell-curl",        "name_fr": "Curl Barre"},
            "dumbbells":       {"slug": "dumbbell-curl",       "name_fr": "Curl Haltères Alternés"}
          },
          "by_tier": {
            "premium":  {"slug": "barbell-curl",  "name_fr": "Curl barre"},
            "standard": {"slug": "barbell-curl",  "name_fr": "Curl barre"},
            "home":     {"slug": "dumbbell-curl", "name_fr": "Curl haltères alternés"}
          }
        }
      ]
    },
    {
      "name": "Lower B",
      "focus": "Ischios heavy · Fessiers · Quads secondaire · Mollets assis",
      "exercises": [
        {
          "slot": "hamstring_hip_hinge",
          "sets": 4, "reps": "8-12", "rest_sec": 180,
          "note": "RDL : mouvement principal ischios-fessiers. Barre ou haltères proches du corps, charger progressivement chaque semaine.",
          "by_tier": {
            "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
          }
        },
        {
          "slot": "hamstring_isolation",
          "sets": 4, "reps": "10-15", "rest_sec": 120,
          "note": "Leg curl : tension ischios en étirement. Contrôler la descente 2 secondes. Pied fléchi en contraction.",
          "by_tier": {
            "premium":  {"slug": "leg-curl",   "name_fr": "Leg Curl allongé"},
            "standard": {"slug": "leg-curl",   "name_fr": "Leg Curl allongé"},
            "home":     {"slug": "nordic-curl","name_fr": "Nordic Hamstring Curl"}
          }
        },
        {
          "slot": "glute_thrust",
          "sets": 4, "reps": "12-15", "rest_sec": 120,
          "note": "Hip Thrust : isolation fessière optimale. 4 séries aujourd'hui — c'est la séance ischios/fessiers prioritaire.",
          "by_tier": {
            "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "home":     {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust haltère"}
          }
        },
        {
          "slot": "legs_press",
          "sets": 3, "reps": "12-15", "rest_sec": 120,
          "note": "Presse légère — focus sur la sensation musculaire. Pieds hauts pour plus de fessiers.",
          "by_tier": {
            "premium":  {"slug": "leg-press",            "name_fr": "Leg Press"},
            "standard": {"slug": "leg-press",            "name_fr": "Leg Press"},
            "home":     {"slug": "bulgarian-split-squat","name_fr": "Fente bulgare haltères"}
          }
        },
        {
          "slot": "calf_raise_seated",
          "sets": 4, "reps": "15-20", "rest_sec": 60,
          "note": "Mollets assis = chef sural (gastrocnémien médial). Amplitude maximale, pause 1s en bas.",
          "by_tier": {
            "premium":  {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
            "standard": {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
            "home":     {"slug": "calf-raise",                "name_fr": "Mollets debout marche"}
          }
        }
      ]
    }
  ]
}$ul4x$::jsonb
WHERE slug = 'upper-lower-hypertrophie-4x';


-- ══════════════════════════════════════════════════════════════════════════════
-- PROGRAMME 3 : PPL Hypertrophie 6×/semaine
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE programs SET
  description = 'Push/Pull/Legs 6 jours pour maximiser l''hypertrophie. Chaque groupe musculaire travaillé 2×/semaine — session A lourde/composés, session B volume/isolation. Principe scientifique : machine > barre pour l''hypertrophie (meilleure tension musculaire, moins de risque de blessure, possible de charger lourd seul). Exception : squat barre et RDL où la barre est irremplaçable. Le programme s''adapte automatiquement à l''équipement de ta salle — Hammer Strength, Technogym, câbles ou haltères. Prérequis : minimum 1 an d''entraînement régulier.'
WHERE slug = 'ppl-hypertrophie-6x';

UPDATE programs SET structure = $ppl6x${
  "days": [
    {
      "name": "Push A",
      "focus": "Pecto horizontal heavy · Épaules · Triceps",
      "exercises": [
        {
          "slot": "chest_horizontal",
          "sets": 4, "reps": "6-10", "rest_sec": 180,
          "note": "Mouvement principal pectoral — charge maximale. La machine permet de charger lourd seul sans risque. Progresser obligatoirement : +2,5 kg si 4×10 réussis.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-chest-press", "name_fr": "Chest Press Hammer Strength"},
            "technogym":       {"slug": "machine-chest-press", "name_fr": "Chest Press Technogym"},
            "life_fitness":    {"slug": "machine-chest-press", "name_fr": "Chest Press Life Fitness"},
            "plate_loaded":    {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"},
            "dumbbells":       {"slug": "dumbbell-bench-press","name_fr": "Développé couché haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "standard": {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "home":     {"slug": "barbell-bench-press",  "name_fr": "Développé couché barre"}
          }
        },
        {
          "slot": "chest_incline",
          "sets": 3, "reps": "10-15", "rest_sec": 120,
          "note": "Angle 30-40° — faisceau claviculaire du pectoral. Étirement maximal en bas. Volume secondaire après le principal.",
          "by_feature": {
            "hammer_strength": {"slug": "developpe-incline-hammer-strength", "name_fr": "Développé Incliné Hammer Strength"},
            "technogym":       {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Technogym"},
            "life_fitness":    {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Life Fitness"},
            "cable_station":   {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Haltères"},
            "plate_loaded":    {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Barre"},
            "dumbbells":       {"slug": "incline-barbell-bench-press",        "name_fr": "Développé Incliné Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "developpe-incline-hammer-strength", "name_fr": "Développé incliné machine"},
            "standard": {"slug": "incline-barbell-bench-press",       "name_fr": "Développé incliné haltères"},
            "home":     {"slug": "incline-barbell-bench-press",       "name_fr": "Développé incliné haltères"}
          }
        },
        {
          "slot": "shoulder_press",
          "sets": 3, "reps": "10-15", "rest_sec": 120,
          "note": "Presse épaules en complément — volume modéré car les épaules sont déjà pré-fatiguées par le développé.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Hammer Strength"},
            "technogym":       {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Technogym"},
            "life_fitness":    {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Life Fitness"},
            "plate_loaded":    {"slug": "barbell-overhead-press",  "name_fr": "Press Militaire Barre"},
            "dumbbells":       {"slug": "dumbbell-shoulder-press", "name_fr": "Développé Épaules Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "standard": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
          }
        },
        {
          "slot": "delt_lateral",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Câble = tension constante du début à la fin du mouvement, supérieure aux haltères pour ce muscle. Léger angle vers l'avant.",
          "by_feature": {
            "cable_station":      {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "functional_trainer": {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "dumbbells":          {"slug": "lateral-raise",       "name_fr": "Élévations Latérales Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "home":     {"slug": "lateral-raise",       "name_fr": "Élévations latérales haltères"}
          }
        },
        {
          "slot": "tricep_isolation",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Extension au-dessus de la tête = longue portion du triceps en étirement. La partie la plus volumineuse — ne pas négliger.",
          "by_feature": {
            "cable_station":      {"slug": "cable-overhead-tricep-extension", "name_fr": "Extension Triceps Tête Câble"},
            "functional_trainer": {"slug": "cable-overhead-tricep-extension", "name_fr": "Extension Triceps Tête Câble"},
            "dumbbells":          {"slug": "skull-crusher",                   "name_fr": "Barre au Front Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-overhead-tricep-extension", "name_fr": "Extension triceps tête câble"},
            "standard": {"slug": "cable-overhead-tricep-extension", "name_fr": "Extension triceps tête câble"},
            "home":     {"slug": "skull-crusher",                   "name_fr": "Barre au front haltères"}
          }
        }
      ]
    },
    {
      "name": "Pull A",
      "focus": "Dos vertical heavy · Biceps · Delt postérieur",
      "exercises": [
        {
          "slot": "back_vertical_pull",
          "sets": 4, "reps": "6-10", "rest_sec": 180,
          "note": "Tirage vertical lourd — tirer les coudes vers les hanches (pas vers l'arrière). Contrôler la descente 2-3 secondes. Le grand dorsal construit le V du dos.",
          "by_tier": {
            "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
            "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
            "home":     {"slug": "pull-up",      "name_fr": "Traction pronation lestée"}
          }
        },
        {
          "slot": "back_horizontal_row",
          "sets": 3, "reps": "10-15", "rest_sec": 120,
          "note": "Rowing horizontal — épaisseur du dos. Coude vers la hanche, compression des omoplates 1 seconde en position haute.",
          "by_feature": {
            "hammer_strength": {"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing ISO-Latéral Hammer Strength"},
            "technogym":       {"slug": "chest-supported-row",                "name_fr": "Rowing Soutenu Technogym"},
            "life_fitness":    {"slug": "chest-supported-row",                "name_fr": "Rowing Soutenu Life Fitness"},
            "cable_station":   {"slug": "seated-cable-row",                   "name_fr": "Rowing Horizontal Câble"},
            "functional_trainer": {"slug": "seated-cable-row",               "name_fr": "Rowing Câble"},
            "plate_loaded":    {"slug": "barbell-row",                        "name_fr": "Rowing Barre"}
          },
          "by_tier": {
            "premium":  {"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing machine"},
            "standard": {"slug": "seated-cable-row",                   "name_fr": "Rowing câble"},
            "home":     {"slug": "barbell-row",                        "name_fr": "Rowing barre"}
          }
        },
        {
          "slot": "back_isolation",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Tirage bras tendus ou pullover — travaille la longue portion du grand dorsal. Bras tendus, pousser vers les cuisses.",
          "by_feature": {
            "cable_station":      {"slug": "straight-arm-pulldown", "name_fr": "Tirage Bras Tendus Câble"},
            "functional_trainer": {"slug": "straight-arm-pulldown", "name_fr": "Tirage Bras Tendus Câble"},
            "dumbbells":          {"slug": "dumbbell-pullover",     "name_fr": "Pullover Haltère"}
          },
          "by_tier": {
            "premium":  {"slug": "straight-arm-pulldown", "name_fr": "Tirage bras tendus câble"},
            "standard": {"slug": "straight-arm-pulldown", "name_fr": "Tirage bras tendus câble"},
            "home":     {"slug": "dumbbell-pullover",     "name_fr": "Pullover haltère"}
          }
        },
        {
          "slot": "delt_rear",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Face Pull ou oiseau — le delt postérieur est essentiel pour la posture et la santé de l'épaule. Ne jamais ignorer cet exercice.",
          "by_feature": {
            "cable_station":      {"slug": "face-pull",     "name_fr": "Face Pull Câble"},
            "functional_trainer": {"slug": "face-pull",     "name_fr": "Face Pull Câble"},
            "dumbbells":          {"slug": "rear-delt-fly", "name_fr": "Oiseau Haltères Incliné"}
          },
          "by_tier": {
            "premium":  {"slug": "face-pull",     "name_fr": "Face Pull câble"},
            "standard": {"slug": "face-pull",     "name_fr": "Face Pull câble"},
            "home":     {"slug": "rear-delt-fly", "name_fr": "Oiseau haltères incliné"}
          }
        },
        {
          "slot": "bicep_compound",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Curl principal — supination complète en haut, descente contrôlée. Coudes fixes, pas de balancement du buste.",
          "by_feature": {
            "hammer_strength": {"slug": "preacher-curl", "name_fr": "Curl Pupitre"},
            "cable_station":   {"slug": "barbell-curl",  "name_fr": "Curl Barre Câble"},
            "functional_trainer": {"slug": "barbell-curl", "name_fr": "Curl Câble"},
            "plate_loaded":    {"slug": "barbell-curl",  "name_fr": "Curl Barre"},
            "dumbbells":       {"slug": "dumbbell-curl", "name_fr": "Curl Haltères Alternés"}
          },
          "by_tier": {
            "premium":  {"slug": "barbell-curl",  "name_fr": "Curl barre"},
            "standard": {"slug": "barbell-curl",  "name_fr": "Curl barre"},
            "home":     {"slug": "dumbbell-curl", "name_fr": "Curl haltères alternés"}
          }
        }
      ]
    },
    {
      "name": "Legs A",
      "focus": "Quads heavy · Ischios · Mollets debout",
      "exercises": [
        {
          "slot": "legs_squat",
          "sets": 4, "reps": "6-10", "rest_sec": 240,
          "note": "Exception machine>barre : le squat avec barre offre un ROM et une charge axiale uniques. Descendre sous le parallèle. Priorité à la technique, puis à la charge.",
          "by_tier": {
            "premium":  {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
            "standard": {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
            "home":     {"slug": "barbell-back-squat", "name_fr": "Squat barre"}
          }
        },
        {
          "slot": "legs_press",
          "sets": 3, "reps": "10-15", "rest_sec": 150,
          "note": "Volume quad/fessiers additionnel après le squat. Pieds à largeur d'épaules, descendre jusqu'à 90°.",
          "by_tier": {
            "premium":  {"slug": "leg-press",            "name_fr": "Leg Press"},
            "standard": {"slug": "leg-press",            "name_fr": "Leg Press"},
            "home":     {"slug": "bulgarian-split-squat","name_fr": "Fente bulgare haltères"}
          }
        },
        {
          "slot": "quad_isolation",
          "sets": 3, "reps": "15-20", "rest_sec": 90,
          "note": "Extension jambes — isolation quad pure. Contrôler la descente, ne pas laisser tomber la charge.",
          "by_tier": {
            "premium":  {"slug": "leg-extension", "name_fr": "Extension jambes machine"},
            "standard": {"slug": "leg-extension", "name_fr": "Extension jambes machine"},
            "home":     {"slug": "wall-sit",      "name_fr": "Isométrie murale"}
          }
        },
        {
          "slot": "hamstring_hip_hinge",
          "sets": 3, "reps": "10-15", "rest_sec": 120,
          "note": "RDL après le squat — charge modérée, focus sur l'étirement des ischios. La barre reste l'outil optimal pour ce mouvement.",
          "by_tier": {
            "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
          }
        },
        {
          "slot": "calf_raise",
          "sets": 4, "reps": "15-20", "rest_sec": 60,
          "note": "Mollets debout = gastrocnémien. Amplitude totale obligatoire, pause 1s en bas. Les mollets récupèrent vite — charge lourd.",
          "by_tier": {
            "premium":  {"slug": "calf-raise", "name_fr": "Mollets debout machine"},
            "standard": {"slug": "calf-raise", "name_fr": "Mollets debout machine"},
            "home":     {"slug": "calf-raise", "name_fr": "Mollets debout marche"}
          }
        }
      ]
    },
    {
      "name": "Push B",
      "focus": "Épaules heavy · Pecto isolation · Triceps volume",
      "exercises": [
        {
          "slot": "shoulder_press",
          "sets": 4, "reps": "8-12", "rest_sec": 180,
          "note": "Journée épaules heavy — le pectoral est au repos, les épaules sont fraîches. Objectif : dépasser la charge de Push A.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Hammer Strength"},
            "technogym":       {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Technogym"},
            "life_fitness":    {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Life Fitness"},
            "plate_loaded":    {"slug": "barbell-overhead-press",  "name_fr": "Press Militaire Barre"},
            "dumbbells":       {"slug": "dumbbell-shoulder-press", "name_fr": "Développé Épaules Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "standard": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
          }
        },
        {
          "slot": "chest_fly",
          "sets": 3, "reps": "12-20", "rest_sec": 90,
          "note": "Isolation pectorale en étirement. Le pec deck (butterfly) ou le câble bas→haut créent la meilleure tension en position allongée.",
          "by_feature": {
            "hammer_strength": {"slug": "pec-deck",       "name_fr": "Butterfly Hammer Strength"},
            "technogym":       {"slug": "pec-deck",       "name_fr": "Butterfly Technogym"},
            "life_fitness":    {"slug": "pec-deck",       "name_fr": "Butterfly Life Fitness"},
            "cable_station":   {"slug": "cable-crossover","name_fr": "Écarté Câble Bas vers Haut"},
            "functional_trainer": {"slug": "cable-crossover", "name_fr": "Écarté Câble"},
            "dumbbells":       {"slug": "dumbbell-fly",   "name_fr": "Écarté Haltères Incliné"}
          },
          "by_tier": {
            "premium":  {"slug": "pec-deck",       "name_fr": "Butterfly machine"},
            "standard": {"slug": "cable-crossover","name_fr": "Écarté câble"},
            "home":     {"slug": "dumbbell-fly",   "name_fr": "Écarté haltères"}
          }
        },
        {
          "slot": "delt_lateral",
          "sets": 4, "reps": "15-20", "rest_sec": 60,
          "note": "4 séries aujourd'hui — journée épaules. Câble = tension constante supérieure aux haltères pour le delt médian.",
          "by_feature": {
            "cable_station":      {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "functional_trainer": {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "dumbbells":          {"slug": "lateral-raise",       "name_fr": "Élévations Latérales Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "home":     {"slug": "lateral-raise",       "name_fr": "Élévations latérales haltères"}
          }
        },
        {
          "slot": "delt_rear",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Delt postérieur = équilibre de l'épaule. Deux séances push sans oiseau = déséquilibre musculaire à terme.",
          "by_feature": {
            "cable_station":      {"slug": "face-pull",     "name_fr": "Face Pull Câble"},
            "functional_trainer": {"slug": "face-pull",     "name_fr": "Face Pull Câble"},
            "dumbbells":          {"slug": "rear-delt-fly", "name_fr": "Oiseau Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "face-pull",     "name_fr": "Face Pull câble"},
            "standard": {"slug": "face-pull",     "name_fr": "Face Pull câble"},
            "home":     {"slug": "rear-delt-fly", "name_fr": "Oiseau haltères"}
          }
        },
        {
          "slot": "tricep_pushdown",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Triceps en finisher — extension complète, coudes fixes. Corde ou barre, les deux fonctionnent.",
          "by_feature": {
            "cable_station":      {"slug": "tricep-pushdown", "name_fr": "Extension Triceps Corde Câble"},
            "functional_trainer": {"slug": "tricep-pushdown", "name_fr": "Extension Triceps Câble"},
            "dumbbells":          {"slug": "skull-crusher",   "name_fr": "Dips Barre Parallèles"}
          },
          "by_tier": {
            "premium":  {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble"},
            "standard": {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble"},
            "home":     {"slug": "tricep-dip",      "name_fr": "Dips barre parallèles"}
          }
        }
      ]
    },
    {
      "name": "Pull B",
      "focus": "Dos horizontal heavy · Biceps volume",
      "exercises": [
        {
          "slot": "back_horizontal_row",
          "sets": 4, "reps": "8-12", "rest_sec": 180,
          "note": "Rowing lourd — journée dos horizontal. Coude vers la hanche, compression 1 seconde. Progresser chaque semaine.",
          "by_feature": {
            "hammer_strength": {"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing ISO-Latéral Hammer Strength"},
            "technogym":       {"slug": "chest-supported-row",                "name_fr": "Rowing Soutenu Technogym"},
            "life_fitness":    {"slug": "chest-supported-row",                "name_fr": "Rowing Soutenu Life Fitness"},
            "cable_station":   {"slug": "seated-cable-row",                   "name_fr": "Rowing Horizontal Câble"},
            "functional_trainer": {"slug": "seated-cable-row",               "name_fr": "Rowing Câble"},
            "plate_loaded":    {"slug": "barbell-row",                        "name_fr": "Rowing Barre Pendlay"}
          },
          "by_tier": {
            "premium":  {"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing machine lourd"},
            "standard": {"slug": "seated-cable-row",                   "name_fr": "Rowing câble lourd"},
            "home":     {"slug": "barbell-row",                        "name_fr": "Rowing barre Pendlay"}
          }
        },
        {
          "slot": "back_chest_supported",
          "sets": 3, "reps": "10-15", "rest_sec": 120,
          "note": "Rowing soutenu poitrine = élimine complètement la triche lombaire. Isolation dos pure. Charge plus légère, focus sur la qualité.",
          "by_feature": {
            "hammer_strength": {"slug": "chest-supported-row", "name_fr": "Rowing Soutenu Poitrine"},
            "technogym":       {"slug": "chest-supported-row", "name_fr": "Rowing Soutenu Technogym"},
            "life_fitness":    {"slug": "chest-supported-row", "name_fr": "Rowing Soutenu Life Fitness"},
            "cable_station":   {"slug": "seated-cable-row",    "name_fr": "Rowing Câble Secondaire"},
            "plate_loaded":    {"slug": "dumbbell-row",        "name_fr": "Rowing Haltère Incliné"}
          },
          "by_tier": {
            "premium":  {"slug": "chest-supported-row", "name_fr": "Rowing soutenu poitrine"},
            "standard": {"slug": "chest-supported-row", "name_fr": "Rowing soutenu poitrine"},
            "home":     {"slug": "dumbbell-row",        "name_fr": "Rowing haltère incliné"}
          }
        },
        {
          "slot": "back_vertical_pull",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Volume grand dorsal supplémentaire — charge plus légère qu'en Pull A. Variation de prise (supination recommandée).",
          "by_tier": {
            "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie supination"},
            "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie supination"},
            "home":     {"slug": "pull-up",      "name_fr": "Traction supination"}
          }
        },
        {
          "slot": "bicep_isolation",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Curl marteau ou pupitre — focus brachial antérieur. Le brachialis donne de l'épaisseur au bras entre les deux têtes du biceps.",
          "by_feature": {
            "hammer_strength": {"slug": "preacher-curl",     "name_fr": "Curl Pupitre"},
            "cable_station":   {"slug": "cable-hammer-curl", "name_fr": "Curl Marteau Câble"},
            "functional_trainer": {"slug": "cable-hammer-curl", "name_fr": "Curl Marteau Câble"},
            "dumbbells":       {"slug": "hammer-curl",       "name_fr": "Curl Marteau Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-hammer-curl", "name_fr": "Curl marteau câble"},
            "standard": {"slug": "cable-hammer-curl", "name_fr": "Curl marteau câble"},
            "home":     {"slug": "hammer-curl",       "name_fr": "Curl marteau haltères"}
          }
        },
        {
          "slot": "bicep_isolation_2",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Curl câble finisher — tension constante en bas du mouvement. Idéal pour l'hypertrophie en étirement.",
          "by_feature": {
            "cable_station":      {"slug": "barbell-curl",  "name_fr": "Curl Câble Barre Droite"},
            "functional_trainer": {"slug": "barbell-curl",  "name_fr": "Curl Câble"},
            "dumbbells":          {"slug": "dumbbell-curl", "name_fr": "Curl Concentré Haltère"}
          },
          "by_tier": {
            "premium":  {"slug": "barbell-curl",  "name_fr": "Curl câble barre droite"},
            "standard": {"slug": "barbell-curl",  "name_fr": "Curl câble barre droite"},
            "home":     {"slug": "dumbbell-curl", "name_fr": "Curl concentré haltère"}
          }
        }
      ]
    },
    {
      "name": "Legs B",
      "focus": "Ischios heavy · Fessiers · Mollets assis",
      "exercises": [
        {
          "slot": "hamstring_hip_hinge",
          "sets": 4, "reps": "8-12", "rest_sec": 180,
          "note": "RDL heavy — mouvement principal ischio-fessiers. Barre proches du corps, étirement ischios maximal. Marque de progression chaque semaine obligatoire.",
          "by_tier": {
            "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
          }
        },
        {
          "slot": "hamstring_isolation",
          "sets": 4, "reps": "10-15", "rest_sec": 120,
          "note": "Leg curl allongé — tension ischios en étirement, supérieure au leg curl assis. Contrôler la descente 2 secondes. Pied fléchi en haut.",
          "by_tier": {
            "premium":  {"slug": "leg-curl",   "name_fr": "Leg Curl allongé"},
            "standard": {"slug": "leg-curl",   "name_fr": "Leg Curl allongé"},
            "home":     {"slug": "nordic-curl","name_fr": "Nordic Hamstring Curl"}
          }
        },
        {
          "slot": "glute_thrust",
          "sets": 4, "reps": "12-15", "rest_sec": 120,
          "note": "Hip Thrust — reine des exercices fessiers. Omoplates sur le banc, pieds à 90°. Extension complète en haut, serrer 1 seconde.",
          "by_tier": {
            "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "home":     {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust haltère"}
          }
        },
        {
          "slot": "legs_unilateral",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Fente bulgare — détecte et corrige les asymétries gauche/droite. Genou avant dans l'axe des orteils, ne pas toucher le sol.",
          "by_tier": {
            "premium":  {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"},
            "standard": {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"},
            "home":     {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"}
          }
        },
        {
          "slot": "calf_raise_seated",
          "sets": 4, "reps": "15-20", "rest_sec": 60,
          "note": "Mollets assis = soléaire (muscle profond). Différent des mollets debout — les deux sont nécessaires. Amplitude totale, pause 1s en bas.",
          "by_tier": {
            "premium":  {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
            "standard": {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
            "home":     {"slug": "calf-raise",                "name_fr": "Mollets debout marche"}
          }
        }
      ]
    }
  ]
}$ppl6x$::jsonb
WHERE slug = 'ppl-hypertrophie-6x';


-- ══════════════════════════════════════════════════════════════════════════════
-- PROGRAMME 4 : Force Fondamentaux 3×/semaine
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE programs SET
  description = 'Programme de force pur sur les 4 mouvements fondamentaux : squat, soulevé de terre, développé couché, press militaire. Principe : +2,5 kg à chaque séance. Quand tu stales 3 fois de suite, réduis à 90% de la charge et repars. Ce programme build des fondations en force qui bénéficieront à tous tes entraînements futurs. Ce programme est intentionnellement simple : 3 exercices par séance, pas d''isolation. La force brute d''abord, l''esthétique ensuite. Durée typique jusqu''au stalement complet : 12 à 20 semaines.'
WHERE slug = 'force-fondamentaux-3x';


-- ══════════════════════════════════════════════════════════════════════════════
-- PROGRAMME 5 : Galbe & Fessiers 4×/semaine
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE programs SET
  description = '4 séances orientées fessiers, jambes et galbe. Le Hip Thrust et le RDL sont les piliers — ce sont les deux exercices les plus efficaces pour développer les fessiers et les ischios. Le haut du corps est travaillé en complément pour équilibrer la silhouette. Les mêmes principes d''hypertrophie s''appliquent : machine > barre où c''est possible, volume suffisant, progressivité obligatoire. Les exercices sont adaptés automatiquement à l''équipement de ta salle.'
WHERE slug = 'galbe-fessiers-4x';

UPDATE programs SET structure = $gf4x${
  "days": [
    {
      "name": "Jambes & Fessiers A",
      "focus": "Fessiers heavy · Ischios · Abducteurs",
      "exercises": [
        {
          "slot": "glute_thrust",
          "sets": 4, "reps": "10-15", "rest_sec": 120,
          "note": "Hip Thrust — mouvement principal fessiers. Amplitude complète, extension des hanches maximale en haut. La charge doit progresser chaque semaine.",
          "by_tier": {
            "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "home":     {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust haltère"}
          }
        },
        {
          "slot": "legs_press",
          "sets": 3, "reps": "12-15", "rest_sec": 120,
          "note": "Pieds hauts et légèrement écartés pour maximiser le travail fessiers/ischios. Descendre jusqu'à 90° minimum.",
          "by_tier": {
            "premium":  {"slug": "leg-press",  "name_fr": "Leg Press (pieds hauts)"},
            "standard": {"slug": "leg-press",  "name_fr": "Leg Press (pieds hauts)"},
            "home":     {"slug": "sumo-squat", "name_fr": "Squat sumo haltère"}
          }
        },
        {
          "slot": "hamstring_isolation",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Leg curl — tension ischios en étirement, complémentaire au Hip Thrust. Contrôler la descente.",
          "by_tier": {
            "premium":  {"slug": "leg-curl",   "name_fr": "Leg Curl allongé"},
            "standard": {"slug": "leg-curl",   "name_fr": "Leg Curl allongé"},
            "home":     {"slug": "nordic-curl","name_fr": "Nordic Hamstring Curl"}
          }
        },
        {
          "slot": "glute_abduction",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Abduction — fessier moyen et fessier supérieur. Souvent négligé mais vital pour la stabilité et la forme des fessiers latéraux.",
          "by_feature": {
            "cable_station":      {"slug": "cable-hip-abduction",  "name_fr": "Abduction Câble Debout"},
            "functional_trainer": {"slug": "cable-hip-abduction",  "name_fr": "Abduction Câble"},
            "plate_loaded":       {"slug": "hip-abduction-machine","name_fr": "Abduction Machine"},
            "dumbbells":          {"slug": "clamshell",            "name_fr": "Palourde Élastique"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-hip-abduction",  "name_fr": "Abduction câble debout"},
            "standard": {"slug": "hip-abduction-machine","name_fr": "Abduction machine"},
            "home":     {"slug": "clamshell",            "name_fr": "Palourde élastique"}
          }
        },
        {
          "slot": "calf_raise",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Mollets debout — finisher de séance. Amplitude totale.",
          "by_tier": {
            "premium":  {"slug": "calf-raise", "name_fr": "Mollets debout machine"},
            "standard": {"slug": "calf-raise", "name_fr": "Mollets debout machine"},
            "home":     {"slug": "calf-raise", "name_fr": "Mollets debout marche"}
          }
        }
      ]
    },
    {
      "name": "Corps supérieur",
      "focus": "Dos · Épaules · Pecto · Bras",
      "exercises": [
        {
          "slot": "back_vertical_pull",
          "sets": 3, "reps": "10-15", "rest_sec": 120,
          "note": "Tirage vertical — construire le dos en V pour équilibrer la silhouette avec les fessiers et les jambes.",
          "by_tier": {
            "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
            "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
            "home":     {"slug": "pull-up",      "name_fr": "Traction pronation"}
          }
        },
        {
          "slot": "chest_horizontal",
          "sets": 3, "reps": "10-15", "rest_sec": 120,
          "note": "Développé pectoral — amplitude complète. Haut du corps en complément pour l'équilibre esthétique.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-chest-press", "name_fr": "Chest Press Hammer Strength"},
            "technogym":       {"slug": "machine-chest-press", "name_fr": "Chest Press Technogym"},
            "life_fitness":    {"slug": "machine-chest-press", "name_fr": "Chest Press Life Fitness"},
            "plate_loaded":    {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"},
            "dumbbells":       {"slug": "dumbbell-bench-press","name_fr": "Développé couché haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "standard": {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "home":     {"slug": "dumbbell-bench-press", "name_fr": "Développé couché haltères"}
          }
        },
        {
          "slot": "delt_lateral",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Élévations latérales — largeur d'épaules pour équilibrer la silhouette.",
          "by_feature": {
            "cable_station":      {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "functional_trainer": {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "dumbbells":          {"slug": "lateral-raise",       "name_fr": "Élévations Latérales Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "home":     {"slug": "lateral-raise",       "name_fr": "Élévations latérales haltères"}
          }
        },
        {
          "slot": "delt_rear",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Delt postérieur — équilibre posture, santé de l'épaule.",
          "by_feature": {
            "cable_station":      {"slug": "face-pull",     "name_fr": "Face Pull Câble"},
            "functional_trainer": {"slug": "face-pull",     "name_fr": "Face Pull Câble"},
            "dumbbells":          {"slug": "rear-delt-fly", "name_fr": "Oiseau Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "face-pull",     "name_fr": "Face Pull câble"},
            "standard": {"slug": "face-pull",     "name_fr": "Face Pull câble"},
            "home":     {"slug": "rear-delt-fly", "name_fr": "Oiseau haltères"}
          }
        },
        {
          "slot": "bicep_compound",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Curl — volume modéré. Bras toniques, pas imposants.",
          "by_feature": {
            "cable_station":   {"slug": "barbell-curl",  "name_fr": "Curl Câble"},
            "functional_trainer": {"slug": "barbell-curl", "name_fr": "Curl Câble"},
            "plate_loaded":    {"slug": "barbell-curl",  "name_fr": "Curl Barre"},
            "dumbbells":       {"slug": "dumbbell-curl", "name_fr": "Curl Haltères Alternés"}
          },
          "by_tier": {
            "premium":  {"slug": "barbell-curl",  "name_fr": "Curl câble"},
            "standard": {"slug": "barbell-curl",  "name_fr": "Curl câble"},
            "home":     {"slug": "dumbbell-curl", "name_fr": "Curl haltères alternés"}
          }
        }
      ]
    },
    {
      "name": "Jambes & Fessiers B",
      "focus": "Ischios heavy · Fessiers · Unilatéral",
      "exercises": [
        {
          "slot": "hamstring_hip_hinge",
          "sets": 4, "reps": "10-15", "rest_sec": 150,
          "note": "RDL — mouvement principal ischios. Allonger les ischios en haut, serrer les fessiers en bas. Progresser la charge chaque semaine.",
          "by_tier": {
            "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
          }
        },
        {
          "slot": "glute_thrust",
          "sets": 4, "reps": "12-15", "rest_sec": 120,
          "note": "2e séance Hip Thrust de la semaine — progression sur la charge ou les reps par rapport à Jambes A.",
          "by_tier": {
            "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "home":     {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust haltère"}
          }
        },
        {
          "slot": "legs_unilateral",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Fente bulgare — travail unilatéral pour détecter et corriger les asymétries droite/gauche.",
          "by_tier": {
            "premium":  {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"},
            "standard": {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"},
            "home":     {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"}
          }
        },
        {
          "slot": "glute_bridge",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Kickback câble ou glute bridge — finisher fessiers haute répétition. Contraction maximale en fin de mouvement.",
          "by_feature": {
            "cable_station":      {"slug": "cable-kickback", "name_fr": "Kickback Câble Fessiers"},
            "functional_trainer": {"slug": "cable-kickback", "name_fr": "Kickback Câble"},
            "dumbbells":          {"slug": "glute-bridge",   "name_fr": "Glute Bridge au Sol"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-kickback", "name_fr": "Kickback câble fessiers"},
            "standard": {"slug": "cable-kickback", "name_fr": "Kickback câble fessiers"},
            "home":     {"slug": "glute-bridge",   "name_fr": "Glute Bridge au sol"}
          }
        },
        {
          "slot": "calf_raise_seated",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Mollets assis — soléaire profond. Complémentaire aux mollets debout de Jambes A.",
          "by_tier": {
            "premium":  {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
            "standard": {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
            "home":     {"slug": "calf-raise",                "name_fr": "Mollets debout marche"}
          }
        }
      ]
    },
    {
      "name": "Corps complet + Core",
      "focus": "Corps entier · Abdominaux",
      "exercises": [
        {
          "slot": "legs_squat",
          "sets": 3, "reps": "12-15", "rest_sec": 120,
          "note": "Presse ou goblet squat léger — rythme soutenu, activation globale. Pas de charge maximale aujourd'hui.",
          "by_tier": {
            "premium":  {"slug": "leg-press",   "name_fr": "Leg Press"},
            "standard": {"slug": "leg-press",   "name_fr": "Leg Press"},
            "home":     {"slug": "goblet-squat","name_fr": "Goblet Squat haltère"}
          }
        },
        {
          "slot": "back_horizontal_row",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Rowing dos droit — maintenir le volume dos en fin de semaine.",
          "by_feature": {
            "hammer_strength": {"slug": "rowing-iso-lateral-hammer-strength", "name_fr": "Rowing ISO-Latéral Hammer Strength"},
            "technogym":       {"slug": "chest-supported-row",                "name_fr": "Rowing Soutenu Technogym"},
            "cable_station":   {"slug": "seated-cable-row",                   "name_fr": "Rowing Câble"},
            "dumbbells":       {"slug": "dumbbell-row",                       "name_fr": "Rowing Haltère"}
          },
          "by_tier": {
            "premium":  {"slug": "seated-cable-row", "name_fr": "Rowing câble"},
            "standard": {"slug": "seated-cable-row", "name_fr": "Rowing câble"},
            "home":     {"slug": "dumbbell-row",     "name_fr": "Rowing haltère"}
          }
        },
        {
          "slot": "shoulder_press",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Press épaules léger — complément volume.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Hammer Strength"},
            "technogym":       {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Technogym"},
            "dumbbells":       {"slug": "dumbbell-shoulder-press", "name_fr": "Développé Épaules Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "standard": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
          }
        },
        {
          "slot": "core_plank",
          "sets": 3, "reps": "30-60s", "rest_sec": 60,
          "note": "Planche classique ou latérale — gainage profond. Corps aligné, respiration régulière.",
          "by_tier": {
            "premium":  {"slug": "plank", "name_fr": "Planche abdominale"},
            "standard": {"slug": "plank", "name_fr": "Planche abdominale"},
            "home":     {"slug": "plank", "name_fr": "Planche abdominale"}
          }
        },
        {
          "slot": "core_crunch",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Crunch câble ou crunch au sol — isolation abdominale. Flexion vertébrale consciente.",
          "by_feature": {
            "cable_station":      {"slug": "cable-crunch", "name_fr": "Crunch Câble"},
            "functional_trainer": {"slug": "cable-crunch", "name_fr": "Crunch Câble"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-crunch", "name_fr": "Crunch câble"},
            "standard": {"slug": "cable-crunch", "name_fr": "Crunch câble"},
            "home":     {"slug": "crunch",       "name_fr": "Crunch au sol"}
          }
        }
      ]
    }
  ]
}$gf4x$::jsonb
WHERE slug = 'galbe-fessiers-4x';


-- ══════════════════════════════════════════════════════════════════════════════
-- PROGRAMME 6 : Full Body Femme Débutante 3×/semaine
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE programs SET
  description = 'Programme d''initiation pensé pour les femmes débutantes. Accent sur les fessiers, les jambes et la tonification globale, avec un haut du corps équilibré. Les machines sont recommandées pour débuter : elles guident le mouvement, permettent de trouver ses repères en toute sécurité et de charger progressivement. Règle unique : si tu réussis toutes les répétitions, tu augmentes la charge de 2,5 kg la prochaine fois. Les exercices s''adaptent automatiquement à l''équipement de ta salle. Durée : 8 semaines.'
WHERE slug = 'full-body-femme-debutante';

UPDATE programs SET structure = $fbf3x${
  "days": [
    {
      "name": "Séance A",
      "focus": "Fessiers · Dos · Épaules",
      "exercises": [
        {
          "slot": "glute_thrust",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Hip Thrust — exercice numéro 1 pour les fessiers. Débuter avec le poids du corps ou une barre légère, ajouter 2,5 kg quand tu maîtrises.",
          "by_tier": {
            "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "home":     {"slug": "glute-bridge",       "name_fr": "Glute Bridge au sol"}
          }
        },
        {
          "slot": "back_vertical_pull",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Tirage vertical — construire le dos en V. Utilise l'assistance machine si tu ne peux pas encore faire des tractions. Progresser semaine après semaine.",
          "by_tier": {
            "premium":  {"slug": "lat-pulldown",         "name_fr": "Tirage vertical poulie"},
            "standard": {"slug": "lat-pulldown",         "name_fr": "Tirage vertical poulie"},
            "home":     {"slug": "resistance-band-row",  "name_fr": "Rowing élastique"}
          }
        },
        {
          "slot": "shoulder_press",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Press épaules — développer la stabilité de l'épaule d'abord, la charge ensuite. Coudes légèrement devant le corps.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Hammer Strength"},
            "technogym":       {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Technogym"},
            "life_fitness":    {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Life Fitness"},
            "dumbbells":       {"slug": "dumbbell-shoulder-press", "name_fr": "Développé Épaules Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "standard": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
          }
        },
        {
          "slot": "delt_lateral",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Élévations légères — définir les épaules pour équilibrer la silhouette.",
          "by_feature": {
            "cable_station":      {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "functional_trainer": {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "dumbbells":          {"slug": "lateral-raise",       "name_fr": "Élévations Latérales Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "home":     {"slug": "lateral-raise",       "name_fr": "Élévations latérales haltères"}
          }
        },
        {
          "slot": "core_plank",
          "sets": 3, "reps": "20-30s", "rest_sec": 45,
          "note": "Planche — gainage de base essentiel. Augmente de 5 secondes chaque semaine.",
          "by_tier": {
            "premium":  {"slug": "plank", "name_fr": "Planche abdominale"},
            "standard": {"slug": "plank", "name_fr": "Planche abdominale"},
            "home":     {"slug": "plank", "name_fr": "Planche abdominale"}
          }
        }
      ]
    },
    {
      "name": "Séance B",
      "focus": "Jambes · Pecto · Abdos",
      "exercises": [
        {
          "slot": "legs_press",
          "sets": 3, "reps": "12-15", "rest_sec": 120,
          "note": "Leg press ou goblet squat — mouvement de base pour les jambes. Descendre jusqu'à 90° minimum, dos bien calé.",
          "by_tier": {
            "premium":  {"slug": "leg-press",   "name_fr": "Leg Press"},
            "standard": {"slug": "leg-press",   "name_fr": "Leg Press"},
            "home":     {"slug": "goblet-squat","name_fr": "Goblet Squat haltère"}
          }
        },
        {
          "slot": "hamstring_hip_hinge",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "RDL léger — apprendre le mouvement charnière des hanches. Commence avec des haltères légers. Ischios et fessiers en étirement.",
          "by_tier": {
            "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
            "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
          }
        },
        {
          "slot": "chest_horizontal",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Pectoral — la machine est idéale pour débuter (amplitude guidée, forme sécurisée). Amplitude complète.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-chest-press", "name_fr": "Chest Press Hammer Strength"},
            "technogym":       {"slug": "machine-chest-press", "name_fr": "Chest Press Technogym"},
            "life_fitness":    {"slug": "machine-chest-press", "name_fr": "Chest Press Life Fitness"},
            "plate_loaded":    {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"},
            "dumbbells":       {"slug": "dumbbell-bench-press","name_fr": "Développé couché haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "standard": {"slug": "machine-chest-press",  "name_fr": "Chest Press machine"},
            "home":     {"slug": "push-up",              "name_fr": "Pompes"}
          }
        },
        {
          "slot": "glute_abduction",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Abducteurs — fessier moyen souvent négligé. Important pour la stabilité et la forme des hanches.",
          "by_feature": {
            "cable_station":      {"slug": "cable-hip-abduction",  "name_fr": "Abduction Câble"},
            "functional_trainer": {"slug": "cable-hip-abduction",  "name_fr": "Abduction Câble"},
            "plate_loaded":       {"slug": "hip-abduction-machine","name_fr": "Abduction Machine"},
            "dumbbells":          {"slug": "clamshell",            "name_fr": "Palourde Élastique"}
          },
          "by_tier": {
            "premium":  {"slug": "hip-abduction-machine","name_fr": "Abduction machine"},
            "standard": {"slug": "hip-abduction-machine","name_fr": "Abduction machine"},
            "home":     {"slug": "clamshell",            "name_fr": "Palourde élastique"}
          }
        },
        {
          "slot": "core_crunch",
          "sets": 3, "reps": "15-20", "rest_sec": 45,
          "note": "Crunch ou relevé de jambes — renforcement abdominal progressif. Flexion vertébrale consciente.",
          "by_tier": {
            "premium":  {"slug": "crunch", "name_fr": "Crunch machine"},
            "standard": {"slug": "crunch", "name_fr": "Crunch au sol"},
            "home":     {"slug": "crunch", "name_fr": "Crunch au sol"}
          }
        }
      ]
    },
    {
      "name": "Séance A",
      "focus": "Fessiers · Dos · Épaules",
      "exercises": [
        {
          "slot": "glute_thrust",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Hip Thrust — progresser par rapport à la Séance A précédente. +2,5 kg si toutes les reps réussies.",
          "by_tier": {
            "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
            "home":     {"slug": "glute-bridge",       "name_fr": "Glute Bridge au sol"}
          }
        },
        {
          "slot": "back_vertical_pull",
          "sets": 3, "reps": "10-15", "rest_sec": 90,
          "note": "Tirage vertical — augmenter la charge si possible. Chaque séance doit être légèrement meilleure que la précédente.",
          "by_tier": {
            "premium":  {"slug": "lat-pulldown",        "name_fr": "Tirage vertical poulie"},
            "standard": {"slug": "lat-pulldown",        "name_fr": "Tirage vertical poulie"},
            "home":     {"slug": "resistance-band-row", "name_fr": "Rowing élastique"}
          }
        },
        {
          "slot": "shoulder_press",
          "sets": 3, "reps": "12-15", "rest_sec": 90,
          "note": "Press épaules avec légère progression.",
          "by_feature": {
            "hammer_strength": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Hammer Strength"},
            "technogym":       {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Technogym"},
            "life_fitness":    {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules Life Fitness"},
            "dumbbells":       {"slug": "dumbbell-shoulder-press", "name_fr": "Développé Épaules Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "standard": {"slug": "machine-shoulder-press",  "name_fr": "Press Épaules machine"},
            "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
          }
        },
        {
          "slot": "delt_lateral",
          "sets": 3, "reps": "15-20", "rest_sec": 60,
          "note": "Élévations latérales.",
          "by_feature": {
            "cable_station":      {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "functional_trainer": {"slug": "cable-lateral-raise", "name_fr": "Élévations Latérales Câble"},
            "dumbbells":          {"slug": "lateral-raise",       "name_fr": "Élévations Latérales Haltères"}
          },
          "by_tier": {
            "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
            "home":     {"slug": "lateral-raise",       "name_fr": "Élévations latérales haltères"}
          }
        },
        {
          "slot": "core_plank",
          "sets": 3, "reps": "25-40s", "rest_sec": 45,
          "note": "Planche — 5 secondes de plus que la semaine passée.",
          "by_tier": {
            "premium":  {"slug": "plank", "name_fr": "Planche abdominale"},
            "standard": {"slug": "plank", "name_fr": "Planche abdominale"},
            "home":     {"slug": "plank", "name_fr": "Planche abdominale"}
          }
        }
      ]
    }
  ]
}$fbf3x$::jsonb
WHERE slug = 'full-body-femme-debutante';


-- ══════════════════════════════════════════════════════════════════════════════
-- Vérification finale (décommenter pour tester)
-- ══════════════════════════════════════════════════════════════════════════════
-- SELECT slug, description, updated_at
-- FROM programs
-- WHERE is_public = true AND is_custom = false
-- ORDER BY sessions_per_week;
