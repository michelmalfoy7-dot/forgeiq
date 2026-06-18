import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type FreshnessStatus = 'fresh' | 'moderate' | 'fatigued'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Récupérer les sets de travail des 7 derniers jours (exclut échauffements et back-off)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: recentSets, error } = await supabase
      .from('workout_sets')
      .select('exercise_name, created_at')
      .eq('user_id', user.id)
      .eq('is_warmup', false)
      .neq('set_type', 'backoff')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    // Récupérer la map exercice → muscle_primary depuis exercises_library
    const { data: exerciseLibrary } = await supabase
      .from('exercises_library')
      .select('name, name_fr, muscle_primary')

    // Map nom d'exercice → muscle_primary (premier muscle du tableau)
    // Double indexation : name (EN) ET name_fr (FR) pour que le lookup côté client
    // fonctionne quel que soit le champ utilisé dans exercise_name du groupe.
    const exerciseToMuscle: Record<string, string> = {}
    if (exerciseLibrary) {
      for (const ex of exerciseLibrary) {
        const primaryMuscle = Array.isArray(ex.muscle_primary) && ex.muscle_primary.length > 0
          ? (ex.muscle_primary[0] as string)
          : null
        if (primaryMuscle) {
          exerciseToMuscle[ex.name] = primaryMuscle
          const exAny = ex as unknown as { name_fr?: string }
          if (exAny.name_fr) {
            exerciseToMuscle[exAny.name_fr] = primaryMuscle
          }
        }
      }
    }

    // Calculer la dernière sollicitation par groupe musculaire
    const muscleLastUsed: Record<string, number> = {}
    const now = Date.now()

    if (recentSets) {
      for (const s of recentSets) {
        const muscle = exerciseToMuscle[s.exercise_name]
        if (!muscle) continue

        const setTime = new Date(s.created_at as string).getTime()
        // Garder uniquement la date la plus récente (les sets sont déjà triés desc)
        if (!(muscle in muscleLastUsed)) {
          muscleLastUsed[muscle] = setTime
        }
      }
    }

    // Calculer le statut de fraîcheur par muscle
    const muscleFreshness: Record<string, FreshnessStatus> = {}
    for (const [muscle, lastUsedTs] of Object.entries(muscleLastUsed)) {
      const daysSince = (now - lastUsedTs) / (1000 * 60 * 60 * 24)
      if (daysSince < 2) {
        muscleFreshness[muscle] = 'fatigued'  // < 48h
      } else if (daysSince < 3) {
        muscleFreshness[muscle] = 'moderate'  // 48-72h
      } else {
        muscleFreshness[muscle] = 'fresh'     // > 72h
      }
    }

    // Retourner aussi la map exercice → muscle_primary pour lookup O(1) côté client
    return NextResponse.json({
      data: {
        muscleFreshness,
        exerciseToMuscle,
      },
      error: null,
    })
  } catch (err) {
    console.error('[muscle-freshness]', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
