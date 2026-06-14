'use client'

import { getCurrentGrade, getNextGrade, computeBadges } from '@/lib/utils/badges'
import type { BadgeStats } from '@/lib/utils/badges'

type Props = { stats: BadgeStats }

export function BadgesSection({ stats }: Props) {
  const grade    = getCurrentGrade(stats.totalSessions)
  const next     = getNextGrade(stats.totalSessions)
  const badges   = computeBadges(stats)
  const unlocked = badges.filter(b => b.unlocked)
  const locked   = badges.filter(b => !b.unlocked)

  const progress = next
    ? Math.min(100, Math.round(((stats.totalSessions - grade.minSessions) / (next.minSessions - grade.minSessions)) * 100))
    : 100

  return (
    <div className="space-y-4">
      {/* Grade actuel */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: grade.color + '22', border: `1px solid ${grade.color}44` }}
            >
              {grade.emoji}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--fiq-muted)' }}>
                Grade actuel
              </p>
              <p className="text-lg font-black" style={{ color: grade.color, letterSpacing: '-0.02em' }}>
                {grade.label}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
              {stats.totalSessions}
            </p>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--fiq-muted)' }}>séances</p>
          </div>
        </div>

        {/* Barre de progression vers le prochain grade */}
        {next && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px]" style={{ color: 'var(--fiq-muted)' }}>
                Prochain : <span className="font-black" style={{ color: next.color }}>{next.emoji} {next.label}</span>
              </p>
              <p className="text-[11px] font-black" style={{ color: 'var(--fiq-muted)' }}>
                {next.minSessions - stats.totalSessions} séances
              </p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--fiq-faint)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: grade.color }}
              />
            </div>
          </div>
        )}

        {!next && (
          <p className="text-xs font-black text-center py-1" style={{ color: grade.color }}>
            Grade maximum atteint 👑
          </p>
        )}
      </div>

      {/* Badges débloqués */}
      {unlocked.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase font-black tracking-widest px-1" style={{ color: 'var(--fiq-muted)' }}>
            Badges débloqués · {unlocked.length}/{badges.length}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {unlocked.map(badge => (
              <div
                key={badge.id}
                className="rounded-xl p-3 flex flex-col items-center gap-1.5 text-center"
                style={{ background: '#B4FF4A12', border: '1px solid #B4FF4A30' }}
              >
                <span style={{ fontSize: 24 }}>{badge.emoji}</span>
                <p className="text-[11px] font-black leading-tight" style={{ color: 'var(--fiq-text)' }}>
                  {badge.label}
                </p>
                <p className="text-[9px] leading-tight" style={{ color: 'var(--fiq-muted)' }}>
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges verrouillés */}
      {locked.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase font-black tracking-widest px-1" style={{ color: 'var(--fiq-muted)' }}>
            À débloquer
          </p>
          <div className="grid grid-cols-3 gap-2">
            {locked.map(badge => (
              <div
                key={badge.id}
                className="rounded-xl p-3 flex flex-col items-center gap-1.5 text-center opacity-40"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
              >
                <span style={{ fontSize: 24, filter: 'grayscale(1)' }}>{badge.emoji}</span>
                <p className="text-[11px] font-black leading-tight" style={{ color: 'var(--fiq-text)' }}>
                  {badge.label}
                </p>
                <p className="text-[9px] leading-tight" style={{ color: 'var(--fiq-muted)' }}>
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
