import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const raw = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const today = raw.log_date ?? new Date().toISOString().split('T')[0]

    // Whitelist stricte des colonnes autorisées — empêche l'injection de champs arbitraires
    const body = {
      log_date:           today,
      user_id:            user.id,
      weight_kg:          raw.weight_kg          ?? null,
      weight_trend:       raw.weight_trend        ?? null,
      sys_bp:             raw.sys_bp              ?? null,
      dia_bp:             raw.dia_bp              ?? null,
      steps:              raw.steps               ?? null,
      sleep_total_min:    raw.sleep_total_min     ?? null,
      sleep_deep_min:     raw.sleep_deep_min      ?? null,
      sleep_light_min:    raw.sleep_light_min     ?? null,
      sleep_rem_min:      raw.sleep_rem_min       ?? null,
      calories:           raw.calories            ?? null,
      protein_g:          raw.protein_g           ?? null,
      carbs_g:            raw.carbs_g             ?? null,
      fat_g:              raw.fat_g               ?? null,
      fatigue_score:      raw.fatigue_score       ?? null,
      motivation_score:   raw.motivation_score    ?? null,
      notes:              raw.notes               ?? null,
    }

    // Upsert : mise à jour si log du jour existe déjà
    const { data, error } = await supabase
      .from('daily_logs')
      .upsert(body, { onConflict: 'user_id,log_date' })
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    // ── Mise à jour streak check-in ──────────────────────────────
    const { data: prof } = await supabase
      .from('profiles')
      .select('checkin_streak, last_checkin_date')
      .eq('id', user.id)
      .single()

    if (prof) {
      const prev = prof.last_checkin_date
      const prevDate = prev ? new Date(prev + 'T12:00:00') : null
      const todayDate = new Date(today + 'T12:00:00')
      const diffDays = prevDate
        ? Math.round((todayDate.getTime() - prevDate.getTime()) / 86400000)
        : null

      let newStreak = 1
      if (diffDays === 0) {
        newStreak = prof.checkin_streak ?? 1     // même jour, pas de changement
      } else if (diffDays === 1) {
        newStreak = (prof.checkin_streak ?? 0) + 1  // jour consécutif
      }
      // diffDays > 1 ou null → reset à 1

      if (diffDays !== 0) {
        await supabase
          .from('profiles')
          .update({ checkin_streak: newStreak, last_checkin_date: today })
          .eq('id', user.id)
      }
    }

    // Invalider le cache du dashboard pour mise à jour immédiate après check-in
    revalidatePath('/dashboard')

    return NextResponse.json({ data, error: null })
  } catch (e) {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .single()

    return NextResponse.json({ data: data ?? null, error: error?.code === 'PGRST116' ? null : error?.message })
  } catch (e) {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
