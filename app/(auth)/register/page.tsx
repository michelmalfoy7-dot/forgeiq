'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [refCode, setRefCode] = useState<string | null>(null)
  const router = useRouter()

  // Code referral depuis l'URL (?ref=XXXXXXXX) — dans useEffect pour éviter l'hydration mismatch
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('ref')
    if (code) setRefCode(code)
  }, [])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!displayName.trim()) {
      setError('Entre ton prénom ou un pseudo.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { display_name: displayName.trim() },
      },
    })

    setLoading(false)

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Cet email est déjà utilisé. Connecte-toi plutôt.')
      } else {
        setError(signUpError.message)
      }
      return
    }

    // Si Supabase ne demande pas de confirmation (email auto-confirm activé)
    if (data.session) {
      // Sauvegarder le display_name dans profiles (fire-and-forget — le trigger Supabase crée la row)
      void supabase.from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', data.user!.id)

      // Appliquer le code referral si présent (fire-and-forget)
      if (refCode) {
        fetch('/api/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: refCode }),
        }).catch(() => null)
      }
      router.push('/onboarding')
      return
    }

    // Sinon : email de confirmation envoyé
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">📬</div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--fiq-text)' }}>
            Confirme ton email
          </h2>
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
            On a envoyé un lien à <strong style={{ color: 'var(--fiq-text)' }}>{email}</strong>.
            Clique dessus pour finaliser ton inscription — c&apos;est la seule fois.
          </p>
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            Ensuite tu te connecteras directement avec ton mot de passe, sans passer par le mail.
          </p>
          <Button variant="ghost" onClick={() => setSent(false)} style={{ color: 'var(--fiq-muted)' }}>
            Utiliser une autre adresse
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
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Ton coach IA. Ta progression.</p>
        </div>

        <div className="fiq-card space-y-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--fiq-text)' }}>Créer un compte</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Gratuit. Sans carte bancaire.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="fiq-label">Prénom ou pseudo</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Ex: Michel, MikeLifts, Coach_M…"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={50}
                style={{ background: 'var(--surface)', borderColor: 'var(--fiq-border)', color: 'var(--fiq-text)' }}
              />
            </div>

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
                  placeholder="8 caractères minimum"
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

            <div className="space-y-2">
              <Label htmlFor="confirm" className="fiq-label">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="Répète ton mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              disabled={loading || !displayName.trim() || !email || !password || !confirm}
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer mon compte'}
            </Button>
          </form>

          <div className="text-center text-sm" style={{ color: 'var(--fiq-muted)' }}>
            Déjà un compte ?{' '}
            <Link href="/login" style={{ color: 'var(--fiq-accent)' }} className="font-semibold">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
