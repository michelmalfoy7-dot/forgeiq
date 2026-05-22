import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Exponentially Weighted Moving Average — lisse les variations hydrique (+/-2kg)
// factor=0.1 → mémoire d'environ 10 jours
function calculateEWMA(previousTrend: number | null, currentWeight: number, factor = 0.1): number {
  if (!previousTrend) return currentWeight
  // Sanity check : si la tendance précédente est aberrante (>25% d'écart avec le poids actuel),
  // on repart du poids actuel pour éviter une convergence lente sur donnée corrompue
  const deviation = Math.abs(previousTrend - currentWeight) / currentWeight
  if (deviation > 0.25) return currentWeight
  return previousTrend + factor * (currentWeight - previousTrend)
}

export async function POST(request: Request) {
  try {
    const { weight_kg, log_date } = await request.json()

    if (!weight_kg || !log_date) {
      return NextResponse.json({ data: null, error: 'weight_kg et log_date requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Récupérer le dernier trend connu
    const { data: lastLog } = await supabase
      .from('daily_logs')
      .select('weight_trend')
      .eq('user_id', user.id)
      .lt('log_date', log_date)
      .order('log_date', { ascending: false })
      .limit(1)
      .single()

    const previousTrend = lastLog?.weight_trend ?? null
    const weight_trend = calculateEWMA(previousTrend, weight_kg)

    return NextResponse.json({ data: { weight_trend: Math.round(weight_trend * 100) / 100 }, error: null })
  } catch (e) {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
