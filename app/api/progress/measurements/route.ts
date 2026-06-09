import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — 2 dernières entrées (pour afficher + calculer tendance)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false })
      .limit(2)

    // Table absente → réponse vide gracieuse
    if (error) return NextResponse.json({ data: [], error: null })

    return NextResponse.json({ data: data ?? [], error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — upsert (une mesure par jour)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as Record<string, unknown>

    const measured_at = (body.measured_at as string) ?? new Date().toISOString().split('T')[0]

    // Nettoyer les valeurs : null si vide/0
    function clean(v: unknown): number | null {
      const n = Number(v)
      return isNaN(n) || n <= 0 ? null : Math.round(n * 10) / 10
    }

    const row = {
      user_id:        user.id,
      measured_at,
      body_fat_pct:   clean(body.body_fat_pct),
      chest_cm:       clean(body.chest_cm),
      waist_cm:       clean(body.waist_cm),
      hips_cm:        clean(body.hips_cm),
      shoulders_cm:   clean(body.shoulders_cm),
      neck_cm:        clean(body.neck_cm),
      left_arm_cm:    clean(body.left_arm_cm),
      right_arm_cm:   clean(body.right_arm_cm),
      left_thigh_cm:  clean(body.left_thigh_cm),
      right_thigh_cm: clean(body.right_thigh_cm),
      left_calf_cm:   clean(body.left_calf_cm),
      right_calf_cm:  clean(body.right_calf_cm),
      notes:          (body.notes as string)?.trim() || null,
    }

    const { data, error } = await supabase
      .from('body_measurements')
      .upsert(row, { onConflict: 'user_id,measured_at' })
      .select('*')
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
