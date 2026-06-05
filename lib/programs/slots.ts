// ═══════════════════════════════════════════════════════════════════════
// Mapping slot → exercices réels selon équipement salle
// Utilisé par le générateur IA pour résoudre les slots en vrais slugs
// Priorité : by_feature[feature] → by_tier[tier]
// ═══════════════════════════════════════════════════════════════════════

export type TierKey = 'premium' | 'standard' | 'home'

export interface ExerciseOption {
  slug: string
  name_fr: string
}

export interface SlotDefinition {
  label: string
  by_feature?: Partial<Record<string, ExerciseOption>>
  by_tier: Record<TierKey, ExerciseOption>
}

export const SLOT_MAP: Record<string, SlotDefinition> = {
  // ── PECTORAL ────────────────────────────────────────────────────────────────
  chest_horizontal: {
    label: 'Développé horizontal',
    by_feature: {
      hammer_strength: { slug: 'machine-chest-press', name_fr: 'Chest Press Hammer Strength' },
      technogym:       { slug: 'machine-chest-press', name_fr: 'Chest Press Technogym' },
      life_fitness:    { slug: 'machine-chest-press', name_fr: 'Chest Press Life Fitness' },
      plate_loaded:    { slug: 'barbell-bench-press', name_fr: 'Développé couché barre' },
      dumbbells:       { slug: 'dumbbell-bench-press', name_fr: 'Développé couché haltères' },
    },
    by_tier: {
      premium:  { slug: 'machine-chest-press',  name_fr: 'Chest Press machine' },
      standard: { slug: 'machine-chest-press',  name_fr: 'Chest Press machine' },
      home:     { slug: 'dumbbell-bench-press', name_fr: 'Développé couché haltères' },
    },
  },
  chest_incline: {
    label: 'Développé incliné',
    by_feature: {
      hammer_strength: { slug: 'developpe-incline-hammer-strength', name_fr: 'Développé Incliné Hammer Strength' },
      technogym:       { slug: 'incline-barbell-bench-press', name_fr: 'Développé Incliné Technogym' },
      life_fitness:    { slug: 'incline-barbell-bench-press', name_fr: 'Développé Incliné Life Fitness' },
      cable_station:   { slug: 'incline-barbell-bench-press', name_fr: 'Développé Incliné Haltères' },
      plate_loaded:    { slug: 'incline-barbell-bench-press', name_fr: 'Développé Incliné Barre' },
      dumbbells:       { slug: 'incline-barbell-bench-press', name_fr: 'Développé Incliné Haltères' },
    },
    by_tier: {
      premium:  { slug: 'developpe-incline-hammer-strength', name_fr: 'Développé incliné machine' },
      standard: { slug: 'incline-barbell-bench-press',       name_fr: 'Développé incliné haltères' },
      home:     { slug: 'incline-barbell-bench-press',       name_fr: 'Développé incliné haltères' },
    },
  },
  chest_fly: {
    label: 'Écarté pectoral',
    by_feature: {
      hammer_strength:    { slug: 'pec-deck',       name_fr: 'Butterfly Hammer Strength' },
      technogym:          { slug: 'pec-deck',       name_fr: 'Butterfly Technogym' },
      life_fitness:       { slug: 'pec-deck',       name_fr: 'Butterfly Life Fitness' },
      cable_station:      { slug: 'cable-crossover', name_fr: 'Écarté Câble' },
      functional_trainer: { slug: 'cable-crossover', name_fr: 'Écarté Câble' },
      dumbbells:          { slug: 'dumbbell-fly',   name_fr: 'Écarté Haltères' },
    },
    by_tier: {
      premium:  { slug: 'pec-deck',       name_fr: 'Butterfly machine' },
      standard: { slug: 'cable-crossover', name_fr: 'Écarté câble' },
      home:     { slug: 'dumbbell-fly',   name_fr: 'Écarté haltères' },
    },
  },

  // ── DOS ─────────────────────────────────────────────────────────────────────
  back_vertical_pull: {
    label: 'Tirage vertical',
    by_tier: {
      premium:  { slug: 'lat-pulldown', name_fr: 'Tirage vertical poulie' },
      standard: { slug: 'lat-pulldown', name_fr: 'Tirage vertical poulie' },
      home:     { slug: 'pull-up',      name_fr: 'Traction pronation' },
    },
  },
  back_horizontal_row: {
    label: 'Rowing horizontal',
    by_feature: {
      hammer_strength:    { slug: 'rowing-iso-lateral-hammer-strength', name_fr: 'Rowing ISO-Latéral Hammer Strength' },
      technogym:          { slug: 'chest-supported-row', name_fr: 'Rowing Soutenu Technogym' },
      life_fitness:       { slug: 'chest-supported-row', name_fr: 'Rowing Soutenu Life Fitness' },
      cable_station:      { slug: 'seated-cable-row',   name_fr: 'Rowing Horizontal Câble' },
      functional_trainer: { slug: 'seated-cable-row',   name_fr: 'Rowing Câble' },
      plate_loaded:       { slug: 'barbell-row',        name_fr: 'Rowing Barre' },
      dumbbells:          { slug: 'dumbbell-row',       name_fr: 'Rowing Haltère' },
    },
    by_tier: {
      premium:  { slug: 'rowing-iso-lateral-hammer-strength', name_fr: 'Rowing machine' },
      standard: { slug: 'seated-cable-row',                   name_fr: 'Rowing câble' },
      home:     { slug: 'dumbbell-row',                       name_fr: 'Rowing haltère' },
    },
  },
  back_chest_supported: {
    label: 'Rowing soutenu poitrine',
    by_feature: {
      hammer_strength: { slug: 'chest-supported-row', name_fr: 'Rowing Soutenu Poitrine' },
      technogym:       { slug: 'chest-supported-row', name_fr: 'Rowing Soutenu Technogym' },
      life_fitness:    { slug: 'chest-supported-row', name_fr: 'Rowing Soutenu Life Fitness' },
      cable_station:   { slug: 'seated-cable-row',    name_fr: 'Rowing Câble Secondaire' },
      plate_loaded:    { slug: 'dumbbell-row',        name_fr: 'Rowing Haltère Incliné' },
    },
    by_tier: {
      premium:  { slug: 'chest-supported-row', name_fr: 'Rowing soutenu poitrine' },
      standard: { slug: 'chest-supported-row', name_fr: 'Rowing soutenu poitrine' },
      home:     { slug: 'dumbbell-row',        name_fr: 'Rowing haltère incliné' },
    },
  },
  back_isolation: {
    label: 'Isolation grand dorsal',
    by_feature: {
      cable_station:      { slug: 'straight-arm-pulldown', name_fr: 'Tirage Bras Tendus Câble' },
      functional_trainer: { slug: 'straight-arm-pulldown', name_fr: 'Tirage Bras Tendus Câble' },
      dumbbells:          { slug: 'dumbbell-pullover',     name_fr: 'Pullover Haltère' },
    },
    by_tier: {
      premium:  { slug: 'straight-arm-pulldown', name_fr: 'Tirage bras tendus câble' },
      standard: { slug: 'straight-arm-pulldown', name_fr: 'Tirage bras tendus câble' },
      home:     { slug: 'dumbbell-pullover',     name_fr: 'Pullover haltère' },
    },
  },

  // ── ÉPAULES ─────────────────────────────────────────────────────────────────
  shoulder_press: {
    label: 'Press épaules',
    by_feature: {
      hammer_strength: { slug: 'machine-shoulder-press',  name_fr: 'Press Épaules Hammer Strength' },
      technogym:       { slug: 'machine-shoulder-press',  name_fr: 'Press Épaules Technogym' },
      life_fitness:    { slug: 'machine-shoulder-press',  name_fr: 'Press Épaules Life Fitness' },
      plate_loaded:    { slug: 'barbell-overhead-press',  name_fr: 'Press Militaire Barre' },
      dumbbells:       { slug: 'dumbbell-shoulder-press', name_fr: 'Développé Épaules Haltères' },
    },
    by_tier: {
      premium:  { slug: 'machine-shoulder-press',  name_fr: 'Press Épaules machine' },
      standard: { slug: 'machine-shoulder-press',  name_fr: 'Press Épaules machine' },
      home:     { slug: 'dumbbell-shoulder-press', name_fr: 'Développé épaules haltères' },
    },
  },
  delt_lateral: {
    label: 'Élévations latérales',
    by_feature: {
      cable_station:      { slug: 'cable-lateral-raise', name_fr: 'Élévations Latérales Câble' },
      functional_trainer: { slug: 'cable-lateral-raise', name_fr: 'Élévations Latérales Câble' },
      dumbbells:          { slug: 'lateral-raise',       name_fr: 'Élévations Latérales Haltères' },
    },
    by_tier: {
      premium:  { slug: 'cable-lateral-raise', name_fr: 'Élévations latérales câble' },
      standard: { slug: 'cable-lateral-raise', name_fr: 'Élévations latérales câble' },
      home:     { slug: 'lateral-raise',       name_fr: 'Élévations latérales haltères' },
    },
  },
  delt_rear: {
    label: 'Delt postérieur',
    by_feature: {
      cable_station:      { slug: 'face-pull',     name_fr: 'Face Pull Câble' },
      functional_trainer: { slug: 'face-pull',     name_fr: 'Face Pull Câble' },
      dumbbells:          { slug: 'rear-delt-fly', name_fr: 'Oiseau Haltères Incliné' },
    },
    by_tier: {
      premium:  { slug: 'face-pull',     name_fr: 'Face Pull câble' },
      standard: { slug: 'face-pull',     name_fr: 'Face Pull câble' },
      home:     { slug: 'rear-delt-fly', name_fr: 'Oiseau haltères' },
    },
  },

  // ── TRICEPS ─────────────────────────────────────────────────────────────────
  tricep_pushdown: {
    label: 'Extension triceps poulie',
    by_feature: {
      cable_station:      { slug: 'tricep-pushdown', name_fr: 'Extension Triceps Poulie' },
      functional_trainer: { slug: 'tricep-pushdown', name_fr: 'Extension Triceps Câble' },
      dumbbells:          { slug: 'skull-crusher',   name_fr: 'Barre au Front Haltères' },
    },
    by_tier: {
      premium:  { slug: 'tricep-pushdown', name_fr: 'Extension triceps poulie' },
      standard: { slug: 'tricep-pushdown', name_fr: 'Extension triceps poulie' },
      home:     { slug: 'skull-crusher',   name_fr: 'Barre au front haltères' },
    },
  },
  tricep_isolation: {
    label: 'Extension triceps tête',
    by_feature: {
      cable_station:      { slug: 'cable-overhead-tricep-extension', name_fr: 'Extension Triceps Tête Câble' },
      functional_trainer: { slug: 'cable-overhead-tricep-extension', name_fr: 'Extension Triceps Tête Câble' },
      dumbbells:          { slug: 'skull-crusher',                   name_fr: 'Barre au Front Haltères' },
    },
    by_tier: {
      premium:  { slug: 'cable-overhead-tricep-extension', name_fr: 'Extension triceps tête câble' },
      standard: { slug: 'cable-overhead-tricep-extension', name_fr: 'Extension triceps tête câble' },
      home:     { slug: 'skull-crusher',                   name_fr: 'Barre au front haltères' },
    },
  },

  // ── BICEPS ──────────────────────────────────────────────────────────────────
  bicep_compound: {
    label: 'Curl composé',
    by_feature: {
      hammer_strength:    { slug: 'preacher-curl', name_fr: 'Curl Pupitre' },
      cable_station:      { slug: 'barbell-curl',  name_fr: 'Curl Barre Câble' },
      functional_trainer: { slug: 'barbell-curl',  name_fr: 'Curl Câble' },
      plate_loaded:       { slug: 'barbell-curl',  name_fr: 'Curl Barre' },
      dumbbells:          { slug: 'dumbbell-curl', name_fr: 'Curl Haltères Alternés' },
    },
    by_tier: {
      premium:  { slug: 'barbell-curl',  name_fr: 'Curl barre' },
      standard: { slug: 'barbell-curl',  name_fr: 'Curl barre' },
      home:     { slug: 'dumbbell-curl', name_fr: 'Curl haltères alternés' },
    },
  },
  bicep_isolation: {
    label: 'Curl isolation',
    by_feature: {
      hammer_strength:    { slug: 'preacher-curl',     name_fr: 'Curl Pupitre' },
      cable_station:      { slug: 'cable-hammer-curl', name_fr: 'Curl Marteau Câble' },
      functional_trainer: { slug: 'cable-hammer-curl', name_fr: 'Curl Marteau Câble' },
      dumbbells:          { slug: 'hammer-curl',       name_fr: 'Curl Marteau Haltères' },
    },
    by_tier: {
      premium:  { slug: 'cable-hammer-curl', name_fr: 'Curl marteau câble' },
      standard: { slug: 'cable-hammer-curl', name_fr: 'Curl marteau câble' },
      home:     { slug: 'hammer-curl',       name_fr: 'Curl marteau haltères' },
    },
  },

  // ── JAMBES ──────────────────────────────────────────────────────────────────
  legs_squat: {
    label: 'Squat',
    by_tier: {
      premium:  { slug: 'barbell-back-squat', name_fr: 'Squat barre' },
      standard: { slug: 'barbell-back-squat', name_fr: 'Squat barre' },
      home:     { slug: 'goblet-squat',       name_fr: 'Goblet Squat haltère' },
    },
  },
  legs_press: {
    label: 'Presse à cuisses',
    by_tier: {
      premium:  { slug: 'leg-press',            name_fr: 'Leg Press' },
      standard: { slug: 'leg-press',            name_fr: 'Leg Press' },
      home:     { slug: 'bulgarian-split-squat', name_fr: 'Fente bulgare haltères' },
    },
  },
  quad_isolation: {
    label: 'Extension jambes',
    by_tier: {
      premium:  { slug: 'leg-extension', name_fr: 'Extension jambes machine' },
      standard: { slug: 'leg-extension', name_fr: 'Extension jambes machine' },
      home:     { slug: 'wall-sit',      name_fr: 'Isométrie murale' },
    },
  },
  hamstring_hip_hinge: {
    label: 'Charnière hanches (RDL)',
    by_tier: {
      premium:  { slug: 'romanian-deadlift', name_fr: 'Soulevé de terre jambes tendues' },
      standard: { slug: 'romanian-deadlift', name_fr: 'Soulevé de terre jambes tendues' },
      home:     { slug: 'romanian-deadlift', name_fr: 'SDT jambes tendues haltères' },
    },
  },
  hamstring_isolation: {
    label: 'Leg curl',
    by_tier: {
      premium:  { slug: 'leg-curl',   name_fr: 'Leg Curl allongé' },
      standard: { slug: 'leg-curl',   name_fr: 'Leg Curl allongé' },
      home:     { slug: 'nordic-curl', name_fr: 'Nordic Hamstring Curl' },
    },
  },
  glute_thrust: {
    label: 'Hip Thrust',
    by_tier: {
      premium:  { slug: 'barbell-hip-thrust', name_fr: 'Hip Thrust barre' },
      standard: { slug: 'barbell-hip-thrust', name_fr: 'Hip Thrust barre' },
      home:     { slug: 'barbell-hip-thrust', name_fr: 'Hip Thrust haltère' },
    },
  },
  legs_unilateral: {
    label: 'Unilatéral jambes',
    by_tier: {
      premium:  { slug: 'bulgarian-split-squat', name_fr: 'Fente bulgare haltères' },
      standard: { slug: 'bulgarian-split-squat', name_fr: 'Fente bulgare haltères' },
      home:     { slug: 'bulgarian-split-squat', name_fr: 'Fente bulgare haltères' },
    },
  },
  glute_abduction: {
    label: 'Abduction fessiers',
    by_feature: {
      cable_station:      { slug: 'cable-hip-abduction',  name_fr: 'Abduction Câble Debout' },
      functional_trainer: { slug: 'cable-hip-abduction',  name_fr: 'Abduction Câble' },
      plate_loaded:       { slug: 'hip-abduction-machine', name_fr: 'Abduction Machine' },
    },
    by_tier: {
      premium:  { slug: 'cable-hip-abduction',  name_fr: 'Abduction câble debout' },
      standard: { slug: 'hip-abduction-machine', name_fr: 'Abduction machine' },
      home:     { slug: 'clamshell',            name_fr: 'Palourde élastique' },
    },
  },

  // ── MOLLETS ─────────────────────────────────────────────────────────────────
  calf_raise: {
    label: 'Mollets debout',
    by_tier: {
      premium:  { slug: 'calf-raise', name_fr: 'Mollets debout machine' },
      standard: { slug: 'calf-raise', name_fr: 'Mollets debout machine' },
      home:     { slug: 'calf-raise', name_fr: 'Mollets debout marche' },
    },
  },
  calf_raise_seated: {
    label: 'Mollets assis',
    by_tier: {
      premium:  { slug: 'seated-calf-raise-machine', name_fr: 'Mollets assis machine' },
      standard: { slug: 'seated-calf-raise-machine', name_fr: 'Mollets assis machine' },
      home:     { slug: 'calf-raise',                name_fr: 'Mollets debout marche' },
    },
  },

  // ── CORE ────────────────────────────────────────────────────────────────────
  core_plank: {
    label: 'Planche',
    by_tier: {
      premium:  { slug: 'plank', name_fr: 'Planche abdominale' },
      standard: { slug: 'plank', name_fr: 'Planche abdominale' },
      home:     { slug: 'plank', name_fr: 'Planche abdominale' },
    },
  },
  core_crunch: {
    label: 'Crunch',
    by_feature: {
      cable_station:      { slug: 'cable-crunch', name_fr: 'Crunch Câble' },
      functional_trainer: { slug: 'cable-crunch', name_fr: 'Crunch Câble' },
    },
    by_tier: {
      premium:  { slug: 'cable-crunch', name_fr: 'Crunch câble' },
      standard: { slug: 'cable-crunch', name_fr: 'Crunch câble' },
      home:     { slug: 'crunch',       name_fr: 'Crunch au sol' },
    },
  },
}

/**
 * Résout un slot en exercice concret selon l'équipement de la salle.
 * Cascade : by_feature[features[i]] → by_tier[tier] → by_tier.standard
 */
export function resolveSlot(
  slot: string,
  tier: TierKey | null,
  gymFeatures: string[] | null
): ExerciseOption {
  const def = SLOT_MAP[slot]
  if (!def) return { slug: slot, name_fr: slot }

  if (def.by_feature && gymFeatures && gymFeatures.length > 0) {
    for (const feature of gymFeatures) {
      const match = def.by_feature[feature]
      if (match) return match
    }
  }

  const key = tier ?? 'standard'
  return def.by_tier[key] ?? def.by_tier.standard
}

/** Liste des noms de slots valides pour le prompt Haiku */
export const VALID_SLOTS = Object.keys(SLOT_MAP)

/** Recommandation de split selon nombre de jours */
export const SPLIT_BY_DAYS: Record<number, string> = {
  3: 'full_body — 3 séances Full Body A/B/A (corps entier, alternance)',
  4: 'upper_lower — 2 Upper Body + 2 Lower Body',
  5: 'upper_lower_plus — 2 Upper + 2 Lower + 1 Full Body léger',
  6: 'ppl — Push A / Pull A / Legs A / Push B / Pull B / Legs B',
}

/** Volume cible par muscle selon niveau (sets/semaine) */
export const MEV_MRV: Record<string, Record<string, string>> = {
  beginner: {
    chest: '8-12', back: '10-14', shoulders: '8-12',
    legs: '10-14', arms: '6-10', core: '6-10',
  },
  intermediate: {
    chest: '10-16', back: '12-18', shoulders: '10-16',
    legs: '12-18', arms: '8-14', core: '8-12',
  },
  advanced: {
    chest: '12-20', back: '14-22', shoulders: '12-20',
    legs: '14-22', arms: '10-18', core: '8-14',
  },
}
