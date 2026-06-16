import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const sort = searchParams.get('sort') ?? 'popular' // popular | recent
    const level = searchParams.get('level')
    const goal = searchParams.get('goal')
    const equipment = searchParams.get('equipment')

    let query = supabase
      .from('programs')
      .select(`
        id, name, slug, description, level, goal, equipment,
        sessions_per_week, duration_weeks, structure, is_custom,
        adopted_count, community_published_at, created_by,
        profiles!programs_created_by_fkey(display_name),
        social_profiles!social_profiles_id_fkey(username)
      `)
      .eq('is_custom', true)
      .eq('is_public', true)

    if (level) query = query.contains('level', [level])
    if (goal) query = query.contains('goal', [goal])
    if (equipment) query = query.contains('equipment', [equipment])

    if (sort === 'recent') {
      query = query.order('community_published_at', { ascending: false })
    } else {
      query = query.order('adopted_count', { ascending: false })
    }

    query = query.limit(50)

    const { data, error } = await query
    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

    // Aplatir les infos auteur
    const programs = (data ?? []).map((p: Record<string, unknown>) => {
      const profile = p.profiles as { display_name?: string } | null
      const social = p.social_profiles as { username?: string } | null
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        level: p.level,
        goal: p.goal,
        equipment: p.equipment,
        sessions_per_week: p.sessions_per_week,
        duration_weeks: p.duration_weeks,
        structure: p.structure,
        is_custom: p.is_custom,
        adopted_count: (p.adopted_count as number) ?? 0,
        community_published_at: p.community_published_at,
        created_by: p.created_by,
        author_name: profile?.display_name ?? 'Athlète ForgeIQ',
        author_username: social?.username ?? null,
        is_mine: p.created_by === user.id,
      }
    })

    return NextResponse.json({ data: programs, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
