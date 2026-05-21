'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase gère le token depuis l'URL automatiquement via onAuthStateChange
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center space-y-4">
          <CheckCircle className="w-12 h-12 mx-auto" style={{ color: 'var(--fiq-accent)' }} />
          <h2 className="text-xl font-black" style={{ color: 'var(--fiq-text)' }}>Mot de passe mis à jour !</h2>
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Redirection en cours…</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--fiq-accent)' }} />
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Vérification du lien…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="text-4xl">🔑</div>
          <h1 className="text-2xl fiq-display" style={{ color: 'var(--fiq-text)' }}>Nouveau mot de passe</h1>
        </div>

        <div className="fiq-card space-y-5">
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="fiq-label">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="6 caractères minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
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
                placeholder="Répète le mot de passe"
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
              disabled={loading || !password || !confirm}
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer le mot de passe →'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
