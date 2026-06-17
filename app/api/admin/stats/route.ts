import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ data: null, error: 'Accès refusé' }, { status: 403 })
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Pagination — page 1-based, limit max 100
    const params = new URL(req.url).searchParams
    const page  = Math.max(1, parseInt(params.get('page')  ?? '1',  10))
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '50', 10)))
    const offset = (page - 1) * limit

    const now    = new Date()
    const d7ago  = new Date(now.getTime() - 7  * 86400000).toISOString()
    const d30ago = new Date(now.getTime() - 30 * 86400000).toISOString()
    const d1ago  = new Date(now.getTime() -  1 * 86400000).toISOString()
    const today  = now.toISOString().split('T')[0]

    const [
      totalResult,
      proResult,
      lifetimeResult,
      freeResult,
      trialResult,
      new24hResult,
      new7dResult,
      new30dResult,
      activeResult,
      allUsersResult,
    ] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'pro'),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'lifetime'),
      admin.from('profiles').select('*', { count: 'exact', head: true }).or('subscription_status.is.null,subscription_status.eq.free').is('referral_pro_until', null),
      // Trial referral actifs (free + referral_pro_until dans le futur)
      admin.from('profiles').select('*', { count: 'exact', head: true })
        .or('subscription_status.is.null,subscription_status.eq.free')
        .gte('referral_pro_until', today),
      admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', d1ago),
      admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', d7ago),
      admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', d30ago),
      admin.from('daily_logs').select('user_id', { count: 'exact', head: true }).gte('log_date', d7ago.split('T')[0]),
      // Users paginés avec données utiles
      admin.from('profiles')
        .select('id, display_name, subscription_status, subscription_plan, created_at, checkin_streak, training_streak_weeks, referral_count, referred_by, referral_pro_until')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
    ])

    const total    = totalResult.count    ?? 0
    const proCount = proResult.count      ?? 0
    const lifetime = lifetimeResult.count ?? 0
    const freeOnly = freeResult.count     ?? 0
    const trial    = trialResult.count    ?? 0
    const paying   = proCount + lifetime

    const mrrEstimate = proCount * 4.99

    // Emails depuis auth.users — pagination en boucle pour dépasser la limite 1000
    // Supabase retourne au max 1000 users par page ; on boucle jusqu'à la dernière page
    const authUsers: { id: string; email?: string }[] = []
    let authPage = 1
    const AUTH_PER_PAGE = 1000
    while (true) {
      const { data: { users: batch } } = await admin.auth.admin.listUsers({ page: authPage, perPage: AUTH_PER_PAGE })
      authUsers.push(...batch)
      // Si la page est incomplète, on a atteint la fin
      if (batch.length < AUTH_PER_PAGE) break
      authPage++
    }
    const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))

    // Dernière séance par user — on limite à limit*5 lignes pour éviter un timeout
    // sur grande base (chaque user a au plus ~quelques centaines de séances, mais on borne globalement)
    const userIds = (allUsersResult.data ?? []).map(u => u.id)
    const { data: lastWorkouts } = await admin
      .from('workouts')
      .select('user_id, completed_at')
      .in('user_id', userIds)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(limit * 5) // borne : 5 séances max par user en moyenne avant dedup

    const lastWorkoutMap = new Map<string, string>()
    for (const w of (lastWorkouts ?? [])) {
      if (!lastWorkoutMap.has(w.user_id)) lastWorkoutMap.set(w.user_id, w.completed_at)
    }

    // Dernier check-in par user — même approche bornée
    const { data: lastCheckins } = await admin
      .from('daily_logs')
      .select('user_id, log_date')
      .in('user_id', userIds)
      .order('log_date', { ascending: false })
      .limit(limit * 5) // borne : 5 check-ins max par user en moyenne avant dedup

    const lastCheckinMap = new Map<string, string>()
    for (const c of (lastCheckins ?? [])) {
      if (!lastCheckinMap.has(c.user_id)) lastCheckinMap.set(c.user_id, c.log_date)
    }

    return NextResponse.json({
      data: {
        overview: {
          total_users:     total,
          paying_users:    paying,
          free_users:      freeOnly,
          trial_users:     trial,
          pro_users:       proCount,
          lifetime_users:  lifetime,
          conversion_rate: total > 0 ? Math.round((paying / total) * 1000) / 10 : 0,
          mrr_estimate:    Math.round(mrrEstimate * 100) / 100,
        },
        growth: {
          new_last_24h:   new24hResult.count  ?? 0,
          new_last_7d:    new7dResult.count   ?? 0,
          new_last_30d:   new30dResult.count  ?? 0,
          active_last_7d: activeResult.count  ?? 0,
        },
        pagination: {
          page,
          limit,
          total_users: total,
          total_pages: Math.ceil(total / limit),
          has_next: page * limit < total,
        },
        users: (allUsersResult.data ?? []).map(u => ({
          id:               u.id,
          name:             u.display_name ?? '(sans nom)',
          email:            emailMap.get(u.id) ?? '',
          plan:             u.subscription_status ?? 'free',
          trial_until:      u.referral_pro_until ?? null,
          joined:           u.created_at,
          checkin_streak:   u.checkin_streak ?? 0,
          training_streak:  u.training_streak_weeks ?? 0,
          referral_count:   u.referral_count ?? 0,
          referred_by:      u.referred_by ?? null,
          last_workout:     lastWorkoutMap.get(u.id) ?? null,
          last_checkin:     lastCheckinMap.get(u.id) ?? null,
        })),
        generated_at: now.toISOString(),
      },
      error: null,
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
