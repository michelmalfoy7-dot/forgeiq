import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Search, Users, Compass } from 'lucide-react'
import { WorkoutPost } from '@/components/social/WorkoutPost'
import { SocialProfileSetup } from '@/components/social/SocialProfileSetup'
import type { FeedPost, ExerciseInPost } from '@/components/social/WorkoutPost'

export const dynamic = 'force-dynamic'

export default async function SocialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Récupérer le profil social de l'utilisateur courant
  const { data: socialProfile } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  // Récupérer le feed (utilisateurs suivis + soi-même)
  let feed: FeedPost[] = []

  if (socialProfile) {
    // Récupérer IDs suivis
    const { data: followsData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (followsData ?? []).map((f: { following_id: string }) => f.following_id)
    const feedUserIds = [...followingIds, user.id]

    // Récupérer les posts
    const { data: shares } = await supabase
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
      .in('user_id', feedUserIds)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (shares && shares.length > 0) {
      const authorIds = [...new Set(shares.map((s: { user_id: string }) => s.user_id))]

      const [{ data: socialProfiles }, { data: authProfiles }, { data: userLikes }] = await Promise.all([
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
          .in('workout_share_id', shares.map((s: { id: string }) => s.id)),
      ])

      const socialMap = new Map((socialProfiles ?? []).map((p: { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }) => [p.user_id, p]))
      const authMap = new Map((authProfiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]))
      const likedIds = new Set((userLikes ?? []).map((l: { workout_share_id: string }) => l.workout_share_id))

      // Récupérer les sets des workouts pour afficher les exercices dans chaque post
      const workoutIds = shares.map((s: { workout_id: string }) => s.workout_id).filter(Boolean)
      const { data: setsData } = workoutIds.length > 0
        ? await supabase
            .from('workout_sets')
            .select('workout_id, exercise_name, weight_kg, reps, set_type')
            .in('workout_id', workoutIds)
            .neq('set_type', 'warmup')
            .gt('weight_kg', 0)
            .gt('reps', 0)
            .order('set_number', { ascending: true })
        : { data: [] }

      // Grouper les sets par workout → exercice, garder le meilleur set par exercice
      const exercisesByWorkout = buildExercisesMap(setsData ?? [])

      feed = shares.map((share) => {
        const social = socialMap.get(share.user_id)
        const auth = authMap.get(share.user_id)
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
          likes_count: share.likes_count,
          comments_count: share.comments_count,
          created_at: share.created_at,
          is_liked: likedIds.has(share.id),
          exercises: exercisesByWorkout.get(share.workout_id),
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
        } satisfies FeedPost
      })
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            Communauté
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
            Progressez ensemble
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/social/explorer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: '#B4FF4A15', border: '1px solid #B4FF4A30', color: 'var(--fiq-accent)' }}
          >
            <Compass className="w-3.5 h-3.5" />
            Explorer
          </Link>
          <Link
            href="/social/search"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
          >
            <Search className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Pas encore de profil social — CTA création */}
      {!socialProfile && (
        <SocialProfileSetup />
      )}

      {/* Feed */}
      {socialProfile && feed.length > 0 && (
        <div className="space-y-3">
          {feed.map((post) => (
            <WorkoutPost key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Feed vide mais profil créé */}
      {socialProfile && feed.length === 0 && (
        <div className="fiq-card text-center py-10 space-y-4">
          <div className="text-4xl">🏋️</div>
          <div>
            <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>
              Suis des athlètes pour voir leur progression ici
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Partage aussi tes séances après l&apos;entraînement
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/social/explorer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              <Compass className="w-4 h-4" />
              Explorer la communauté
            </Link>
            <Link
              href="/social/search"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}
            >
              <Users className="w-4 h-4" />
              Rechercher des athlètes
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Utilitaire : grouper les sets par workout → exercice ──────────────────────
type RawSet = {
  workout_id: string
  exercise_name: string
  weight_kg: number
  reps: number
  set_type: string | null
}

function buildExercisesMap(sets: RawSet[]): Map<string, ExerciseInPost[]> {
  // workout_id → exercise_name → { maxKg, maxReps, count, order }
  const workoutExMap = new Map<string, Map<string, { maxKg: number; maxReps: number; count: number; order: number }>>()

  for (const set of sets) {
    if (!workoutExMap.has(set.workout_id)) workoutExMap.set(set.workout_id, new Map())
    const exMap = workoutExMap.get(set.workout_id)!
    const existing = exMap.get(set.exercise_name)

    if (!existing) {
      exMap.set(set.exercise_name, {
        maxKg: set.weight_kg,
        maxReps: set.reps,
        count: 1,
        order: exMap.size, // ordre d'apparition dans la séance
      })
    } else {
      const isBetter =
        set.weight_kg > existing.maxKg ||
        (set.weight_kg === existing.maxKg && set.reps > existing.maxReps)
      exMap.set(set.exercise_name, {
        maxKg: isBetter ? set.weight_kg : existing.maxKg,
        maxReps: isBetter ? set.reps : existing.maxReps,
        count: existing.count + 1,
        order: existing.order,
      })
    }
  }

  const result = new Map<string, ExerciseInPost[]>()
  for (const [workoutId, exMap] of workoutExMap.entries()) {
    const exercises = Array.from(exMap.entries())
      .sort(([, a], [, b]) => a.order - b.order) // ordre de la séance
      .map(([name, data]) => ({
        name,
        top_set_kg: data.maxKg,
        top_set_reps: data.maxReps,
        set_count: data.count,
      }))
    result.set(workoutId, exercises)
  }
  return result
}
