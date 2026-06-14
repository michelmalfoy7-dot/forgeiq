'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Users } from 'lucide-react'

// Dérive un username valide depuis un display_name
function toUsername(name: string): string {
  const base = name.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 20)
  if (base.length === 0) return 'user'
  if (base.length === 1) return base + '00'
  if (base.length === 2) return base + '0'
  return base
}

export function SocialProfileSetup({ displayName }: { displayName?: string | null }) {
  const router = useRouter()
  const [username, setUsername] = useState(() =>
    displayName ? toUsername(displayName) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    const trimmed = username.toLowerCase().trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/social/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed, is_public: true }),
      })
      const json = await res.json() as { data: unknown; error: string | null }

      if (json.error) {
        setError(json.error)
        return
      }

      // Rafraîchir la page pour afficher le feed
      router.refresh()
    } catch {
      setError('Erreur réseau, réessaie.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fiq-card space-y-4"
      style={{ background: '#B4FF4A08', borderColor: '#B4FF4A30' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#B4FF4A20' }}
        >
          <Users className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
        </div>
        <div>
          <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
            Crée ton profil public
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
            Partage tes séances et inspire la communauté — toujours opt-in
          </p>
        </div>
      </div>

      {/* Champ username */}
      <div>
        <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Choisis ton username
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--fiq-muted)' }}
            >
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                setError(null)
              }}
              placeholder="ton_username"
              maxLength={20}
              className="w-full pl-7 pr-3 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--fiq-faint)',
                border: `1px solid ${error ? 'var(--fiq-red)' : 'var(--fiq-border)'}`,
                color: 'var(--fiq-text)',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || username.length < 3}
            className="px-4 py-3 rounded-xl font-black text-sm flex items-center gap-1.5"
            style={{
              background: username.length >= 3 ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
              color: username.length >= 3 ? 'var(--bg)' : 'var(--fiq-muted)',
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
          </button>
        </div>
        {error && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--fiq-red)' }}>
            {error}
          </p>
        )}
        <p className="text-xs mt-1.5" style={{ color: 'var(--fiq-muted)' }}>
          3-20 caractères · lettres minuscules, chiffres et _ uniquement
        </p>
      </div>
    </div>
  )
}
