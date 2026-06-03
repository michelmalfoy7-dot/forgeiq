'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────

type FastingSession = {
  id: string
  start_time: string
  end_time: string | null
  target_hours: number
  log_date: string
}

type FastingData = {
  active: FastingSession | null
  history: FastingSession[]
  streak: number
}

// ── Protocoles populaires ──────────────────────────────────────

const PROTOCOLS = [
  { label: '16:8',  hours: 16, sub: 'Lean Gains' },
  { label: '18:6',  hours: 18, sub: 'Intermédiaire' },
  { label: '20:4',  hours: 20, sub: 'Warrior' },
  { label: 'OMAD',  hours: 23, sub: 'Un repas/j' },
]

// ── Helpers ────────────────────────────────────────────────────

function fmtTime(ms: number) {
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h${m.toString().padStart(2, '0')}`
}

function fmtHour(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

function fmtDay(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' }).format(new Date(dateStr + 'T12:00:00'))
}

// ── Composant principal ────────────────────────────────────────

export function FastingWidget() {
  const [data,       setData]       = useState<FastingData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [acting,     setActing]     = useState(false)
  const [targetH,    setTargetH]    = useState(16)
  const [customH,    setCustomH]    = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)
  const [now,        setNow]        = useState(Date.now())

  // ── Fetch ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch('/api/fasting')
      const json = await res.json()
      if (json.data) {
        setData(json.data)
        if (json.data.active) setTargetH(json.data.active.target_hours)
      }
    } catch { /* silencieux */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Live timer quand jeûne actif
  useEffect(() => {
    if (!data?.active) return
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [data?.active])

  // ── Actions ────────────────────────────────────────────────
  async function startFast() {
    const hours = showCustom && customH ? parseInt(customH) : targetH
    if (isNaN(hours) || hours < 1 || hours > 48) return
    setActing(true)
    try {
      await fetch('/api/fasting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_hours: hours }),
      })
      await fetchData()
    } finally { setActing(false) }
  }

  async function stopFast() {
    if (!data?.active) return
    setActing(true)
    try {
      await fetch('/api/fasting', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.active.id }),
      })
      await fetchData()
    } finally { setActing(false) }
  }

  async function cancelFast() {
    if (!data?.active) return
    setActing(true)
    try {
      await fetch('/api/fasting', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.active.id }),
      })
      await fetchData()
    } finally { setActing(false) }
  }

  // ── Calculs temps ──────────────────────────────────────────
  const active     = data?.active
  const elapsedMs  = active ? now - new Date(active.start_time).getTime() : 0
  const targetMs   = (active?.target_hours ?? targetH) * 3600000
  const pct        = active ? Math.min(100, (elapsedMs / targetMs) * 100) : 0
  const done       = pct >= 100
  const endTime    = active ? new Date(new Date(active.start_time).getTime() + active.target_hours * 3600000) : null

  // Couleur dynamique : bleu → jaune → vert à l'objectif
  const ringColor = done
    ? 'var(--fiq-accent)'
    : pct > 75
      ? '#F59E0B'
      : 'var(--fiq-blue)'

  // SVG ring
  const R    = 38
  const circ = 2 * Math.PI * R
  const dash = (pct / 100) * circ

  if (loading) return null

  return (
    <div className="fiq-card">
      {/* ── Header cliquable (collapse) ── */}
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">⏱</span>
          <div className="text-left">
            <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Jeûne intermittent</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--fiq-muted)' }}>
              {active
                ? `En cours · ${fmtTime(elapsedMs)} / ${active.target_hours}h`
                : data?.streak
                  ? `🔥 ${data.streak} jour${data.streak > 1 ? 's' : ''} d'affilée`
                  : 'Tracker fenêtre alimentaire'
              }
            </p>
          </div>
        </div>
        <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-3">
          {active ? (
            /* ── Jeûne en cours ── */
            <div className="space-y-3">
              {/* Ring + infos */}
              <div className="flex items-center gap-4">
                {/* SVG Ring */}
                <div className="relative flex-shrink-0">
                  <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
                    <circle cx="46" cy="46" r={R} fill="none" stroke="var(--fiq-faint)" strokeWidth="7" />
                    <circle
                      cx="46" cy="46" r={R} fill="none"
                      stroke={ringColor} strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={`${dash} ${circ}`}
                      style={{ transition: 'stroke-dasharray 0.5s ease' }}
                    />
                  </svg>
                  {/* Texte centré — annuler la rotation avec re-rotate */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-black fiq-data" style={{ color: ringColor }}>
                      {fmtTime(elapsedMs)}
                    </span>
                    <span className="text-[9px]" style={{ color: 'var(--fiq-muted)' }}>
                      / {active.target_hours}h
                    </span>
                  </div>
                </div>

                {/* Détails */}
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold" style={{ color: done ? 'var(--fiq-accent)' : 'var(--fiq-text)' }}>
                    {done ? '✅ Objectif atteint !' : `${Math.round(pct)}% accompli`}
                  </p>
                  <div className="space-y-0.5">
                    <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                      🕐 Début : <span className="font-semibold" style={{ color: 'var(--fiq-text)' }}>{fmtHour(active.start_time)}</span>
                    </p>
                    {endTime && !done && (
                      <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                        🏁 Fin prévue : <span className="font-semibold" style={{ color: ringColor }}>{fmtHour(endTime.toISOString())}</span>
                      </p>
                    )}
                    {!done && (
                      <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                        ⏳ Restant : <span className="font-semibold" style={{ color: 'var(--fiq-text)' }}>{fmtTime(Math.max(0, targetMs - elapsedMs))}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Barre linéaire */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fiq-faint)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${pct}%`, background: ringColor }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={stopFast} disabled={acting}
                  className="flex-1 py-2.5 rounded-xl font-black text-sm transition-all"
                  style={{
                    background: done ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                    color: done ? 'var(--bg)' : 'var(--fiq-accent)',
                    border: `1px solid ${done ? 'var(--fiq-accent)' : '#B4FF4A44'}`,
                  }}
                >
                  {acting ? '…' : done ? '✅ Terminer le jeûne' : '🛑 Terminer maintenant'}
                </button>
                <button
                  onClick={cancelFast} disabled={acting}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
                  title="Annuler et supprimer ce jeûne"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            /* ── Aucun jeûne actif — sélection protocole ── */
            <div className="space-y-3">
              {/* Protocoles */}
              <div className="grid grid-cols-2 gap-1.5">
                {PROTOCOLS.map((p) => {
                  const isActive = targetH === p.hours && !showCustom
                  return (
                    <button
                      key={p.hours}
                      onClick={() => { setTargetH(p.hours); setShowCustom(false) }}
                      className="flex flex-col items-start px-3 py-2 rounded-xl text-left transition-all"
                      style={{
                        background: isActive ? '#3D8BFF18' : 'var(--fiq-faint)',
                        border: `1px solid ${isActive ? '#3D8BFF55' : 'var(--fiq-border)'}`,
                      }}
                    >
                      <span className="text-sm font-black" style={{ color: isActive ? 'var(--fiq-blue)' : 'var(--fiq-text)' }}>
                        {p.label}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>{p.sub}</span>
                    </button>
                  )
                })}

                {/* Personnalisé */}
                <button
                  onClick={() => setShowCustom(c => !c)}
                  className="flex flex-col items-start px-3 py-2 rounded-xl text-left transition-all"
                  style={{
                    background: showCustom ? '#B4FF4A18' : 'var(--fiq-faint)',
                    border: `1px solid ${showCustom ? '#B4FF4A55' : 'var(--fiq-border)'}`,
                  }}
                >
                  <span className="text-sm font-black" style={{ color: showCustom ? 'var(--fiq-accent)' : 'var(--fiq-text)' }}>
                    Custom
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>Tes heures</span>
                </button>
              </div>

              {/* Input personnalisé */}
              {showCustom && (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="1" max="48"
                    placeholder="ex: 14"
                    value={customH}
                    onChange={e => setCustomH(e.target.value)}
                    className="w-20 text-center rounded-xl h-9 text-sm font-bold"
                    style={{
                      background: 'var(--fiq-faint)',
                      border: '1px solid var(--fiq-border)',
                      color: 'var(--fiq-text)',
                    }}
                  />
                  <span className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
                    heures de jeûne
                  </span>
                </div>
              )}

              {/* Historique récent */}
              {(data?.history?.length ?? 0) > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--fiq-muted)' }}>Récent</p>
                  {(data?.history ?? []).slice(0, 3).map((s, i) => {
                    const durMs  = s.end_time
                      ? new Date(s.end_time).getTime() - new Date(s.start_time).getTime()
                      : null
                    const success = durMs !== null && durMs >= s.target_hours * 3600000
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--fiq-muted)' }}>{fmtDay(s.log_date)}</span>
                        <span style={{ color: success ? 'var(--fiq-accent)' : 'var(--fiq-orange)' }}>
                          {success ? '✅' : '⚠️'} {durMs !== null ? fmtTime(durMs) : '—'} / {s.target_hours}h
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Bouton démarrer */}
              <button
                onClick={startFast} disabled={acting}
                className="w-full py-3 rounded-xl font-black text-sm transition-all"
                style={{
                  background: 'var(--fiq-faint)',
                  border: '1px solid var(--fiq-border)',
                  color: 'var(--fiq-accent)',
                }}
              >
                {acting
                  ? '…'
                  : `▶ Démarrer le jeûne ${showCustom && customH ? `${customH}h` : `${targetH}h`}`
                }
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
