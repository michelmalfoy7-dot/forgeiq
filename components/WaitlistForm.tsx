'use client'

import { useState } from 'react'
import { Loader2, ArrowRight, Check } from 'lucide-react'

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm"
        style={{ background: '#B4FF4A22', border: '1px solid #B4FF4A44', color: 'var(--fiq-accent)' }}>
        <Check className="w-4 h-4" />
        Inscrit ! On te contacte bientôt.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="ton@email.com"
        required
        className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-4 py-3 rounded-xl font-black text-sm flex items-center gap-1.5 flex-shrink-0"
        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
      >
        {status === 'loading'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <><ArrowRight className="w-4 h-4" />S&apos;inscrire</>
        }
      </button>
    </form>
  )
}
