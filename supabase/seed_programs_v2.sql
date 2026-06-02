-- ═══════════════════════════════════════════════════════════════════════
-- SEED PROGRAMMES v2 — Réécriture scientifique avec profils salle
-- Principes : Mike Israetel / Jeff Nippard / Brad Schoenfeld
--   • Machine > Barre pour l'hypertrophie (sauf Squat, SdT)
--   • Câble > Haltères pour l'isolation
--   • Haltères > Barre pour la majorité des composés
--   • by_tier : premium (Hammer Strength) / standard (câbles + machines) / home (haltères + barre)
--
-- ATTENTION : supprime TOUS les programmes publics non-custom avant d'insérer
-- Exécuter APRÈS migration_gym_profiles.sql
-- ═══════════════════════════════════════════════════════════════════════

DELETE FROM programs WHERE is_custom = false AND is_public = true;

-- ── HELPERS (JSON réutilisables sous forme de blocs commentés) ─────────
-- Structure exercice :
-- {
--   "slot":     identifiant sémantique du mouvement (pour substitution future),
--   "sets":     nombre de séries,
--   "reps":     plage de reps (string),
--   "rest_sec": repos en secondes,
--   "note":     conseil clé,
--   "by_tier":  {
--     "premium":  {"slug": "...", "name_fr": "..."},
--     "standard": {"slug": "...", "name_fr": "..."},
--     "home":     {"slug": "...", "name_fr": "..."}
--   }
-- }
-- ────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════
-- PROGRAMME 1 : Full Body Débutant 3×/semaine
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO programs (name, slug, description, level, goal, equipment,
                      sessions_per_week, duration_weeks, is_public, is_custom, structure)
VALUES (
  'Full Body Débutant 3×',
  'full-body-debutant-3x',
  'Programme scientifique pour débutants. 3 séances corps complet par semaine avec alternance A/B pour couvrir tous les muscles deux fois. Progressivité linéaire sur chaque exercice.',
  '{"beginner"}',
  '{"general","muscle_gain"}',
  '{"full_gym","home_advanced","home_basic"}',
  3, 8, true, false,
  $prog1${
    "days": [
      {
        "name": "Full Body A",
        "focus": "Quads · Pecto · Dos · Épaules",
        "exercises": [
          {
            "slot": "legs_squat",
            "sets": 3, "reps": "8-12", "rest_sec": 120,
            "note": "Descendre sous le parallèle, genoux dans l'axe des pieds. Progression : +2.5 kg si 3×12 réussis.",
            "by_tier": {
              "premium":  {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "standard": {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "home":     {"slug": "goblet-squat", "name_fr": "Goblet Squat haltère"}
            }
          },
          {
            "slot": "chest_horizontal",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Amplitude complète, étirement pectoral en bas. Pause légère en bas du mouvement.",
            "by_tier": {
              "premium":  {"slug": "machine-chest-press", "name_fr": "Chest Press Hammer Strength"},
              "standard": {"slug": "machine-chest-press", "name_fr": "Chest Press Machine"},
              "home":     {"slug": "dumbbell-bench-press", "name_fr": "Développé couché haltères"}
            }
          },
          {
            "slot": "back_vertical_pull",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Tirer les coudes vers les hanches, ne pas balancer. Contrôler la descente.",
            "by_tier": {
              "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "home":     {"slug": "pull-up", "name_fr": "Traction pronation"}
            }
          },
          {
            "slot": "shoulder_press",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Coudes légèrement devant le corps, ne pas bloquer en haut.",
            "by_tier": {
              "premium":  {"slug": "machine-shoulder-press", "name_fr": "Shoulder Press Hammer Strength"},
              "standard": {"slug": "machine-shoulder-press", "name_fr": "Presse épaules machine"},
              "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
            }
          },
          {
            "slot": "hamstring_hip_hinge",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Charnière hanches-bassin, barre/haltères proches du corps. Léger fléchissement genoux.",
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
            "note": "Pieds à largeur d'épaules, descendre jusqu'à 90°, ne pas verrouiller les genoux en haut.",
            "by_tier": {
              "premium":  {"slug": "leg-press", "name_fr": "Leg Press"},
              "standard": {"slug": "leg-press", "name_fr": "Leg Press"},
              "home":     {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"}
            }
          },
          {
            "slot": "chest_incline",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Angle 30-45°, focus pectoral haut. Descendre haltères à hauteur d'épaule.",
            "by_tier": {
              "premium":  {"slug": "incline-barbell-bench-press", "name_fr": "Incline Chest Press Hammer Strength"},
              "standard": {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné haltères"},
              "home":     {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné haltères"}
            }
          },
          {
            "slot": "back_horizontal_row",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Dos droit, tirer le coude vers la hanche, pause d'une seconde en contraction.",
            "by_tier": {
              "premium":  {"slug": "seated-cable-row", "name_fr": "Iso-Lateral Row Hammer Strength"},
              "standard": {"slug": "seated-cable-row", "name_fr": "Tirage horizontal câble"},
              "home":     {"slug": "dumbbell-row", "name_fr": "Rowing haltère unilatéral"}
            }
          },
          {
            "slot": "delt_lateral",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Légère flexion du coude, pousser jusqu'à l'horizontale. Câble = tension constante idéale.",
            "by_tier": {
              "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "home":     {"slug": "lateral-raise", "name_fr": "Élévations latérales haltères"}
            }
          },
          {
            "slot": "glute_thrust",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Extension complète des hanches en haut, serrer les fessiers. Dos appuyé sur banc.",
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
        "focus": "Quads · Pecto · Dos · Épaules",
        "exercises": [
          {
            "slot": "legs_squat",
            "sets": 3, "reps": "8-12", "rest_sec": 120,
            "note": "Même séance que J1 — augmenter la charge si 3×12 la dernière fois.",
            "by_tier": {
              "premium":  {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "standard": {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "home":     {"slug": "goblet-squat", "name_fr": "Goblet Squat haltère"}
            }
          },
          {
            "slot": "chest_horizontal",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Amplitude complète, étirement pectoral en bas.",
            "by_tier": {
              "premium":  {"slug": "machine-chest-press", "name_fr": "Chest Press Hammer Strength"},
              "standard": {"slug": "machine-chest-press", "name_fr": "Chest Press Machine"},
              "home":     {"slug": "dumbbell-bench-press", "name_fr": "Développé couché haltères"}
            }
          },
          {
            "slot": "back_vertical_pull",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Tirer les coudes vers les hanches, dos engagé.",
            "by_tier": {
              "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "home":     {"slug": "pull-up", "name_fr": "Traction pronation"}
            }
          },
          {
            "slot": "shoulder_press",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Coudes légèrement devant, pousser fort.",
            "by_tier": {
              "premium":  {"slug": "machine-shoulder-press", "name_fr": "Shoulder Press Hammer Strength"},
              "standard": {"slug": "machine-shoulder-press", "name_fr": "Presse épaules machine"},
              "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
            }
          },
          {
            "slot": "hamstring_hip_hinge",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Charnière hanches, barre proches du corps.",
            "by_tier": {
              "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
            }
          }
        ]
      }
    ]
  }$prog1$::jsonb
);

-- ═══════════════════════════════════════════════════════════════════════
-- PROGRAMME 2 : Upper/Lower Hypertrophie 4×/semaine
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO programs (name, slug, description, level, goal, equipment,
                      sessions_per_week, duration_weeks, is_public, is_custom, structure)
VALUES (
  'Upper/Lower Hypertrophie 4×',
  'upper-lower-hypertrophie-4x',
  'Programme 4 jours Upper/Lower pour intermédiaires. Chaque groupe musculaire est travaillé 2× par semaine avec des angles différents pour maximiser le volume et la récupération.',
  '{"intermediate"}',
  '{"muscle_gain"}',
  '{"full_gym"}',
  4, 12, true, false,
  $prog2${
    "days": [
      {
        "name": "Upper A",
        "focus": "Pecto heavy · Dos vertical · Épaules · Triceps",
        "exercises": [
          {
            "slot": "chest_horizontal",
            "sets": 4, "reps": "6-10", "rest_sec": 180,
            "note": "Mouvement principal — progressivité obligatoire. Tester une charge max sur 6 reps.",
            "by_tier": {
              "premium":  {"slug": "machine-chest-press", "name_fr": "Chest Press Hammer Strength"},
              "standard": {"slug": "machine-chest-press", "name_fr": "Chest Press Machine"},
              "home":     {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"}
            }
          },
          {
            "slot": "back_vertical_pull",
            "sets": 4, "reps": "8-12", "rest_sec": 150,
            "note": "Tirer les coudes vers les hanches. Contrôler la descente sur 2 secondes.",
            "by_tier": {
              "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "home":     {"slug": "pull-up", "name_fr": "Traction pronation"}
            }
          },
          {
            "slot": "chest_incline",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Angle 30-45°, focus faisceau claviculaire du pectoral.",
            "by_tier": {
              "premium":  {"slug": "incline-barbell-bench-press", "name_fr": "Incline Chest Press Hammer Strength"},
              "standard": {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné haltères"},
              "home":     {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné haltères"}
            }
          },
          {
            "slot": "back_horizontal_row",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Dos droit, tirer le coude vers la hanche. Volume dosé pour préserver le dos.",
            "by_tier": {
              "premium":  {"slug": "seated-cable-row", "name_fr": "Iso-Lateral Row Hammer Strength"},
              "standard": {"slug": "seated-cable-row", "name_fr": "Tirage horizontal câble"},
              "home":     {"slug": "barbell-row", "name_fr": "Rowing barre"}
            }
          },
          {
            "slot": "delt_lateral",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Isolation delt médian — légère flexion coude, tension du câble constante.",
            "by_tier": {
              "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "home":     {"slug": "lateral-raise", "name_fr": "Élévations latérales haltères"}
            }
          },
          {
            "slot": "tricep_pushdown",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Coudes fixes, extension complète en bas, contrôler la remontée.",
            "by_tier": {
              "premium":  {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble"},
              "standard": {"slug": "tricep-pushdown", "name_fr": "Extension triceps poulie"},
              "home":     {"slug": "skull-crusher", "name_fr": "Skull Crusher haltères"}
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
            "note": "Roi des exercices jambes. Descendre sous le parallèle, dos neutre. Ceinture recommandée > 100 kg.",
            "by_tier": {
              "premium":  {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "standard": {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "home":     {"slug": "barbell-back-squat", "name_fr": "Squat barre"}
            }
          },
          {
            "slot": "legs_press",
            "sets": 3, "reps": "10-15", "rest_sec": 150,
            "note": "Placer pieds hauts pour focus fessiers, bas pour focus quads.",
            "by_tier": {
              "premium":  {"slug": "leg-press", "name_fr": "Leg Press"},
              "standard": {"slug": "leg-press", "name_fr": "Leg Press"},
              "home":     {"slug": "walking-lunge", "name_fr": "Fente marchée haltères"}
            }
          },
          {
            "slot": "quad_isolation",
            "sets": 3, "reps": "12-20", "rest_sec": 90,
            "note": "Extension complète en haut, contrôle en descente. Excellent pour la santé du genou.",
            "by_tier": {
              "premium":  {"slug": "leg-extension", "name_fr": "Extension jambes machine"},
              "standard": {"slug": "leg-extension", "name_fr": "Extension jambes machine"},
              "home":     {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"}
            }
          },
          {
            "slot": "hamstring_isolation",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Curl complet — ne pas soulever les hanches. Pied fléchi en haut.",
            "by_tier": {
              "premium":  {"slug": "leg-curl", "name_fr": "Leg Curl allongé"},
              "standard": {"slug": "leg-curl", "name_fr": "Leg Curl allongé"},
              "home":     {"slug": "nordic-curl", "name_fr": "Nordic Hamstring Curl"}
            }
          },
          {
            "slot": "glute_thrust",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Extension complète des hanches en haut, serrer 1 seconde.",
            "by_tier": {
              "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "home":     {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust haltère"}
            }
          },
          {
            "slot": "calf_raise",
            "sets": 4, "reps": "15-20", "rest_sec": 60,
            "note": "Amplitude complète : descendre talon sous la marche, monter sur la pointe.",
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
            "note": "Mouvement principal deltoïdes — coudes légèrement devant le corps.",
            "by_tier": {
              "premium":  {"slug": "machine-shoulder-press", "name_fr": "Shoulder Press Hammer Strength"},
              "standard": {"slug": "machine-shoulder-press", "name_fr": "Presse épaules machine"},
              "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
            }
          },
          {
            "slot": "back_horizontal_row",
            "sets": 4, "reps": "8-12", "rest_sec": 150,
            "note": "Mouvement principal dos — compression maximale des scapulas.",
            "by_tier": {
              "premium":  {"slug": "seated-cable-row", "name_fr": "Iso-Lateral Row Hammer Strength"},
              "standard": {"slug": "seated-cable-row", "name_fr": "Tirage horizontal câble"},
              "home":     {"slug": "barbell-row", "name_fr": "Rowing barre"}
            }
          },
          {
            "slot": "chest_fly",
            "sets": 3, "reps": "12-20", "rest_sec": 90,
            "note": "Étirement profond du pectoral, coude légèrement fléchi. Câble = tension en étirement idéale.",
            "by_tier": {
              "premium":  {"slug": "cable-crossover", "name_fr": "Câble crossover"},
              "standard": {"slug": "cable-crossover", "name_fr": "Câble crossover"},
              "home":     {"slug": "dumbbell-fly", "name_fr": "Écarté haltères"}
            }
          },
          {
            "slot": "back_pulldown_secondary",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Plus léger qu'Upper A, focus activation et connexion neuromusculaire dos.",
            "by_tier": {
              "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "home":     {"slug": "pull-up", "name_fr": "Traction supination"}
            }
          },
          {
            "slot": "delt_rear",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Face pull ou oiseau câble — vital pour la santé de l'épaule et le delt postérieur.",
            "by_tier": {
              "premium":  {"slug": "face-pull", "name_fr": "Face Pull câble"},
              "standard": {"slug": "face-pull", "name_fr": "Face Pull câble"},
              "home":     {"slug": "rear-delt-fly", "name_fr": "Oiseau haltères"}
            }
          },
          {
            "slot": "bicep_compound",
            "sets": 3, "reps": "10-15", "rest_sec": 90,
            "note": "Curl barre ou haltères — supination complète en haut, ne pas balancer le buste.",
            "by_tier": {
              "premium":  {"slug": "barbell-curl", "name_fr": "Curl barre"},
              "standard": {"slug": "barbell-curl", "name_fr": "Curl barre"},
              "home":     {"slug": "dumbbell-curl", "name_fr": "Curl haltères alterné"}
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
            "note": "Soulevé de terre jambes tendues : mouvement principal ischios-fessiers. Charger progressivement.",
            "by_tier": {
              "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
            }
          },
          {
            "slot": "hamstring_isolation",
            "sets": 4, "reps": "10-15", "rest_sec": 120,
            "note": "Curl allongé : excellente tension en étirement. Contrôler la descente sur 2 secondes.",
            "by_tier": {
              "premium":  {"slug": "leg-curl", "name_fr": "Leg Curl allongé"},
              "standard": {"slug": "leg-curl", "name_fr": "Leg Curl allongé"},
              "home":     {"slug": "nordic-curl", "name_fr": "Nordic Hamstring Curl"}
            }
          },
          {
            "slot": "glute_thrust",
            "sets": 4, "reps": "12-15", "rest_sec": 120,
            "note": "Hip Thrust : isolation fessière optimale. Poser les omoplates sur le banc.",
            "by_tier": {
              "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "home":     {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust haltère"}
            }
          },
          {
            "slot": "legs_press",
            "sets": 3, "reps": "12-15", "rest_sec": 120,
            "note": "Séries plus légères qu'Upper A, focus sur la sensation musculaire quads/fessiers.",
            "by_tier": {
              "premium":  {"slug": "leg-press", "name_fr": "Leg Press"},
              "standard": {"slug": "leg-press", "name_fr": "Leg Press"},
              "home":     {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"}
            }
          },
          {
            "slot": "calf_raise_seated",
            "sets": 4, "reps": "15-20", "rest_sec": 60,
            "note": "Mollets assis = chef sural (gastrocnémien médial). Amplitude maximale, pause en bas.",
            "by_tier": {
              "premium":  {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
              "standard": {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
              "home":     {"slug": "calf-raise", "name_fr": "Mollets debout marche"}
            }
          }
        ]
      }
    ]
  }$prog2$::jsonb
);

-- ═══════════════════════════════════════════════════════════════════════
-- PROGRAMME 3 : PPL Hypertrophie 6×/semaine (programme phare)
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO programs (name, slug, description, level, goal, equipment,
                      sessions_per_week, duration_weeks, is_public, is_custom, structure)
VALUES (
  'PPL Hypertrophie 6×',
  'ppl-hypertrophie-6x',
  'Programme Push/Pull/Legs 6 jours, conçu selon les principes de Mike Israetel et Jeff Nippard. Chaque groupe musculaire travaillé 2× par semaine avec priorité aux machines pour l''hypertrophie. Version A = lourd/composés, Version B = volume/isolation.',
  '{"advanced"}',
  '{"muscle_gain"}',
  '{"full_gym"}',
  6, 16, true, false,
  $prog3${
    "days": [
      {
        "name": "Push A",
        "focus": "Pecto horizontal heavy · Épaules · Triceps",
        "exercises": [
          {
            "slot": "chest_horizontal",
            "sets": 4, "reps": "6-10", "rest_sec": 180,
            "note": "Mouvement principal pectoral. Progressivité obligatoire : +2.5 kg si 4×10 réussis.",
            "by_tier": {
              "premium":  {"slug": "machine-chest-press", "name_fr": "Chest Press Hammer Strength"},
              "standard": {"slug": "machine-chest-press", "name_fr": "Chest Press Machine"},
              "home":     {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"}
            }
          },
          {
            "slot": "chest_incline",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Angle 30-40°, étirement maximal en bas. Faisceau claviculaire du pectoral.",
            "by_tier": {
              "premium":  {"slug": "incline-barbell-bench-press", "name_fr": "Incline Chest Press Hammer Strength"},
              "standard": {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné haltères"},
              "home":     {"slug": "incline-barbell-bench-press", "name_fr": "Développé incliné haltères"}
            }
          },
          {
            "slot": "shoulder_press",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Presse épaules en complément pectoral. Volume modéré (épaules déjà pré-fatiguées).",
            "by_tier": {
              "premium":  {"slug": "machine-shoulder-press", "name_fr": "Shoulder Press Hammer Strength"},
              "standard": {"slug": "machine-shoulder-press", "name_fr": "Presse épaules machine"},
              "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
            }
          },
          {
            "slot": "delt_lateral",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Câble = tension en étirement optimale pour delt médian. Léger angle vers l'avant.",
            "by_tier": {
              "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "home":     {"slug": "lateral-raise", "name_fr": "Élévations latérales haltères"}
            }
          },
          {
            "slot": "tricep_isolation",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Extension au-dessus de la tête = longue portion triceps en étirement.",
            "by_tier": {
              "premium":  {"slug": "cable-overhead-tricep-extension", "name_fr": "Extension triceps tête câble"},
              "standard": {"slug": "cable-overhead-tricep-extension", "name_fr": "Extension triceps tête câble"},
              "home":     {"slug": "skull-crusher", "name_fr": "Skull Crusher haltères"}
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
            "note": "Tirage vertical lourd : tirer les coudes vers les hanches, contrôle descente 2-3s.",
            "by_tier": {
              "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "home":     {"slug": "pull-up", "name_fr": "Traction pronation lestée"}
            }
          },
          {
            "slot": "back_horizontal_row",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Rowing horizontal — compression scapulas en fin de mouvement.",
            "by_tier": {
              "premium":  {"slug": "seated-cable-row", "name_fr": "Iso-Lateral Row Hammer Strength"},
              "standard": {"slug": "seated-cable-row", "name_fr": "Tirage horizontal câble"},
              "home":     {"slug": "barbell-row", "name_fr": "Rowing barre"}
            }
          },
          {
            "slot": "back_isolation",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Pullover câble droit : travaille la longue portion du grand dorsal.",
            "by_tier": {
              "premium":  {"slug": "straight-arm-pulldown", "name_fr": "Tirage bras tendus câble"},
              "standard": {"slug": "straight-arm-pulldown", "name_fr": "Tirage bras tendus câble"},
              "home":     {"slug": "dumbbell-pullover", "name_fr": "Pullover haltère"}
            }
          },
          {
            "slot": "delt_rear",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Face pull : primordial pour la santé de l'épaule et la posture. Ne jamais zapper.",
            "by_tier": {
              "premium":  {"slug": "face-pull", "name_fr": "Face Pull câble"},
              "standard": {"slug": "face-pull", "name_fr": "Face Pull câble"},
              "home":     {"slug": "rear-delt-fly", "name_fr": "Oiseau haltères incliné"}
            }
          },
          {
            "slot": "bicep_compound",
            "sets": 3, "reps": "10-15", "rest_sec": 90,
            "note": "Curl barre ou haltères — pas de balancement, supination complète.",
            "by_tier": {
              "premium":  {"slug": "barbell-curl", "name_fr": "Curl barre"},
              "standard": {"slug": "barbell-curl", "name_fr": "Curl barre"},
              "home":     {"slug": "dumbbell-curl", "name_fr": "Curl haltères alterné"}
            }
          }
        ]
      },
      {
        "name": "Legs A",
        "focus": "Quads heavy · Ischios · Fessiers · Mollets",
        "exercises": [
          {
            "slot": "legs_squat",
            "sets": 4, "reps": "6-10", "rest_sec": 240,
            "note": "Squat : exception à la règle machine>barre pour l'hypertrophie. ROM complet essentiel.",
            "by_tier": {
              "premium":  {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "standard": {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "home":     {"slug": "barbell-back-squat", "name_fr": "Squat barre"}
            }
          },
          {
            "slot": "legs_press",
            "sets": 3, "reps": "10-15", "rest_sec": 150,
            "note": "Leg press : volume additionnel quad/fessiers après squat. Pieds à largeur d'épaules.",
            "by_tier": {
              "premium":  {"slug": "leg-press", "name_fr": "Leg Press"},
              "standard": {"slug": "leg-press", "name_fr": "Leg Press"},
              "home":     {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"}
            }
          },
          {
            "slot": "quad_isolation",
            "sets": 3, "reps": "15-20", "rest_sec": 90,
            "note": "Extension jambes : isolation quad en tension courte. Contrôler la descente.",
            "by_tier": {
              "premium":  {"slug": "leg-extension", "name_fr": "Extension jambes machine"},
              "standard": {"slug": "leg-extension", "name_fr": "Extension jambes machine"},
              "home":     {"slug": "wall-sit", "name_fr": "Isométrie murale"}
            }
          },
          {
            "slot": "hamstring_hip_hinge",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "RDL : charge modérée après le squat, focus sur l'étirement des ischios.",
            "by_tier": {
              "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
            }
          },
          {
            "slot": "calf_raise",
            "sets": 4, "reps": "15-20", "rest_sec": 60,
            "note": "Mollets debout (gastrocnémien) — amplitude totale, pause 1s en bas.",
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
            "note": "Journée épaules heavy — mouvement principal. Dépasser la charge de Push A.",
            "by_tier": {
              "premium":  {"slug": "machine-shoulder-press", "name_fr": "Shoulder Press Hammer Strength"},
              "standard": {"slug": "machine-shoulder-press", "name_fr": "Presse épaules machine"},
              "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
            }
          },
          {
            "slot": "chest_fly",
            "sets": 3, "reps": "12-20", "rest_sec": 90,
            "note": "Isolation pectorale en étirement — câble = tension maximale en position allongée.",
            "by_tier": {
              "premium":  {"slug": "cable-crossover", "name_fr": "Câble crossover bas vers haut"},
              "standard": {"slug": "cable-crossover", "name_fr": "Câble crossover"},
              "home":     {"slug": "dumbbell-fly", "name_fr": "Écarté haltères incliné"}
            }
          },
          {
            "slot": "delt_lateral",
            "sets": 4, "reps": "15-20", "rest_sec": 60,
            "note": "Volume delt médian élevé — 4 séries aujourd'hui car épaules sont la priorité.",
            "by_tier": {
              "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "home":     {"slug": "lateral-raise", "name_fr": "Élévations latérales haltères"}
            }
          },
          {
            "slot": "delt_rear",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Delt postérieur = équilibre de l'épaule. Ne jamais négliger.",
            "by_tier": {
              "premium":  {"slug": "rear-delt-fly", "name_fr": "Oiseau câble"},
              "standard": {"slug": "face-pull", "name_fr": "Face Pull câble"},
              "home":     {"slug": "rear-delt-fly", "name_fr": "Oiseau haltères"}
            }
          },
          {
            "slot": "tricep_pushdown",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Triceps en fin — concentration pure, coudes fixes, extension totale.",
            "by_tier": {
              "premium":  {"slug": "tricep-pushdown", "name_fr": "Extension triceps câble corde"},
              "standard": {"slug": "tricep-pushdown", "name_fr": "Extension triceps poulie"},
              "home":     {"slug": "tricep-dip", "name_fr": "Dips barre parallèles"}
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
            "note": "Rowing horizontal heavy — dos droit, coude vers hanche, compression 1s.",
            "by_tier": {
              "premium":  {"slug": "seated-cable-row", "name_fr": "Iso-Lateral Row Hammer Strength"},
              "standard": {"slug": "seated-cable-row", "name_fr": "Tirage horizontal câble"},
              "home":     {"slug": "barbell-row", "name_fr": "Rowing barre Pendlay"}
            }
          },
          {
            "slot": "back_chest_supported",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Support poitrine = élimine le balancement, isolement dos pur.",
            "by_tier": {
              "premium":  {"slug": "chest-supported-row", "name_fr": "Rowing poitrine appuyée machine"},
              "standard": {"slug": "chest-supported-row", "name_fr": "Rowing poitrine appuyée"},
              "home":     {"slug": "incline-barbell-row", "name_fr": "Rowing haltères incliné"}
            }
          },
          {
            "slot": "back_vertical_pull",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Volume supplémentaire dos — charge plus légère qu'en Pull A, focus contracture.",
            "by_tier": {
              "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie supination"},
              "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie supination"},
              "home":     {"slug": "pull-up", "name_fr": "Traction supination"}
            }
          },
          {
            "slot": "bicep_isolation",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Curl marteau = focus brachial antérieur + brachioradial. Supination non requise.",
            "by_tier": {
              "premium":  {"slug": "hammer-curl", "name_fr": "Curl marteau câble"},
              "standard": {"slug": "hammer-curl", "name_fr": "Curl marteau haltères"},
              "home":     {"slug": "hammer-curl", "name_fr": "Curl marteau haltères"}
            }
          },
          {
            "slot": "bicep_isolation_2",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Curl câble : tension constante en bas du mouvement, meilleure pour l'hypertrophie.",
            "by_tier": {
              "premium":  {"slug": "barbell-curl", "name_fr": "Curl câble barre droite"},
              "standard": {"slug": "barbell-curl", "name_fr": "Curl câble barre droite"},
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
            "note": "RDL heavy : mouvement principal ischio-fessiers. Marque de progression chaque semaine.",
            "by_tier": {
              "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
            }
          },
          {
            "slot": "hamstring_isolation",
            "sets": 4, "reps": "10-15", "rest_sec": 120,
            "note": "Leg curl allongé : excellente tension en étirement. Pied fléchi en haut du mouvement.",
            "by_tier": {
              "premium":  {"slug": "leg-curl", "name_fr": "Leg Curl allongé"},
              "standard": {"slug": "leg-curl", "name_fr": "Leg Curl allongé"},
              "home":     {"slug": "nordic-curl", "name_fr": "Nordic Hamstring Curl"}
            }
          },
          {
            "slot": "glute_thrust",
            "sets": 4, "reps": "12-15", "rest_sec": 120,
            "note": "Hip Thrust : reine des exercices fessiers. Poser les omoplates sur le banc, pieds à 90°.",
            "by_tier": {
              "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "home":     {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust haltère"}
            }
          },
          {
            "slot": "legs_unilateral",
            "sets": 3, "reps": "10-15", "rest_sec": 90,
            "note": "Fente bulgare : asymétrie détectée et corrigée. Genou avant dans l'axe des orteils.",
            "by_tier": {
              "premium":  {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"},
              "standard": {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"},
              "home":     {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"}
            }
          },
          {
            "slot": "calf_raise_seated",
            "sets": 4, "reps": "15-20", "rest_sec": 60,
            "note": "Mollets assis : chef sural (profond). Descendre le talon jusqu'en bas, pause 1s.",
            "by_tier": {
              "premium":  {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
              "standard": {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
              "home":     {"slug": "calf-raise", "name_fr": "Mollets debout marche"}
            }
          }
        ]
      }
    ]
  }$prog3$::jsonb
);

-- ═══════════════════════════════════════════════════════════════════════
-- PROGRAMME 4 : Force Fondamentaux 3×/semaine (5×5 inspiré)
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO programs (name, slug, description, level, goal, equipment,
                      sessions_per_week, duration_weeks, is_public, is_custom, structure)
VALUES (
  'Force Fondamentaux 3×',
  'force-fondamentaux-3x',
  'Programme de force basé sur les 4 leviers fondamentaux : Squat, Soulevé de terre, Développé couché, Press militaire. Progressivité linéaire stricte (+2.5 kg par séance). Adapté débutants avancés et intermédiaires cherchant à doper leur force brute.',
  '{"beginner","intermediate"}',
  '{"strength","muscle_gain"}',
  '{"full_gym","home_advanced"}',
  3, 16, true, false,
  $prog4${
    "days": [
      {
        "name": "Jour A",
        "focus": "Squat · Développé couché · Rowing",
        "exercises": [
          {
            "slot": "legs_squat",
            "sets": 5, "reps": "5", "rest_sec": 240,
            "note": "5×5 strict — même charge sur les 5 séries. +2.5 kg si toutes les reps réussies.",
            "by_tier": {
              "premium":  {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "standard": {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "home":     {"slug": "barbell-back-squat", "name_fr": "Squat barre"}
            }
          },
          {
            "slot": "chest_press_strength",
            "sets": 5, "reps": "5", "rest_sec": 240,
            "note": "Développé couché : barre (pas machine) pour la force neuromusculaire. Prise légèrement plus large que l'épaule.",
            "by_tier": {
              "premium":  {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"},
              "standard": {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"},
              "home":     {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"}
            }
          },
          {
            "slot": "back_horizontal_row",
            "sets": 5, "reps": "5", "rest_sec": 180,
            "note": "Rowing barre : mouvement complément antagoniste au développé. Dos plat, tirer vers le nombril.",
            "by_tier": {
              "premium":  {"slug": "barbell-row", "name_fr": "Rowing barre"},
              "standard": {"slug": "barbell-row", "name_fr": "Rowing barre"},
              "home":     {"slug": "barbell-row", "name_fr": "Rowing barre"}
            }
          }
        ]
      },
      {
        "name": "Jour B",
        "focus": "Squat · Press militaire · Soulevé de terre",
        "exercises": [
          {
            "slot": "legs_squat",
            "sets": 5, "reps": "5", "rest_sec": 240,
            "note": "Squat : même protocole, charge légèrement différente de Jour A ou identique.",
            "by_tier": {
              "premium":  {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "standard": {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "home":     {"slug": "barbell-back-squat", "name_fr": "Squat barre"}
            }
          },
          {
            "slot": "shoulder_press_strength",
            "sets": 5, "reps": "5", "rest_sec": 240,
            "note": "Press militaire debout : build épaules + gainage complet. Serrer fessiers et abdos.",
            "by_tier": {
              "premium":  {"slug": "barbell-overhead-press", "name_fr": "Press militaire barre debout"},
              "standard": {"slug": "barbell-overhead-press", "name_fr": "Press militaire barre debout"},
              "home":     {"slug": "barbell-overhead-press", "name_fr": "Press militaire barre debout"}
            }
          },
          {
            "slot": "deadlift",
            "sets": 1, "reps": "5", "rest_sec": 300,
            "note": "Soulevé de terre : 1 seule série maximale (réserve neuromusculaire). +5 kg si réussi. Ne jamais rater une rep.",
            "by_tier": {
              "premium":  {"slug": "deadlift", "name_fr": "Soulevé de terre conventionnel"},
              "standard": {"slug": "deadlift", "name_fr": "Soulevé de terre conventionnel"},
              "home":     {"slug": "deadlift", "name_fr": "Soulevé de terre conventionnel"}
            }
          }
        ]
      },
      {
        "name": "Jour A",
        "focus": "Squat · Développé couché · Rowing",
        "exercises": [
          {
            "slot": "legs_squat",
            "sets": 5, "reps": "5", "rest_sec": 240,
            "note": "Progresser depuis la dernière session Jour A (+2.5 kg si réussi).",
            "by_tier": {
              "premium":  {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "standard": {"slug": "barbell-back-squat", "name_fr": "Squat barre"},
              "home":     {"slug": "barbell-back-squat", "name_fr": "Squat barre"}
            }
          },
          {
            "slot": "chest_press_strength",
            "sets": 5, "reps": "5", "rest_sec": 240,
            "note": "Développé couché : toujours +2.5 kg si 5×5 réussi.",
            "by_tier": {
              "premium":  {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"},
              "standard": {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"},
              "home":     {"slug": "barbell-bench-press", "name_fr": "Développé couché barre"}
            }
          },
          {
            "slot": "back_horizontal_row",
            "sets": 5, "reps": "5", "rest_sec": 180,
            "note": "Rowing barre avec progression.",
            "by_tier": {
              "premium":  {"slug": "barbell-row", "name_fr": "Rowing barre"},
              "standard": {"slug": "barbell-row", "name_fr": "Rowing barre"},
              "home":     {"slug": "barbell-row", "name_fr": "Rowing barre"}
            }
          }
        ]
      }
    ]
  }$prog4$::jsonb
);

-- ═══════════════════════════════════════════════════════════════════════
-- PROGRAMME 5 : Galbe & Fessiers 4×/semaine
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO programs (name, slug, description, level, goal, equipment,
                      sessions_per_week, duration_weeks, is_public, is_custom, structure)
VALUES (
  'Galbe & Fessiers 4×',
  'galbe-fessiers-4x',
  'Programme 4 jours orienté fessiers, jambes et galbe féminin. Travail intense sur le Hip Thrust, le Leg Curl et les exercices d''isolation fessière. Haut du corps en complément pour équilibre esthétique.',
  '{"intermediate"}',
  '{"muscle_gain"}',
  '{"full_gym"}',
  4, 12, true, false,
  $prog5${
    "days": [
      {
        "name": "Jambes & Fessiers A",
        "focus": "Fessiers heavy · Ischios · Abducteurs",
        "exercises": [
          {
            "slot": "glute_thrust",
            "sets": 4, "reps": "10-15", "rest_sec": 120,
            "note": "Hip Thrust : mouvement principal fessiers. Charge maximale avec forme parfaite.",
            "by_tier": {
              "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "home":     {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust haltère"}
            }
          },
          {
            "slot": "legs_press",
            "sets": 3, "reps": "12-15", "rest_sec": 120,
            "note": "Pieds hauts et écartés pour focus fessiers et ischios plutôt que quads.",
            "by_tier": {
              "premium":  {"slug": "leg-press", "name_fr": "Leg Press (pieds hauts)"},
              "standard": {"slug": "leg-press", "name_fr": "Leg Press (pieds hauts)"},
              "home":     {"slug": "sumo-squat", "name_fr": "Squat sumo haltère"}
            }
          },
          {
            "slot": "hamstring_isolation",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Leg curl allongé : tension ischios en position courte. Pied fléchi.",
            "by_tier": {
              "premium":  {"slug": "leg-curl", "name_fr": "Leg Curl allongé"},
              "standard": {"slug": "leg-curl", "name_fr": "Leg Curl allongé"},
              "home":     {"slug": "nordic-curl", "name_fr": "Nordic Hamstring Curl"}
            }
          },
          {
            "slot": "glute_abduction",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Abduction : focus fessier moyen et fessier supérieur. Tension câble = idéal.",
            "by_tier": {
              "premium":  {"slug": "cable-hip-abduction", "name_fr": "Abduction câble debout"},
              "standard": {"slug": "hip-abduction-machine", "name_fr": "Abduction machine"},
              "home":     {"slug": "clamshell", "name_fr": "Palourde élastique"}
            }
          },
          {
            "slot": "calf_raise",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Mollets debout : finir la séance avec cette isolation.",
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
            "note": "Tirage vertical : construire le dos en V pour une silhouette équilibrée.",
            "by_tier": {
              "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "home":     {"slug": "pull-up", "name_fr": "Traction pronation"}
            }
          },
          {
            "slot": "chest_horizontal",
            "sets": 3, "reps": "10-15", "rest_sec": 120,
            "note": "Développé pectoral : amplitude complète, étirement en bas.",
            "by_tier": {
              "premium":  {"slug": "machine-chest-press", "name_fr": "Chest Press Hammer Strength"},
              "standard": {"slug": "machine-chest-press", "name_fr": "Chest Press Machine"},
              "home":     {"slug": "dumbbell-bench-press", "name_fr": "Développé couché haltères"}
            }
          },
          {
            "slot": "delt_lateral",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Élévations latérales : largeur d'épaules pour la silhouette.",
            "by_tier": {
              "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "home":     {"slug": "lateral-raise", "name_fr": "Élévations latérales haltères"}
            }
          },
          {
            "slot": "delt_rear",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Delt postérieur : équilibre posture. Face pull ou oiseau.",
            "by_tier": {
              "premium":  {"slug": "face-pull", "name_fr": "Face Pull câble"},
              "standard": {"slug": "face-pull", "name_fr": "Face Pull câble"},
              "home":     {"slug": "rear-delt-fly", "name_fr": "Oiseau haltères"}
            }
          },
          {
            "slot": "bicep_compound",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Curl : volume modéré. Bras toniques, pas imposants.",
            "by_tier": {
              "premium":  {"slug": "barbell-curl", "name_fr": "Curl câble"},
              "standard": {"slug": "barbell-curl", "name_fr": "Curl câble"},
              "home":     {"slug": "dumbbell-curl", "name_fr": "Curl haltères alterné"}
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
            "note": "RDL : charge lourde — allonger les ischios en haut, serrer les fessiers en bas.",
            "by_tier": {
              "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
            }
          },
          {
            "slot": "glute_thrust",
            "sets": 4, "reps": "12-15", "rest_sec": 120,
            "note": "2e séance Hip Thrust de la semaine — progression sur la charge ou les reps.",
            "by_tier": {
              "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "home":     {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust haltère"}
            }
          },
          {
            "slot": "legs_unilateral",
            "sets": 3, "reps": "10-15", "rest_sec": 90,
            "note": "Fente bulgare : travail unilatéral pour détecter et corriger les asymétries.",
            "by_tier": {
              "premium":  {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"},
              "standard": {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"},
              "home":     {"slug": "bulgarian-split-squat", "name_fr": "Fente bulgare haltères"}
            }
          },
          {
            "slot": "glute_bridge",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Glute bridge ou cable kickback : finisher fessiers à haute répétition.",
            "by_tier": {
              "premium":  {"slug": "cable-kickback", "name_fr": "Kickback câble fessiers"},
              "standard": {"slug": "cable-kickback", "name_fr": "Kickback câble fessiers"},
              "home":     {"slug": "glute-bridge", "name_fr": "Glute Bridge au sol"}
            }
          },
          {
            "slot": "calf_raise_seated",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Mollets assis : chef sural profond.",
            "by_tier": {
              "premium":  {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
              "standard": {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine"},
              "home":     {"slug": "calf-raise", "name_fr": "Mollets debout marche"}
            }
          }
        ]
      },
      {
        "name": "Corps complet + Core",
        "focus": "Corps entier · Abdominaux · Cardio léger",
        "exercises": [
          {
            "slot": "legs_squat",
            "sets": 3, "reps": "12-15", "rest_sec": 120,
            "note": "Squat plus léger — rythme soutenu, focus activation globale.",
            "by_tier": {
              "premium":  {"slug": "leg-press", "name_fr": "Leg Press"},
              "standard": {"slug": "leg-press", "name_fr": "Leg Press"},
              "home":     {"slug": "goblet-squat", "name_fr": "Goblet Squat haltère"}
            }
          },
          {
            "slot": "back_horizontal_row",
            "sets": 3, "reps": "10-15", "rest_sec": 90,
            "note": "Rowing dos droit.",
            "by_tier": {
              "premium":  {"slug": "seated-cable-row", "name_fr": "Tirage horizontal câble"},
              "standard": {"slug": "seated-cable-row", "name_fr": "Tirage horizontal câble"},
              "home":     {"slug": "dumbbell-row", "name_fr": "Rowing haltère unilatéral"}
            }
          },
          {
            "slot": "shoulder_press",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Press épaules léger pour volume complémentaire.",
            "by_tier": {
              "premium":  {"slug": "machine-shoulder-press", "name_fr": "Presse épaules machine"},
              "standard": {"slug": "machine-shoulder-press", "name_fr": "Presse épaules machine"},
              "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
            }
          },
          {
            "slot": "core_plank",
            "sets": 3, "reps": "30-60s", "rest_sec": 60,
            "note": "Planche classique ou planche latérale — gainage profond.",
            "by_tier": {
              "premium":  {"slug": "plank", "name_fr": "Planche abdominale"},
              "standard": {"slug": "plank", "name_fr": "Planche abdominale"},
              "home":     {"slug": "plank", "name_fr": "Planche abdominale"}
            }
          },
          {
            "slot": "core_crunch",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Crunch câble ou crunch au sol : isolation abdominale haute.",
            "by_tier": {
              "premium":  {"slug": "cable-crunch", "name_fr": "Crunch câble"},
              "standard": {"slug": "cable-crunch", "name_fr": "Crunch câble"},
              "home":     {"slug": "crunch", "name_fr": "Crunch au sol"}
            }
          }
        ]
      }
    ]
  }$prog5$::jsonb
);

-- ═══════════════════════════════════════════════════════════════════════
-- PROGRAMME 6 : Full Body Femme Débutante 3×/semaine
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO programs (name, slug, description, level, goal, equipment,
                      sessions_per_week, duration_weeks, is_public, is_custom, structure)
VALUES (
  'Full Body Femme Débutante 3×',
  'full-body-femme-debutante',
  'Programme d''initiation pour les femmes débutantes. Accent sur les fessiers, les jambes et la tonification globale. Exercices accessibles pour créer les bases musculaires et développer la confiance à la salle.',
  '{"beginner"}',
  '{"general","muscle_gain"}',
  '{"full_gym","home_basic","home_advanced"}',
  3, 8, true, false,
  $prog6${
    "days": [
      {
        "name": "Séance A",
        "focus": "Fessiers · Dos · Épaules",
        "exercises": [
          {
            "slot": "glute_thrust",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Hip Thrust : exercice #1 pour les fessiers. Commencer avec le poids du corps, ajouter une charge progressivement.",
            "by_tier": {
              "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "home":     {"slug": "glute-bridge", "name_fr": "Glute Bridge au sol"}
            }
          },
          {
            "slot": "back_vertical_pull",
            "sets": 3, "reps": "10-15", "rest_sec": 90,
            "note": "Tirage vertical : premiers mois avec assist si nécessaire, puis charge progressive.",
            "by_tier": {
              "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "home":     {"slug": "resistance-band-row", "name_fr": "Rowing élastique"}
            }
          },
          {
            "slot": "shoulder_press",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Épaules légères — développer la stabilité de l'épaule d'abord.",
            "by_tier": {
              "premium":  {"slug": "machine-shoulder-press", "name_fr": "Presse épaules machine"},
              "standard": {"slug": "machine-shoulder-press", "name_fr": "Presse épaules machine"},
              "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
            }
          },
          {
            "slot": "delt_lateral",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Élévations légères pour définir les épaules.",
            "by_tier": {
              "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "home":     {"slug": "lateral-raise", "name_fr": "Élévations latérales haltères"}
            }
          },
          {
            "slot": "core_plank",
            "sets": 3, "reps": "20-30s", "rest_sec": 45,
            "note": "Planche : gainage de base. Augmenter la durée chaque semaine.",
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
            "note": "Leg press ou squat : exercice de base pour les jambes. Descendre jusqu'à 90° minimum.",
            "by_tier": {
              "premium":  {"slug": "leg-press", "name_fr": "Leg Press"},
              "standard": {"slug": "leg-press", "name_fr": "Leg Press"},
              "home":     {"slug": "goblet-squat", "name_fr": "Goblet Squat haltère"}
            }
          },
          {
            "slot": "hamstring_hip_hinge",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "RDL léger : apprendre le mouvement charnière. Haltères recommandés au départ.",
            "by_tier": {
              "premium":  {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "standard": {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues"},
              "home":     {"slug": "romanian-deadlift", "name_fr": "Soulevé de terre jambes tendues haltères"}
            }
          },
          {
            "slot": "chest_horizontal",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Pecto : machine recommandée pour débuter, amplitude et sécurité.",
            "by_tier": {
              "premium":  {"slug": "machine-chest-press", "name_fr": "Chest Press Machine"},
              "standard": {"slug": "machine-chest-press", "name_fr": "Chest Press Machine"},
              "home":     {"slug": "push-up", "name_fr": "Pompes"}
            }
          },
          {
            "slot": "glute_abduction",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Abducteurs : les fessiers moyens souvent négligés. Important pour la stabilité.",
            "by_tier": {
              "premium":  {"slug": "hip-abduction-machine", "name_fr": "Abduction machine"},
              "standard": {"slug": "hip-abduction-machine", "name_fr": "Abduction machine"},
              "home":     {"slug": "clamshell", "name_fr": "Palourde élastique"}
            }
          },
          {
            "slot": "core_crunch",
            "sets": 3, "reps": "15-20", "rest_sec": 45,
            "note": "Crunch ou relevé de jambes : renforcement abdominal progressif.",
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
            "note": "Hip Thrust : progresser depuis la dernière Séance A.",
            "by_tier": {
              "premium":  {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "standard": {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre"},
              "home":     {"slug": "glute-bridge", "name_fr": "Glute Bridge au sol"}
            }
          },
          {
            "slot": "back_vertical_pull",
            "sets": 3, "reps": "10-15", "rest_sec": 90,
            "note": "Tirage vertical : augmenter la charge si possible.",
            "by_tier": {
              "premium":  {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "standard": {"slug": "lat-pulldown", "name_fr": "Tirage vertical poulie"},
              "home":     {"slug": "resistance-band-row", "name_fr": "Rowing élastique"}
            }
          },
          {
            "slot": "shoulder_press",
            "sets": 3, "reps": "12-15", "rest_sec": 90,
            "note": "Épaules avec légère progression.",
            "by_tier": {
              "premium":  {"slug": "machine-shoulder-press", "name_fr": "Presse épaules machine"},
              "standard": {"slug": "machine-shoulder-press", "name_fr": "Presse épaules machine"},
              "home":     {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères"}
            }
          },
          {
            "slot": "delt_lateral",
            "sets": 3, "reps": "15-20", "rest_sec": 60,
            "note": "Élévations latérales.",
            "by_tier": {
              "premium":  {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "standard": {"slug": "cable-lateral-raise", "name_fr": "Élévations latérales câble"},
              "home":     {"slug": "lateral-raise", "name_fr": "Élévations latérales haltères"}
            }
          },
          {
            "slot": "core_plank",
            "sets": 3, "reps": "25-40s", "rest_sec": 45,
            "note": "Planche : 5 secondes de plus que la semaine passée.",
            "by_tier": {
              "premium":  {"slug": "plank", "name_fr": "Planche abdominale"},
              "standard": {"slug": "plank", "name_fr": "Planche abdominale"},
              "home":     {"slug": "plank", "name_fr": "Planche abdominale"}
            }
          }
        ]
      }
    ]
  }$prog6$::jsonb
);
