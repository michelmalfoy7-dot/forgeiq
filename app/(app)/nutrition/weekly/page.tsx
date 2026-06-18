import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const DAY_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function dayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return DAY_FR[d.getDay()]
}

function MacroPill({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100))
  const over = value > target
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: 'var(--fiq-muted)' }}>{label}</p>
      <div className="h-1 rounded-full mb-1" style={{ background: 'var(--fiq-faint)' }}>
        <div
          className="h-1 rounded-full transition-all"
          style={{ width: `${pct}%`, background: over ? 'var(--fiq-red)' : color }}
        />
      </div>
      <p className="text-xs font-black tabular-nums" style={{ color: over ? 'var(--fiq-red)' : 'var(--fiq-text)' }}>
        {Math.round(value)}g
      </p>
    </div>
  )
}

export default async function NutritionWeeklyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]

  const [{ data: logs }, { data: profile }] = await Promise.all([
    supabase
      .from('food_logs')
      .select('log_date, calories, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id)
      .gte('log_date', sevenDaysAgo)
      .lte('log_date', today),
    supabase
      .from('profiles')
      .select('custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  // Agrégation par jour
  const byDay: Record<string, { calories: number; protein_g: number; carbs_g: number; fat_g: number }> = {}
  for (const log of logs ?? []) {
    if (!log.log_date) continue
    if (!byDay[log.log_date]) byDay[log.log_date] = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    byDay[log.log_date].calories  += log.calories  ?? 0
    byDay[log.log_date].protein_g += log.protein_g ?? 0
    byDay[log.log_date].carbs_g   += log.carbs_g   ?? 0
    byDay[log.log_date].fat_g     += log.fat_g     ?? 0
  }

  const days: { date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; logged: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    days.push({ date: d, ...(byDay[d] ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }), logged: !!byDay[d] })
  }

  const targetCal = profile?.custom_calories ?? 2000
  const targetProt = profile?.custom_protein_g ?? 150
  const targetCarbs = profile?.custom_carbs_g ?? 200
  const targetFat = profile?.custom_fat_g ?? 65

  const loggedDays = days.filter(d => d.logged)
  const avgCal = loggedDays.length ? Math.round(loggedDays.reduce((a, d) => a + d.calories, 0) / loggedDays.length) : 0
  const avgProt = loggedDays.length ? Math.round(loggedDays.reduce((a, d) => a + d.protein_g, 0) / loggedDays.length) : 0
  const daysOnTarget = loggedDays.filter(d => Math.abs(d.calories - targetCal) / targetCal < 0.1).length
  const maxCal = Math.max(targetCal * 1.2, ...days.map(d => d.calories))

  return (
    <div
      className="max-w-lg mx-auto px-4 space-y-4"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <Link
          href="/nutrition"
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
        >
          <ArrowLeft className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--fiq-muted)' }}>Nutrition</p>
          <h1 className="text-xl font-black leading-none" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            Bilan 7 jours
          </h1>
        </div>
      </div>

      {/* KPIs semaine */}
      <div className="grid grid-cols-3 gap-3">
        <div className="fiq-card text-center">
          <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>{avgCal}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>kcal/j moy.</p>
          <p className="text-[9px] mt-0.5 font-semibold" style={{ color: Math.abs(avgCal - targetCal) < targetCal * 0.1 ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }}>
            obj. {targetCal}
          </p>
        </div>
        <div className="fiq-card text-center">
          <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-blue)' }}>{avgProt}g</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>prot./j moy.</p>
          <p className="text-[9px] mt-0.5 font-semibold" style={{ color: avgProt >= targetProt ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }}>
            obj. {targetProt}g
          </p>
        </div>
        <div className="fiq-card text-center">
          <p className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-orange)' }}>{daysOnTarget}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>jours/7 cible</p>
          <p className="text-[9px] mt-0.5 font-semibold" style={{ color: 'var(--fiq-muted)' }}>
            ±10%
          </p>
        </div>
      </div>

      {/* Graphique barres calories */}
      <div className="fiq-card space-y-3">
        <p className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>Calories par jour</p>

        {/* Barres */}
        <div className="flex items-end gap-2 h-28">
          {days.map(d => {
            const h = d.logged ? Math.max(4, Math.round((d.calories / maxCal) * 112)) : 4
            const over = d.calories > targetCal * 1.1
            const under = d.logged && d.calories < targetCal * 0.9
            const isToday = d.date === today
            const color = !d.logged ? 'var(--fiq-faint)' : over ? 'var(--fiq-red)' : under ? 'var(--fiq-orange)' : 'var(--fiq-accent)'
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                {d.logged && (
                  <p className="text-[9px] tabular-nums font-bold" style={{ color: 'var(--fiq-muted)' }}>
                    {d.calories > 999 ? `${(d.calories / 1000).toFixed(1)}k` : d.calories}
                  </p>
                )}
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{ height: h, background: color, opacity: isToday ? 1 : 0.75 }}
                />
                <p
                  className="text-[10px] font-black"
                  style={{ color: isToday ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }}
                >
                  {dayLabel(d.date)}
                </p>
              </div>
            )
          })}
        </div>

        {/* Ligne objectif calorique */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 rounded" style={{ background: 'var(--fiq-muted)', opacity: 0.5 }} />
          <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>Objectif : {targetCal} kcal/j</p>
        </div>
      </div>

      {/* Détail par jour */}
      <div className="fiq-card space-y-4">
        <p className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>Détail par jour</p>
        {days.map(d => {
          const isToday = d.date === today
          return (
            <div key={d.date}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p
                    className="text-xs font-black w-8"
                    style={{ color: isToday ? 'var(--fiq-accent)' : 'var(--fiq-text)' }}
                  >
                    {dayLabel(d.date)}
                  </p>
                  {isToday && (
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                    >
                      Auj.
                    </span>
                  )}
                </div>
                {d.logged ? (
                  <p className="text-xs font-black tabular-nums" style={{ color: 'var(--fiq-text)' }}>
                    {Math.round(d.calories)} kcal
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Non loggé</p>
                )}
              </div>
              {d.logged && (
                <div className="flex gap-3">
                  <MacroPill label="Prot." value={d.protein_g} target={targetProt} color="var(--fiq-blue)" />
                  <MacroPill label="Gluc." value={d.carbs_g}   target={targetCarbs} color="var(--fiq-accent)" />
                  <MacroPill label="Lip."  value={d.fat_g}     target={targetFat}   color="var(--fiq-orange)" />
                </div>
              )}
              {d !== days[days.length - 1] && (
                <div className="mt-3" style={{ borderBottom: '1px solid var(--fiq-border)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* CTA vers journal */}
      <Link
        href="/nutrition"
        className="block w-full py-4 rounded-2xl text-center font-black text-sm"
        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
      >
        Voir le journal du jour →
      </Link>
    </div>
  )
}
