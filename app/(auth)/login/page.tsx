'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">📬</div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--fiq-text)' }}>
            Vérifie ta boîte mail
          </h2>
          <p style={{ color: 'var(--fiq-muted)' }}>
            On a envoyé un lien de connexion à <strong style={{ color: 'var(--fiq-text)' }}>{email}</strong>.
            Clique dessus pour accéder à ForgeIQ.
          </p>
          <Button
            variant="ghost"
            onClick={() => setSent(false)}
            style={{ color: 'var(--fiq-muted)' }}
          >
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
          <h1 className="text-2xl fiq-display" style={{ color: 'var(--fiq-text)' }}>
            ForgeIQ
          </h1>
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
            Build smarter. Lift harder.
          </p>
        </div>

        <div className="fiq-card space-y-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--fiq-text)' }}>
              Connexion
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Reçois un lien magique par email — sans mot de passe.
            </p>
          </div>

          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="fiq-label">
                Adresse email
              </Label>
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

            {error && (
              <div className="fiq-alert-red text-sm" style={{ color: 'var(--fiq-red)' }}>
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-black"
              disabled={loading || !email}
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer le lien magique
                </>
              )}
            </Button>
          </form>

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
