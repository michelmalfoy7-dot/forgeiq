import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calcChallengeValue, type ChallengeType } from '@/lib/utils/challenges'

export const dynamic = 'force-dynamic'

// POST /api/challenges/[id]/join — Rejoindre un challenge
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { data: challenge } = await supabase
      .from('challenges')
      .select('type, start_date, end_date')
      .eq('id', id)
      .maybeSingle()

    if (!challenge) {
      return NextResponse.json({ data: null, error: 'Challenge introuvable' }, { status: 404 })
    }

    // Refus si le challenge est déjà terminé
    const today = new Date().toISOString().split('T')[0]
    if ((challenge.end_date as string) < today) {
      return NextResponse.json({ data: null, error: 'Ce challenge est terminé' }, { status: 400 })
    }

    // Valeur déjà acquise sur la période (pour un départ équitable si rejoint en cours)
    const initValue = await calcChallengeValue(
      supabase,
      user.id,
      challenge.type as ChallengeType,
      challenge.start_date as string,
      challenge.end_date as string
    )

    const { error } = await supabase
      .from('challenge_participants')
      .insert({ challenge_id: id, user_id: user.id, current_value: initValue })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ data: { already_joined: true }, error: null })
      }
      return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: { joined: true, current_value: initValue }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
