/**
 * Big 5 — catégorisation des PRs par mouvement fondamental
 * Approche science-based (Jeff Nippard, Eric Helms, RP Strength) :
 * 5 patterns de mouvement couvrant 95% des adaptations neuromusculaires.
 */

export type Big5Category = {
  id: string
  label: string        // label FR affiché
  sublabel: string     // ex: "Squat · Presse · Fente"
  emoji: string
  color: string
}

export type Big5PR = Big5Category & {
  value: number | null       // poids en kg
  exerciseName: string | null
}

type RawPR = {
  value: number
  exercise_name: string
  exercises_library?: { name: string; name_fr: string | null } | null
}

// Chaque catégorie = un pattern de mouvement, PAS un exercice spécifique.
// Barre, haltères, câble, machine → tous équivalents dans leur pattern.
// Chaque catégorie est testée dans l'ordre — first match wins.
const CATEGORIES: (Big5Category & { patterns: RegExp[] })[] = [
  {
    id: 'quad',
    label: 'Jambes',
    sublabel: 'Squat · Presse · Fente · Bulgarian',
    emoji: '🦵',
    color: 'var(--fiq-accent)',
    patterns: [
      /squat/i,
      /leg press/i, /presse.?jambe/i, /presse à jambe/i, /leg.?press/i,
      /hack squat/i,
      /goblet/i,
      /fente/i, /lunge/i, /bulgarian/i, /split squat/i,
      /pistol/i,
      /sissy squat/i,
      /step.?up/i, /step up/i,
    ],
  },
  {
    id: 'hinge',
    label: 'Hanches',
    sublabel: 'Hip Thrust · Romanian · Deadlift',
    emoji: '⚡',
    color: 'var(--fiq-orange)',
    patterns: [
      /hip thrust/i, /hip hinge/i,
      /romanian/i, /roumain/i,
      /deadlift/i,
      /soulevé de terre/i, /soulevé/i, /\bsdt\b/i,
      /good morning/i,
      /stiff.?leg/i, /rdl/i,
      /trap bar/i, /hex bar/i,
      /glute bridge/i, /pont fessier/i,
    ],
  },
  {
    id: 'push_h',
    label: 'Push Pec',
    sublabel: 'Haltères · Câble · Barre · Dips',
    emoji: '💪',
    color: 'var(--fiq-blue)',
    patterns: [
      // Haltères (priorité car plus courant en hypertrophie)
      /incline dumbbell/i, /développé incliné haltère/i, /developpe incline haltere/i,
      /decline dumbbell/i, /développé décliné haltère/i,
      /dumbbell press/i, /haltère.*press/i, /press.*haltère/i,
      // Barre
      /bench press/i, /développé couché/i, /developpe couche/i,
      /incline press/i, /incliné/i,
      /décliné/i, /decline press/i,
      // Câble & machine
      /cable.*chest/i, /chest.*cable/i, /cable.*fly/i,
      /cable.*crossover/i, /croisé.?câble/i,
      /chest press/i, /pec deck/i,
      // Isolation pec
      /écarté/i, /\bfly\b/i, /\bflyes\b/i, /pec fly/i,
      // Dips
      /\bdips\b/i, /dips pectoraux/i,
    ],
  },
  {
    id: 'push_v',
    label: 'Push Épaules',
    sublabel: 'Haltères · Câble · Barre · Machine',
    emoji: '🏋️',
    color: '#A855F7',
    patterns: [
      // Haltères (très courant en hypertrophie épaules)
      /dumbbell shoulder/i, /shoulder.*dumbbell/i,
      /arnold/i,
      /développé militaire haltère/i, /haltère.*militaire/i,
      // Barre & OHP
      /overhead press/i, /\bohp\b/i,
      /shoulder press/i,
      /développé militaire/i, /developpe militaire/i, /militaire/i,
      /push press/i, /landmine press/i,
      // Machine & câble
      /machine.*shoulder/i, /shoulder.*machine/i,
      /cable.*shoulder/i, /cable.*press.*shoulder/i,
      /élévation latérale/i, /lateral raise/i, /élévation frontale/i,
    ],
  },
  {
    id: 'pull',
    label: 'Dos / Pull',
    sublabel: 'Câble · Haltères · Tractions · Machine',
    emoji: '🔙',
    color: '#F59E0B',
    patterns: [
      // Câble (très courant en hypertrophie dos)
      /rowing câble/i, /cable.*row/i, /row.*cable/i, /tirage.*câble/i, /câble.*tirage/i,
      /tirage horizontal/i, /tirage vertical/i,
      /lat pull/i, /pulldown/i, /pull.?down/i,
      // Haltères
      /dumbbell.*row/i, /row.*dumbbell/i, /haltère.*rowing/i,
      /rowing.*haltère/i, /rowing.*dumbbell/i,
      // Barre
      /barbell row/i, /pendlay/i, /rowing barre/i,
      // Machine
      /seated row/i, /rowing.*assis/i, /machine.*row/i,
      // Poids de corps
      /pull.?up/i, /pullup/i, /traction/i,
      // Générique
      /\brow\b/i, /rowing/i, /tirage/i,
    ],
  },
]

/**
 * Classe une liste de PRs dans les 5 catégories fondamentales.
 * Prend le meilleur PR (plus haute valeur) par catégorie.
 * Les PRs doivent être triés par value DESC avant l'appel.
 */
export function categorizeBig5(prs: RawPR[]): Big5PR[] {
  return CATEGORIES.map((cat) => {
    // Chercher le premier PR (donc le plus lourd) qui correspond à cette catégorie
    const match = prs.find((pr) => {
      const name =
        pr.exercises_library?.name_fr ??
        pr.exercises_library?.name ??
        pr.exercise_name
      return cat.patterns.some((pattern) => pattern.test(name))
    })

    return {
      id: cat.id,
      label: cat.label,
      sublabel: cat.sublabel,
      emoji: cat.emoji,
      color: cat.color,
      value: match?.value ?? null,
      exerciseName: match
        ? (match.exercises_library?.name_fr ??
           match.exercises_library?.name ??
           match.exercise_name)
        : null,
    }
  })
}
