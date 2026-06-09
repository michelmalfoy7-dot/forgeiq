'use client'

import { useEffect, useState } from 'react'
import { Users, TrendingUp, CreditCard, Zap, RefreshCw, AlertTriangle } from 'lucide-react'

interface AdminStats {
  overview: {
    total_users:     number
    paying_users:    number
    free_users:      number
    pro_users:       number
    lifetime_users:  number
    conversion_rate: number
    mrr_estimate:    number
  }
  growth: {
    new_last_24h:   number
    new_last_7d:    number
    new_last_30d:   number
    active_last_7d: number
  }
  recent_users: {
    id:     string
    name:   string
    email:  string
    plan:   string
    joined: string
  }[]
  generated_at: string
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/admin/stats')
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setStats(json.data)
        setError(null)
      }
    } catch {
      setError('Impossible de charger les stats')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--fiq-accent)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--fiq-muted)', fontSize: 13 }}>Chargement des stats…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="fiq-card p-6 text-center max-w-sm w-full">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--fiq-red)' }} />
          <p style={{ color: 'var(--fiq-text)', fontWeight: 800, marginBottom: 4 }}>Accès refusé</p>
          <p style={{ color: 'var(--fiq-muted)', fontSize: 13 }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const { overview, growth, recent_users, generated_at } = stats

  const updatedAt = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(generated_at))

  function planBadge(plan: string) {
    if (plan === 'lifetime') return { label: 'Lifetime', color: 'var(--fiq-accent)', bg: '#B4FF4A22' }
    if (plan === 'pro')      return { label: 'Pro',      color: 'var(--fiq-blue)',   bg: '#3D8BFF22' }
    return                          { label: 'Free',     color: 'var(--fiq-muted)',  bg: '#6B728022' }
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-[480px] mx-auto px-4 pt-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--fiq-text)', letterSpacing: '-0.03em', margin: 0 }}>
              Admin
            </h1>
            <p style={{ fontSize: 12, color: 'var(--fiq-muted)', marginTop: 2 }}>
              Mis à jour {updatedAt}
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              style={{ color: 'var(--fiq-accent)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--fiq-text)', fontWeight: 700 }}>Refresh</span>
          </button>
        </div>

        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <KpiCard
            icon={<Users className="w-5 h-5" />}
            label="Utilisateurs"
            value={overview.total_users.toLocaleString('fr-FR')}
            sub={`+${growth.new_last_7d} cette semaine`}
            color="var(--fiq-blue)"
          />
          <KpiCard
            icon={<CreditCard className="w-5 h-5" />}
            label="Abonnés payants"
            value={overview.paying_users.toString()}
            sub={`${overview.conversion_rate}% de conversion`}
            color="var(--fiq-accent)"
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="MRR estimé"
            value={`${overview.mrr_estimate.toFixed(2)} €`}
            sub={`Pro: ${overview.pro_users} · Lifetime: ${overview.lifetime_users}`}
            color="var(--fiq-orange)"
          />
          <KpiCard
            icon={<Zap className="w-5 h-5" />}
            label="Actifs 7j"
            value={growth.active_last_7d.toString()}
            sub={`${growth.new_last_24h} inscrits aujourd'hui`}
            color="var(--fiq-yellow)"
          />
        </div>

        {/* Growth bar */}
        <div className="fiq-card p-4 mb-4">
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Croissance
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: '24 heures', value: growth.new_last_24h,  max: growth.new_last_30d },
              { label: '7 jours',   value: growth.new_last_7d,   max: growth.new_last_30d },
              { label: '30 jours',  value: growth.new_last_30d,  max: overview.total_users },
            ].map(({ label, value, max }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--fiq-muted)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--fiq-text)', fontVariantNumeric: 'tabular-nums' }}>+{value}</span>
                </div>
                <div style={{ background: 'var(--fiq-faint)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: max > 0 ? `${Math.min(100, (value / max) * 100)}%` : '0%',
                    background: 'var(--fiq-accent)',
                    borderRadius: 4,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan distribution */}
        <div className="fiq-card p-4 mb-4">
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Répartition plans
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Free',     value: overview.free_users,     color: 'var(--fiq-muted)' },
              { label: 'Pro',      value: overview.pro_users,      color: 'var(--fiq-blue)' },
              { label: 'Lifetime', value: overview.lifetime_users, color: 'var(--fiq-accent)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center', background: 'var(--fiq-faint)', borderRadius: 10, padding: '12px 8px' }}>
                <p style={{ fontSize: 22, fontWeight: 900, color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                <p style={{ fontSize: 11, color: 'var(--fiq-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        <div className="fiq-card p-4">
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Derniers inscrits
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recent_users.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--fiq-muted)', textAlign: 'center', padding: '12px 0' }}>Aucun utilisateur</p>
            )}
            {recent_users.map((u, i) => {
              const badge = planBadge(u.plan)
              const joined = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(u.joined))
              return (
                <div key={u.id} style={{
                  padding: '10px 0',
                  borderBottom: i < recent_users.length - 1 ? '1px solid var(--fiq-border)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--fiq-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name}
                    </p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--fiq-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {joined}
                    </p>
                  </div>
                  <span style={{
                    flexShrink: 0,
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: badge.color, background: badge.bg,
                    padding: '3px 8px', borderRadius: 20,
                    border: `1px solid ${badge.color}44`,
                  }}>
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Composant KPI card ─────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color }: {
  icon:  React.ReactNode
  label: string
  value: string
  sub:   string
  color: string
}) {
  return (
    <div className="fiq-card p-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--fiq-text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
          {value}
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--fiq-muted)' }}>
          {sub}
        </p>
      </div>
    </div>
  )
}
