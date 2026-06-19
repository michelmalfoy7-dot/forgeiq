import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { buildExercisesMap } from '@/lib/utils/social'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') ?? 0)
    const mode = searchParams.get('mode') ?? 'discover'
    const offset = page * PAGE_SIZE

    // Toujours récupérer les IDs suivis (pour le bouton "Suivre" dans discover)
    const { data: followsData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (followsData ?? []).map((f: { following_id: string }) => f.following_id)
    const followingSet = new Set(followingIds)

    // Construire la requête selon le mode
    let query = supabase
      .from('workout_shares')
      .select(`
        id,
        workout_id,
        user_id,
        caption,
        likes_count,
        comments_count,
        is_public,
        created_at,
        workouts (
          session_name,
          total_tonnage_kg,
          total_sets,
          completed_at
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (mode === 'following') {
      // Uniquement les gens suivis + soi-même
      const feedUserIds = [...followingIds, user.id]
      if (feedUserIds.length === 0) {
        return NextResponse.json({ data: [], hasMore: false, error: null })
      }
      query = query.in('user_id', feedUserIds)
    }
    // mode === 'discover' : tous les posts publics, aucun filtre user

    const { data: shares, error } = await query

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    if (!shares || shares.length === 0) return NextResponse.json({ data: [], hasMore: false, error: null })

    const authorIds  = [...new Set(shares.map((s: { user_id: string }) => s.user_id))]
    const shareIds   = shares.map((s: { id: string }) => s.id)
    const workoutIds = shares.map((s: { workout_id: string }) => s.workout_id).filter(Boolean)

    const [
      { data: socialProfiles },
      { data: authProfiles },
      { data: userLikes },
      { data: setsData },
    ] = await Promise.all([
      supabase
        .from('social_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', authorIds),
      supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', authorIds),
      supabase
        .from('likes')
        .select('workout_share_id')
        .eq('user_id', user.id)
        .in('workout_share_id', shareIds),
      workoutIds.length > 0
        ? supabase
            .from('workout_sets')
            .select('workout_id, exercise_name, weight_kg, reps, set_type')
            .in('workout_id', workoutIds)
            .neq('set_type', 'warmup')
            .gt('weight_kg', 0)
            .gt('reps', 0)
            .order('set_number', { ascending: true })
        : Promise.resolve({ data: [] }),
    ])

    const likedShareIds      = new Set((userLikes ?? []).map((l: { workout_share_id: string }) => l.workout_share_id))
    const socialMap          = new Map((socialProfiles ?? []).map((p: { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }) => [p.user_id, p]))
    const authMap            = new Map((authProfiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]))
    const exercisesByWorkout = buildExercisesMap(setsData ?? [])

    const feed = shares.map((share) => {
      const social  = socialMap.get(share.user_id)
      const auth    = authMap.get(share.user_id)
      const workout = (share.workouts as unknown) as {
        session_name: string | null
        total_tonnage_kg: number | null
        total_sets: number | null
        completed_at: string | null
      } | null

      return {
        id: share.id,
        workout_id: share.workout_id,
        user_id: share.user_id,
        caption: share.caption,
        likes_count: share.likes_count ?? 0,
        comments_count: share.comments_count ?? 0,
        created_at: share.created_at,
        is_liked: likedShareIds.has(share.id),
        is_mine: share.user_id === user.id,
        is_following: followingSet.has(share.user_id),
        exercises: exercisesByWorkout.get(share.workout_id) ?? [],
        author: {
          username: social?.username ?? null,
          display_name: social?.display_name ?? auth?.display_name ?? 'Athlète',
          avatar_url: social?.avatar_url ?? null,
        },
        workout: workout
          ? {
              session_name: workout.session_name,
              total_tonnage_kg: workout.total_tonnage_kg,
              total_sets: workout.total_sets,
              completed_at: workout.completed_at,
            }
          : null,
      }
    })

    return NextResponse.json({ data: feed, hasMore: feed.length === PAGE_SIZE, error: null })
  } catch {
    return NextResponse.json({ data: null, hasMore: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
