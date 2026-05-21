'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Send, Bot, User, Sparkles } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string; streaming?: boolean }

type DailyCtx = {
  weight_trend: number | null
  sleep_deep_min: number | null
  protein_g: number | null
}

// Ratios protéines selon objectif (g/kg poids de corps)
const PROTEIN_RATIO: Record<string, { min: number; max: number }> = {
  muscle_gain: { min: 1.8, max: 2.2 },
  strength:    { min: 1.8, max: 2.2 },
  weight_loss: { min: 1.8, max: 2.0 },
  endurance:   { min: 1.2, max: 1.6 },
  general:     { min: 1.4, max: 1.8 },
}

function calcProteinTarget(goal?: string, weightKg?: number | null): number {
  const ratio = PROTEIN_RATIO[goal ?? 'general'] ?? PROTEIN_RATIO['general']
  const w = (weightKg && weightKg > 30 && weightKg < 250) ? weightKg : 75
  return Math.round(w * (ratio.min + ratio.max) / 2)
}

function getQuickSuggestions(ctx: DailyCtx | null, proteinTarget: number): string[] {
  if (!ctx) return ['Quelle séance demain ?', 'Analyse ma semaine', 'Mon prochain PR', 'Besoin d\'un refeed ?']
  const s: string[] = []
  if (ctx.sleep_deep_min !== null && ctx.sleep_deep_min < 60) s.push('Séance adaptée aujourd\'hui ?')
  if (ctx.protein_g !== null && ctx.protein_g < proteinTarget - 20) s.push('Comment atteindre mes protéines ?')
  if (s.length < 4) s.push('Quelle séance demain ?')
  if (s.length < 4) s.push('Analyse ma semaine')
  if (s.length < 4) s.push('Mon prochain PR')
  if (s.length < 4) s.push('Besoin d\'un refeed ?')
  return s.slice(0, 4)
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{
            background: 'var(--fiq-muted)',
            animationDelay: `${i * 150}ms`,
            animationDuration: '900ms',
          }}
        />
      ))}
    </span>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: isUser ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
          border: isUser ? 'none' : '1px solid var(--fiq-border)',
        }}
      >
        {isUser
          ? <User className="w-3.5 h-3.5" style={{ color: 'var(--bg)' }} />
          : <Bot className="w-3.5 h-3.5" style={{ color: 'var(--fiq-accent)' }} />
        }
      </div>

      {/* Bubble */}
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={{
          background: isUser ? 'var(--fiq-accent)' : 'var(--fiq-card)',
          color: isUser ? 'var(--bg)' : 'var(--fiq-text)',
          border: isUser ? 'none' : '1px solid var(--fiq-border)',
          borderTopRightRadius: isUser ? 4 : undefined,
          borderTopLeftRadius: isUser ? undefined : 4,
        }}
      >
        {msg.streaming && !msg.content ? (
          <TypingDots />
        ) : (
          <p className="whitespace-pre-wrap">
            {msg.content}
            {msg.streaming && <span className="animate-pulse">▋</span>}
          </p>
        )}
      </div>
    </div>
  )
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [dailyCtx, setDailyCtx] = useState<DailyCtx | null>(null)
  const [proteinTarget, setProteinTarget] = useState(160)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Charger l'historique + contexte + profil au montage
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      const [{ data: history }, { data: log }, { data: profile }] = await Promise.all([
        supabase.from('coach_messages')
          .select('role, content, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(40),
        supabase.from('daily_logs')
          .select('weight_trend, sleep_deep_min, protein_g')
          .eq('user_id', user.id)
          .eq('log_date', today)
          .single(),
        supabase.from('profiles')
          .select('goal, weight_kg')
          .eq('id', user.id)
          .single(),
      ])

      if (history?.length) {
        setMessages(history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })))
      }
      if (log) setDailyCtx(log)
      if (profile) setProteinTarget(calcProteinTarget(profile.goal, profile.weight_kg))
      setHistoryLoading(false)
    }
    load()
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-fill from URL param (dashboard "Demander au coach" button)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const prefill = params.get('q')
    if (prefill) {
      setInput(prefill)
      inputRef.current?.focus()
    }
  }, [])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    const assistantMsg: Message = { role: 'assistant', content: '', streaming: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (res.status === 429) {
        const { error: limitErr } = await res.json()
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: limitErr ?? 'Limite mensuelle atteinte. Passez en Pro pour un accès illimité.', streaming: false }
          return updated
        })
        setLoading(false)
        return
      }
      if (!res.ok || !res.body) throw new Error('Erreur réseau')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: full, streaming: true }
          return updated
        })
      }

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: full, streaming: false }
        return updated
      })
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Une erreur est survenue. Vérifie ta connexion et réessaie.',
          streaming: false,
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const suggestions = getQuickSuggestions(dailyCtx, proteinTarget)
  const isEmpty = !historyLoading && messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <p className="fiq-label">Intelligence artificielle</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Coach IA</h1>
      </div>

      {/* Context bar */}
      {dailyCtx && (
        <div
          className="mx-4 mb-3 flex items-center gap-3 px-3 py-2 rounded-xl text-xs flex-shrink-0"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
        >
          {dailyCtx.weight_trend && (
            <span style={{ color: 'var(--fiq-muted)' }}>
              <span style={{ color: 'var(--fiq-accent)', fontWeight: 800 }}>{dailyCtx.weight_trend}kg</span> lissé
            </span>
          )}
          {dailyCtx.sleep_deep_min !== null && (
            <span style={{ color: dailyCtx.sleep_deep_min < 60 ? 'var(--fiq-orange)' : 'var(--fiq-muted)' }}>
              {dailyCtx.sleep_deep_min}min sommeil profond
            </span>
          )}
          {dailyCtx.protein_g !== null && (
            <span style={{ color: dailyCtx.protein_g < proteinTarget - 20 ? 'var(--fiq-orange)' : 'var(--fiq-muted)' }}>
              {dailyCtx.protein_g}g / {proteinTarget}g prot.
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
        {historyLoading && (
          <div className="flex justify-center pt-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
          </div>
        )}

        {isEmpty && (
          <div className="text-center pt-8 pb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
            >
              <Bot className="w-7 h-7" style={{ color: 'var(--fiq-accent)' }} />
            </div>
            <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>Ton coach personnel</p>
            <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Je connais tes données — poids, sommeil, séances, PRs.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
      {isEmpty && !historyLoading && (
        <div className="px-4 mb-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3" style={{ color: 'var(--fiq-accent)' }} />
            <span className="fiq-label">Suggestions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: 'var(--fiq-faint)',
                  border: '1px solid var(--fiq-border)',
                  color: 'var(--fiq-text)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className="px-4 pb-4 pt-3 flex-shrink-0"
        style={{ borderTop: '1px solid var(--fiq-border)' }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder="Pose ta question au coach..."
            disabled={loading}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{
              background: 'var(--fiq-card)',
              border: '1px solid var(--fiq-border)',
              color: 'var(--fiq-text)',
              minHeight: 44,
              maxHeight: 120,
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: input.trim() && !loading ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
              border: '1px solid var(--fiq-border)',
            }}
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
              : <Send className="w-4 h-4" style={{ color: input.trim() ? 'var(--bg)' : 'var(--fiq-muted)' }} />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
