import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ChevronLeft, Trophy, Dumbbell, Flame, Calendar, Utensils, Scale, TrendingUp, TrendingDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────
interface YearData {
  year: number
  workouts: {
    total: number
    totalTonnage: number
    bestSession: { date: string; name: string; tonnage: number } | null
    topMuscle: string | null
    bestWeek: { weekLabel: string; tonnage: number } | null
  }
  streaks: { longestWeekStreak: number }
  exercises: {
    topExercise: { name: string; count: number } | null
    biggestPRGain: { name: string; start: number; end: number; gain: number } | null
  }
  nutrition: { daysLogged: number; avgProtein: number | null }
  checkins: {
    total: number
    weightStart: number | null
    weightEnd: number | null
    weightDelta: number | null
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function YearInForgePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const year = Number(params.year ?? currentYear)
  const displayYear = isNaN(year) ? currentYear : year

  // Fetch depuis l'API interne en passant les cookies de session
  let yearData: YearData | null = null
  try {
    const cookieStore = await cookies()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/progress/year?year=${displayYear}`, {
      cache: 'no-store',
      headers: {
        Cookie: cookieStore.toString(),
      },
    })
    const json = await res.json()
    if (json.data) yearData = json.data as YearData
  } catch {
    // Si le fetch échoue, on affiche la page vide sans crash
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR').format(n)

  const fmtKg = (n: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n)

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--bg)' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--fiq-border)' }}>
        <Link href="/progress" aria-label="Retour">
          <ChevronLeft size={22} style={{ color: 'var(--fiq-muted)' }} />
        </Link>
        <div>
          <p className="fiq-label" style={{ color: 'var(--fiq-muted)' }}>Récapitulatif</p>
          <h1 className="text-lg font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            Ton année {displayYear}
          </h1>
        </div>
        <Trophy size={20} className="ml-auto" style={{ color: 'var(--fiq-accent)' }} />
      </div>

      <div className="px-4 pt-6 max-w-[480px] mx-auto space-y-4">

        {/* Hero titre */}
        <div className="text-center py-4">
          <p className="text-5xl mb-2">🏆</p>
          <h2 className="text-2xl font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            Ton année {displayYear}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
            en chiffres
          </p>
        </div>

        {!yearData || yearData.workouts.total === 0 ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
          >
            <p className="text-3xl mb-3">🏋️</p>
            <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Aucune séance en {displayYear}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Les données apparaîtront après tes premières séances.
            </p>
          </div>
        ) : (
          <>
            {/* Card 1 — Tonnage total */}
            {yearData.workouts.totalTonnage > 0 && (
              <StatCard
                icon={<Dumbbell size={18} style={{ color: 'var(--fiq-accent)' }} />}
                label="Tu as soulevé"
                value={`${fmt(yearData.workouts.totalTonnage)} kg`}
                sub={`soit l'équivalent de ${fmt(Math.round(yearData.workouts.totalTonnage / 5000))} éléphants`}
              />
            )}

            {/* Card 2 — Séances */}
            {yearData.workouts.total > 0 && (
              <StatCard
                icon={<Calendar size={18} style={{ color: 'var(--fiq-blue)' }} />}
                label="Séances complétées"
                value={`${yearData.workouts.total} séances`}
                sub={`soit ${Math.round((yearData.workouts.total / 52) * 10) / 10} séances par semaine en moyenne`}
                accentColor="var(--fiq-blue)"
              />
            )}

            {/* Card 3 — Exercice signature */}
            {yearData.exercises.topExercise && (
              <StatCard
                icon={<span className="text-base">⭐</span>}
                label="Ton exercice signature"
                value={yearData.exercises.topExercise.name}
                sub={`réalisé ${fmt(yearData.exercises.topExercise.count)} fois cette année`}
                accentColor="var(--fiq-yellow)"
              />
            )}

            {/* Card 4 — Groupe musculaire dominant */}
            {yearData.workouts.topMuscle && (
              <StatCard
                icon={<span className="text-base">💪</span>}
                label="Muscle dominant"
                value={yearData.workouts.topMuscle}
                sub="le groupe musculaire le plus sollicité cette année"
                accentColor="var(--fiq-orange)"
              />
            )}

            {/* Card 5 — Meilleure semaine */}
            {yearData.workouts.bestWeek && (
              <StatCard
                icon={<Flame size={18} style={{ color: 'var(--fiq-orange)' }} />}
                label="Ta meilleure semaine"
                value={`semaine du ${yearData.workouts.bestWeek.weekLabel}`}
                sub={`${fmt(yearData.workouts.bestWeek.tonnage)} kg soulevés`}
                accentColor="var(--fiq-orange)"
              />
            )}

            {/* Card 6 — Streak */}
            {yearData.streaks.longestWeekStreak > 0 && (
              <StatCard
                icon={<Flame size={18} style={{ color: 'var(--fiq-red)' }} />}
                label="Plus long streak"
                value={`${yearData.streaks.longestWeekStreak} semaines d'affilée`}
                sub="la plus longue série d'entraînement consécutive"
                accentColor="var(--fiq-red)"
              />
            )}

            {/* Card 7 — Plus grande progression 1RM */}
            {yearData.exercises.biggestPRGain && (
              <StatCard
                icon={<TrendingUp size={18} style={{ color: 'var(--fiq-accent)' }} />}
                label="Plus grande progression"
                value={`+${fmtKg(yearData.exercises.biggestPRGain.gain)} kg`}
                sub={`${yearData.exercises.biggestPRGain.name} — de ${fmtKg(yearData.exercises.biggestPRGain.start)} à ${fmtKg(yearData.exercises.biggestPRGain.end)} kg`}
              />
            )}

            {/* Card 8 — Nutrition */}
            {yearData.nutrition.daysLogged > 0 && (
              <StatCard
                icon={<Utensils size={18} style={{ color: 'var(--fiq-blue)' }} />}
                label="Nutrition suivie"
                value={`${fmt(yearData.nutrition.daysLogged)} jours sur 365`}
                sub={
                  yearData.nutrition.avgProtein != null
                    ? `${yearData.nutrition.avgProtein} g de protéines/jour en moyenne`
                    : 'continue comme ça !'
                }
                accentColor="var(--fiq-blue)"
              />
            )}

            {/* Card 9 — Poids */}
            {yearData.checkins.weightDelta !== null && (
              <WeightCard
                weightStart={yearData.checkins.weightStart}
                weightEnd={yearData.checkins.weightEnd}
                weightDelta={yearData.checkins.weightDelta}
                totalCheckins={yearData.checkins.total}
                fmtKg={fmtKg}
                fmt={fmt}
              />
            )}

            {/* Footer */}
            <div
              className="rounded-2xl p-4 text-center mt-2"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
            >
              <p className="text-sm font-bold" style={{ color: 'var(--fiq-accent)' }}>
                Build smarter. Lift harder.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
                ForgeIQ · {displayYear}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Composants ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accentColor = 'var(--fiq-accent)',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accentColor?: string
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--fiq-muted)' }}>
          {label}
        </span>
      </div>
      <p
        className="text-4xl font-black leading-none"
        style={{ color: accentColor, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-sm mt-2 leading-snug" style={{ color: 'var(--fiq-muted)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function WeightCard({
  weightStart,
  weightEnd,
  weightDelta,
  totalCheckins,
  fmtKg,
  fmt,
}: {
  weightStart: number | null
  weightEnd: number | null
  weightDelta: number
  totalCheckins: number
  fmtKg: (n: number) => string
  fmt: (n: number) => string
}) {
  const isLoss = weightDelta < 0
  const isGain = weightDelta > 0

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Scale size={18} style={{ color: isLoss ? 'var(--fiq-accent)' : isGain ? 'var(--fiq-orange)' : 'var(--fiq-blue)' }} />
        <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--fiq-muted)' }}>
          Évolution du poids
        </span>
      </div>

      {weightStart !== null && weightEnd !== null && (
        <div className="flex items-center gap-3 mb-2">
          <div className="text-center">
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Janvier</p>
            <p className="text-xl font-black" style={{ color: 'var(--fiq-text)', fontVariantNumeric: 'tabular-nums' }}>
              {fmtKg(weightStart)} kg
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {isLoss
              ? <TrendingDown size={20} style={{ color: 'var(--fiq-accent)' }} />
              : <TrendingUp size={20} style={{ color: isGain ? 'var(--fiq-orange)' : 'var(--fiq-blue)' }} />
            }
          </div>
          <div className="text-center">
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Aujourd&apos;hui</p>
            <p className="text-xl font-black" style={{ color: 'var(--fiq-text)', fontVariantNumeric: 'tabular-nums' }}>
              {fmtKg(weightEnd)} kg
            </p>
          </div>
        </div>
      )}

      <p
        className="text-4xl font-black leading-none"
        style={{
          color: isLoss ? 'var(--fiq-accent)' : isGain ? 'var(--fiq-orange)' : 'var(--fiq-blue)',
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {isGain ? '+' : ''}{fmtKg(weightDelta)} kg
      </p>
      <p className="text-sm mt-2" style={{ color: 'var(--fiq-muted)' }}>
        {isLoss
          ? `perdu depuis janvier · ${fmt(totalCheckins)} check-ins`
          : isGain
          ? `pris depuis janvier · ${fmt(totalCheckins)} check-ins`
          : `poids stable cette année · ${fmt(totalCheckins)} check-ins`
        }
      </p>
    </div>
  )
}
