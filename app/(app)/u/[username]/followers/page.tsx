'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, UserPlus, UserMinus, Users } from 'lucide-react'

type FollowProfile = {
  user_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  followers_count: number
  bio: string | null
  is_following: boolean
  is_me: boolean
}

type PageProps = {
  params: Promise<{ username: string }>
  searchParams: Promise<{ tab?: string }>
}

export default function FollowersPage({ params, searchParams }: PageProps) {
  const { username } = use(params)
  const { tab } = use(searchParams)
  const activeTab = tab === 'following' ? 'following' : 'followers'

  const [followers, setFollowers] = useState<FollowProfile[] | null>(null)
  const [following, setFollowing] = useState<FollowProfile[] | null>(null)
  const [loadingFollowers, setLoadingFollowers] = useState(false)
  const [loadingFollowing, setLoadingFollowing] = useState(false)

  // Charger le tab actif au montage ou au changement de tab
  useEffect(() => {
    if (activeTab === 'followers' && followers === null) {
      setLoadingFollowers(true)
      fetch(`/api/social/followers?username=${encodeURIComponent(username)}&type=followers`)
        .then(r => r.json())
        .then((json: { data: FollowProfile[] | null }) => { if (json.data) setFollowers(json.data) })
        .catch(() => setFollowers([]))
        .finally(() => setLoadingFollowers(false))
    }
    if (activeTab === 'following' && following === null) {
      setLoadingFollowing(true)
      fetch(`/api/social/followers?username=${encodeURIComponent(username)}&type=following`)
        .then(r => r.json())
        .then((json: { data: FollowProfile[] | null }) => { if (json.data) setFollowing(json.data) })
        .catch(() => setFollowing([]))
        .finally(() => setLoadingFollowing(false))
    }
  }, [activeTab, username, followers, following])

  async function handleFollow(userId: string, currentlyFollowing: boolean) {
    const method = currentlyFollowing ? 'DELETE' : 'POST'
    const res = await fetch('/api/social/follow', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: userId }),
    })
    if (!res.ok) return

    const update = (list: FollowProfile[]) =>
      list.map(p =>
        p.user_id === userId
          ? { ...p, is_following: !currentlyFollowing, followers_count: p.followers_count + (currentlyFollowing ? -1 : 1) }
          : p
      )

    setFollowers(prev => prev ? update(prev) : prev)
    setFollowing(prev => prev ? update(prev) : prev)
  }

  const currentList = activeTab === 'followers' ? followers : following
  const isLoading   = activeTab === 'followers' ? loadingFollowers : loadingFollowing

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/u/${username}`}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            @{username}
          </h1>
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Communauté</p>
        </div>
      </div>

      {/* Onglets Followers / Following */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
        {(['followers', 'following'] as const).map((tabKey) => (
          <Link
            key={tabKey}
            href={`/u/${username}/followers${tabKey === 'following' ? '?tab=following' : ''}`}
            className="flex-1 py-2 rounded-lg text-sm font-black text-center transition-all"
            style={activeTab === tabKey
              ? { background: 'var(--fiq-card)', color: 'var(--fiq-accent)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
              : { color: 'var(--fiq-muted)' }
            }
          >
            {tabKey === 'followers' ? 'Abonnés' : 'Abonnements'}
          </Link>
        ))}
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="fiq-card flex items-center gap-3 animate-pulse" style={{ padding: '12px 14px' }}>
              <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'var(--fiq-faint)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded" style={{ background: 'var(--fiq-faint)', width: '60%' }} />
                <div className="h-2.5 rounded" style={{ background: 'var(--fiq-faint)', width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : currentList && currentList.length > 0 ? (
        <div className="space-y-2">
          {currentList.map((profile) => {
            const initial = (profile.display_name || profile.username || '?')[0].toUpperCase()
            return (
              <div
                key={profile.user_id}
                className="fiq-card flex items-center gap-3"
                style={{ padding: '12px 14px' }}
              >
                {/* Avatar — lien vers le profil */}
                <Link
                  href={profile.username ? `/u/${profile.username}` : '#'}
                  className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                >
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt={profile.display_name ?? ''} fill className="object-cover" sizes="40px" />
                  ) : initial}
                </Link>

                {/* Infos */}
                <Link href={profile.username ? `/u/${profile.username}` : '#'} className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--fiq-text)' }}>
                    {profile.display_name || profile.username}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                    {profile.username ? `@${profile.username}` : ''}
                    {profile.followers_count > 0 && ` · ${profile.followers_count} abonné${profile.followers_count > 1 ? 's' : ''}`}
                  </p>
                  {profile.bio && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--fiq-muted)' }}>
                      {profile.bio}
                    </p>
                  )}
                </Link>

                {/* Bouton Follow/Unfollow — masqué si c'est nous-même */}
                {!profile.is_me && (
                  <button
                    onClick={() => handleFollow(profile.user_id, profile.is_following)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black flex-shrink-0"
                    style={{
                      background: profile.is_following ? 'var(--fiq-faint)' : 'var(--fiq-accent)',
                      color:      profile.is_following ? 'var(--fiq-muted)' : 'var(--bg)',
                      border:     profile.is_following ? '1px solid var(--fiq-border)' : 'none',
                    }}
                  >
                    {profile.is_following
                      ? <><UserMinus className="w-3.5 h-3.5" /> Suivi</>
                      : <><UserPlus  className="w-3.5 h-3.5" /> Suivre</>
                    }
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : currentList !== null ? (
        <div className="fiq-card text-center py-12">
          <Users className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--fiq-muted)' }} />
          <p className="font-bold text-sm" style={{ color: 'var(--fiq-text)' }}>
            {activeTab === 'followers' ? 'Aucun abonné pour l\'instant' : 'Ne suit personne pour l\'instant'}
          </p>
          {activeTab === 'followers' && (
            <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Partage des séances pour attirer des abonnés
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
