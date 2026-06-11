import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/social/leaderboard?type=tonnage|sessions|prs&days=7
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? 'tonnage'
    const days = Math.min(Number(searchParams.get('days') ?? 7), 30)

    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

    type RawRow = { user_id: string; value: number }
    let rows: RawRow[] = []

    if (type === 'tonnage' || type === 'sessions') {
      // Workouts de la semaine avec is_public via social_profiles
      const { data: workoutsData } = await supabase
        .from('workouts')
        .select('user_id, total_tonnage_kg')
        .gte('session_date', since)
        .not('completed_at', 'is', null)

      if (workoutsData) {
        // Agréger par user_id
        const agg = new Map<string, number>()
        for (const w of workoutsData) {
          const prev = agg.get(w.user_id) ?? 0
          if (type === 'tonnage') {
            agg.set(w.user_id, prev + (w.total_tonnage_kg ?? 0))
          } else {
            agg.set(w.user_id, prev + 1)
          }
        }
        rows = Array.from(agg.entries()).map(([user_id, value]) => ({ user_id, value }))
      }
    } else if (type === 'prs') {
      // PRs validés cette semaine (top_set uniquement, pas back-off)
      const { data: prsData } = await supabase
        .from('personal_records')
        .select('user_id')
        .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())

      if (prsData) {
        const agg = new Map<string, number>()
        for (const pr of prsData) {
          agg.set(pr.user_id, (agg.get(pr.user_id) ?? 0) + 1)
        }
        rows = Array.from(agg.entries()).map(([user_id, value]) => ({ user_id, value }))
      }
    }

    // Trier et garder le top 10
    rows.sort((a, b) => b.value - a.value)
    const top10 = rows.slice(0, 10)

    if (top10.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    const userIds = top10.map(r => r.user_id)

    // Récupérer les profils sociaux publics
    const { data: socialProfiles } = await supabase
      .from('social_profiles')
      .select('user_id, username, display_name, avatar_url, is_public')
      .in('user_id', userIds)

    // Profils auth fallback
    const { data: authProfiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)

    const socialMap = new Map((socialProfiles ?? []).map((p: {
      user_id: string; username: string | null; display_name: string | null
      avatar_url: string | null; is_public: boolean
    }) => [p.user_id, p]))

    const authMap = new Map((authProfiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]))

    const leaderboard = top10
      .map((row, index) => {
        const social = socialMap.get(row.user_id)
        const auth   = authMap.get(row.user_id)
        // Exclure uniquement les profils explicitement privés (is_public = false)
        // null ou absent = visible dans le classement
        if (social?.is_public === false) return null
        return {
          rank: index + 1,
          user_id: row.user_id,
          username: social?.username ?? null,
          display_name: social?.display_name ?? auth?.display_name ?? 'Athlète',
          avatar_url: social?.avatar_url ?? null,
          value: type === 'tonnage' ? Math.round(row.value) : row.value,
          is_me: row.user_id === user.id,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ data: leaderboard, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
