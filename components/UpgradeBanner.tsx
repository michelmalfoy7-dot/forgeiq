'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'

interface Props {
  count: number
  limit: number
  limitReached?: boolean
}

export function UpgradeBanner({ count, limit, limitReached }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade(plan: 'monthly' | 'annual') {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = data.url
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  if (limitReached) {
    return (
      <div
        className="mx-4 mb-4 rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: '#B4FF4A10', border: '1px solid #B4FF4A33' }}
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: '#B4FF4A' }} />
          <p className="text-sm font-black" style={{ color: '#B4FF4A' }}>
            Limite mensuelle atteinte ({limit} messages)
          </p>
        </div>
        <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          Passez en Pro pour un coaching illimité — votre progression ne s'arrête pas.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleUpgrade('monthly')}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-xs font-black disabled:opacity-60"
            style={{ background: '#B4FF4A', color: '#0A0C0F' }}
          >
            {loading ? '...' : 'Pro $7.99/mois'}
          </button>
          <button
            onClick={() => handleUpgrade('annual')}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-xs font-black disabled:opacity-60"
            style={{ background: 'var(--fiq-card)', border: '1px solid #B4FF4A44', color: '#B4FF4A' }}
          >
            {loading ? '...' : 'Annuel $59.99 −37%'}
          </button>
        </div>
      </div>
    )
  }

  // Avertissement préventif quand il reste peu de messages
  const remaining = limit - count
  if (remaining > 5) return null

  return (
    <div
      className="mx-4 mb-3 px-3 py-2 rounded-xl flex items-center justify-between gap-3"
      style={{ background: '#F59E0B10', border: '1px solid #F59E0B33' }}
    >
      <p className="text-xs" style={{ color: '#F59E0B' }}>
        {remaining} message{remaining > 1 ? 's' : ''} coach restant{remaining > 1 ? 's' : ''} ce mois
      </p>
      <button
        onClick={() => handleUpgrade('annual')}
        disabled={loading}
        className="text-xs font-black px-3 py-1.5 rounded-lg flex-shrink-0 disabled:opacity-60"
        style={{ background: '#F59E0B', color: '#0A0C0F' }}
      >
        {loading ? '...' : 'Passer Pro'}
      </button>
    </div>
  )
}
