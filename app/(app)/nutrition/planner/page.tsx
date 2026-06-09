'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Search, X, Loader2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

type PlanEntry = {
  id: string
  plan_date: string
  meal_type: MealType
  food_name: string
  food_id: string | null
  quantity_g: number
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

type SearchResult = {
  id: string
  name_fr: string
  name: string
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  source?: string
}

// ── Config repas ───────────────────────────────────────────────
const MEAL_CONFIG: Record<MealType, { label: string; emoji: string }> = {
  breakfast: { label: 'Petit-déjeuner', emoji: '🌅' },
  lunch:     { label: 'Déjeuner',       emoji: '☀️' },
  dinner:    { label: 'Dîner',          emoji: '🌙' },
  snack:     { label: 'Collation',      emoji: '🍎' },
}
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

// ── Utilitaires ────────────────────────────────────────────────
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' }).format(date)
}

function formatMonthRange(start: Date, end: Date): string {
  const s = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(start)
  const e = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(end)
  return `${s} – ${e}`
}

function macroFromEntry(e: PlanEntry, key: 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'): number {
  const v = e[key]
  return v != null ? Math.round(v) : 0
}

// ── Composant ──────────────────────────────────────────────────
export default function MealPlannerPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()))
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()))
  const [entries, setEntries] = useState<PlanEntry[]>([])
  const [loading, setLoading] = useState(false)

  // Bottom sheet ajout
  const [addingFor, setAddingFor] = useState<{ date: string; meal: MealType } | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<SearchResult | null>(null)
  const [qty, setQty] = useState('100')
  const [adding, setAdding] = useState(false)

  // Charger les entrées de la semaine
  const loadWeek = useCallback(async (start: Date) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/nutrition/planner?week_start=${toISODate(start)}`)
      const json = await res.json() as { data: PlanEntry[] | null; error: string | null }
      setEntries(json.data ?? [])
    } catch { /* silencieux */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadWeek(weekStart) }, [weekStart, loadWeek])

  // Recherche aliments
  useEffect(() => {
    if (searchQ.trim().length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(searchQ)}&limit=20`)
        const json = await res.json() as { data: SearchResult[] | null }
        setSearchResults(json.data ?? [])
      } catch { /* silencieux */ }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ])

  // Semaine précédente / suivante
  function prevWeek() {
    const d = addDays(weekStart, -7)
    setWeekStart(d)
    // Garder le même jour de semaine si possible
    const targetDay = (new Date(selectedDate)).getDay()
    const newDay = addDays(d, ((targetDay || 7) - 1))
    setSelectedDate(toISODate(newDay))
  }
  function nextWeek() {
    const d = addDays(weekStart, 7)
    setWeekStart(d)
    const targetDay = (new Date(selectedDate)).getDay()
    const newDay = addDays(d, ((targetDay || 7) - 1))
    setSelectedDate(toISODate(newDay))
  }

  // Ajouter un aliment
  async function handleAdd() {
    if (!addingFor || !selectedFood || adding) return
    setAdding(true)
    try {
      const q = parseFloat(qty) || 100
      const ratio = q / 100
      const body = {
        plan_date:  addingFor.date,
        meal_type:  addingFor.meal,
        food_name:  selectedFood.name_fr || selectedFood.name,
        food_id:    selectedFood.id,
        quantity_g: q,
        calories:   Math.round((selectedFood.calories_100g ?? 0) * ratio),
        protein_g:  Math.round((selectedFood.protein_100g ?? 0) * ratio * 10) / 10,
        carbs_g:    Math.round((selectedFood.carbs_100g ?? 0) * ratio * 10) / 10,
        fat_g:      Math.round((selectedFood.fat_100g ?? 0) * ratio * 10) / 10,
      }
      const res = await fetch('/api/nutrition/planner', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json() as { data: PlanEntry | null; error: string | null }
      if (json.data) {
        setEntries(prev => [...prev, json.data!])
        setSelectedFood(null)
        setSearchQ('')
        setQty('100')
        setSearchResults([])
        setAddingFor(null)
      }
    } catch { /* silencieux */ }
    finally { setAdding(false) }
  }

  // Supprimer une entrée
  async function handleDelete(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id)) // optimiste
    try {
      await fetch(`/api/nutrition/planner?id=${id}`, { method: 'DELETE' })
    } catch {
      // rollback — recharger
      loadWeek(weekStart)
    }
  }

  // Données du jour sélectionné
  const todayEntries = entries.filter(e => e.plan_date === selectedDate)
  const dayCalories = todayEntries.reduce((a, e) => a + macroFromEntry(e, 'calories'), 0)
  const dayProtein  = todayEntries.reduce((a, e) => a + macroFromEntry(e, 'protein_g'), 0)
  const dayCarbs    = todayEntries.reduce((a, e) => a + macroFromEntry(e, 'carbs_g'), 0)
  const dayFat      = todayEntries.reduce((a, e) => a + macroFromEntry(e, 'fat_g'), 0)

  // Jours de la semaine
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { date: toISODate(d), label: formatDay(d), isToday: toISODate(d) === toISODate(new Date()) }
  })

  return (
    <div className="max-w-lg mx-auto" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-safe pb-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--fiq-border)', backdropFilter: 'blur(12px)' }}>

        {/* Titre + range semaine */}
        <div className="pt-4 mb-3 flex items-start justify-between">
          <div>
            <p className="fiq-label">Alimentation</p>
            <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Nutrition</h1>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--fiq-muted)' }}>
            {formatMonthRange(weekStart, addDays(weekStart, 6))}
          </p>
        </div>

        {/* Onglets Journal / Planifier */}
        <div className="flex gap-1 p-1 rounded-2xl mb-3" style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
          <Link
            href="/nutrition"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-black transition-all"
            style={{ color: 'var(--fiq-muted)' }}
          >
            Journal
          </Link>
          <div
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-black"
            style={{ background: 'var(--fiq-card)', color: 'var(--fiq-accent)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
          >
            <Calendar className="w-3.5 h-3.5" />
            Planifier
          </div>
        </div>

        {/* Navigation semaine */}
        <div className="flex items-center gap-2">
          <button onClick={prevWeek}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {weekDays.map(({ date, label, isToday }) => {
              const hasEntries = entries.some(e => e.plan_date === date)
              const isSelected = date === selectedDate
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-center transition-all min-w-[44px]"
                  style={{
                    background: isSelected ? 'var(--fiq-accent)' : isToday ? 'var(--fiq-faint)' : 'transparent',
                    border: isToday && !isSelected ? '1px solid var(--fiq-accent)44' : '1px solid transparent',
                  }}>
                  <span className="text-[9px] uppercase font-bold"
                    style={{ color: isSelected ? 'var(--bg)' : 'var(--fiq-muted)' }}>
                    {label.split(' ')[0]}
                  </span>
                  <span className="text-sm font-black"
                    style={{ color: isSelected ? 'var(--bg)' : isToday ? 'var(--fiq-accent)' : 'var(--fiq-text)' }}>
                    {label.split(' ')[1]}
                  </span>
                  {/* Point indicateur */}
                  <div className="w-1 h-1 rounded-full"
                    style={{ background: hasEntries ? (isSelected ? 'var(--bg)' : 'var(--fiq-accent)') : 'transparent' }} />
                </button>
              )
            })}
          </div>

          <button onClick={nextWeek}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Résumé journalier */}
        {dayCalories > 0 && (
          <div className="fiq-card space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
                {dayCalories.toLocaleString('fr-FR')} kcal
              </p>
              <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(selectedDate + 'T12:00:00'))}
              </p>
            </div>
            {/* Barre macros */}
            <div>
              <div className="flex gap-0.5 rounded-full overflow-hidden h-2 mb-2"
                style={{ background: 'var(--fiq-faint)' }}>
                {(() => {
                  const total = dayProtein * 4 + dayCarbs * 4 + dayFat * 9
                  if (total === 0) return null
                  const pPct = (dayProtein * 4 / total) * 100
                  const cPct = (dayCarbs * 4 / total) * 100
                  const fPct = (dayFat * 9 / total) * 100
                  return (
                    <>
                      <div style={{ width: `${pPct}%`, background: 'var(--fiq-accent)', borderRadius: '4px 0 0 4px' }} />
                      <div style={{ width: `${cPct}%`, background: 'var(--fiq-blue)' }} />
                      <div style={{ width: `${fPct}%`, background: 'var(--fiq-orange)', borderRadius: '0 4px 4px 0' }} />
                    </>
                  )
                })()}
              </div>
              <div className="flex gap-4">
                {[
                  { label: 'P', val: dayProtein, color: 'var(--fiq-accent)' },
                  { label: 'G', val: dayCarbs,   color: 'var(--fiq-blue)' },
                  { label: 'L', val: dayFat,     color: 'var(--fiq-orange)' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs font-black tabular-nums" style={{ color: 'var(--fiq-text)' }}>{val}g</span>
                    <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="fiq-card animate-pulse">
                <div className="h-4 w-32 rounded" style={{ background: 'var(--fiq-faint)' }} />
                <div className="h-3 w-48 rounded mt-2" style={{ background: 'var(--fiq-faint)' }} />
              </div>
            ))}
          </div>
        )}

        {/* Repas par type */}
        {!loading && MEAL_ORDER.map(meal => {
          const mealEntries = todayEntries.filter(e => e.meal_type === meal)
          const mealCal = mealEntries.reduce((a, e) => a + macroFromEntry(e, 'calories'), 0)
          const cfg = MEAL_CONFIG[meal]

          return (
            <div key={meal} className="fiq-card space-y-2">
              {/* En-tête repas */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cfg.emoji}</span>
                  <div>
                    <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>{cfg.label}</p>
                    {mealCal > 0 && (
                      <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{mealCal} kcal</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setAddingFor({ date: selectedDate, meal }); setSearchQ(''); setSelectedFood(null); setQty('100') }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Aliments */}
              {mealEntries.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Aucun aliment planifié</p>
              ) : (
                <div className="space-y-1.5">
                  {mealEntries.map(entry => (
                    <div key={entry.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--fiq-text)' }}>
                          {entry.food_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{entry.quantity_g}g</span>
                          {entry.calories != null && (
                            <span className="text-xs font-black" style={{ color: 'var(--fiq-accent)' }}>
                              {Math.round(entry.calories)} kcal
                            </span>
                          )}
                          {entry.protein_g != null && (
                            <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                              P:{Math.round(entry.protein_g)}g
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDelete(entry.id)}
                        className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ color: 'var(--fiq-muted)' }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Bottom sheet ajout aliment ──────────────────────────── */}
      {addingFor && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => { setAddingFor(null); setSelectedFood(null); setSearchQ('') }}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl"
            style={{ maxHeight: 'calc(88dvh - env(safe-area-inset-bottom))', background: 'var(--surface)', borderTop: '1px solid var(--fiq-border)' }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--fiq-border)' }} />
            </div>

            {/* Header sheet */}
            <div className="px-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
              <div>
                <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
                  {MEAL_CONFIG[addingFor.meal].emoji} {MEAL_CONFIG[addingFor.meal].label}
                </p>
                <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                  {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(addingFor.date + 'T12:00:00'))}
                </p>
              </div>
              <button onClick={() => { setAddingFor(null); setSelectedFood(null); setSearchQ('') }}>
                <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-3"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>

              {/* Recherche */}
              {!selectedFood && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
                    <input
                      autoFocus
                      placeholder="Rechercher un aliment…"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      style={{
                        width: '100%', paddingLeft: 36, paddingRight: 12,
                        paddingTop: 10, paddingBottom: 10,
                        background: 'var(--bg)', border: '1px solid var(--fiq-border)',
                        borderRadius: 12, color: 'var(--fiq-text)', fontSize: 14, outline: 'none',
                      }}
                    />
                  </div>

                  {searching && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fiq-accent)' }} />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {searchResults.map(food => (
                      <button
                        key={food.id}
                        onClick={() => { setSelectedFood(food); setQty('100') }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:opacity-70"
                        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--fiq-text)' }}>
                            {food.name_fr || food.name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                            {food.calories_100g} kcal · P:{food.protein_100g}g · G:{food.carbs_100g}g · L:{food.fat_100g}g
                            <span className="ml-1.5" style={{ color: 'var(--fiq-faint)', fontSize: 9 }}>pour 100g</span>
                          </p>
                        </div>
                        <Plus className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
                      </button>
                    ))}

                    {searchQ.length >= 2 && !searching && searchResults.length === 0 && (
                      <p className="text-sm text-center py-4" style={{ color: 'var(--fiq-muted)' }}>Aucun aliment trouvé</p>
                    )}
                  </div>
                </>
              )}

              {/* Confirmation quantité */}
              {selectedFood && (
                <div className="space-y-4">
                  {/* Aliment sélectionné */}
                  <div className="flex items-start gap-3 px-3 py-3 rounded-xl"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-accent)44' }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
                        {selectedFood.name_fr || selectedFood.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                        {selectedFood.calories_100g} kcal pour 100g
                      </p>
                    </div>
                    <button onClick={() => setSelectedFood(null)} style={{ color: 'var(--fiq-muted)' }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantité */}
                  <div>
                    <label className="fiq-label mb-2 block">Quantité (g)</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQty(v => String(Math.max(10, (parseFloat(v) || 100) - 10)))}
                        className="w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}>
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={qty}
                        onChange={e => setQty(e.target.value)}
                        className="flex-1 text-center text-xl font-black h-12 rounded-xl outline-none"
                        style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                      />
                      <button
                        onClick={() => setQty(v => String((parseFloat(v) || 100) + 10))}
                        className="w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}>
                        +
                      </button>
                    </div>

                    {/* Macros calculées */}
                    {(() => {
                      const q = parseFloat(qty) || 0
                      const r = q / 100
                      if (q <= 0) return null
                      return (
                        <div className="mt-3 flex gap-3 px-3 py-2.5 rounded-xl"
                          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                          {[
                            { label: 'kcal', val: Math.round((selectedFood.calories_100g ?? 0) * r), color: 'var(--fiq-accent)' },
                            { label: 'P',    val: Math.round((selectedFood.protein_100g ?? 0) * r * 10) / 10, color: 'var(--fiq-accent)' },
                            { label: 'G',    val: Math.round((selectedFood.carbs_100g ?? 0) * r * 10) / 10, color: 'var(--fiq-blue)' },
                            { label: 'L',    val: Math.round((selectedFood.fat_100g ?? 0) * r * 10) / 10, color: 'var(--fiq-orange)' },
                          ].map(({ label, val, color }) => (
                            <div key={label} className="flex-1 text-center">
                              <p className="text-sm font-black tabular-nums" style={{ color }}>{val}</p>
                              <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--fiq-muted)' }}>{label}</p>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Bouton ajouter */}
                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
                    {adding
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Ajout…</>
                      : <><Plus className="w-4 h-4" /> Ajouter au plan</>
                    }
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
