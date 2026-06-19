import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

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
        .select('custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g, goal, weight_kg')
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

    // Générer les 7 derniers jours (du plus ancien au plus récent)
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
      const totals = byDay[d] ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      days.push({ date: d, ...totals, logged: !!byDay[d] })
    }

    const targetCalories = profile?.custom_calories ?? 2000
    const targetProtein  = profile?.custom_protein_g ?? 150
    const targetCarbs    = profile?.custom_carbs_g   ?? 200
    const targetFat      = profile?.custom_fat_g     ?? 65

    // Stats semaine
    const loggedDays = days.filter(d => d.logged)
    const avgCalories = loggedDays.length
      ? Math.round(loggedDays.reduce((a, d) => a + d.calories, 0) / loggedDays.length)
      : 0
    const avgProtein = loggedDays.length
      ? Math.round(loggedDays.reduce((a, d) => a + d.protein_g, 0) / loggedDays.length)
      : 0
    const daysOnTarget = loggedDays.filter(
      d => targetCalories > 0 && Math.abs(d.calories - targetCalories) / targetCalories < 0.1
    ).length

    return NextResponse.json({
      data: {
        days,
        targets: { calories: targetCalories, protein_g: targetProtein, carbs_g: targetCarbs, fat_g: targetFat },
        stats: { avgCalories, avgProtein, daysOnTarget, loggedDays: loggedDays.length },
      },
      error: null,
    })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
