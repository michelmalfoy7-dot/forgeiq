'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)
  const [showMagicLink, setShowMagicLink] = useState(false)
  const router = useRouter()

  // Page cible après login (ex: /workout/xxx si la session a expiré en plein logger)
  function getRedirectPath(onboardingDone: boolean): string {
    if (!onboardingDone) return '/onboarding'
    try {
      const next = new URLSearchParams(window.location.search).get('next')
      // Valider chemin interne uniquement (pas d'open redirect)
      if (next && next.startsWith('/') && !next.startsWith('//')) return next
    } catch { /* SSR safety */ }
    return '/dashboard'
  }

  // Connexion par mot de passe (méthode principale)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect.')
      } else if (signInError.message.includes('Email not confirmed')) {
        setError('Email non confirmé. Vérifie ta boîte mail.')
      } else {
        setError(signInError.message)
      }
      return
    }

    // Vérifier si l'onboarding est fait
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_done')
      .eq('id', authData?.user?.id ?? '')
      .maybeSingle()

    router.push(getRedirectPath(profile?.onboarding_done ?? false))
  }

  // Connexion par lien magique (méthode alternative)
  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMagicLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    setMagicLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMagicSent(true)
    }
  }

  if (magicSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">📬</div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--fiq-text)' }}>Vérifie ta boîte mail</h2>
          <p style={{ color: 'var(--fiq-muted)' }}>
            Lien envoyé à <strong style={{ color: 'var(--fiq-text)' }}>{email}</strong>.
          </p>
          <Button variant="ghost" onClick={() => setMagicSent(false)} style={{ color: 'var(--fiq-muted)' }}>
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="text-4xl">⚗️</div>
          <h1 className="text-2xl fiq-display" style={{ color: 'var(--fiq-text)' }}>ForgeIQ</h1>
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Build smarter. Lift harder.</p>
        </div>

        <div className="fiq-card space-y-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--fiq-text)' }}>Connexion</h2>
          </div>

          {!showMagicLink ? (
            // Formulaire mot de passe (par défaut)
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="fiq-label">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="toi@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ background: 'var(--surface)', borderColor: 'var(--fiq-border)', color: 'var(--fiq-text)' }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="fiq-label">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ton mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ background: 'var(--surface)', borderColor: 'var(--fiq-border)', color: 'var(--fiq-text)', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--fiq-muted)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg px-3 py-2 text-sm" style={{ background: '#EF444418', color: 'var(--fiq-red)', border: '1px solid #EF444444' }}>
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full font-black"
                disabled={loading || !email || !password}
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Se connecter'}
              </Button>

              <div className="flex items-center justify-between">
                <Link href="/forgot-password" className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                  Mot de passe oublié ?
                </Link>
                <button
                  type="button"
                  onClick={() => { setShowMagicLink(true); setError(null) }}
                  className="text-xs"
                  style={{ color: 'var(--fiq-muted)' }}
                >
                  Connexion sans mot de passe
                </button>
              </div>
            </form>
          ) : (
            // Formulaire lien magique (alternatif)
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magic-email" className="fiq-label">Adresse email</Label>
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="toi@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ background: 'var(--surface)', borderColor: 'var(--fiq-border)', color: 'var(--fiq-text)' }}
                />
              </div>

              {error && (
                <div className="rounded-lg px-3 py-2 text-sm" style={{ background: '#EF444418', color: 'var(--fiq-red)', border: '1px solid #EF444444' }}>
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full font-black"
                disabled={magicLoading || !email}
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
              >
                {magicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4 mr-2" />Envoyer le lien magique</>}
              </Button>

              <button
                type="button"
                onClick={() => { setShowMagicLink(false); setError(null) }}
                className="w-full text-xs text-center py-1"
                style={{ color: 'var(--fiq-muted)' }}
              >
                ← Retour connexion avec mot de passe
              </button>
            </form>
          )}

          <div className="text-center text-sm" style={{ color: 'var(--fiq-muted)' }}>
            Pas encore de compte ?{' '}
            <Link href="/register" style={{ color: 'var(--fiq-accent)' }} className="font-semibold">
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
