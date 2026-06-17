'use client'

import { useEffect, useState } from 'react'
import { Users, TrendingUp, CreditCard, Zap, RefreshCw, AlertTriangle, Flame, Dumbbell, Share2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'

interface UserRow {
  id:              string
  name:            string
  email:           string
  plan:            string
  trial_until:     string | null
  joined:          string
  checkin_streak:  number
  training_streak: number
  referral_count:  number
  referred_by:     string | null
  last_workout:    string | null
  last_checkin:    string | null
}

interface AdminStats {
  overview: {
    total_users:     number
    paying_users:    number
    free_users:      number
    trial_users:     number
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
  pagination: {
    page:        number
    limit:       number
    total_users: number
    total_pages: number
    has_next:    boolean
  }
  users: UserRow[]
  generated_at: string
}

// Nombre d'utilisateurs affichés par page dans l'UI admin
const ADMIN_PAGE_LIMIT = 50

export default function AdminPage() {
  const [stats, setStats]           = useState<AdminStats | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  // Page courante de la liste utilisateurs (1-based)
  const [page, setPage]             = useState(1)

  async function load(targetPage = page, isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res  = await fetch(`/api/admin/stats?page=${targetPage}&limit=${ADMIN_PAGE_LIMIT}`)
      const json = await res.json()
      if (json.error) setError(json.error)
      else {
        setStats(json.data)
        setError(null)
        // Réinitialise l'accordéon à chaque changement de page
        setExpandedId(null)
      }
    } catch {
      setError('Impossible de charger les stats')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load(page) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--fiq-accent)', borderTopColor: 'transparent' }} />
        <p style={{ color: 'var(--fiq-muted)', fontSize: 13 }}>Chargement des stats…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="fiq-card p-6 text-center max-w-sm w-full">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--fiq-red)' }} />
        <p style={{ color: 'var(--fiq-text)', fontWeight: 800, marginBottom: 4 }}>Accès refusé</p>
        <p style={{ color: 'var(--fiq-muted)', fontSize: 13 }}>{error}</p>
      </div>
    </div>
  )

  if (!stats) return null

  const { overview, growth, pagination, users, generated_at } = stats

  const updatedAt = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(generated_at))

  function planBadge(u: UserRow) {
    if (u.plan === 'lifetime') return { label: 'Lifetime', color: 'var(--fiq-accent)', bg: '#B4FF4A22' }
    if (u.plan === 'pro')      return { label: 'Pro',      color: 'var(--fiq-blue)',   bg: '#3D8BFF22' }
    if (u.trial_until && new Date(u.trial_until) > new Date())
      return { label: 'Trial', color: 'var(--fiq-orange)', bg: '#FF6B3522' }
    return { label: 'Free', color: 'var(--fiq-muted)', bg: '#6B728022' }
  }

  function relativeTime(iso: string | null) {
    if (!iso) return null
    const d   = new Date(iso)
    const now = Date.now()
    const ms  = now - d.getTime()
    const h   = Math.floor(ms / 3600000)
    const day = Math.floor(ms / 86400000)
    if (h < 1)  return "à l'instant"
    if (h < 24) return `il y a ${h}h`
    if (day < 7) return `il y a ${day}j`
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(d)
  }

  const totalReferrals = users.reduce((s, u) => s + u.referral_count, 0)
  const usersWithReferral = users.filter(u => u.referral_count > 0)

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

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
            onClick={() => load(page, true)}
            disabled={refreshing}
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} style={{ color: 'var(--fiq-accent)' }} />
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
            sub={`${growth.new_last_24h} inscrit(s) aujourd'hui`}
            color="var(--fiq-yellow)"
          />
        </div>

        {/* Growth bars */}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Free',     value: overview.free_users,    color: 'var(--fiq-muted)' },
              { label: 'Trial',    value: overview.trial_users,   color: 'var(--fiq-orange)' },
              { label: 'Pro',      value: overview.pro_users,     color: 'var(--fiq-blue)' },
              { label: 'Lifetime', value: overview.lifetime_users, color: 'var(--fiq-accent)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', background: 'var(--fiq-faint)', borderRadius: 10, padding: '10px 4px' }}>
                <p style={{ fontSize: 20, fontWeight: 900, color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                <p style={{ fontSize: 10, color: 'var(--fiq-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Referral summary */}
        {totalReferrals > 0 && (
          <div className="fiq-card p-4 mb-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Share2 className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Referrals — {totalReferrals} invitation{totalReferrals > 1 ? 's' : ''} utilisée{totalReferrals > 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {usersWithReferral.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--fiq-text)', fontWeight: 700 }}>{u.name}</span>
                  <span style={{ color: 'var(--fiq-accent)', fontWeight: 800 }}>
                    {u.referral_count}/3 invité{u.referral_count > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users list */}
        <div className="fiq-card p-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fiq-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Utilisateurs ({pagination.total_users}) — page {pagination.page}/{pagination.total_pages}
            </p>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Nom ou email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)',
              borderRadius: 10, padding: '8px 12px', fontSize: 13, color: 'var(--fiq-text)',
              outline: 'none', marginBottom: 12,
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.length === 0 && !search && (
              <p style={{ fontSize: 13, color: 'var(--fiq-muted)', textAlign: 'center', padding: '12px 0' }}>Aucun utilisateur sur cette page</p>
            )}
            {filtered.length === 0 && search && (
              <p style={{ fontSize: 13, color: 'var(--fiq-muted)', textAlign: 'center', padding: '12px 0' }}>Aucun résultat pour «&nbsp;{search}&nbsp;»</p>
            )}
            {filtered.map((u, i) => {
              const badge   = planBadge(u)
              const joined  = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(u.joined))
              const lastAct = u.last_workout
                ? relativeTime(u.last_workout)
                : u.last_checkin
                  ? relativeTime(u.last_checkin)
                  : null
              const expanded = expandedId === u.id

              return (
                <div key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--fiq-border)' : 'none' }}>
                  {/* Row */}
                  <button
                    onClick={() => setExpandedId(expanded ? null : u.id)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
                  >
                    {/* Avatar initial */}
                    <div style={{
                      flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 900, color: 'var(--fiq-text)',
                    }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--fiq-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.name}
                        </p>
                        <span style={{
                          flexShrink: 0,
                          fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: badge.color, background: badge.bg,
                          padding: '2px 6px', borderRadius: 20,
                          border: `1px solid ${badge.color}44`,
                        }}>
                          {badge.label}
                        </span>
                      </div>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--fiq-accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                        {u.email}
                      </p>
                      <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--fiq-muted)' }}>
                        Inscrit le {joined}{lastAct ? ` · actif ${lastAct}` : ''}
                      </p>
                    </div>

                    {/* Streaks */}
                    <div style={{ flexShrink: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
                      {u.checkin_streak > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--fiq-orange)', display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Flame className="w-3 h-3" />{u.checkin_streak}
                        </span>
                      )}
                      {u.training_streak > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--fiq-blue)', display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Dumbbell className="w-3 h-3" />{u.training_streak}
                        </span>
                      )}
                      {expanded
                        ? <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--fiq-muted)' }} />
                        : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--fiq-muted)' }} />
                      }
                    </div>
                  </button>

                  {/* Expanded details */}
                  {expanded && (
                    <div style={{
                      background: 'var(--fiq-faint)', borderRadius: 10, padding: '10px 12px',
                      marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6,
                    }}>
                      <DetailRow label="Email" value={u.email} />
                      <DetailRow label="Inscrit le" value={new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(u.joined))} />
                      <DetailRow label="Dernière séance" value={relativeTime(u.last_workout) ?? '—'} />
                      <DetailRow label="Dernier check-in" value={relativeTime(u.last_checkin) ?? '—'} />
                      {lastAct && (
                        <DetailRow label="Dernière activité" value={lastAct} />
                      )}
                      <DetailRow label="Streak check-in" value={`${u.checkin_streak} jour${u.checkin_streak > 1 ? 's' : ''}`} />
                      <DetailRow label="Streak entraîn." value={`${u.training_streak} semaine${u.training_streak > 1 ? 's' : ''}`} />
                      <DetailRow label="Referrals" value={`${u.referral_count}/3`} />
                      {u.referred_by && (
                        <DetailRow label="Invité par code" value={u.referred_by} mono />
                      )}
                      {u.trial_until && (
                        <DetailRow
                          label="Trial jusqu'au"
                          value={new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(u.trial_until))}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Contrôles de pagination — Précédent / Suivant */}
          {pagination.total_pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--fiq-border)' }}>
              <button
                onClick={() => { const prev = page - 1; setPage(prev); }}
                disabled={page <= 1 || loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: page <= 1 ? 'var(--fiq-faint)' : 'var(--fiq-faint)',
                  border: '1px solid var(--fiq-border)', borderRadius: 8,
                  padding: '6px 12px', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.4 : 1,
                }}
              >
                <ChevronLeft className="w-4 h-4" style={{ color: 'var(--fiq-text)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fiq-text)' }}>Précédent</span>
              </button>

              <span style={{ fontSize: 12, color: 'var(--fiq-muted)' }}>
                {page} / {pagination.total_pages}
              </span>

              <button
                onClick={() => { const next = page + 1; setPage(next); }}
                disabled={!pagination.has_next || loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'var(--fiq-faint)',
                  border: '1px solid var(--fiq-border)', borderRadius: 8,
                  padding: '6px 12px', cursor: !pagination.has_next ? 'not-allowed' : 'pointer',
                  opacity: !pagination.has_next ? 0.4 : 1,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fiq-text)' }}>Suivant</span>
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--fiq-text)' }} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Composants utilitaires ─────────────────────────────────────────────────

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

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--fiq-muted)' }}>{label}</span>
      <span style={{ color: 'var(--fiq-text)', fontWeight: 700, fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? 11 : 12 }}>
        {value}
      </span>
    </div>
  )
}
