import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { grantReferralRewardIfEligible } from '@/app/api/referral/route'
import { sendPushToUser } from '@/lib/utils/push'

export const dynamic = 'force-dynamic'

type SetInput = {
  exercise_id: string | null
  exercise_name: string
  set_number: number
  weight_kg: number
  reps: number
  rpe?: number | null
  is_warmup?: boolean
  set_type?: string   // work | top_set | backoff | drop | failure | pause_rep | warmup
  is_bilateral_dumbbell?: boolean
  is_unilateral?: boolean
  unilateral_both_sides?: boolean
  note?: string | null  // note libre par série (colonne workout_sets.note TEXT)
}

export async function POST(request: Request) {
  try {
    const { workout_id, sets, notes, rpe_overall, duration_min, distance_km, workout_type } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Lire la préférence utilisateur (inclure échauffement dans le tonnage)
    const { data: profilePref } = await supabase
      .from('profiles')
      .select('include_warmup_in_tonnage')
      .eq('id', user.id)
      .maybeSingle()
    const includeWarmup = profilePref?.include_warmup_in_tonnage ?? false

    // Calculer les métriques de la séance
    const workingSets = (sets as SetInput[]).filter((s) => !s.is_warmup)
    const warmupSets = (sets as SetInput[]).filter((s) => s.is_warmup)
    const setsForTonnage = includeWarmup ? [...workingSets, ...warmupSets] : workingSets
    // Multiplicateur × 2 pour :
    //  - is_bilateral_dumbbell : haltères 2 bras simultanément (poids max 120kg/côté)
    //  - is_unilateral + unilateral_both_sides : câble/machine fait des 2 côtés (tirage unilatéral, etc.)
    const totalTonnage = setsForTonnage.reduce((acc, s) => {
      const isBilateralDumbbell = !!s.is_bilateral_dumbbell
      const isUnilateralDouble  = (s.is_unilateral && (s.unilateral_both_sides ?? false))
      const multiplier = (isBilateralDumbbell || isUnilateralDouble) ? 2 : 1
      return acc + s.weight_kg * s.reps * multiplier
    }, 0)
    const totalSets = workingSets.length
    const totalReps = workingSets.reduce((acc, s) => acc + s.reps, 0)

    // Mettre à jour le workout avec les métriques finales
    const { error: wErr } = await supabase
      .from('workouts')
      .update({
        completed_at: new Date().toISOString(),
        total_tonnage_kg: Math.round(totalTonnage * 10) / 10,
        total_sets: totalSets,
        total_reps: totalReps,
        notes,
        rpe_overall,
        ...(duration_min != null && { duration_min }),
        ...(distance_km != null && { distance_km }),
        ...(workout_type != null && { workout_type }),
      })
      .eq('id', workout_id)
      .eq('user_id', user.id)

    if (wErr) return NextResponse.json({ data: null, error: wErr.message }, { status: 400 })

    // Insérer toutes les séries — is_bilateral_dumbbell est dans exercises_library, pas dans workout_sets
    if (sets.length > 0) {
      const { error: sErr } = await supabase
        .from('workout_sets')
        .insert(sets.map((s: SetInput) => {
          // Retirer les flags de multiplicateur (cols non présents dans workout_sets)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { is_bilateral_dumbbell: _b, is_unilateral: _u, unilateral_both_sides: _ubs, ...setData } = s
          return { ...setData, workout_id }
        }))

      if (sErr) return NextResponse.json({ data: null, error: sErr.message }, { status: 400 })
    }

    // Détection des PRs — uniquement les sets valides (poids et reps > 0)
    const newPRs: string[] = []
    const validSets = workingSets.filter(s => s.weight_kg > 0 && s.reps > 0)
    const exerciseGroups = groupByExercise(validSets)
    const exerciseIds = Object.keys(exerciseGroups)
    const today = new Date().toLocaleDateString('sv')

    // 1 seule requête pour charger tous les PRs existants
    const { data: existingPRsRows } = await supabase
      .from('personal_records')
      .select('exercise_id, record_type, value')
      .eq('user_id', user.id)
      .in('exercise_id', exerciseIds)
      .in('record_type', ['top_set', '1rm_estimated', 'max_weight'])

    // Map lookup: exerciseId → { record_type → value }
    const prMap = new Map<string, Record<string, number>>()
    for (const pr of existingPRsRows ?? []) {
      if (!prMap.has(pr.exercise_id)) prMap.set(pr.exercise_id, {})
      prMap.get(pr.exercise_id)![pr.record_type] = pr.value
    }

    // Calculer les nouveaux PRs et préparer le batch upsert
    const upserts: {
      user_id: string; exercise_id: string; exercise_name: string
      record_type: string; value: number; unit: string
      reps?: number; achieved_date: string; workout_id: string
    }[] = []

    for (const [exerciseId, exSets] of Object.entries(exerciseGroups)) {
      const existing = prMap.get(exerciseId) ?? {}
      const exerciseName = exSets[0].exercise_name

      // PR = charge la plus lourde du top set explicite, sinon de tous les sets (à égalité → plus de reps)
      // Les back-off sets et drop sets sont des sets de volume, pas des PRs — priorité au top_set tagué
      const taggedTopSets = exSets.filter(s => s.set_type === 'top_set')
      const prCandidates = taggedTopSets.length > 0 ? taggedTopSets : exSets.filter(s => !['backoff', 'drop', 'failure', 'pause_rep'].includes(s.set_type ?? ''))
      const heaviestSet = prCandidates.reduce((best, s) =>
        s.weight_kg > best.weight_kg
          ? s
          : s.weight_kg === best.weight_kg && s.reps > best.reps
          ? s
          : best
      )

      // Guard : skip si le set candidat n'a pas de poids/reps valides (évite NaN ou Infinity dans Epley)
      if (!heaviestSet || heaviestSet.reps < 1 || heaviestSet.weight_kg <= 0) continue

      const prWeight = heaviestSet.weight_kg
      const prReps = heaviestSet.reps

      if (!existing['top_set'] || prWeight > existing['top_set']) {
        upserts.push({
          user_id: user.id, exercise_id: exerciseId, exercise_name: exerciseName,
          record_type: 'top_set', value: prWeight, unit: 'kg',
          reps: prReps, achieved_date: today, workout_id,
        })
        newPRs.push(exerciseName)
      }

      // 1RM estimé (formule Epley) basé sur le set le plus lourd
      const estimatedRM = Math.round((heaviestSet.weight_kg * (1 + heaviestSet.reps / 30)) * 10) / 10
      if (!existing['1rm_estimated'] || estimatedRM > existing['1rm_estimated']) {
        upserts.push({
          user_id: user.id, exercise_id: exerciseId, exercise_name: exerciseName,
          record_type: '1rm_estimated', value: estimatedRM, unit: 'kg',
          achieved_date: today, workout_id,
        })
      }
    }

    // Upsert batch — d'abord sans reps (toujours compatible)
    if (upserts.length > 0) {
      const upsertsWithoutReps = upserts.map(({ reps: _r, ...u }) => u)
      await supabase.from('personal_records').upsert(upsertsWithoutReps, { onConflict: 'user_id,exercise_id,record_type' })

      // Ensuite essayer d'ajouter reps (échoue silencieusement si colonne absente)
      const topSetUpserts = upserts.filter(u => u.record_type === 'top_set' && u.reps != null)
      for (const u of topSetUpserts) {
        try {
          await supabase.from('personal_records')
            .update({ reps: u.reps } as Record<string, unknown>)
            .eq('user_id', u.user_id)
            .eq('exercise_id', u.exercise_id)
            .eq('record_type', 'top_set')
        } catch (err) {
          console.error('[complete] PR reps update failed:', u.exercise_id, err)
        }
      }
    }

    // ── Notifier les followers pour chaque PR battu (fire-and-forget) ──
    if (newPRs.length > 0) {
      notifyFollowersOfPRs(user.id, newPRs, upserts).catch(() => null)
    }

    // ── Mise à jour streak d'entraînement (semaines consécutives) ──
    // Ne compte pas les jours de repos ni le cardio rapide comme "semaine d'entraînement"
    let trainingMilestone: { streak: number; type: 'training' } | null = null
    // Compte uniquement les séances avec au moins 1 série de travail (pas juste échauffement)
    const isRealWorkout = workout_type !== 'cardio' && workingSets.length > 0
    if (isRealWorkout) {
      const currentWeek = getISOWeek(new Date())
      const { data: prof } = await supabase
        .from('profiles')
        .select('training_streak_weeks, last_training_week_iso')
        .eq('id', user.id)
        .maybeSingle()

      if (prof) {
        const lastWeek = prof.last_training_week_iso
        let newStreak = 1
        if (lastWeek === currentWeek) {
          newStreak = prof.training_streak_weeks ?? 1  // déjà compté cette semaine
        } else if (lastWeek && isPrevWeek(lastWeek, currentWeek)) {
          newStreak = (prof.training_streak_weeks ?? 0) + 1
        }
        if (lastWeek !== currentWeek) {
          await supabase
            .from('profiles')
            .update({ training_streak_weeks: newStreak, last_training_week_iso: currentWeek })
            .eq('id', user.id)

          const MILESTONES = [4, 12, 52]
          if (MILESTONES.includes(newStreak)) {
            trainingMilestone = { streak: newStreak, type: 'training' }
          }
        }
      }
    }

    // Récompense referral différée (1ère séance = 1ère vraie action)
    grantReferralRewardIfEligible(user.id).catch(() => null)

    return NextResponse.json({
      data: { workout_id, totalTonnage, totalSets, newPRs, milestone: trainingMilestone },
      error: null,
    })
  } catch (e) {
    console.error('[workout/complete]', e)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── Notifier les followers d'un PR battu ─────────────────────────────────────
// Fire-and-forget : ne bloque jamais la réponse principale
async function notifyFollowersOfPRs(
  userId: string,
  prExerciseNames: string[],
  upserts: { exercise_id: string; exercise_name: string; record_type: string; value: number }[]
): Promise<void> {
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Récupérer le display_name de l'utilisateur
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle()
  const displayName = profile?.display_name ?? 'Un athlète'

  // Récupérer les followers (max 50 pour éviter les timeouts)
  const { data: follows } = await supabaseAdmin
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .limit(50)

  if (!follows || follows.length === 0) return

  // Construire le message — premier PR en titre, liste courte dans le body
  const topPR = upserts.find(u => u.record_type === 'top_set' && prExerciseNames.includes(u.exercise_name))
  const prBody = topPR
    ? `${topPR.exercise_name} — ${topPR.value}kg`
    : prExerciseNames.slice(0, 2).join(', ')

  // Envoyer en parallèle (silencieux si un follower n'a pas de subscription)
  await Promise.allSettled(
    follows.map(f =>
      sendPushToUser(f.follower_id, {
        title: `🏆 PR de ${displayName}`,
        body: prBody,
        url: '/social',
        tag: 'pr-notification',
      })
    )
  )
}

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function isPrevWeek(lastWeekIso: string, currentWeekIso: string): boolean {
  const [ly, lw] = lastWeekIso.split('-W').map(Number)
  const [cy, cw] = currentWeekIso.split('-W').map(Number)
  // Passage d'année : certaines années ont 53 semaines ISO (ex: 2020), pas seulement 52
  if (cy === ly + 1 && cw === 1) {
    const lastWeekOfLastYear = getISOWeeksInYear(ly)
    return lw === lastWeekOfLastYear
  }
  return cy === ly && cw === lw + 1
}

/** Retourne le nombre de semaines ISO dans une année (52 ou 53) */
function getISOWeeksInYear(year: number): number {
  const parsed = getISOWeek(new Date(year, 11, 28)).split('-W').map(Number)
  // Si le 28 déc tombe en semaine 1 de l'année suivante (rare), l'année a 52 semaines ISO
  return parsed[0] === year ? parsed[1] : 52
}

function groupByExercise(sets: SetInput[]): Record<string, SetInput[]> {
  return sets.reduce((acc, s) => {
    if (!s.exercise_id) return acc
    if (!acc[s.exercise_id]) acc[s.exercise_id] = []
    acc[s.exercise_id].push(s)
    return acc
  }, {} as Record<string, SetInput[]>)
}
