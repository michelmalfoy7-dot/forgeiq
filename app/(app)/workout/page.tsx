'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertBar } from '@/components/ui/AlertBar'
import { Loader2, Plus, Dumbbell, ChevronRight, History } from 'lucide-react'
import Link from 'next/link'

type Exercise = {
  id: string
  name: string
  name_fr: string
  muscle_primary: string[]
  equipment: string
  category: string
}

type SuggestedSession = {
  program_name: string
  session_name: string
  session_index: number
  total_sessions: number
  volume_adjustment: 'reduce' | 'normal' | 'increase'
  adjustment_reason: string
  exercises: { name: string; sets: number; reps: string; weight_kg: number | null; note: string }[]
}

export default function WorkoutPage() {
  const [suggestion, setSuggestion] = useState<SuggestedSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [recentWorkouts, setRecentWorkouts] = useState<{id: string; session_name: string; session_date: string; total_tonnage_kg: number}[]>([])
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const [suggRes, supabase] = [fetch('/api/suggest-workout'), createClient()]

      const [suggData, { data: { user } }] = await Promise.all([
        suggRes.then(r => r.json()),
        supabase.auth.getUser(),
      ])

      if (suggData.data) setSuggestion(suggData.data)

      if (user) {
        const { data: workouts } = await supabase
          .from('workouts')
          .select('id, session_name, session_date, total_tonnage_kg')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('session_date', { ascending: false })
          .limit(5)
        setRecentWorkouts(workouts ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function startWorkout(sessionName: string, exercises?: { name: string; sets: number; reps: string; weight_kg: number | null; note: string }[]) {
    setStarting(true)
    try {
      const res = await fetch('/api/workout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_name: sessionName }),
      })
      const { data } = await res.json()
      if (data?.id) {
        // Stocker les exercices suggérés pour les pré-charger dans le logger
        if (exercises && exercises.length > 0) {
          sessionStorage.setItem(`workout-exercises-${data.id}`, JSON.stringify(exercises))
        }
        router.push(`/workout/${data.id}`)
      }
    } finally {
      setStarting(false)
    }
  }

  const volumeColors = {
    reduce: 'var(--fiq-orange)',
    normal: 'var(--fiq-accent)',
    increase: 'var(--fiq-blue)',
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 mb-6">
        <p className="fiq-label">Entraînement</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Séances</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Card séance suggérée */}
          {suggestion && (
            <div className="fiq-card space-y-4">
              <div>
                <p className="fiq-label">Prochaine séance</p>
                <h2 className="text-xl font-black mt-1" style={{ color: 'var(--fiq-text)' }}>
                  {suggestion.session_name}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  {suggestion.program_name} · Séance {suggestion.session_index + 1}/{suggestion.total_sessions}
                </p>
              </div>

              {suggestion.volume_adjustment !== 'normal' && (
                <div
                  className="rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{
                    color: volumeColors[suggestion.volume_adjustment],
                    background: volumeColors[suggestion.volume_adjustment] + '18',
                    border: `1px solid ${volumeColors[suggestion.volume_adjustment]}44`,
                  }}
                >
                  {suggestion.volume_adjustment === 'reduce' ? '⚠️ Volume réduit' : '⚡ Volume augmenté'} — {suggestion.adjustment_reason}
                </div>
              )}

              <Button
                className="w-full py-5 font-black text-base"
                onClick={() => startWorkout(suggestion.session_name, suggestion.exercises as { name: string; sets: number; reps: string; weight_kg: number | null; note: string }[])}
                disabled={starting}
                style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
              >
                {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Dumbbell className="w-5 h-5 mr-2" />Démarrer cette séance</>}
              </Button>
            </div>
          )}

          {/* Séance libre */}
          <button
            onClick={() => startWorkout('Séance libre')}
            disabled={starting}
            className="w-full fiq-card flex items-center gap-3 text-left transition-all hover:border-[var(--fiq-accent)]/40"
          >
            <Plus className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--fiq-text)' }}>Séance libre</p>
              <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Choisis tes exercices librement</p>
            </div>
            <ChevronRight className="ml-auto w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
          </button>

          {/* Historique récent */}
          {recentWorkouts.length > 0 && (
            <div className="fiq-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
                  <p className="font-semibold text-sm" style={{ color: 'var(--fiq-text)' }}>Séances récentes</p>
                </div>
                <Link href="/workout/history"
                  className="text-xs font-semibold"
                  style={{ color: 'var(--fiq-accent)' }}>
                  Tout voir →
                </Link>
              </div>
              {recentWorkouts.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--fiq-border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fiq-text)' }}>{w.session_name}</p>
                    <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                      {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(w.session_date))}
                    </p>
                  </div>
                  {w.total_tonnage_kg && (
                    <span className="text-sm fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                      {w.total_tonnage_kg.toLocaleString('fr-FR')} kg
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
