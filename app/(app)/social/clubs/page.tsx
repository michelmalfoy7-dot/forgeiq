'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Users, X } from 'lucide-react'
import Link from 'next/link'

type Club = {
  id: string
  name: string
  description: string | null
  emoji: string
  member_count: number
  isMember?: boolean
  myRole?: string
}

const EMOJI_OPTIONS = ['🏋️', '🏃', '🚴', '🤸', '⚽', '🧘']

export default function ClubsPage() {
  const router = useRouter()

  const [myClubs, setMyClubs] = useState<Club[]>([])
  const [allClubs, setAllClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  // Modal création
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', emoji: '🏋️' })
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [resAll, resMy] = await Promise.all([
      fetch('/api/social/clubs'),
      fetch('/api/social/clubs?my=true'),
    ])
    const [jsonAll, jsonMy] = await Promise.all([resAll.json(), resMy.json()])
    setAllClubs(jsonAll.data ?? [])
    setMyClubs(jsonMy.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const myClubIds = new Set(myClubs.map((c) => c.id))

  async function handleJoinLeave(club: Club, action: 'join' | 'leave') {
    setActionId(club.id)
    const res = await fetch('/api/social/clubs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ club_id: club.id, action }),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json.error ?? 'Erreur')
      setActionId(null)
      return
    }
    await fetchAll()
    setActionId(null)
  }

  async function handleCreate() {
    setFormError('')
    if (!form.name.trim()) { setFormError('Le nom est requis.'); return }
    setCreating(true)
    const res = await fetch('/api/social/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) {
      setFormError(json.error ?? 'Erreur lors de la création.')
      setCreating(false)
      return
    }
    setShowModal(false)
    setForm({ name: '', description: '', emoji: '🏋️' })
    setCreating(false)
    await fetchAll()
  }

  const discoverClubs = allClubs.filter((c) => !myClubIds.has(c.id))

  return (
    <div
      className="max-w-lg mx-auto p-4 space-y-5"
      style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          </button>
          <div>
            <h1
              className="text-xl font-black"
              style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}
            >
              Clubs ForgeIQ
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
              Rejoins ou crée un groupe
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Créer
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="fiq-card h-20 animate-pulse"
              style={{ background: 'var(--fiq-faint)' }}
            />
          ))}
        </div>
      ) : (
        <>
          {/* ── Mes clubs ── */}
          {myClubs.length > 0 && (
            <section className="space-y-2">
              <h2
                className="text-xs font-black uppercase"
                style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}
              >
                Mes clubs
              </h2>
              <div className="space-y-2">
                {myClubs.map((club) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    isMember
                    isCreator={club.myRole === 'admin'}
                    loading={actionId === club.id}
                    onAction={() => handleJoinLeave(club, 'leave')}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Découvrir ── */}
          <section className="space-y-2">
            <h2
              className="text-xs font-black uppercase"
              style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}
            >
              Découvrir
            </h2>
            {discoverClubs.length === 0 ? (
              <div
                className="fiq-card text-center py-10"
                style={{ color: 'var(--fiq-muted)' }}
              >
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-sm">Tu fais partie de tous les clubs disponibles !</p>
              </div>
            ) : (
              <div className="space-y-2">
                {discoverClubs.map((club) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    isMember={false}
                    isCreator={false}
                    loading={actionId === club.id}
                    onAction={() => handleJoinLeave(club, 'join')}
                  />
                ))}
              </div>
            )}
          </section>

          {/* État vide total */}
          {myClubs.length === 0 && discoverClubs.length === 0 && (
            <div className="fiq-card text-center py-12 space-y-4">
              <p className="text-4xl">🏋️</p>
              <div>
                <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>
                  Aucun club pour l&apos;instant
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
                  Sois le premier à créer une communauté ForgeIQ.
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm"
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
              >
                <Plus className="w-4 h-4" /> Créer le premier club
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Modal création ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>
                Créer un club
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ background: 'var(--fiq-faint)' }}
              >
                <X className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
              </button>
            </div>

            {/* Emoji picker */}
            <div>
              <p className="text-xs font-black uppercase mb-2" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
                Icône
              </p>
              <div className="flex gap-2 flex-wrap">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                    className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                    style={{
                      background: form.emoji === e ? '#B4FF4A20' : 'var(--fiq-faint)',
                      border: `1px solid ${form.emoji === e ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Nom */}
            <div>
              <label className="text-xs font-black uppercase block mb-1.5" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
                Nom <span style={{ color: 'var(--fiq-red)' }}>*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex : Powerlifters Paris"
                maxLength={50}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--fiq-faint)',
                  border: '1px solid var(--fiq-border)',
                  color: 'var(--fiq-text)',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-black uppercase block mb-1.5" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.08em' }}>
                Description <span style={{ color: 'var(--fiq-muted)' }}>(optionnel)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="De quoi parle ce club ?"
                rows={2}
                maxLength={200}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{
                  background: 'var(--fiq-faint)',
                  border: '1px solid var(--fiq-border)',
                  color: 'var(--fiq-text)',
                }}
              />
            </div>

            {formError && (
              <p className="text-xs" style={{ color: 'var(--fiq-red)' }}>{formError}</p>
            )}

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-3 rounded-xl font-black text-sm disabled:opacity-50"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              {creating ? 'Création…' : `${form.emoji} Créer le club`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Composant carte club ─────────────────────────────────────────────────────

type ClubCardProps = {
  club: Club
  isMember: boolean
  isCreator: boolean
  loading: boolean
  onAction: () => void
}

function ClubCard({ club, isMember, isCreator, loading, onAction }: ClubCardProps) {
  return (
    <div
      className="fiq-card flex items-center gap-3 p-4"
      style={isMember ? { borderColor: '#B4FF4A30', background: '#B4FF4A06' } : {}}
    >
      {/* Emoji */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: 'var(--fiq-faint)' }}
      >
        {club.emoji}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm truncate" style={{ color: 'var(--fiq-text)' }}>
          {club.name}
        </p>
        {club.description && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
            {club.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1">
          <Users className="w-3 h-3" style={{ color: 'var(--fiq-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            {club.member_count} membre{club.member_count !== 1 ? 's' : ''}
          </span>
          {isCreator && (
            <span
              className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase"
              style={{ background: '#B4FF4A22', color: 'var(--fiq-accent)', letterSpacing: '0.06em' }}
            >
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      {isMember ? (
        <button
          onClick={onAction}
          disabled={loading || isCreator}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black disabled:opacity-40 transition-opacity"
          style={{
            border: '1px solid var(--fiq-border)',
            color: 'var(--fiq-muted)',
            background: 'transparent',
          }}
          title={isCreator ? 'Le créateur ne peut pas quitter' : undefined}
        >
          {loading ? '…' : isCreator ? 'Créateur' : 'Quitter'}
        </button>
      ) : (
        <button
          onClick={onAction}
          disabled={loading}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black disabled:opacity-40 transition-opacity"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          {loading ? '…' : 'Rejoindre'}
        </button>
      )}
    </div>
  )
}
