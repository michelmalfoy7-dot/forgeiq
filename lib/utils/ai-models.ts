/**
 * Constantes de modèles Anthropic — source unique de vérité.
 * Mettre à jour ici uniquement pour migrer tout le codebase.
 *
 * Règle : jamais hardcoder un nom de modèle dans les routes API.
 * Jamais utiliser Opus (coût prohibitif).
 */
export const AI_MODELS = {
  /** Coach IA — streaming, contexte complet utilisateur */
  coach:    'claude-sonnet-4-6',
  /** Génération de programmes personnalisés */
  programs: 'claude-sonnet-4-6',
  /** Analyse photo repas (vision) */
  photo:    'claude-haiku-4-5-20251001',
  /** Suggestions repas calibrées au budget */
  meals:    'claude-haiku-4-5-20251001',
  /** Bilan post-séance IA */
  summary:  'claude-haiku-4-5-20251001',
  /** Import URL aliment */
  import:   'claude-haiku-4-5-20251001',
  /** Alertes dashboard / suggestions séance (cachées 4h) */
  alerts:   'claude-haiku-4-5-20251001',
} as const

export type AiModelKey = keyof typeof AI_MODELS
