'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export function CancelWorkoutButton({ workoutId, label = 'Annuler' }: { workoutId: string; label?: string }) {
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const router = useRouter()

  async function handleCancel() {
    if (!confirmed) {
      // Premier clic → demande confirmation
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 3000) // reset après 3s si pas confirmé
      return
    }
    // Deuxième clic → suppression réelle
    setLoading(true)
    try {
      const res = await fetch('/api/workout/delete-today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout_id: workoutId }),
      })
      const { data, error } = await res.json()
      if (data?.deleted) {
        router.refresh()
      } else {
        console.error('Erreur annulation:', error)
        setConfirmed(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
      style={{
        background: confirmed ? '#EF444418' : 'var(--fiq-faint)',
        border: `1px solid ${confirmed ? '#EF444444' : 'var(--fiq-border)'}`,
        color: confirmed ? 'var(--fiq-red)' : 'var(--fiq-muted)',
        minWidth: '80px',
      }}
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : confirmed
        ? <><Trash2 className="w-3.5 h-3.5" /> Confirmer</>
        : label
      }
    </button>
  )
}
