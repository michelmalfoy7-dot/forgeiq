'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Send, Bot, User, Sparkles, Trash2, Crown } from 'lucide-react'
import Link from 'next/link'

type Message = { role: 'user' | 'assistant'; content: string; streaming?: boolean }

type DailyCtx = {
  weight_trend: number | null
  sleep_deep_min: number | null
  protein_g: number | null
  fatigue_score: number | null
  calories_consumed: number | null   // kcal du jour (food_logs)
  last_session_name: string | null   // dernière séance
  last_tonnage: number | null        // tonnage dernière séance (kg)
  last_session_date: string | null   // date dernière séance
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
  // Suggestions contextuelles selon données du jour (P5)
  if (ctx.sleep_deep_min !== null && ctx.sleep_deep_min < 60) s.push('Séance adaptée aujourd\'hui ?')
  if (ctx.fatigue_score !== null && ctx.fatigue_score >= 8) s.push('Je suis épuisé — que faire ?')
  if (ctx.protein_g !== null && ctx.protein_g < proteinTarget - 20) s.push('Comment atteindre mes protéines ?')
  if (ctx.sleep_deep_min !== null && ctx.sleep_deep_min > 90 && ctx.fatigue_score !== null && ctx.fatigue_score <= 3) s.push('Repousser mes limites aujourd\'hui ?')
  // Compléter jusqu'à 4 suggestions génériques
  const fallbacks = ['Quelle séance demain ?', 'Analyse ma semaine', 'Mon prochain PR', 'Besoin d\'un refeed ?', 'Optimise ma nutrition', 'Conseils récupération']
  for (const f of fallbacks) {
    if (s.length >= 4) break
    if (!s.includes(f)) s.push(f)
  }
  return s.slice(0, 4)
}

// --- Markdown renderer léger (sans dépendance externe) ---

function renderInline(text: string): React.ReactNode {
  // Gère **bold** et *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let keyIdx = 0

  const flushList = () => {
    if (!listItems.length) return
    if (listType === 'ol') {
      nodes.push(
        <ol key={keyIdx++} className="my-1.5 pl-5 list-decimal space-y-0.5">
          {listItems.map((item, i) => <li key={i} className="leading-relaxed">{renderInline(item)}</li>)}
        </ol>
      )
    } else {
      nodes.push(
        <ul key={keyIdx++} className="my-1.5 pl-5 list-disc space-y-0.5">
          {listItems.map((item, i) => <li key={i} className="leading-relaxed">{renderInline(item)}</li>)}
        </ul>
      )
    }
    listItems = []
    listType = null
  }

  for (const line of lines) {
    const ulMatch = line.match(/^[-•*]\s+(.+)/)
    const olMatch = line.match(/^\d+\.\s+(.+)/)
    const hMatch = line.match(/^#{1,3}\s+(.+)/)

    if (ulMatch) {
      if (listType === 'ol') flushList()
      listType = 'ul'
      listItems.push(ulMatch[1])
    } else if (olMatch) {
      if (listType === 'ul') flushList()
      listType = 'ol'
      listItems.push(olMatch[1])
    } else if (hMatch) {
      flushList()
      nodes.push(
        <p key={keyIdx++} className="font-bold mt-2 mb-0.5">{renderInline(hMatch[1])}</p>
      )
    } else if (line.trim() === '') {
      flushList()
      // Ligne vide = séparateur de paragraphe (géré par margin)
    } else {
      flushList()
      nodes.push(
        <p key={keyIdx++} className="mb-1.5 leading-relaxed">{renderInline(line)}</p>
      )
    }
  }
  flushList()
  return <>{nodes}</>
}

// ---------------------------------------------------------

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

      {/* Bulle */}
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3 text-sm"
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
        ) : isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">
            {msg.content}
            {msg.streaming && <span className="animate-pulse">▋</span>}
          </p>
        ) : (
          <div>
            {renderMarkdown(msg.content)}
            {msg.streaming && <span className="animate-pulse">▋</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// Suggestions de suivi après chaque réponse du coach
const FOLLOW_UP_POOL = [
  'Donne-moi plus de détails',
  'Comment progresser plus vite ?',
  'Quelle séance demain ?',
  'Conseil nutrition du jour',
  'Comment améliorer ma récupération ?',
  'Analyse mes PRs récents',
  'Que manger ce soir ?',
  'Comment gérer la fatigue ?',
]

function getFollowUps(): string[] {
  return [...FOLLOW_UP_POOL].sort(() => Math.random() - 0.5).slice(0, 3)
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [dailyCtx, setDailyCtx] = useState<DailyCtx | null>(null)
  const [proteinTarget, setProteinTarget] = useState(160)
  const [coachCount, setCoachCount] = useState(0)
  const [coachLimit, setCoachLimit] = useState(9999)
  const [isFree, setIsFree] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [followUps] = useState<string[]>(getFollowUps())
  const [clearing, setClearing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Charger l'historique + contexte + compteur (all-time free / mensuel pro) au montage
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [{ data: history }, { data: log }, { data: profile }, { data: foodLogs }, { data: lastWorkout }] = await Promise.all([
        supabase.from('coach_messages')
          .select('role, content, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(40),
        supabase.from('daily_logs')
          .select('weight_trend, sleep_deep_min, protein_g, fatigue_score')
          .eq('user_id', user.id)
          .eq('log_date', today)
          .maybeSingle(),
        supabase.from('profiles')
          .select('goal, weight_kg, subscription_status, subscription_plan, is_admin')
          .eq('id', user.id)
          .single(),
        // Calories consommées aujourd'hui (food_logs)
        supabase.from('food_logs')
          .select('calories')
          .eq('user_id', user.id)
          .eq('log_date', today),
        // Dernière séance terminée
        supabase.from('workouts')
          .select('session_name, session_date, total_tonnage_kg')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('session_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (history?.length) {
        setMessages(history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })))
      }

      // Construire le contexte enrichi
      const caloriesConsumed = foodLogs?.length
        ? Math.round(foodLogs.reduce((s, r) => s + (r.calories ?? 0), 0))
        : null

      if (log || caloriesConsumed !== null || lastWorkout) {
        setDailyCtx({
          weight_trend: log?.weight_trend ?? null,
          sleep_deep_min: log?.sleep_deep_min ?? null,
          protein_g: log?.protein_g ?? null,
          fatigue_score: log?.fatigue_score ?? null,
          calories_consumed: caloriesConsumed,
          last_session_name: lastWorkout?.session_name ?? null,
          last_tonnage: lastWorkout?.total_tonnage_kg ?? null,
          last_session_date: lastWorkout?.session_date ?? null,
        })
      }
      if (profile) setProteinTarget(calcProteinTarget(profile.goal, profile.weight_kg))

      // Déterminer tier et limite
      const status = profile?.subscription_status ?? 'free'
      const plan = profile?.subscription_plan ?? 'free'
      const admin = profile?.is_admin ?? false
      setIsAdmin(admin)
      const free = !admin && status !== 'pro' && status !== 'lifetime'
      setIsFree(free)

      if (admin) {
        // Admin : pas de comptage, pas de limite
        setCoachLimit(9999)
        setCoachCount(0)
      } else if (free) {
        // Comptage all-time pour les free
        setCoachLimit(3)
        const { count: total } = await supabase
          .from('coach_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('role', 'user')
        setCoachCount(total ?? 0)
      } else {
        // Comptage mensuel pour les Pro
        const limit = (status === 'lifetime' || plan === 'annual') ? 9999 : 60
        setCoachLimit(limit)
        const { count: monthly } = await supabase
          .from('coach_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('role', 'user')
          .gte('created_at', startOfMonth.toISOString())
        setCoachCount(monthly ?? 0)
      }

      setHistoryLoading(false)
    }
    load()
  }, [])

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Pré-remplir depuis l'URL param ?q= (boutons "Demander au coach" dashboard)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const prefill = params.get('q')
    if (prefill) {
      setInput(prefill)
      inputRef.current?.focus()
    }
  }, [])

  async function clearHistory() {
    if (clearing) return
    setClearing(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('coach_messages').delete().eq('user_id', user.id)
        setMessages([])
      }
    } finally {
      setClearing(false)
    }
  }

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
          updated[updated.length - 1] = {
            role: 'assistant',
            content: limitErr ?? 'Limite mensuelle atteinte. Passez en Pro pour un accès illimité.',
            streaming: false,
          }
          return updated
        })
        setLoading(false)
        return
      }
      if (!res.ok || !res.body) throw new Error('Erreur réseau')

      // Lire le compteur depuis les headers de réponse
      const headerCount = res.headers.get('X-Coach-Count')
      if (headerCount) setCoachCount(parseInt(headerCount))

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      try {
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
      } catch (streamErr) {
        console.error('[coach] Stream error:', streamErr)
        full = ''
      }

      // Si le stream s'est fermé sans contenu → afficher l'erreur au lieu d'une bulle vide
      const finalContent = full.trim()
        ? full
        : '⚠️ Je n\'ai pas pu générer de réponse. Réessaie dans quelques secondes.'

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: finalContent, streaming: false }
        return updated
      })
    } catch (err) {
      console.error('[coach] Fetch error:', err)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '⚠️ Erreur de connexion. Vérifie ta connexion et réessaie.',
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
  const lastIsAssistant =
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    !messages[messages.length - 1].streaming
  const remaining = Math.max(0, coachLimit - coachCount)
  const limitReached = coachCount >= coachLimit

  return (
    <div className="flex flex-col max-w-lg mx-auto" style={{ height: 'calc(100dvh - 4rem - env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0 flex items-start justify-between">
        <div>
          <p className="fiq-label">Intelligence artificielle</p>
          <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Coach IA</h1>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            disabled={clearing}
            className="mt-2 p-2 rounded-xl transition-all"
            title="Effacer la conversation"
            style={{ color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)', background: 'var(--fiq-card)' }}
          >
            {clearing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Trash2 className="w-4 h-4" />
            }
          </button>
        )}
      </div>

      {/* Context bar — données biométriques + séance + nutrition */}
      {dailyCtx && (
        <div
          className="mx-4 mb-3 flex items-center gap-3 px-3 py-2 rounded-xl text-xs flex-shrink-0 overflow-x-auto"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', scrollbarWidth: 'none' }}
        >
          {/* Poids lissé */}
          {dailyCtx.weight_trend != null && (
            <span className="whitespace-nowrap flex-shrink-0" style={{ color: 'var(--fiq-muted)' }}>
              ⚖️ <span style={{ color: 'var(--fiq-accent)', fontWeight: 800 }}>{dailyCtx.weight_trend}kg</span>
            </span>
          )}
          {/* Sommeil profond */}
          {dailyCtx.sleep_deep_min !== null && (
            <span className="whitespace-nowrap flex-shrink-0" style={{ color: dailyCtx.sleep_deep_min < 60 ? 'var(--fiq-orange)' : 'var(--fiq-muted)' }}>
              😴 {dailyCtx.sleep_deep_min}min
            </span>
          )}
          {/* Calories consommées */}
          {dailyCtx.calories_consumed !== null && (
            <span className="whitespace-nowrap flex-shrink-0" style={{ color: 'var(--fiq-muted)' }}>
              🍽️ <span style={{ color: 'var(--fiq-text)', fontWeight: 700 }}>{dailyCtx.calories_consumed}</span> kcal
            </span>
          )}
          {/* Protéines */}
          {dailyCtx.protein_g !== null && (
            <span className="whitespace-nowrap flex-shrink-0" style={{ color: dailyCtx.protein_g < proteinTarget - 20 ? 'var(--fiq-orange)' : 'var(--fiq-muted)' }}>
              🥩 {dailyCtx.protein_g}g/{proteinTarget}g
            </span>
          )}
          {/* Dernière séance + tonnage */}
          {dailyCtx.last_session_name && (
            <span className="whitespace-nowrap flex-shrink-0" style={{ color: 'var(--fiq-muted)' }}>
              🏋️ <span style={{ color: 'var(--fiq-text)', fontWeight: 700 }}>{dailyCtx.last_session_name}</span>
              {dailyCtx.last_tonnage != null && (
                <span> · {Math.round(dailyCtx.last_tonnage / 1000 * 10) / 10}t</span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Zone messages */}
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

        {/* Follow-up chips après la dernière réponse du coach */}
        {lastIsAssistant && !loading && (
          <div className="flex flex-wrap gap-2 pl-10">
            {followUps.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={{
                  background: 'var(--fiq-faint)',
                  border: '1px solid var(--fiq-border)',
                  color: 'var(--fiq-muted)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions rapides (état vide uniquement) */}
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

      {/* Zone de saisie */}
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
            placeholder={limitReached && isFree ? '🔒 Passe en Pro pour continuer...' : 'Pose ta question au coach...'}
            disabled={loading || (limitReached && isFree)}
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
            disabled={loading || !input.trim() || (limitReached && isFree)}
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

        {/* Compteur quota free — visible dès le début (pas seulement après 1 message) */}
        {isFree && !limitReached && !historyLoading && (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: i < coachCount ? 'var(--fiq-muted)' : 'var(--fiq-accent)', opacity: i < coachCount ? 0.3 : 1 }}
                />
              ))}
            </div>
            <p className="text-xs" style={{ color: remaining <= 1 ? 'var(--fiq-orange)' : 'var(--fiq-muted)' }}>
              {remaining} essai{remaining !== 1 ? 's' : ''} gratuit{remaining !== 1 ? 's' : ''} restant{remaining !== 1 ? 's' : ''}
              {' '}· <Link href="/pricing" style={{ color: 'var(--fiq-accent)', fontWeight: 700 }}>Pro →</Link>
            </p>
          </div>
        )}

        {/* Mur d'upgrade free — CTA visible dans la zone de saisie */}
        {isFree && limitReached && (
          <div className="mt-3 rounded-2xl p-4 flex items-center gap-3"
            style={{ background: '#B4FF4A12', border: '1px solid #B4FF4A44' }}>
            <Crown className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Tes 3 essais sont utilisés</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Passe en Pro pour continuer avec le coach IA.</p>
            </div>
            <Link href="/pricing"
              className="px-3 py-2 rounded-xl text-xs font-black flex-shrink-0"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
              Pro →
            </Link>
          </div>
        )}

        {/* Compteur mensuel Pro */}
        {!isFree && coachLimit < 9999 && coachCount > 0 && (
          <p className="text-xs mt-2 text-right"
            style={{ color: remaining <= 10 ? 'var(--fiq-orange)' : 'var(--fiq-muted)' }}>
            {remaining} msg restant{remaining > 1 ? 's' : ''} ce mois
          </p>
        )}
      </div>
    </div>
  )
}
