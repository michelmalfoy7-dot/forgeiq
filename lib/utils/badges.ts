export type Grade = {
  id: string
  label: string
  emoji: string
  minSessions: number
  color: string
}

export type Badge = {
  id: string
  emoji: string
  label: string
  description: string
  unlocked: boolean
}

export type BadgeStats = {
  totalSessions: number
  totalTonnageKg: number
  prCount: number
  checkinStreak: number
  trainingStreakWeeks: number
  challengeWins?: number
}

export const GRADES: Grade[] = [
  { id: 'rookie',    label: 'Rookie',    emoji: '🌱', minSessions: 0,   color: '#6B7280' },
  { id: 'aspirant',  label: 'Aspirant',  emoji: '⚡', minSessions: 5,   color: '#3D8BFF' },
  { id: 'athlete',   label: 'Athlète',   emoji: '🏋️', minSessions: 25,  color: '#B4FF4A' },
  { id: 'warrior',   label: 'Warrior',   emoji: '⚔️', minSessions: 75,  color: '#FF6B35' },
  { id: 'elite',     label: 'Élite',     emoji: '🔥', minSessions: 150, color: '#F59E0B' },
  { id: 'champion',  label: 'Champion',  emoji: '🏆', minSessions: 300, color: '#A78BFA' },
  { id: 'legende',   label: 'Légende',   emoji: '👑', minSessions: 500, color: '#EF4444' },
]

export function getCurrentGrade(totalSessions: number): Grade {
  return [...GRADES].reverse().find(g => totalSessions >= g.minSessions) ?? GRADES[0]
}

export function getNextGrade(totalSessions: number): Grade | null {
  return GRADES.find(g => g.minSessions > totalSessions) ?? null
}

export function computeBadges(stats: BadgeStats): Badge[] {
  const { totalSessions, totalTonnageKg, prCount, checkinStreak, trainingStreakWeeks, challengeWins = 0 } = stats

  return [
    // Séances
    {
      id: 'first_session',
      emoji: '🏋️',
      label: 'Première séance',
      description: 'Terminer ta 1ère séance',
      unlocked: totalSessions >= 1,
    },
    {
      id: 'sessions_50',
      emoji: '🎯',
      label: '50 séances',
      description: '50 séances terminées',
      unlocked: totalSessions >= 50,
    },
    {
      id: 'sessions_100',
      emoji: '💯',
      label: '100 séances',
      description: '100 séances terminées',
      unlocked: totalSessions >= 100,
    },
    {
      id: 'sessions_300',
      emoji: '🚀',
      label: '300 séances',
      description: '300 séances terminées',
      unlocked: totalSessions >= 300,
    },
    // Tonnage
    {
      id: 'tonnage_1t',
      emoji: '💰',
      label: '1 tonne',
      description: '1 000 kg soulevés au total',
      unlocked: totalTonnageKg >= 1000,
    },
    {
      id: 'tonnage_10t',
      emoji: '🏗️',
      label: '10 tonnes',
      description: '10 000 kg soulevés au total',
      unlocked: totalTonnageKg >= 10000,
    },
    {
      id: 'tonnage_100t',
      emoji: '🌍',
      label: '100 tonnes',
      description: '100 000 kg soulevés au total',
      unlocked: totalTonnageKg >= 100000,
    },
    // Records personnels
    {
      id: 'first_pr',
      emoji: '🏆',
      label: 'Premier PR',
      description: 'Établir ton 1er record personnel',
      unlocked: prCount >= 1,
    },
    {
      id: 'pr_10',
      emoji: '🥇',
      label: '10 PRs',
      description: '10 records personnels établis',
      unlocked: prCount >= 10,
    },
    {
      id: 'pr_25',
      emoji: '🌟',
      label: '25 PRs',
      description: '25 records personnels établis',
      unlocked: prCount >= 25,
    },
    // Streaks check-in
    {
      id: 'checkin_7',
      emoji: '🔥',
      label: 'Semaine parfaite',
      description: '7 jours de check-in consécutifs',
      unlocked: checkinStreak >= 7,
    },
    {
      id: 'checkin_30',
      emoji: '💪',
      label: 'Mois de feu',
      description: '30 jours de check-in consécutifs',
      unlocked: checkinStreak >= 30,
    },
    {
      id: 'checkin_100',
      emoji: '⚡',
      label: 'Centurion',
      description: '100 jours de check-in consécutifs',
      unlocked: checkinStreak >= 100,
    },
    // Streaks training
    {
      id: 'training_4w',
      emoji: '📅',
      label: '4 semaines',
      description: '4 semaines d\'entraînement consécutives',
      unlocked: trainingStreakWeeks >= 4,
    },
    {
      id: 'training_12w',
      emoji: '🗓️',
      label: 'Trimestre',
      description: '12 semaines d\'entraînement consécutives',
      unlocked: trainingStreakWeeks >= 12,
    },
    {
      id: 'training_52w',
      emoji: '🎖️',
      label: 'Année complète',
      description: '52 semaines d\'entraînement consécutives',
      unlocked: trainingStreakWeeks >= 52,
    },
    // Défis entre amis
    {
      id: 'challenge_win_1',
      emoji: '🏆',
      label: 'Challenger',
      description: 'Remporter ton 1er défi entre amis',
      unlocked: challengeWins >= 1,
    },
    {
      id: 'challenge_win_5',
      emoji: '👑',
      label: 'Domination',
      description: 'Remporter 5 défis entre amis',
      unlocked: challengeWins >= 5,
    },
  ]
}
