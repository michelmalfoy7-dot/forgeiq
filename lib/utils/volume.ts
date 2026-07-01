// Mapping clé muscle Supabase → groupe normalisé affiché
export const MUSCLE_GROUPS: Record<string, string> = {
  chest:      'Poitrine',
  lats:       'Dos',
  mid_back:   'Dos',
  upper_back: 'Dos',
  lower_back: 'Dos',
  traps:      'Dos',
  front_delt: 'Épaules',
  side_delt:  'Épaules',
  rear_delt:  'Épaules',
  biceps:     'Biceps',
  triceps:    'Triceps',
  forearms:   'Avant-bras',
  quads:      'Jambes',
  hamstrings: 'Jambes',
  glutes:     'Fessiers',
  calves:     'Mollets',
  abs:        'Abdos',
  core:       'Abdos',
  obliques:   'Abdos',
}

// Seuils sets/semaine par groupe musculaire (science-based — Dr. Mike Israetel / RP)
// MEV = Minimum Effective Volume  |  MAV = Maximum Adaptive Volume
export const VOLUME_TARGETS: Record<string, { mev: number; mav: number }> = {
  Poitrine:    { mev: 10, mav: 18 },
  Dos:         { mev: 10, mav: 20 },
  Épaules:     { mev: 8,  mav: 16 },
  Biceps:      { mev: 6,  mav: 14 },
  Triceps:     { mev: 6,  mav: 14 },
  'Avant-bras':{ mev: 0,  mav: 10 },
  Jambes:      { mev: 10, mav: 20 },
  Fessiers:    { mev: 6,  mav: 16 },
  Mollets:     { mev: 6,  mav: 14 },
  Abdos:       { mev: 6,  mav: 16 },
}

export type MuscleVolume = {
  muscle: string
  sets: number
  mev: number
  mav: number
  status: 'low' | 'optimal' | 'high'  // sous MEV / dans MEV-MAV / au-delà MAV
}

/**
 * Classe le volume hebdomadaire d'un groupe musculaire :
 *  - 'high'    : ≥ MAV (au-delà du volume adaptatif max — surveiller le surentraînement)
 *  - 'optimal' : entre MEV et MAV (zone de progression)
 *  - 'low'     : sous le MEV (volume insuffisant pour stimuler)
 */
export function classifyVolumeStatus(sets: number, mev: number, mav: number): MuscleVolume['status'] {
  return sets >= mav ? 'high' : sets >= mev ? 'optimal' : 'low'
}
