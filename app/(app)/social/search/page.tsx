'use client'

import { useState, useCallback } from 'react'
import { Search, Users, Loader2, UserPlus, UserMinus } from 'lucide-react'
import Link from 'next/link'

type SearchResult = {
  user_id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  followers_count: number
  following_count: number
  is_following: boolean
}

export default function SocialSearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Recherche avec debounce 300ms
  const handleSearch = useCallback((q: string) => {
    setQuery(q)

    if (debounceTimer) clearTimeout(debounceTimer)

    if (q.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/social/search?q=${encodeURIComponent(q)}`)
        const json = await res.json() as { data: SearchResult[] | null; error: string | null }
        if (json.data) setResults(json.data)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    setDebounceTimer(timer)
  }, [debounceTimer])

  async function handleFollow(userId: string, currentlyFollowing: boolean) {
    const method = currentlyFollowing ? 'DELETE' : 'POST'

    const res = await fetch('/api/social/follow', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: userId }),
    })

    if (res.ok) {
      // Mise à jour optimiste de la liste
      setResults((prev) =>
        prev.map((r) =>
          r.user_id === userId
            ? {
                ...r,
                is_following: !currentlyFollowing,
                followers_count: r.followers_count + (currentlyFollowing ? -1 : 1),
              }
            : r
        )
      )
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/social"
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          ←
        </Link>
        <div>
          <h1 className="text-lg font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            Découvrir des athlètes
          </h1>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Rechercher un username..."
          autoFocus
          className="w-full outline-none text-sm"
          style={{
            paddingLeft: 36,
            paddingRight: 40,
            paddingTop: 12,
            paddingBottom: 12,
            background: 'var(--fiq-faint)',
            border: '1px solid var(--fiq-border)',
            borderRadius: 12,
            color: 'var(--fiq-text)',
          }}
        />
        {loading && (
          <Loader2
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
            style={{ color: 'var(--fiq-muted)' }}
          />
        )}
      </div>

      {/* Résultats */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => {
            const initial = (result.display_name || result.username || '?')[0].toUpperCase()
            return (
              <div
                key={result.user_id}
                className="fiq-card flex items-center gap-3"
                style={{ padding: '12px 14px' }}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                >
                  {result.avatar_url ? (
                    // eslint-disable-next-line @next/next-eslint/no-img-element
                    <img src={result.avatar_url} alt={result.display_name ?? ''} className="w-full h-full rounded-xl object-cover" />
                  ) : initial}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--fiq-text)' }}>
                    {result.display_name || result.username}
                  </p>
                  {result.username && (
                    <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                      @{result.username} · {result.followers_count} abonné{result.followers_count > 1 ? 's' : ''}
                    </p>
                  )}
                  {result.bio && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--fiq-muted)' }}>
                      {result.bio}
                    </p>
                  )}
                </div>

                {/* Bouton Follow/Unfollow */}
                <button
                  onClick={() => handleFollow(result.user_id, result.is_following)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black flex-shrink-0"
                  style={{
                    background: result.is_following ? 'var(--fiq-faint)' : 'var(--fiq-accent)',
                    color: result.is_following ? 'var(--fiq-muted)' : 'var(--bg)',
                    border: result.is_following ? '1px solid var(--fiq-border)' : 'none',
                  }}
                >
                  {result.is_following ? (
                    <><UserMinus className="w-3.5 h-3.5" /> Suivi</>
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5" /> Suivre</>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* État vide */}
      {query.length >= 2 && !loading && results.length === 0 && (
        <div className="text-center py-10">
          <Users className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--fiq-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>
            Aucun athlète trouvé
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
            Essaie un autre username
          </p>
        </div>
      )}

      {/* Invite initiale */}
      {query.length < 2 && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
            Tape au moins 2 caractères pour rechercher
          </p>
        </div>
      )}
    </div>
  )
}
