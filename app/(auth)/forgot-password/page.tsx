'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) throw new Error()
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">📬</div>
          <h2 className="text-xl font-black" style={{ color: 'var(--fiq-text)' }}>Email envoyé !</h2>
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
            Si un compte existe pour <strong style={{ color: 'var(--fiq-text)' }}>{email}</strong>,
            tu recevras un lien pour réinitialiser ton mot de passe dans quelques secondes.
          </p>
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Vérifie aussi tes spams.</p>
          <Link href="/login">
            <Button variant="ghost" className="mt-2" style={{ color: 'var(--fiq-accent)' }}>
              ← Retour à la connexion
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="text-4xl">🔐</div>
          <h1 className="text-2xl fiq-display" style={{ color: 'var(--fiq-text)' }}>Mot de passe oublié</h1>
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
            Entre ton email et on t&apos;envoie un lien de réinitialisation.
          </p>
        </div>

        <div className="fiq-card space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="fiq-label">Adresse email</Label>
              <Input
                id="email"
                type="email"
                placeholder="toi@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
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
              disabled={loading || !email}
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer le lien →'}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/login" className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
