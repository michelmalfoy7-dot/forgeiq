import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/stats
 * Statistiques globales de l'application (admin uniquement).
 * Retourne : nombre d'utilisateurs, répartition par plan, inscriptions récentes.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Vérifier que l'utilisateur est admin
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

    const now    = new Date()
    const d7ago  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString()
    const d30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const d1ago  = new Date(now.getTime() -  1 * 24 * 60 * 60 * 1000).toISOString()

    // Toutes les requêtes en parallèle pour minimiser la latence
    const [
      totalResult,
      proResult,
      lifetimeResult,
      freeResult,
      new24hResult,
      new7dResult,
      new30dResult,
      activeResult,
      recentUsersResult,
    ] = await Promise.all([
      // Total utilisateurs inscrits
      supabase.from('profiles').select('*', { count: 'exact', head: true }),

      // Abonnés Pro (mensuel + annuel)
      supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'pro'),

      // Lifetime
      supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'lifetime'),

      // Free (pas de subscription_status ou 'free')
      supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .or('subscription_status.is.null,subscription_status.eq.free'),

      // Nouvelles inscriptions < 24h
      supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', d1ago),

      // Nouvelles inscriptions < 7j
      supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', d7ago),

      // Nouvelles inscriptions < 30j
      supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', d30ago),

      // Utilisateurs actifs : au moins 1 check-in dans les 7 derniers jours
      supabase.from('daily_logs')
        .select('user_id', { count: 'exact', head: true })
        .gte('log_date', d7ago.split('T')[0]),

      // 10 derniers inscrits (pour le dashboard admin)
      supabase.from('profiles')
        .select('id, display_name, email, subscription_status, subscription_plan, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const total    = totalResult.count    ?? 0
    const proCount = proResult.count      ?? 0
    const lifetime = lifetimeResult.count ?? 0
    const free     = freeResult.count     ?? 0
    const paying   = proCount + lifetime

    // Estimation MRR (approximative — sans accès Stripe direct)
    // Pro mensuel : ~4.99€, Pro annuel : 39.99/12 = 3.33€/mois
    // On n'a pas le détail mensuel/annuel ici → on utilise 4.99 comme proxy
    const mrrEstimate = proCount * 4.99

    return NextResponse.json({
      data: {
        overview: {
          total_users:    total,
          paying_users:   paying,
          free_users:     free,
          pro_users:      proCount,
          lifetime_users: lifetime,
          conversion_rate: total > 0 ? Math.round((paying / total) * 1000) / 10 : 0, // %
          mrr_estimate:   Math.round(mrrEstimate * 100) / 100, // €
        },
        growth: {
          new_last_24h:  new24hResult.count  ?? 0,
          new_last_7d:   new7dResult.count   ?? 0,
          new_last_30d:  new30dResult.count  ?? 0,
          active_last_7d: activeResult.count ?? 0, // actifs (check-in)
        },
        recent_users: (recentUsersResult.data ?? []).map(u => ({
          id:     u.id,
          name:   u.display_name ?? '(sans nom)',
          email:  (u as Record<string, unknown>).email ?? '',
          plan:   u.subscription_status ?? 'free',
          joined: u.created_at,
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
