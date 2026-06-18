'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, Trash2, Search, X, Loader2,
  ChevronLeft, ChevronRight, Calendar, Copy, Zap,
} from 'lucide-react'

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
  name_fr: string | null
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  source?: string
}

type UserProfile = {
  goal: string | null
  weight_kg: number | null
  custom_calories: number | null
  custom_protein_g: number | null
  sessions_per_week: number | null
}

// ── Templates repas pré-définis ────────────────────────────────
type MealTemplate = {
  id: string
  label: string
  emoji: string
  description: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  color: string
  meals: Array<{
    meal_type: MealType
    food_name: string
    quantity_g: number
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }>
}

const MEAL_TEMPLATES: MealTemplate[] = [
  {
    id: 'training',
    label: 'Entraînement',
    emoji: '💪',
    description: 'Glucides élevés pour la performance',
    kcal: 2600,
    protein: 175,
    carbs: 300,
    fat: 75,
    color: 'var(--fiq-accent)',
    meals: [
      { meal_type: 'breakfast', food_name: 'Flocons d\'avoine',  quantity_g: 80,  calories: 300, protein_g: 10, carbs_g: 55, fat_g: 6  },
      { meal_type: 'breakfast', food_name: 'Banane',             quantity_g: 120, calories: 105, protein_g: 1,  carbs_g: 27, fat_g: 0  },
      { meal_type: 'breakfast', food_name: 'Fromage blanc 0%',   quantity_g: 200, calories: 120, protein_g: 20, carbs_g: 8,  fat_g: 0  },
      { meal_type: 'lunch',     food_name: 'Poulet cuit',        quantity_g: 200, calories: 330, protein_g: 62, carbs_g: 0,  fat_g: 7  },
      { meal_type: 'lunch',     food_name: 'Riz blanc cuit',     quantity_g: 250, calories: 325, protein_g: 6,  carbs_g: 72, fat_g: 1  },
      { meal_type: 'lunch',     food_name: 'Brocoli cuit',       quantity_g: 200, calories: 56,  protein_g: 4,  carbs_g: 10, fat_g: 1  },
      { meal_type: 'snack',     food_name: 'Whey protéine',      quantity_g: 30,  calories: 120, protein_g: 24, carbs_g: 4,  fat_g: 2  },
      { meal_type: 'dinner',    food_name: 'Saumon cuit',        quantity_g: 180, calories: 360, protein_g: 38, carbs_g: 0,  fat_g: 22 },
      { meal_type: 'dinner',    food_name: 'Patate douce cuite', quantity_g: 200, calories: 172, protein_g: 3,  carbs_g: 40, fat_g: 0  },
      { meal_type: 'dinner',    food_name: 'Courgettes cuites',  quantity_g: 150, calories: 35,  protein_g: 2,  carbs_g: 7,  fat_g: 0  },
    ],
  },
  {
    id: 'rest',
    label: 'Repos',
    emoji: '🛌',
    description: 'Protéines hautes, glucides modérés',
    kcal: 2100,
    protein: 170,
    carbs: 180,
    fat: 70,
    color: 'var(--fiq-blue)',
    meals: [
      { meal_type: 'breakfast', food_name: 'Œufs entiers',       quantity_g: 150, calories: 225, protein_g: 18, carbs_g: 1,  fat_g: 16 },
      { meal_type: 'breakfast', food_name: 'Fromage blanc 0%',   quantity_g: 200, calories: 120, protein_g: 20, carbs_g: 8,  fat_g: 0  },
      { meal_type: 'lunch',     food_name: 'Thon au naturel',    quantity_g: 150, calories: 165, protein_g: 36, carbs_g: 0,  fat_g: 2  },
      { meal_type: 'lunch',     food_name: 'Quinoa cuit',        quantity_g: 150, calories: 180, protein_g: 7,  carbs_g: 33, fat_g: 3  },
      { meal_type: 'lunch',     food_name: 'Salade verte',       quantity_g: 100, calories: 15,  protein_g: 1,  carbs_g: 3,  fat_g: 0  },
      { meal_type: 'snack',     food_name: 'Fromage cottage',    quantity_g: 200, calories: 160, protein_g: 28, carbs_g: 6,  fat_g: 2  },
      { meal_type: 'dinner',    food_name: 'Bœuf haché 5%',      quantity_g: 180, calories: 252, protein_g: 36, carbs_g: 0,  fat_g: 11 },
      { meal_type: 'dinner',    food_name: 'Légumes vapeur',     quantity_g: 250, calories: 80,  protein_g: 4,  carbs_g: 16, fat_g: 1  },
    ],
  },
  {
    id: 'cut',
    label: 'Sèche',
    emoji: '🔥',
    description: 'Déficit calorique, satiété maximale',
    kcal: 1700,
    protein: 175,
    carbs: 120,
    fat: 55,
    color: 'var(--fiq-orange)',
    meals: [
      { meal_type: 'breakfast', food_name: 'Blancs d\'œufs',     quantity_g: 200, calories: 104, protein_g: 22, carbs_g: 1,  fat_g: 0  },
      { meal_type: 'breakfast', food_name: 'Fromage blanc 0%',   quantity_g: 200, calories: 120, protein_g: 20, carbs_g: 8,  fat_g: 0  },
      { meal_type: 'breakfast', food_name: 'Myrtilles',          quantity_g: 100, calories: 57,  protein_g: 1,  carbs_g: 14, fat_g: 0  },
      { meal_type: 'lunch',     food_name: 'Poulet cuit',        quantity_g: 200, calories: 330, protein_g: 62, carbs_g: 0,  fat_g: 7  },
      { meal_type: 'lunch',     food_name: 'Riz complet cuit',   quantity_g: 120, calories: 156, protein_g: 3,  carbs_g: 33, fat_g: 1  },
      { meal_type: 'lunch',     food_name: 'Brocoli cuit',       quantity_g: 250, calories: 70,  protein_g: 5,  carbs_g: 13, fat_g: 1  },
      { meal_type: 'snack',     food_name: 'Fromage blanc 0%',   quantity_g: 200, calories: 120, protein_g: 20, carbs_g: 8,  fat_g: 0  },
      { meal_type: 'dinner',    food_name: 'Saumon cuit',        quantity_g: 150, calories: 300, protein_g: 32, carbs_g: 0,  fat_g: 19 },
      { meal_type: 'dinner',    food_name: 'Asperges cuites',    quantity_g: 200, calories: 50,  protein_g: 4,  carbs_g: 9,  fat_g: 0  },
    ],
  },
  {
    id: 'bulk',
    label: 'Prise de masse',
    emoji: '📈',
    description: 'Surplus calorique contrôlé',
    kcal: 3200,
    protein: 190,
    carbs: 400,
    fat: 90,
    color: '#a78bfa',
    meals: [
      { meal_type: 'breakfast', food_name: 'Flocons d\'avoine',  quantity_g: 120, calories: 450, protein_g: 15, carbs_g: 82, fat_g: 9  },
      { meal_type: 'breakfast', food_name: 'Lait entier',        quantity_g: 300, calories: 195, protein_g: 10, carbs_g: 15, fat_g: 10 },
      { meal_type: 'breakfast', food_name: 'Œufs entiers',       quantity_g: 100, calories: 150, protein_g: 12, carbs_g: 1,  fat_g: 11 },
      { meal_type: 'lunch',     food_name: 'Poulet cuit',        quantity_g: 250, calories: 413, protein_g: 77, carbs_g: 0,  fat_g: 9  },
      { meal_type: 'lunch',     food_name: 'Riz blanc cuit',     quantity_g: 350, calories: 455, protein_g: 9,  carbs_g: 100, fat_g: 1 },
      { meal_type: 'lunch',     food_name: 'Avocat',             quantity_g: 100, calories: 160, protein_g: 2,  carbs_g: 9,  fat_g: 15 },
      { meal_type: 'snack',     food_name: 'Whey protéine',      quantity_g: 40,  calories: 160, protein_g: 32, carbs_g: 5,  fat_g: 2  },
      { meal_type: 'snack',     food_name: 'Banane',             quantity_g: 120, calories: 105, protein_g: 1,  carbs_g: 27, fat_g: 0  },
      { meal_type: 'dinner',    food_name: 'Bœuf haché 5%',      quantity_g: 200, calories: 280, protein_g: 40, carbs_g: 0,  fat_g: 12 },
      { meal_type: 'dinner',    food_name: 'Patate douce cuite', quantity_g: 300, calories: 258, protein_g: 5,  carbs_g: 60, fat_g: 0  },
      { meal_type: 'dinner',    food_name: 'Huile d\'olive',     quantity_g: 15,  calories: 133, protein_g: 0,  carbs_g: 0,  fat_g: 15 },
    ],
  },
]

// ── Config repas ───────────────────────────────────────────────
const MEAL_CONFIG: Record<MealType, { label: string; emoji: string }> = {
  breakfast: { label: 'Petit-déjeuner', emoji: '🌅' },
  lunch:     { label: 'Déjeuner',       emoji: '☀️' },
  dinner:    { label: 'Dîner',          emoji: '🌙' },
  snack:     { label: 'Collation',      emoji: '🍎' },
}
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

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

function formatMonthRange(start: Date, end: Date): string {
  const s = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(start)
  const e = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(end)
  return `${s} – ${e}`
}

function macroFromEntry(e: PlanEntry, key: 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'): number {
  const v = e[key]
  return v != null ? Math.round(v) : 0
}

// Couleur indicateur selon % de la cible
function calColor(kcal: number, target: number): string {
  if (target <= 0 || kcal === 0) return 'var(--fiq-muted)'
  const pct = kcal / target
  if (pct >= 0.9 && pct <= 1.1) return 'var(--fiq-accent)'
  if (pct >= 0.8 && pct <= 1.2) return 'var(--fiq-yellow)'
  return 'var(--fiq-orange)'
}

// ── Composant ──────────────────────────────────────────────────
export default function MealPlannerPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()))
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()))
  const [entries, setEntries] = useState<PlanEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Onglet actif : 'plan' | 'templates' | 'copy'
  const [activeTab, setActiveTab] = useState<'plan' | 'templates' | 'copy'>('plan')

  // Bottom sheet ajout
  const [addingFor, setAddingFor] = useState<{ date: string; meal: MealType } | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<SearchResult | null>(null)
  const [qty, setQty] = useState('100')
  const [adding, setAdding] = useState(false)

  // Template — modal confirm
  const [templateModal, setTemplateModal] = useState<MealTemplate | null>(null)
  const [templateDays, setTemplateDays] = useState<Set<string>>(new Set())
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  // Copier vers
  const [copySourceDate, setCopySourceDate] = useState<string>(toISODate(new Date()))
  const [copyTargetDays, setCopyTargetDays] = useState<Set<string>>(new Set())
  const [copying, setCopying] = useState(false)
  const [copyDone, setCopyDone] = useState(false)

  // Charger le profil utilisateur (cible calorique)
  useEffect(() => {
    fetch('/api/profile/macro-target')
      .then(r => r.json())
      .then((json: { data: UserProfile | null }) => {
        if (json.data) setProfile(json.data)
      })
      .catch(() => { /* silencieux */ })
  }, [])

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
    const targetDay = (new Date(selectedDate)).getDay()
    setSelectedDate(toISODate(addDays(d, ((targetDay || 7) - 1))))
    setCopyDone(false)
  }
  function nextWeek() {
    const d = addDays(weekStart, 7)
    setWeekStart(d)
    const targetDay = (new Date(selectedDate)).getDay()
    setSelectedDate(toISODate(addDays(d, ((targetDay || 7) - 1))))
    setCopyDone(false)
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
        calories:   Math.round((selectedFood.calories ?? 0) * ratio),
        protein_g:  Math.round((selectedFood.protein_g ?? 0) * ratio * 10) / 10,
        carbs_g:    Math.round((selectedFood.carbs_g ?? 0) * ratio * 10) / 10,
        fat_g:      Math.round((selectedFood.fat_g ?? 0) * ratio * 10) / 10,
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
      loadWeek(weekStart)
    }
  }

  // Appliquer un template sur les jours sélectionnés
  async function applyTemplate(template: MealTemplate, targetDates: string[]) {
    if (targetDates.length === 0) return
    setApplyingTemplate(true)
    try {
      for (const date of targetDates) {
        for (const meal of template.meals) {
          const body = {
            plan_date:  date,
            meal_type:  meal.meal_type,
            food_name:  meal.food_name,
            food_id:    null,
            quantity_g: meal.quantity_g,
            calories:   meal.calories,
            protein_g:  meal.protein_g,
            carbs_g:    meal.carbs_g,
            fat_g:      meal.fat_g,
          }
          await fetch('/api/nutrition/planner', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
          })
        }
      }
      await loadWeek(weekStart)
      setTemplateModal(null)
      setTemplateDays(new Set())
    } catch { /* silencieux */ }
    finally { setApplyingTemplate(false) }
  }

  // Copier les repas d'un jour source vers des jours cibles
  async function handleCopy() {
    if (copyTargetDays.size === 0 || copying) return
    setCopying(true)
    const sourceEntries = entries.filter(e => e.plan_date === copySourceDate)
    if (sourceEntries.length === 0) {
      setCopying(false)
      return
    }
    try {
      for (const targetDate of Array.from(copyTargetDays)) {
        if (targetDate === copySourceDate) continue
        for (const entry of sourceEntries) {
          const body = {
            plan_date:  targetDate,
            meal_type:  entry.meal_type,
            food_name:  entry.food_name,
            food_id:    entry.food_id,
            quantity_g: entry.quantity_g,
            calories:   entry.calories,
            protein_g:  entry.protein_g,
            carbs_g:    entry.carbs_g,
            fat_g:      entry.fat_g,
          }
          await fetch('/api/nutrition/planner', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
          })
        }
      }
      await loadWeek(weekStart)
      setCopyTargetDays(new Set())
      setCopyDone(true)
    } catch { /* silencieux */ }
    finally { setCopying(false) }
  }

  // Calcul cible calorique estimée (fallback si pas de profil)
  const calTarget = profile?.custom_calories ?? (profile?.goal === 'cut' ? 1800 : profile?.goal === 'bulk' ? 3000 : 2200)

  // Données du jour sélectionné
  const todayEntries = entries.filter(e => e.plan_date === selectedDate)
  const dayCalories = todayEntries.reduce((a, e) => a + macroFromEntry(e, 'calories'), 0)
  const dayProtein  = todayEntries.reduce((a, e) => a + macroFromEntry(e, 'protein_g'), 0)
  const dayCarbs    = todayEntries.reduce((a, e) => a + macroFromEntry(e, 'carbs_g'), 0)
  const dayFat      = todayEntries.reduce((a, e) => a + macroFromEntry(e, 'fat_g'), 0)

  // Jours de la semaine avec totaux calories
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    const iso = toISODate(d)
    const kcal = entries.filter(e => e.plan_date === iso).reduce((a, e) => a + macroFromEntry(e, 'calories'), 0)
    return {
      date:    iso,
      label:   DAY_LABELS[i],
      dayNum:  d.getDate(),
      isToday: iso === toISODate(new Date()),
      kcal,
    }
  })

  const todayISO = toISODate(new Date())

  return (
    <div className="max-w-lg mx-auto" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

      {/* Header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 px-4 pt-safe pb-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--fiq-border)', backdropFilter: 'blur(12px)' }}>

        {/* Titre + range semaine */}
        <div className="pt-4 mb-3 flex items-start justify-between">
          <div>
            <p className="fiq-label">Alimentation</p>
            <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Planner</h1>
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

        {/* Navigation semaine ─────────────────────────────── */}
        <div className="flex items-center gap-2">
          <button onClick={prevWeek}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Grille 7 jours avec calories ─────────────────── */}
          <div className="flex-1 flex gap-1">
            {weekDays.map(({ date, label, dayNum, isToday, kcal }) => {
              const isSelected = date === selectedDate
              const color = calColor(kcal, calTarget)
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-center transition-all min-w-0"
                  style={{
                    background: isSelected ? 'var(--fiq-accent)' : isToday ? 'var(--fiq-faint)' : 'transparent',
                    border: isToday && !isSelected ? '1px solid rgba(180,255,74,0.25)' : '1px solid transparent',
                  }}>
                  {/* Jour court */}
                  <span className="text-[9px] uppercase font-bold leading-none"
                    style={{ color: isSelected ? 'var(--bg)' : 'var(--fiq-muted)' }}>
                    {label}
                  </span>
                  {/* Numéro */}
                  <span className="text-sm font-black leading-tight"
                    style={{ color: isSelected ? 'var(--bg)' : isToday ? 'var(--fiq-accent)' : 'var(--fiq-text)' }}>
                    {dayNum}
                  </span>
                  {/* Calories ou point */}
                  {kcal > 0 ? (
                    <span className="text-[8px] font-black tabular-nums leading-none"
                      style={{ color: isSelected ? 'rgba(10,12,15,0.7)' : color }}>
                      {kcal >= 1000 ? `${(kcal / 1000).toFixed(1)}k` : kcal}
                    </span>
                  ) : (
                    <div className="w-1 h-1 rounded-full"
                      style={{ background: isSelected ? 'rgba(10,12,15,0.4)' : 'var(--fiq-border)' }} />
                  )}
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

        {/* Sous-onglets : Plan / Modèles / Copier */}
        <div className="flex gap-2 mt-3">
          {(['plan', 'templates', 'copy'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-xl text-xs font-black transition-all"
              style={{
                background: activeTab === tab ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                color: activeTab === tab ? 'var(--bg)' : 'var(--fiq-muted)',
                border: '1px solid ' + (activeTab === tab ? 'transparent' : 'var(--fiq-border)'),
              }}>
              {tab === 'plan' ? '📋 Plan' : tab === 'templates' ? '⚡ Modèles' : '📋 Copier'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ────────────────────────────────────────────── */}
      <div className="px-4 pt-4 space-y-4">

        {/* ── ONGLET PLAN ───────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <>
            {/* Résumé journalier */}
            {dayCalories > 0 && (
              <div className="fiq-card space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
                    {dayCalories.toLocaleString('fr-FR')} kcal
                    {calTarget > 0 && (
                      <span className="ml-2 text-xs font-normal" style={{ color: calColor(dayCalories, calTarget) }}>
                        {Math.round(dayCalories / calTarget * 100)}% cible
                      </span>
                    )}
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
                {[1, 2, 3].map(i => (
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
          </>
        )}

        {/* ── ONGLET MODÈLES ────────────────────────────────────── */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 mb-1">
              <Zap className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
              <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Modèles de repas</p>
            </div>
            <p className="text-xs px-1" style={{ color: 'var(--fiq-muted)' }}>
              Applique un modèle pré-défini sur un ou plusieurs jours de la semaine.
            </p>

            {MEAL_TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => { setTemplateModal(tpl); setTemplateDays(new Set()) }}
                className="w-full fiq-card text-left transition-all active:scale-[0.98]"
                style={{ border: `1px solid ${tpl.color}33` }}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                    style={{ background: `${tpl.color}18` }}>
                    {tpl.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>{tpl.label}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black"
                        style={{ background: `${tpl.color}22`, color: tpl.color }}>
                        {tpl.kcal} kcal
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{tpl.description}</p>
                    <div className="flex gap-3 mt-2">
                      {[
                        { label: 'P', val: tpl.protein, color: 'var(--fiq-accent)' },
                        { label: 'G', val: tpl.carbs,   color: 'var(--fiq-blue)' },
                        { label: 'L', val: tpl.fat,     color: 'var(--fiq-orange)' },
                      ].map(({ label, val, color }) => (
                        <span key={label} className="text-xs font-black" style={{ color }}>
                          {val}g <span style={{ color: 'var(--fiq-muted)', fontWeight: 400 }}>{label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: 'var(--fiq-muted)' }} />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── ONGLET COPIER ─────────────────────────────────────── */}
        {activeTab === 'copy' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1 mb-1">
              <Copy className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
              <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>Copier un jour vers d&apos;autres</p>
            </div>

            {/* Jour source */}
            <div className="fiq-card space-y-3">
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--fiq-muted)' }}>
                Jour source
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {weekDays.map(({ date, label, dayNum }) => {
                  const hasData = entries.some(e => e.plan_date === date)
                  const isSource = date === copySourceDate
                  return (
                    <button
                      key={date}
                      onClick={() => { setCopySourceDate(date); setCopyTargetDays(new Set()); setCopyDone(false) }}
                      className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
                      style={{
                        background: isSource ? 'var(--fiq-accent)' : hasData ? 'var(--fiq-faint)' : 'transparent',
                        border: '1px solid ' + (isSource ? 'transparent' : hasData ? 'var(--fiq-border)' : 'var(--fiq-border)'),
                        opacity: hasData ? 1 : 0.4,
                      }}>
                      <span className="text-[9px] uppercase font-bold"
                        style={{ color: isSource ? 'var(--bg)' : 'var(--fiq-muted)' }}>
                        {label}
                      </span>
                      <span className="text-sm font-black"
                        style={{ color: isSource ? 'var(--bg)' : 'var(--fiq-text)' }}>
                        {dayNum}
                      </span>
                      {hasData && (
                        <span className="text-[8px]" style={{ color: isSource ? 'rgba(10,12,15,0.6)' : 'var(--fiq-accent)' }}>
                          {entries.filter(e => e.plan_date === date).reduce((a, e) => a + macroFromEntry(e, 'calories'), 0)} kcal
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {/* Repas dans la source */}
              {(() => {
                const srcEntries = entries.filter(e => e.plan_date === copySourceDate)
                const srcKcal = srcEntries.reduce((a, e) => a + macroFromEntry(e, 'calories'), 0)
                if (srcEntries.length === 0) return (
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                    Aucun aliment planifié pour ce jour.
                  </p>
                )
                return (
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                    {srcEntries.length} aliment{srcEntries.length > 1 ? 's' : ''} · {srcKcal} kcal
                  </p>
                )
              })()}
            </div>

            {/* Flèche visuelle */}
            <div className="flex justify-center">
              <div className="text-2xl" style={{ color: 'var(--fiq-accent)' }}>↓</div>
            </div>

            {/* Jours cibles */}
            <div className="fiq-card space-y-3">
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--fiq-muted)' }}>
                Copier vers
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {weekDays.map(({ date, label, dayNum }) => {
                  const isSource = date === copySourceDate
                  const isTarget = copyTargetDays.has(date)
                  const isToday = date === todayISO
                  if (isSource) return null
                  return (
                    <button
                      key={date}
                      onClick={() => {
                        setCopyTargetDays(prev => {
                          const s = new Set(prev)
                          if (s.has(date)) s.delete(date)
                          else s.add(date)
                          return s
                        })
                        setCopyDone(false)
                      }}
                      className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
                      style={{
                        background: isTarget ? 'rgba(180,255,74,0.15)' : 'var(--fiq-faint)',
                        border: '1px solid ' + (isTarget ? 'var(--fiq-accent)' : 'var(--fiq-border)'),
                      }}>
                      <span className="text-[9px] uppercase font-bold"
                        style={{ color: isTarget ? 'var(--fiq-accent)' : 'var(--fiq-muted)' }}>
                        {label}
                      </span>
                      <span className="text-sm font-black"
                        style={{ color: isTarget ? 'var(--fiq-accent)' : isToday ? 'var(--fiq-accent)' : 'var(--fiq-text)' }}>
                        {dayNum}
                      </span>
                      {isTarget && (
                        <span className="text-[9px]" style={{ color: 'var(--fiq-accent)' }}>✓</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Bouton copier */}
              {copyDone ? (
                <div className="w-full py-3 rounded-2xl text-center font-black text-sm"
                  style={{ background: 'rgba(180,255,74,0.12)', color: 'var(--fiq-accent)', border: '1px solid rgba(180,255,74,0.3)' }}>
                  ✅ Repas copiés avec succès
                </div>
              ) : (
                <button
                  onClick={handleCopy}
                  disabled={copyTargetDays.size === 0 || copying || entries.filter(e => e.plan_date === copySourceDate).length === 0}
                  className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
                  {copying
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Copie en cours…</>
                    : <><Copy className="w-4 h-4" /> Copier vers {copyTargetDays.size > 0 ? `${copyTargetDays.size} jour${copyTargetDays.size > 1 ? 's' : ''}` : 'les jours sélectionnés'}</>
                  }
                </button>
              )}
            </div>
          </div>
        )}
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

            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--fiq-border)' }} />
            </div>

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
                            {food.calories} kcal · P:{food.protein_g}g · G:{food.carbs_g}g · L:{food.fat_g}g
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

              {selectedFood && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 px-3 py-3 rounded-xl"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid rgba(180,255,74,0.27)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
                        {selectedFood.name_fr || selectedFood.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                        {selectedFood.calories} kcal pour 100g
                      </p>
                    </div>
                    <button onClick={() => setSelectedFood(null)} style={{ color: 'var(--fiq-muted)' }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>

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

                    {(() => {
                      const q = parseFloat(qty) || 0
                      const r = q / 100
                      if (q <= 0) return null
                      return (
                        <div className="mt-3 flex gap-3 px-3 py-2.5 rounded-xl"
                          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                          {[
                            { label: 'kcal', val: Math.round((selectedFood.calories ?? 0) * r),          color: 'var(--fiq-accent)' },
                            { label: 'P',    val: Math.round((selectedFood.protein_g ?? 0) * r * 10) / 10, color: 'var(--fiq-accent)' },
                            { label: 'G',    val: Math.round((selectedFood.carbs_g ?? 0) * r * 10) / 10,   color: 'var(--fiq-blue)' },
                            { label: 'L',    val: Math.round((selectedFood.fat_g ?? 0) * r * 10) / 10,     color: 'var(--fiq-orange)' },
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

      {/* ── Modal template — choisir les jours ──────────────────── */}
      {templateModal && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => { setTemplateModal(null); setTemplateDays(new Set()) }}
          />
          <div
            className="fixed inset-x-4 bottom-4 z-50 rounded-3xl p-5 space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)' }}>

            {/* En-tête */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{templateModal.emoji}</span>
                  <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>{templateModal.label}</p>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  {templateModal.kcal} kcal · P:{templateModal.protein}g · G:{templateModal.carbs}g · L:{templateModal.fat}g
                </p>
              </div>
              <button onClick={() => { setTemplateModal(null); setTemplateDays(new Set()) }}>
                <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
              </button>
            </div>

            {/* Aperçu repas */}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {MEAL_ORDER.map(mealType => {
                const items = templateModal.meals.filter(m => m.meal_type === mealType)
                if (items.length === 0) return null
                return (
                  <div key={mealType} className="flex gap-2 items-start">
                    <span className="text-xs flex-shrink-0 mt-0.5">{MEAL_CONFIG[mealType].emoji}</span>
                    <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                      {items.map(i => i.food_name).join(', ')}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Sélection des jours */}
            <div>
              <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'var(--fiq-muted)' }}>
                Appliquer sur
              </p>
              <div className="flex gap-1.5">
                {weekDays.map(({ date, label, dayNum }) => {
                  const isSel = templateDays.has(date)
                  return (
                    <button
                      key={date}
                      onClick={() => {
                        setTemplateDays(prev => {
                          const s = new Set(prev)
                          if (s.has(date)) s.delete(date)
                          else s.add(date)
                          return s
                        })
                      }}
                      className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all"
                      style={{
                        background: isSel ? `${templateModal.color}22` : 'var(--fiq-faint)',
                        border: '1px solid ' + (isSel ? templateModal.color : 'var(--fiq-border)'),
                      }}>
                      <span className="text-[9px] uppercase font-bold"
                        style={{ color: isSel ? templateModal.color : 'var(--fiq-muted)' }}>
                        {label}
                      </span>
                      <span className="text-sm font-black"
                        style={{ color: isSel ? templateModal.color : 'var(--fiq-text)' }}>
                        {dayNum}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Bouton appliquer */}
            <button
              onClick={() => applyTemplate(templateModal, Array.from(templateDays))}
              disabled={templateDays.size === 0 || applyingTemplate}
              className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: templateModal.color, color: 'var(--bg)' }}>
              {applyingTemplate
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Application…</>
                : <><Zap className="w-4 h-4" /> Appliquer sur {templateDays.size > 0 ? `${templateDays.size} jour${templateDays.size > 1 ? 's' : ''}` : 'les jours sélectionnés'}</>
              }
            </button>
          </div>
        </>
      )}
    </div>
  )
}
