'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

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
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div
        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
        style={{ background: '#B4FF4A15', border: '1px solid #B4FF4A44', color: '#B4FF4A' }}
      >
        ✓ Tu es sur la liste — on te prévient en premier !
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm mx-auto">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="ton@email.com"
        required
        className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
        style={{
          background: 'var(--fiq-surface)',
          border: '1px solid var(--fiq-border)',
          color: 'var(--fiq-text)',
        }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-4 py-3 rounded-xl font-black text-sm flex items-center gap-1 flex-shrink-0 disabled:opacity-60"
        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
      >
        {status === 'loading' ? '...' : <>Rejoindre <ChevronRight className="w-4 h-4" /></>}
      </button>
    </form>
  )
}
