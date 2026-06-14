import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calcChallengeValue, type ChallengeType } from '@/lib/utils/challenges'

export const dynamic = 'force-dynamic'

// GET /api/challenges/[id]/leaderboard — Classement live d'un challenge
export async function GET(
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
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!challenge) {
      return NextResponse.json({ data: null, error: 'Challenge introuvable' }, { status: 404 })
    }

    // Participants (max 50 pour limiter les requêtes parallèles)
    const { data: participants } = await supabase
      .from('challenge_participants')
      .select('user_id, joined_at')
      .eq('challenge_id', id)
      .limit(50)

    if (!participants || participants.length === 0) {
      return NextResponse.json({ data: { challenge, entries: [] }, error: null })
    }

    const userIds = participants.map(p => p.user_id as string)

    // Profils sociaux et profils auth en parallèle
    const [{ data: socialProfiles }, { data: authProfiles }] = await Promise.all([
      supabase
        .from('social_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds),
      supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds),
    ])

    const socialMap = new Map(
      (socialProfiles ?? []).map(p => [p.user_id as string, p])
    )
    const authMap = new Map(
      (authProfiles ?? []).map(p => [p.id as string, p])
    )

    // Calcul live des valeurs en parallèle
    const entries = await Promise.all(
      participants.map(async (p) => {
        const value = await calcChallengeValue(
          supabase,
          p.user_id as string,
          challenge.type as ChallengeType,
          challenge.start_date as string,
          challenge.end_date as string
        )
        const social = socialMap.get(p.user_id as string)
        const auth   = authMap.get(p.user_id as string)
        return {
          user_id:      p.user_id as string,
          username:     (social?.username as string | null) ?? null,
          display_name: (social?.display_name as string | null) ?? (auth?.display_name as string | null) ?? 'Athlète',
          avatar_url:   (social?.avatar_url as string | null) ?? null,
          value,
          is_me:        p.user_id === user.id,
        }
      })
    )

    // Tri décroissant par valeur, puis par date d'adhésion (premier inscrit gagne l'égalité)
    entries.sort((a, b) => b.value - a.value || 0)
    const ranked = entries.map((e, i) => ({ ...e, rank: i + 1 }))

    // Mise en cache des valeurs en arrière-plan (fire-and-forget)
    ranked.forEach(e => {
      void supabase
        .from('challenge_participants')
        .update({ current_value: e.value })
        .eq('challenge_id', id)
        .eq('user_id', e.user_id)
    })

    return NextResponse.json({ data: { challenge, entries: ranked }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
