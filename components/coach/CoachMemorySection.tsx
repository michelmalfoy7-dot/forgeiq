'use client'

import { useState, useEffect } from 'react'
import { Trash2, Plus, Brain, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

type MemoryEntry = {
  id: string
  category: 'injury' | 'goal' | 'preference' | 'milestone' | 'note'
  content: string
  source: string
  created_at: string
  expires_at: string | null
}

const CATEGORY_CONFIG: Record<MemoryEntry['category'], { label: string; icon: string; color: string }> = {
  injury:     { label: 'Blessure',   icon: '🩹', color: 'var(--fiq-red)' },
  goal:       { label: 'Objectif',   icon: '🎯', color: 'var(--fiq-blue)' },
  preference: { label: 'Préférence', icon: '⚙️', color: 'var(--fiq-yellow)' },
  milestone:  { label: 'Milestone',  icon: '🏆', color: 'var(--fiq-accent)' },
  note:       { label: 'Note',       icon: '📝', color: 'var(--fiq-muted)' },
}

const CATEGORY_OPTIONS = [
  { value: 'goal',       label: '🎯 Objectif' },
  { value: 'injury',     label: '🩹 Blessure / Douleur' },
  { value: 'preference', label: '⚙️ Préférence' },
  { value: 'milestone',  label: '🏆 Milestone' },
  { value: 'note',       label: '📝 Note' },
]

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export function CoachMemorySection() {
  const [memories, setMemories]   = useState<MemoryEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [formCat, setFormCat]     = useState('note')
  const [formText, setFormText]   = useState('')
  const [formErr, setFormErr]     = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/coach/memory')
      const j = await r.json()
      if (j.data) setMemories(j.data)
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    setDeleting(id)
    try {
      const r = await fetch(`/api/coach/memory/${id}`, { method: 'DELETE' })
      const j = await r.json()
      if (!j.error) setMemories(prev => prev.filter(m => m.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  async function add() {
    if (!formText.trim()) return
    setFormErr(null)
    setSaving(true)
    try {
      const r = await fetch('/api/coach/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: formCat, content: formText.trim() }),
      })
      const j = await r.json()
      if (j.error) {
        setFormErr(j.error)
      } else {
        setMemories(prev => [j.data, ...prev])
        setFormText('')
        setFormCat('note')
        setShowForm(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const visible = expanded ? memories : memories.slice(0, 4)

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Brain size={16} style={{ color: 'var(--fiq-accent)' }} />
          <p className="font-bold text-sm" style={{ color: 'var(--fiq-text)' }}>Mémoire du coach</p>
          {memories.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: 'var(--fiq-accent)22', color: 'var(--fiq-accent)', border: '1px solid var(--fiq-accent)44' }}
            >
              {memories.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setFormErr(null) }}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-bold"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          <Plus size={12} />
          Ajouter
        </button>
      </div>

      <p className="text-xs mb-3" style={{ color: 'var(--fiq-muted)' }}>
        Le coach mémorise automatiquement blessures, objectifs et préférences issus de vos échanges.
      </p>

      {/* Formulaire */}
      {showForm && (
        <div
          className="rounded-xl p-3 mb-3 space-y-2"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
        >
          <select
            value={formCat}
            onChange={e => setFormCat(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none appearance-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
          >
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <textarea
            value={formText}
            onChange={e => setFormText(e.target.value)}
            placeholder="Ex : Je prépare un marathon en octobre 2026…"
            maxLength={500}
            rows={2}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
          />
          {formErr && <p className="text-xs" style={{ color: 'var(--fiq-red)' }}>{formErr}</p>}
          <div className="flex gap-2">
            <button
              onClick={add}
              disabled={saving || !formText.trim()}
              className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Enregistrer'}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormErr(null) }}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--fiq-muted)' }} />
        </div>
      ) : memories.length === 0 ? (
        <p className="text-xs text-center py-3" style={{ color: 'var(--fiq-muted)' }}>
          Aucune mémoire. Le coach apprendra de vos échanges automatiquement.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map(m => {
            const cfg = CATEGORY_CONFIG[m.category]
            return (
              <div
                key={m.id}
                className="flex items-start gap-2 rounded-xl p-3"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
              >
                <span className="text-sm flex-shrink-0 mt-0.5">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    {m.source === 'manual' && (
                      <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>· Manuel</span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--fiq-text)' }}>{m.content}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                    {fmtDate(m.created_at)}
                    {m.expires_at && ` · expire le ${fmtDate(m.expires_at)}`}
                  </p>
                </div>
                <button
                  onClick={() => remove(m.id)}
                  disabled={deleting === m.id}
                  className="flex-shrink-0 p-1.5 rounded-lg disabled:opacity-40"
                  style={{ color: 'var(--fiq-muted)' }}
                  title="Supprimer"
                >
                  {deleting === m.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />}
                </button>
              </div>
            )
          })}

          {memories.length > 4 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-xl"
              style={{ color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
            >
              {expanded
                ? <><ChevronUp size={13} /> Réduire</>
                : <><ChevronDown size={13} /> Voir {memories.length - 4} de plus</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
