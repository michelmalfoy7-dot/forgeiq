-- ============================================================
-- ForgeIQ — Programmes féminins + mise à jour programmes existants
-- Nouveau format structure.days = [{name, exercises}]
-- ============================================================

-- ── 1. GALBE & FESSIERS (3x/semaine, débutant/intermédiaire) ──
INSERT INTO programs (
  name, slug, description, level, goal, equipment,
  sessions_per_week, duration_weeks, is_public, structure
) VALUES (
  'Galbe & Fessiers',
  'galbe-fessiers',
  'Programme féminin axé sur le développement des fessiers, l''affinement des jambes et le galbe global. 3 séances par semaine avec progression sur 8 semaines.',
  ARRAY['beginner','intermediate'],
  ARRAY['muscle_gain','general'],
  ARRAY['full_gym'],
  3, 8, true,
  '{
    "days": [
      {
        "name": "Fessiers & Ischio",
        "exercises": [
          {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre", "sets": 4, "reps": "10-12", "rest_sec": 90, "note": "Squeeze fort en haut, 1 sec de pause"},
          {"slug": "romanian-deadlift", "name_fr": "Soulevé roumain", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Dos droit, descends jusqu\'à sentir l\'étirement"},
          {"slug": "bulgarian-split-squat-dumbbells", "name_fr": "Fente bulgare haltères", "sets": 3, "reps": "10", "rest_sec": 75, "note": "Pied arrière sur le banc"},
          {"slug": "cable-kickback", "name_fr": "Extension fesse câble", "sets": 3, "reps": "15", "rest_sec": 60, "note": "Contraction maximale en haut"},
          {"slug": "adductor-machine", "name_fr": "Machine adducteur", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Contrôle la descente"},
          {"slug": "glute-bridge", "name_fr": "Pont fessier", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Maintiens 2 sec en haut"}
        ]
      },
      {
        "name": "Corps Complet & Core",
        "exercises": [
          {"slug": "goblet-squat", "name_fr": "Squat goblet", "sets": 3, "reps": "12-15", "rest_sec": 75, "note": "Haltère contre la poitrine"},
          {"slug": "lat-pulldown", "name_fr": "Tirage poulie haute", "sets": 3, "reps": "12", "rest_sec": 75, "note": "Tire vers le menton"},
          {"slug": "dumbbell-lateral-raise", "name_fr": "Élévation latérale", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Légère flexion des coudes"},
          {"slug": "plank", "name_fr": "Planche", "sets": 3, "reps": "30-45 sec", "rest_sec": 60, "note": "Corps aligné tête-talon"},
          {"slug": "bicycle-crunch", "name_fr": "Crunch vélo", "sets": 3, "reps": "20", "rest_sec": 45, "note": "Contrôle, ne tire pas sur le cou"},
          {"slug": "mountain-climber", "name_fr": "Grimpeur", "sets": 3, "reps": "30 sec", "rest_sec": 45, "note": "Hanches basses, rythme régulier"}
        ]
      },
      {
        "name": "Fessiers & Dos",
        "exercises": [
          {"slug": "banded-hip-thrust", "name_fr": "Hip Thrust élastique", "sets": 4, "reps": "15-20", "rest_sec": 75, "note": "Élastique au-dessus des genoux"},
          {"slug": "single-leg-romanian-deadlift", "name_fr": "Soulevé roumain unijambiste", "sets": 3, "reps": "10", "rest_sec": 75, "note": "Jambe libre en arrière pour équilibre"},
          {"slug": "step-up", "name_fr": "Montée sur box", "sets": 3, "reps": "12", "rest_sec": 60, "note": "Pousse avec le talon"},
          {"slug": "seated-row", "name_fr": "Rowing assis câble", "sets": 3, "reps": "12", "rest_sec": 75, "note": "Tire les coudes en arrière"},
          {"slug": "donkey-kick", "name_fr": "Coup de pied âne", "sets": 3, "reps": "15", "rest_sec": 45, "note": "Genou à 90°, contracte en haut"},
          {"slug": "clamshell", "name_fr": "Palourde élastique", "sets": 3, "reps": "20", "rest_sec": 45, "note": "Ne bouge pas le bassin"}
        ]
      }
    ]
  }'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- ── 2. FULL BODY FEMME DÉBUTANTE (3x/semaine, bodyweight/haltères) ──
INSERT INTO programs (
  name, slug, description, level, goal, equipment,
  sessions_per_week, duration_weeks, is_public, structure
) VALUES (
  'Full Body Femme Débutante',
  'full-body-femme-debutante',
  'Programme complet pour commencer en douceur. Aucun équipement requis, exercices au poids du corps et haltères légers. Idéal pour débuter et créer de bonnes habitudes.',
  ARRAY['beginner'],
  ARRAY['general','weight_loss'],
  ARRAY['bodyweight','home_basic'],
  3, 6, true,
  '{
    "days": [
      {
        "name": "Full Body A",
        "exercises": [
          {"slug": "squat", "name_fr": "Squat poids du corps", "sets": 3, "reps": "15", "rest_sec": 60, "note": "Genoux dans l\'axe des orteils"},
          {"slug": "push-up", "name_fr": "Pompe", "sets": 3, "reps": "8-12", "rest_sec": 60, "note": "Sur les genoux si besoin"},
          {"slug": "glute-bridge", "name_fr": "Pont fessier", "sets": 3, "reps": "15-20", "rest_sec": 60, "note": "Maintiens 2 sec en haut"},
          {"slug": "dead-bug", "name_fr": "Dead Bug", "sets": 3, "reps": "10", "rest_sec": 45, "note": "Dos collé au sol en permanence"},
          {"slug": "jumping-jacks", "name_fr": "Sauts étoiles", "sets": 3, "reps": "30 sec", "rest_sec": 45, "note": "Rythme régulier"},
          {"slug": "hip-flexor-stretch", "name_fr": "Étirement fléchisseur", "sets": 1, "reps": "30 sec/côté", "rest_sec": 0, "note": "Fin de séance"}
        ]
      },
      {
        "name": "Full Body B",
        "exercises": [
          {"slug": "reverse-lunge", "name_fr": "Fente arrière", "sets": 3, "reps": "10/côté", "rest_sec": 60, "note": "Genou arrière près du sol"},
          {"slug": "incline-push-up", "name_fr": "Pompe inclinée", "sets": 3, "reps": "12", "rest_sec": 60, "note": "Mains sur un banc ou chaise"},
          {"slug": "donkey-kick", "name_fr": "Coup de pied âne", "sets": 3, "reps": "15/côté", "rest_sec": 45, "note": "Contracte le fessier en haut"},
          {"slug": "side-plank", "name_fr": "Planche latérale", "sets": 3, "reps": "20 sec/côté", "rest_sec": 45, "note": "Corps en ligne droite"},
          {"slug": "mountain-climber", "name_fr": "Grimpeur", "sets": 3, "reps": "20 sec", "rest_sec": 45, "note": "Hanches basses"},
          {"slug": "downward-dog", "name_fr": "Chien tête en bas", "sets": 1, "reps": "5 respirations", "rest_sec": 0, "note": "Étirement final"}
        ]
      },
      {
        "name": "Full Body C",
        "exercises": [
          {"slug": "sumo-squat", "name_fr": "Squat sumo", "sets": 3, "reps": "15", "rest_sec": 60, "note": "Pieds larges, orteils vers l\'extérieur"},
          {"slug": "pike-push-up", "name_fr": "Pompe en V inversé", "sets": 3, "reps": "8", "rest_sec": 60, "note": "Simule un développé épaules"},
          {"slug": "fire-hydrant", "name_fr": "Borne incendie", "sets": 3, "reps": "15/côté", "rest_sec": 45, "note": "Genou à 90° tout le long"},
          {"slug": "bicycle-crunch", "name_fr": "Crunch vélo", "sets": 3, "reps": "20", "rest_sec": 45, "note": "Contrôle le mouvement"},
          {"slug": "burpee", "name_fr": "Burpee", "sets": 3, "reps": "8", "rest_sec": 60, "note": "À ton rythme, qualité > vitesse"},
          {"slug": "pigeon-pose", "name_fr": "Posture du pigeon", "sets": 1, "reps": "45 sec/côté", "rest_sec": 0, "note": "Étirement fessiers"}
        ]
      }
    ]
  }'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- ── 3. TONIFICATION & SÈCHE FEMME (4x/semaine, intermédiaire) ──
INSERT INTO programs (
  name, slug, description, level, goal, equipment,
  sessions_per_week, duration_weeks, is_public, structure
) VALUES (
  'Tonification & Sèche Femme',
  'tonification-seche-femme',
  'Programme 4 jours pour sculpter et affiner la silhouette. Combine musculation et cardio pour maximiser la dépense calorique tout en préservant le muscle.',
  ARRAY['intermediate'],
  ARRAY['weight_loss','general'],
  ARRAY['full_gym'],
  4, 8, true,
  '{
    "days": [
      {
        "name": "Bas du Corps Intensif",
        "exercises": [
          {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 4, "reps": "12-15", "rest_sec": 75, "note": "Descends les genoux près de la poitrine"},
          {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre", "sets": 4, "reps": "12", "rest_sec": 90, "note": "Barre avec coussin, pousse avec les talons"},
          {"slug": "walking-lunges", "name_fr": "Fentes marchées", "sets": 3, "reps": "12/côté", "rest_sec": 60, "note": "Pas amples, buste droit"},
          {"slug": "leg-curl", "name_fr": "Leg Curl couché", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Contrôle la descente"},
          {"slug": "abductor-machine", "name_fr": "Machine abducteur", "sets": 3, "reps": "15-20", "rest_sec": 45, "note": "Résistance légère, amplitude complète"},
          {"slug": "jump-squat", "name_fr": "Squat sauté", "sets": 3, "reps": "12", "rest_sec": 45, "note": "Atterris genou fléchi"}
        ]
      },
      {
        "name": "Haut du Corps & Core",
        "exercises": [
          {"slug": "lat-pulldown", "name_fr": "Tirage poulie haute", "sets": 3, "reps": "12", "rest_sec": 75, "note": "Prise un peu plus large que les épaules"},
          {"slug": "dumbbell-shoulder-press", "name_fr": "Développé épaules haltères", "sets": 3, "reps": "12", "rest_sec": 75, "note": "Assis, dos droit"},
          {"slug": "machine-chest-press", "name_fr": "Pectoraux machine", "sets": 3, "reps": "12-15", "rest_sec": 75, "note": "Amplitude complète"},
          {"slug": "cable-lateral-raise", "name_fr": "Élévation latérale câble", "sets": 3, "reps": "15", "rest_sec": 45, "note": "Légère flexion du coude"},
          {"slug": "pallof-press", "name_fr": "Pallof Press", "sets": 3, "reps": "12/côté", "rest_sec": 45, "note": "Résiste à la rotation"},
          {"slug": "hollow-body-hold", "name_fr": "Gainage creux", "sets": 3, "reps": "20 sec", "rest_sec": 45, "note": "Lombaires au sol"}
        ]
      },
      {
        "name": "Fessiers & Jambes",
        "exercises": [
          {"slug": "romanian-deadlift-dumbbells", "name_fr": "Soulevé roumain haltères", "sets": 4, "reps": "12", "rest_sec": 75, "note": "Haltères le long des jambes"},
          {"slug": "single-leg-press", "name_fr": "Presse unijambiste", "sets": 3, "reps": "12/côté", "rest_sec": 75, "note": "Commence par la jambe faible"},
          {"slug": "curtsy-lunge", "name_fr": "Fente croisée", "sets": 3, "reps": "12/côté", "rest_sec": 60, "note": "Travaille l\'extérieur des fessiers"},
          {"slug": "cable-kickback", "name_fr": "Extension fesse câble", "sets": 3, "reps": "15/côté", "rest_sec": 45, "note": "Contraction en haut"},
          {"slug": "clamshell", "name_fr": "Palourde élastique", "sets": 3, "reps": "20/côté", "rest_sec": 45, "note": "Élastique au-dessus des genoux"},
          {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis machine", "sets": 4, "reps": "15-20", "rest_sec": 45, "note": "Amplitude complète, maintiens en haut"}
        ]
      },
      {
        "name": "HIIT & Cardio Muscu",
        "exercises": [
          {"slug": "burpee", "name_fr": "Burpee", "sets": 4, "reps": "10", "rest_sec": 30, "note": "Max effort, short rest"},
          {"slug": "jump-squat", "name_fr": "Squat sauté", "sets": 4, "reps": "12", "rest_sec": 30, "note": "Explosif"},
          {"slug": "mountain-climber", "name_fr": "Grimpeur", "sets": 4, "reps": "30 sec", "rest_sec": 30, "note": "Rythme soutenu"},
          {"slug": "box-jump", "name_fr": "Saut sur box", "sets": 4, "reps": "8", "rest_sec": 45, "note": "Atterris genou fléchi"},
          {"slug": "lateral-shuffle", "name_fr": "Glissement latéral", "sets": 3, "reps": "30 sec", "rest_sec": 30, "note": "Position basse, pieds ne se croisent pas"},
          {"slug": "battle-rope-waves", "name_fr": "Ondes cordes combat", "sets": 3, "reps": "20 sec", "rest_sec": 40, "note": "Bras alternés, full power"}
        ]
      }
    ]
  }'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- ── 4. STRONG WOMAN (4x/semaine, intermédiaire/avancé) ──
INSERT INTO programs (
  name, slug, description, level, goal, equipment,
  sessions_per_week, duration_weeks, is_public, structure
) VALUES (
  'Strong Woman',
  'strong-woman',
  'Programme de force adapté à la femme. Basé sur les mouvements fondamentaux (squat, deadlift, press) avec une progression linéaire. Deviens plus forte, gagne en confiance.',
  ARRAY['intermediate','advanced'],
  ARRAY['strength','muscle_gain'],
  ARRAY['full_gym'],
  4, 10, true,
  '{
    "days": [
      {
        "name": "Deadlift & Postérieure",
        "exercises": [
          {"slug": "deadlift", "name_fr": "Soulevé de terre", "sets": 4, "reps": "5", "rest_sec": 180, "note": "Mouvement principal — monte progressivement en charge"},
          {"slug": "romanian-deadlift", "name_fr": "Soulevé roumain", "sets": 3, "reps": "8", "rest_sec": 120, "note": "Après le deadlift lourd"},
          {"slug": "single-leg-romanian-deadlift", "name_fr": "Soulevé roumain unijambiste", "sets": 3, "reps": "8/côté", "rest_sec": 90, "note": "Haltère côté opposé"},
          {"slug": "seated-row", "name_fr": "Rowing assis câble", "sets": 3, "reps": "10", "rest_sec": 90, "note": "Tire les coudes en arrière"},
          {"slug": "lat-pulldown", "name_fr": "Tirage poulie haute", "sets": 3, "reps": "10", "rest_sec": 75, "note": "Prise en supination pour plus de biceps"},
          {"slug": "barbell-hip-thrust", "name_fr": "Hip Thrust barre", "sets": 3, "reps": "10", "rest_sec": 90, "note": "Poids lourd, squeeze fort"}
        ]
      },
      {
        "name": "Pectoraux & Triceps",
        "exercises": [
          {"slug": "bench-press", "name_fr": "Développé couché barre", "sets": 4, "reps": "5-8", "rest_sec": 150, "note": "Mouvement principal force"},
          {"slug": "incline-dumbbell-press", "name_fr": "Développé incliné haltères", "sets": 3, "reps": "10", "rest_sec": 90, "note": "Banc à 30-45°"},
          {"slug": "dumbbell-fly", "name_fr": "Écarté haltères", "sets": 3, "reps": "12", "rest_sec": 75, "note": "Légère flexion des coudes"},
          {"slug": "close-grip-bench-press", "name_fr": "Développé prise serrée", "sets": 3, "reps": "8-10", "rest_sec": 90, "note": "Prise à 45cm, coudes près du corps"},
          {"slug": "cable-overhead-tricep-extension", "name_fr": "Extension tricep nuque câble", "sets": 3, "reps": "12", "rest_sec": 60, "note": "Étirement complet en bas"},
          {"slug": "diamond-push-up", "name_fr": "Pompe diamant", "sets": 2, "reps": "max", "rest_sec": 60, "note": "Finisher triceps"}
        ]
      },
      {
        "name": "Squat & Quadriceps",
        "exercises": [
          {"slug": "squat", "name_fr": "Squat barre", "sets": 4, "reps": "5", "rest_sec": 180, "note": "Mouvement roi — descends sous le parallèle"},
          {"slug": "front-squat", "name_fr": "Squat avant", "sets": 3, "reps": "6", "rest_sec": 120, "note": "Barre sur les deltoïdes"},
          {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 3, "reps": "10-12", "rest_sec": 90, "note": "Pieds à largeur d\'épaules"},
          {"slug": "leg-extension", "name_fr": "Leg Extension", "sets": 3, "reps": "12-15", "rest_sec": 60, "note": "Isolation quadriceps"},
          {"slug": "walking-lunges", "name_fr": "Fentes marchées", "sets": 3, "reps": "10/côté", "rest_sec": 75, "note": "Avec haltères"},
          {"slug": "seated-calf-raise-machine", "name_fr": "Mollets assis", "sets": 4, "reps": "15", "rest_sec": 45, "note": "Lent et contrôlé"}
        ]
      },
      {
        "name": "Dos & Biceps",
        "exercises": [
          {"slug": "bent-over-row", "name_fr": "Rowing barre penché", "sets": 4, "reps": "6-8", "rest_sec": 120, "note": "Dos à 45°, tire vers le nombril"},
          {"slug": "pull-up", "name_fr": "Traction", "sets": 3, "reps": "max", "rest_sec": 120, "note": "Assisté si besoin"},
          {"slug": "single-arm-cable-row", "name_fr": "Rowing câble unilatéral", "sets": 3, "reps": "10/côté", "rest_sec": 75, "note": "Rotation du tronc pour plus d\'amplitude"},
          {"slug": "barbell-curl", "name_fr": "Curl barre", "sets": 3, "reps": "10", "rest_sec": 75, "note": "Coudes fixes, pleine amplitude"},
          {"slug": "incline-dumbbell-curl", "name_fr": "Curl haltère incliné", "sets": 3, "reps": "10", "rest_sec": 60, "note": "Banc à 60°, pré-étire les biceps"},
          {"slug": "banded-pull-apart", "name_fr": "Écartement élastique", "sets": 3, "reps": "20", "rest_sec": 30, "note": "Santé des épaules, à faire chaque séance"}
        ]
      }
    ]
  }'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- ── 5. MOBILITÉ & BIEN-ÊTRE FEMME (3x/semaine, tous niveaux) ──
INSERT INTO programs (
  name, slug, description, level, goal, equipment,
  sessions_per_week, duration_weeks, is_public, structure
) VALUES (
  'Mobilité & Bien-être',
  'mobilite-bien-etre',
  'Programme axé sur la mobilité, la posture et le bien-être global. Combine yoga, pilates et renforcement doux. Parfait pour décompresser, retrouver de la souplesse et se sentir bien dans son corps.',
  ARRAY['beginner','intermediate','advanced'],
  ARRAY['general'],
  ARRAY['bodyweight'],
  3, 8, true,
  '{
    "days": [
      {
        "name": "Mobilité & Activation",
        "exercises": [
          {"slug": "worlds-greatest-stretch", "name_fr": "Grand étirement mondial", "sets": 2, "reps": "5/côté", "rest_sec": 30, "note": "Mouvement lent et conscient"},
          {"slug": "cat-cow", "name_fr": "Chat-Vache", "sets": 2, "reps": "10", "rest_sec": 30, "note": "Synchronise avec la respiration"},
          {"slug": "thoracic-rotation", "name_fr": "Rotation thoracique", "sets": 2, "reps": "10/côté", "rest_sec": 30, "note": "Suis le coude du regard"},
          {"slug": "bird-dog", "name_fr": "Bird Dog", "sets": 3, "reps": "10/côté", "rest_sec": 30, "note": "Maintiens 2 sec, dos plat"},
          {"slug": "dead-bug", "name_fr": "Dead Bug", "sets": 3, "reps": "8/côté", "rest_sec": 30, "note": "Dos collé au sol"},
          {"slug": "hip-circle", "name_fr": "Cercle de hanche", "sets": 2, "reps": "10/sens", "rest_sec": 30, "note": "Ample et lent"},
          {"slug": "90-90-hip-stretch", "name_fr": "Étirement 90-90 hanche", "sets": 2, "reps": "45 sec/côté", "rest_sec": 30, "note": "Reste détendu"},
          {"slug": "childs-pose", "name_fr": "Posture de l\'enfant", "sets": 1, "reps": "60 sec", "rest_sec": 0, "note": "Fin de séance, respire profond"}
        ]
      },
      {
        "name": "Force Douce & Posture",
        "exercises": [
          {"slug": "glute-bridge", "name_fr": "Pont fessier", "sets": 3, "reps": "15", "rest_sec": 45, "note": "Active les fessiers et le core"},
          {"slug": "bird-dog", "name_fr": "Bird Dog", "sets": 3, "reps": "10/côté", "rest_sec": 30, "note": "Stabilité lombaire"},
          {"slug": "side-plank", "name_fr": "Planche latérale", "sets": 3, "reps": "20-30 sec/côté", "rest_sec": 30, "note": "Corps en ligne"},
          {"slug": "y-t-w-raise", "name_fr": "Élévation Y-T-W", "sets": 3, "reps": "10", "rest_sec": 30, "note": "Poids très légers, santé des épaules"},
          {"slug": "wall-sit", "name_fr": "Chaise murale", "sets": 3, "reps": "30-45 sec", "rest_sec": 45, "note": "Genoux à 90°"},
          {"slug": "jefferson-curl", "name_fr": "Curl Jefferson", "sets": 2, "reps": "5", "rest_sec": 45, "note": "Sans poids, vertèbre par vertèbre"},
          {"slug": "pigeon-pose", "name_fr": "Posture du pigeon", "sets": 1, "reps": "90 sec/côté", "rest_sec": 0, "note": "Étirement profond des fessiers"}
        ]
      },
      {
        "name": "Récupération Active",
        "exercises": [
          {"slug": "downward-dog", "name_fr": "Chien tête en bas", "sets": 3, "reps": "5 respirations", "rest_sec": 30, "note": "Talons vers le sol"},
          {"slug": "couch-stretch", "name_fr": "Étirement du canapé", "sets": 1, "reps": "2 min/côté", "rest_sec": 30, "note": "Fléchisseur de hanche profond"},
          {"slug": "thoracic-extension", "name_fr": "Extension thoracique", "sets": 2, "reps": "30 sec", "rest_sec": 30, "note": "Foam roller sous les omoplates"},
          {"slug": "ankle-circle", "name_fr": "Cercle de cheville", "sets": 2, "reps": "10/sens", "rest_sec": 0, "note": "Améliore la mobilité pour le squat"},
          {"slug": "hip-flexor-stretch", "name_fr": "Étirement fléchisseur hanche", "sets": 1, "reps": "90 sec/côté", "rest_sec": 30, "note": "Essentiel si tu es sédentaire"},
          {"slug": "shoulder-dislocate", "name_fr": "Dislocateur épaule", "sets": 3, "reps": "10", "rest_sec": 30, "note": "Prise très large, élastique fin"},
          {"slug": "childs-pose", "name_fr": "Posture de l\'enfant", "sets": 1, "reps": "2 min", "rest_sec": 0, "note": "Décompression finale"}
        ]
      }
    ]
  }'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- ── Mise à jour des programmes existants phares ──
-- PPL 3x/semaine
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Push",
      "exercises": [
        {"slug": "bench-press", "name_fr": "Développé couché", "sets": 4, "reps": "6-10", "rest_sec": 120},
        {"slug": "overhead-press-dumbbells", "name_fr": "Développé épaules haltères", "sets": 3, "reps": "10-12", "rest_sec": 90},
        {"slug": "incline-dumbbell-press", "name_fr": "Développé incliné haltères", "sets": 3, "reps": "10-12", "rest_sec": 90},
        {"slug": "lateral-raise", "name_fr": "Élévation latérale", "sets": 3, "reps": "15", "rest_sec": 60},
        {"slug": "tricep-pushdown", "name_fr": "Tirage tricep poulie", "sets": 3, "reps": "12-15", "rest_sec": 60},
        {"slug": "cable-overhead-tricep-extension", "name_fr": "Extension tricep nuque", "sets": 3, "reps": "12", "rest_sec": 60}
      ]
    },
    {
      "name": "Pull",
      "exercises": [
        {"slug": "pull-up", "name_fr": "Traction", "sets": 4, "reps": "max", "rest_sec": 120},
        {"slug": "bent-over-row", "name_fr": "Rowing barre penché", "sets": 3, "reps": "8-10", "rest_sec": 90},
        {"slug": "lat-pulldown", "name_fr": "Tirage poulie haute", "sets": 3, "reps": "10-12", "rest_sec": 90},
        {"slug": "seated-row", "name_fr": "Rowing assis câble", "sets": 3, "reps": "12", "rest_sec": 75},
        {"slug": "barbell-curl", "name_fr": "Curl barre", "sets": 3, "reps": "10", "rest_sec": 75},
        {"slug": "incline-dumbbell-curl", "name_fr": "Curl haltère incliné", "sets": 3, "reps": "10", "rest_sec": 60}
      ]
    },
    {
      "name": "Legs",
      "exercises": [
        {"slug": "squat", "name_fr": "Squat barre", "sets": 4, "reps": "6-10", "rest_sec": 150},
        {"slug": "romanian-deadlift", "name_fr": "Soulevé roumain", "sets": 3, "reps": "8-10", "rest_sec": 120},
        {"slug": "leg-press", "name_fr": "Presse à cuisses", "sets": 3, "reps": "12", "rest_sec": 90},
        {"slug": "leg-curl", "name_fr": "Leg Curl", "sets": 3, "reps": "12", "rest_sec": 75},
        {"slug": "leg-extension", "name_fr": "Leg Extension", "sets": 3, "reps": "15", "rest_sec": 60},
        {"slug": "calf-raise", "name_fr": "Mollets debout", "sets": 4, "reps": "15-20", "rest_sec": 45}
      ]
    }
  ]
}'::jsonb WHERE slug = 'ppl-3x';

-- Starting Strength
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Workout A",
      "exercises": [
        {"slug": "squat", "name_fr": "Squat barre", "sets": 3, "reps": "5", "rest_sec": 180, "note": "+2.5kg à chaque séance"},
        {"slug": "bench-press", "name_fr": "Développé couché", "sets": 3, "reps": "5", "rest_sec": 150, "note": "+2.5kg à chaque séance"},
        {"slug": "deadlift", "name_fr": "Soulevé de terre", "sets": 1, "reps": "5", "rest_sec": 180, "note": "+5kg à chaque séance"}
      ]
    },
    {
      "name": "Workout B",
      "exercises": [
        {"slug": "squat", "name_fr": "Squat barre", "sets": 3, "reps": "5", "rest_sec": 180, "note": "+2.5kg à chaque séance"},
        {"slug": "overhead-press", "name_fr": "Développé militaire", "sets": 3, "reps": "5", "rest_sec": 150, "note": "+2.5kg à chaque séance"},
        {"slug": "bent-over-row", "name_fr": "Rowing barre penché", "sets": 3, "reps": "5", "rest_sec": 150, "note": "+2.5kg à chaque séance"}
      ]
    },
    {
      "name": "Workout A",
      "exercises": [
        {"slug": "squat", "name_fr": "Squat barre", "sets": 3, "reps": "5", "rest_sec": 180},
        {"slug": "bench-press", "name_fr": "Développé couché", "sets": 3, "reps": "5", "rest_sec": 150},
        {"slug": "deadlift", "name_fr": "Soulevé de terre", "sets": 1, "reps": "5", "rest_sec": 180}
      ]
    }
  ]
}'::jsonb WHERE slug = 'starting-strength';

-- Full Body 3x
UPDATE programs SET structure = '{
  "days": [
    {
      "name": "Full Body A",
      "exercises": [
        {"slug": "squat", "name_fr": "Squat barre", "sets": 3, "reps": "8", "rest_sec": 120},
        {"slug": "bench-press", "name_fr": "Développé couché", "sets": 3, "reps": "8", "rest_sec": 120},
        {"slug": "bent-over-row", "name_fr": "Rowing barre penché", "sets": 3, "reps": "8", "rest_sec": 90},
        {"slug": "overhead-press-dumbbells", "name_fr": "Développé épaules", "sets": 2, "reps": "10", "rest_sec": 90},
        {"slug": "plank", "name_fr": "Planche", "sets": 3, "reps": "30 sec", "rest_sec": 45}
      ]
    },
    {
      "name": "Full Body B",
      "exercises": [
        {"slug": "deadlift", "name_fr": "Soulevé de terre", "sets": 3, "reps": "5", "rest_sec": 150},
        {"slug": "incline-dumbbell-press", "name_fr": "Développé incliné", "sets": 3, "reps": "10", "rest_sec": 90},
        {"slug": "lat-pulldown", "name_fr": "Tirage poulie haute", "sets": 3, "reps": "10", "rest_sec": 90},
        {"slug": "dumbbell-lateral-raise", "name_fr": "Élévation latérale", "sets": 3, "reps": "12", "rest_sec": 60},
        {"slug": "bicycle-crunch", "name_fr": "Crunch vélo", "sets": 3, "reps": "20", "rest_sec": 45}
      ]
    },
    {
      "name": "Full Body A",
      "exercises": [
        {"slug": "squat", "name_fr": "Squat barre", "sets": 3, "reps": "8", "rest_sec": 120},
        {"slug": "bench-press", "name_fr": "Développé couché", "sets": 3, "reps": "8", "rest_sec": 120},
        {"slug": "bent-over-row", "name_fr": "Rowing barre penché", "sets": 3, "reps": "8", "rest_sec": 90},
        {"slug": "overhead-press-dumbbells", "name_fr": "Développé épaules", "sets": 2, "reps": "10", "rest_sec": 90},
        {"slug": "plank", "name_fr": "Planche", "sets": 3, "reps": "30 sec", "rest_sec": 45}
      ]
    }
  ]
}'::jsonb WHERE slug = 'full-body-3x';
