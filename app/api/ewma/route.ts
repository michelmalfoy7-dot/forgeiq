import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculateEWMA } from '@/lib/utils/ewma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { weight_kg, log_date } = await request.json()

    if (!weight_kg || !log_date) {
      return NextResponse.json({ data: null, error: 'weight_kg et log_date requis' }, { status: 400 })
    }
    if (typeof weight_kg !== 'number' || weight_kg < 20 || weight_kg > 500) {
      return NextResponse.json({ data: null, error: 'Poids invalide' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Récupérer le dernier trend connu (.maybeSingle évite l'erreur PGRST116 si aucun log)
    const { data: lastLog } = await supabase
      .from('daily_logs')
      .select('weight_trend')
      .eq('user_id', user.id)
      .lt('log_date', log_date)
      .not('weight_trend', 'is', null)
      .order('log_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const previousTrend = lastLog?.weight_trend ?? null
    const weight_trend = calculateEWMA(previousTrend, weight_kg)

    return NextResponse.json({ data: { weight_trend: Math.round(weight_trend * 100) / 100 }, error: null })
  } catch (e) {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
