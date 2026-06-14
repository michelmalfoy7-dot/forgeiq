import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calcChallengeValue, type ChallengeType } from '@/lib/utils/challenges'

export const dynamic = 'force-dynamic'

// GET /api/challenges — Challenges créés ou rejoints par l'utilisateur
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Participations du user (pour récupérer les valeurs courantes)
    const { data: participations } = await supabase
      .from('challenge_participants')
      .select('challenge_id, current_value, joined_at')
      .eq('user_id', user.id)

    const joinedIds = (participations ?? []).map(p => p.challenge_id as string)
    const participationMap = new Map(
      (participations ?? []).map(p => [p.challenge_id as string, p])
    )

    // Challenges créés par le user
    const { data: created } = await supabase
      .from('challenges')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    // Challenges rejoints (non créés par le user)
    let joined: typeof created = []
    if (joinedIds.length > 0) {
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .in('id', joinedIds)
        .neq('created_by', user.id)
        .order('created_at', { ascending: false })
      joined = data ?? []
    }

    const allChallenges = [...(created ?? []), ...(joined ?? [])]

    // Compter les participants par challenge
    const challengeIds = allChallenges.map(c => c.id as string)
    const participantCounts: Record<string, number> = {}

    if (challengeIds.length > 0) {
      const { data: counts } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .in('challenge_id', challengeIds)
      ;(counts ?? []).forEach((row: { challenge_id: string }) => {
        participantCounts[row.challenge_id] = (participantCounts[row.challenge_id] ?? 0) + 1
      })
    }

    const result = allChallenges.map(c => ({
      ...c,
      is_joined:         participationMap.has(c.id as string),
      is_mine:           c.created_by === user.id,
      my_value:          participationMap.get(c.id as string)?.current_value ?? 0,
      participant_count: participantCounts[c.id as string] ?? 0,
    }))

    return NextResponse.json({ data: result, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/challenges — Créer un challenge et y rejoindre automatiquement
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as {
      title?: string
      type?: ChallengeType
      target_value?: number
      start_date?: string
      end_date?: string
      is_public?: boolean
    }

    if (!body.title?.trim() || !body.type || !body.start_date || !body.end_date) {
      return NextResponse.json({ data: null, error: 'Champs requis manquants' }, { status: 400 })
    }

    const validTypes: ChallengeType[] = [
      'tonnage_weekly', 'streak_weekly', 'sessions_monthly', 'tonnage_monthly',
    ]
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ data: null, error: 'Type invalide' }, { status: 400 })
    }

    const { data: challenge, error } = await supabase
      .from('challenges')
      .insert({
        created_by:   user.id,
        title:        body.title.trim(),
        type:         body.type,
        target_value: body.target_value ?? null,
        start_date:   body.start_date,
        end_date:     body.end_date,
        is_public:    body.is_public ?? true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    // Rejoindre automatiquement avec la valeur déjà acquise sur la période
    const initValue = await calcChallengeValue(
      supabase, user.id, body.type, body.start_date, body.end_date
    )
    await supabase.from('challenge_participants').insert({
      challenge_id:  challenge.id,
      user_id:       user.id,
      current_value: initValue,
    })

    return NextResponse.json({ data: challenge, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
