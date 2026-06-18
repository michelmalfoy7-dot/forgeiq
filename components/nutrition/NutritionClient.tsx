'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, Camera, ScanLine, Search, Trash2, Pencil, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader2, X, Check, Keyboard, Star, ChefHat, Minus, ArrowLeft, Link2, Sparkles, Calendar, Copy } from 'lucide-react'
import { WaterWidget } from '@/components/nutrition/WaterWidget'
import { FastingWidget } from '@/components/nutrition/FastingWidget'
import { MicroNutrientWidget, MicroTotals } from '@/components/nutrition/MicroNutrientWidget'
import { PaywallModal } from '@/components/ui/PaywallModal'

// ── Types ─────────────────────────────────────────────────────

type FoodLog = {
  id: string
  food_name: string
  quantity_g: number
  meal_type: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  source: string
  ai_note: string | null
  created_at: string
  // Micronutriments (null si non disponibles dans la bibliothèque)
  iron_mg:       number | null
  magnesium_mg:  number | null
  zinc_mg:       number | null
  calcium_mg:    number | null
  vitamin_d_mcg: number | null
  potassium_mg:  number | null
  vitamin_c_mg:  number | null
}

type FoodResult = {
  id: string | null
  name: string
  name_fr: string | null
  brand: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  barcode: string | null
}

type Favorite = {
  id: string
  food_name: string
  food_id?: string | null
  brand?: string | null
  calories_per_100g?: number | null
  protein_per_100g?: number | null
  carbs_per_100g?: number | null
  fat_per_100g?: number | null
  fiber_per_100g?: number | null
  default_quantity_g: number
  use_count: number
}

type RecipeIngr = {
  food_name: string
  food_id?: string | null
  quantity_g: number
  calories_per_100g?: number | null
  protein_per_100g?: number | null
  carbs_per_100g?: number | null
  fat_per_100g?: number | null
  fiber_per_100g?: number | null
  sort_order?: number
}

type Recipe = {
  id: string
  name: string
  description?: string | null
  total_servings: number
  calories_per_serving?: number | null
  protein_per_serving?: number | null
  carbs_per_serving?: number | null
  fat_per_serving?: number | null
  fiber_per_serving?: number | null
  // Micronutriments calculés par portion
  iron_mg_per_serving?:        number | null
  magnesium_mg_per_serving?:   number | null
  zinc_mg_per_serving?:        number | null
  calcium_mg_per_serving?:     number | null
  potassium_mg_per_serving?:   number | null
  vitamin_c_mg_per_serving?:   number | null
  vitamin_d_mcg_per_serving?:  number | null
  recipe_ingredients?: RecipeIngr[]
}

type Targets = {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

type MealSuggestion = {
  nom: string
  emoji: string
  description: string
  aliments: string[]
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  prep_time?: string
}

type Props = {
  initialLogs: FoodLog[]
  targets: Targets
  today: string
  initialWaterMl?: number
  waterGoalMl?: number
  isRestDay?: boolean    // jour de repos (pas de séance complétée)
  workoutKcal?: number   // calories séance d'aujourd'hui (+0 si repos)
  isPro?: boolean        // statut Pro — déterminé côté serveur
}

// ── Types analyse photo ────────────────────────────────────────

type PhotoAliment = {
  nom: string
  quantite_estimee_g: number
  calories: number | null
  proteines_g: number | null
  glucides_g: number | null
  lipides_g: number | null
  fibres_g: number | null
  confiance: 'haute' | 'moyenne' | 'faible'
}

type PhotoAnalysis = {
  aliments: PhotoAliment[]
  total: { calories: number; proteines_g: number; glucides_g: number; lipides_g: number }
  note: string
}

const PHOTO_LOADING_MSGS = [
  'ForgeIQ analyse ta photo...',
  'Identification des aliments...',
  'Calcul des valeurs nutritionnelles...',
]

// ── Constantes ────────────────────────────────────────────────

const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅 Petit-déjeuner',
  lunch: '☀️ Déjeuner',
  dinner: '🌙 Dîner',
  snack: '🍎 Collation',
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']

// ── Sous-composants ───────────────────────────────────────────

function MacroRing({ value, target, color, label }: { value: number; target: number; color: string; label: string }) {
  const rawPct = (value / target) * 100
  const barPct = Math.min(rawPct, 100)
  const over = value > target
  const displayColor = over ? 'var(--fiq-orange)' : color
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (barPct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--fiq-border)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={r} fill="none"
            stroke={displayColor} strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-black leading-none" style={{ color: displayColor }}>
            {Math.round(value)}
          </span>
          {over && <span className="text-[8px] font-black" style={{ color: 'var(--fiq-orange)' }}>+{Math.round(rawPct - 100)}%</span>}
        </div>
      </div>
      <span className="text-[10px] font-semibold" style={{ color: 'var(--fiq-muted)' }}>{label}</span>
      <span className="text-[9px]" style={{ color: 'var(--fiq-muted)' }}>/ {target}g</span>
    </div>
  )
}

function FoodCard({
  log,
  onDelete,
  onUpdate,
}: {
  log: FoodLog
  onDelete: (id: string) => void
  onUpdate: (updated: FoodLog) => void
}) {
  const [deleting, setDeleting] = useState(false)
  // État d'édition inline
  const [editing, setEditing] = useState(false)
  const [editQty, setEditQty] = useState(String(log.quantity_g))
  const [editMeal, setEditMeal] = useState(log.meal_type)
  const [saving, setSaving] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/nutrition/log?id=${log.id}`, { method: 'DELETE' })
      const { error } = await res.json()
      if (!error) onDelete(log.id)
    } catch {
      // Erreur réseau — l'entrée reste visible
    } finally {
      setDeleting(false)
    }
  }

  async function handleSaveEdit() {
    const qty = parseFloat(editQty)
    if (!qty || qty <= 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/nutrition/log', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: log.id, quantity_g: qty, meal_type: editMeal }),
      })
      const { data, error } = await res.json()
      if (data && !error) {
        onUpdate(data)
        setEditing(false)
      }
    } catch {
      // Erreur réseau — log reste inchangé
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div
        className="py-3 space-y-2"
        style={{ borderTop: '1px solid var(--fiq-border)' }}
      >
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--fiq-text)' }}>
          ✏️ {log.food_name}
        </p>
        {/* Quantité */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={editQty}
            onChange={e => setEditQty(e.target.value)}
            className="w-24 px-3 py-2 rounded-xl text-sm outline-none text-center font-black"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
            min="1" max="5000"
            autoFocus
          />
          <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>g</span>
          {/* Sélecteur repas compact */}
          <div className="flex gap-1 flex-1 overflow-x-auto">
            {MEAL_ORDER.map(m => (
              <button
                key={m}
                onClick={() => setEditMeal(m)}
                className="shrink-0 px-2 py-1.5 rounded-lg text-[10px] font-black transition-all"
                style={{
                  background: editMeal === m ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                  color: editMeal === m ? 'var(--bg)' : 'var(--fiq-muted)',
                  border: `1px solid ${editMeal === m ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                }}
              >
                {m === 'breakfast' ? '🌅' : m === 'lunch' ? '☀️' : m === 'dinner' ? '🌙' : '🍎'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(false)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'transparent', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={saving || !editQty || parseFloat(editQty) <= 0}
            className="flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" />Valider</>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-3 py-2.5"
      style={{ borderTop: '1px solid var(--fiq-border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--fiq-text)' }}>
          {log.food_name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: 'var(--fiq-muted)' }}>
          <span>{log.quantity_g}g</span>
          {log.calories && <span>· {Math.round(log.calories)} kcal</span>}
          {log.protein_g && <span>· {Math.round(log.protein_g)}g prot.</span>}
          {log.source === 'photo' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: '#3D8BFF18', color: 'var(--fiq-blue)', border: '1px solid #3D8BFF33' }}>
              📸 IA
            </span>
          )}
          {log.source === 'barcode' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: '#B4FF4A18', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A33' }}>
              📷 Scan
            </span>
          )}
          {log.source === 'recipe' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: '#FF6B3518', color: 'var(--fiq-orange)', border: '1px solid #FF6B3533' }}>
              🍽️ Recette
            </span>
          )}
        </div>
        {log.ai_note && (
          <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--fiq-muted)' }}>{log.ai_note}</p>
        )}
      </div>
      {/* Bouton édition */}
      <button
        onClick={() => { setEditQty(String(log.quantity_g)); setEditMeal(log.meal_type); setEditing(true) }}
        className="p-1.5 rounded-lg flex-shrink-0 transition-all"
        style={{ color: 'var(--fiq-muted)' }}
        title="Modifier"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-1.5 rounded-lg flex-shrink-0 transition-all"
        style={{ color: 'var(--fiq-muted)' }}
        title="Supprimer"
      >
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// ── Barcode Scanner via getUserMedia ──────────────────────────

function BarcodeScannerView({
  onDetected,
  onManual,
  onClose,
}: {
  onDetected: (code: string) => void
  onManual: () => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [camError, setCamError] = useState<string | null>(null)
  const [camReady, setCamReady] = useState(false)
  const [detected, setDetected] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const stopRef = useRef(false)
  const controlsRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    stopRef.current = false

    async function startScanner() {
      const video = videoRef.current
      if (!video) return

      try {
        if ('BarcodeDetector' in window) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          })
          video.srcObject = stream
          await video.play()
          setCamReady(true)

          controlsRef.current = { stop: () => stream.getTracks().forEach(t => t.stop()) }

          const BarcodeDetectorClass = (window as Window & {
            BarcodeDetector: new (opts: { formats: string[] }) => {
              detect: (src: ImageBitmapSource) => Promise<{ rawValue: string }[]>
            }
          }).BarcodeDetector

          const detector = new BarcodeDetectorClass({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf', 'data_matrix'],
          })

          let lastScanAt = 0
          const SCAN_INTERVAL_MS = 150 // Évite de saturer l'API à 60fps

          const scanFrame = async () => {
            if (stopRef.current) return
            const now = Date.now()
            if (now - lastScanAt < SCAN_INTERVAL_MS) {
              requestAnimationFrame(scanFrame)
              return
            }
            lastScanAt = now
            try {
              // readyState >= 3 (HAVE_FUTURE_DATA) + dimensions valides
              if (video.readyState >= 3 && video.videoWidth > 0) {
                // createImageBitmap capture une frame figée — plus fiable que passer video directement
                let source: ImageBitmapSource = video
                let bitmap: ImageBitmap | null = null
                try {
                  bitmap = await createImageBitmap(video)
                  source = bitmap
                } catch { /* fallback : passer video directement */ }

                const codes = await detector.detect(source)
                bitmap?.close()

                if (codes.length > 0 && !stopRef.current) {
                  stopRef.current = true
                  setDetected(true)
                  controlsRef.current?.stop()
                  navigator.vibrate?.(100) // Vibration courte : code détecté ✓
                  onDetected(codes[0].rawValue)
                  return
                }
              }
            } catch { /* frame not ready, skip */ }
            if (!stopRef.current) requestAnimationFrame(scanFrame)
          }
          requestAnimationFrame(scanFrame)

        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          const reader = new BrowserMultiFormatReader()

          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: 'environment' } },
            video,
            (result, _err, ctrl) => {
              if (result && !stopRef.current) {
                stopRef.current = true
                setDetected(true)
                ctrl.stop()
                navigator.vibrate?.(100) // Vibration courte : code détecté ✓
                onDetected(result.getText())
              }
            }
          )
          controlsRef.current = controls
          setCamReady(true)
        }
      } catch (e) {
        const msg = (e as Error).message ?? ''
        if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
          setCamError('Autorise l\'accès à la caméra dans les paramètres de ton navigateur.')
        } else if (msg.includes('Constraints') || msg.includes('OverConstrained')) {
          setCamError('Caméra arrière indisponible sur cet appareil.')
        } else {
          setCamError('Impossible d\'accéder à la caméra. Saisis le code manuellement.')
        }
      }
    }

    startScanner()

    return () => {
      stopRef.current = true
      controlsRef.current?.stop()
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream | null
        stream?.getTracks().forEach(t => t.stop())
        videoRef.current.srcObject = null
      }
    }
  }, [onDetected])

  if (showManual) {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Saisie manuelle du code-barres</p>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          placeholder="Ex: 3017620422003"
          value={manualCode}
          onChange={e => setManualCode(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
          onKeyDown={e => { if (e.key === 'Enter' && manualCode.trim()) onDetected(manualCode.trim()) }}
        />
        <button
          onClick={() => { if (manualCode.trim()) onDetected(manualCode.trim()) }}
          disabled={!manualCode.trim()}
          className="w-full py-3 rounded-xl font-black text-sm"
          style={{ background: 'var(--fiq-blue)', color: '#fff', opacity: manualCode.trim() ? 1 : 0.5 }}
        >
          Rechercher →
        </button>
        <button onClick={() => setShowManual(false)} className="w-full text-xs text-center py-1" style={{ color: 'var(--fiq-muted)' }}>
          ← Retour caméra
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />
        {!camError && !detected && !camReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
            <Loader2 className="w-7 h-7 animate-spin text-white" />
            <span className="text-xs text-white/70">Initialisation caméra…</span>
          </div>
        )}
        {!camError && !detected && camReady && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/50 rounded-xl" style={{ width: '70%', height: '35%' }} />
            </div>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="text-[11px] text-white/70 bg-black/50 rounded-full px-3 py-1">
                Pointez le code-barres dans le cadre
              </span>
            </div>
          </>
        )}
        {detected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center space-y-1">
              <div className="text-3xl">✓</div>
              <p className="text-white font-bold text-sm">Code détecté !</p>
            </div>
          </div>
        )}
        {camError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
            <p className="text-white text-sm text-center">{camError}</p>
          </div>
        )}
      </div>

      {!detected && (
        <button
          onClick={() => setShowManual(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          <Keyboard className="w-4 h-4" />
          Saisir le code manuellement
        </button>
      )}
    </div>
  )
}

// ── Unités naturelles ─────────────────────────────────────────

/** Poids d'une unité standard par aliment (clés normalisées sans accents) */
const FOOD_SERVINGS: Record<string, { unit: string; weightG: number }> = {
  'oeuf entier':         { unit: 'oeuf',        weightG: 60  },
  'oeuf dur':            { unit: 'oeuf',        weightG: 60  },
  'oeuf':                { unit: 'oeuf',        weightG: 60  },
  'blanc d\'oeuf':       { unit: 'blanc',       weightG: 35  },
  'blanc de oeuf':       { unit: 'blanc',       weightG: 35  },
  'jaune d\'oeuf':       { unit: 'jaune',       weightG: 20  },
  'jaune de oeuf':       { unit: 'jaune',       weightG: 20  },
  'banane':              { unit: 'banane',      weightG: 120 },
  'pomme':               { unit: 'pomme',       weightG: 182 },
  'orange':              { unit: 'orange',      weightG: 150 },
  'poire':               { unit: 'poire',       weightG: 170 },
  'kiwi':                { unit: 'kiwi',        weightG: 70  },
  'clementine':          { unit: 'clémentine',  weightG: 70  },
  'mandarine':           { unit: 'mandarine',   weightG: 80  },
  'peche':               { unit: 'pêche',       weightG: 150 },
  'yaourt nature':       { unit: 'yaourt',      weightG: 125 },
  'yaourt':              { unit: 'yaourt',      weightG: 125 },
  'blanc de poulet':     { unit: 'blanc',       weightG: 150 },
  'poitrine de poulet':  { unit: 'blanc',       weightG: 150 },
  'escalope de dinde':   { unit: 'escalope',    weightG: 120 },
  'lait demi-ecreme':    { unit: 'verre',       weightG: 250 },
  'lait entier':         { unit: 'verre',       weightG: 250 },
  'lait':                { unit: 'verre',       weightG: 250 },
  'pain de mie':         { unit: 'tranche',     weightG: 30  },
  'pain complet':        { unit: 'tranche',     weightG: 35  },
  'tranche de pain':     { unit: 'tranche',     weightG: 30  },
}

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/'/g, "'").trim()
}

function getServingInfo(foodName: string): { unit: string; weightG: number } | null {
  const n = normalizeStr(foodName)
  // Trier par longueur décroissante pour privilegier la correspondance la plus spécifique
  const sortedKeys = Object.keys(FOOD_SERVINGS).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    const k = normalizeStr(key)
    if (n === k || n.startsWith(k) || n.includes(k)) return FOOD_SERVINGS[key]
  }
  return null
}

function getStoredUnitMode(foodName: string, defaultMode: 'g' | 'unit' = 'g'): 'g' | 'unit' {
  try { return (localStorage.getItem(`forgeiq_unit_${normalizeStr(foodName)}`) as 'g' | 'unit' | null) ?? defaultMode } catch { return defaultMode }
}
function saveStoredUnitMode(foodName: string, mode: 'g' | 'unit') {
  try { localStorage.setItem(`forgeiq_unit_${normalizeStr(foodName)}`, mode) } catch {}
}

// ── Modale d'ajout ────────────────────────────────────────────

type ModalMode = 'choose' | 'search' | 'scan' | 'photo' | 'confirm' | 'photo-confirm' | 'favorites' | 'recipes' | 'create-recipe' | 'recipe-confirm'

function AddFoodModal({ onClose, onAdded, today, initialMealType = 'breakfast', targets, consumedToday, isPro = false, openPaywall = () => {} }: {
  onClose: () => void
  onAdded: (log: FoodLog) => void
  today: string
  initialMealType?: string
  targets?: Targets
  consumedToday?: { calories: number; protein_g: number; carbs_g: number; fat_g: number }
  isPro?: boolean
  openPaywall?: (trigger: 'photo' | 'general') => void
}) {
  const [mode, setMode] = useState<ModalMode>('choose')
  // Recherche aliment
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FoodResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  // Aliment sélectionné (confirm)
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [mealType, setMealType] = useState(initialMealType)
  const [adding, setAdding] = useState(false)
  // Scan barcode
  const [scanLoading, setScanLoading] = useState(false)
  const [barcodeError, setBarcodeError] = useState<string | null>(null)
  const [incompleteNutrition, setIncompleteNutrition] = useState(false) // fix 3e
  // Photo IA
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysis | null>(null)
  const [photoQuantities, setPhotoQuantities] = useState<Record<number, string>>({})
  const [photoNames, setPhotoNames] = useState<Record<number, string>>({})
  const [photoDeleted, setPhotoDeleted] = useState<Set<number>>(new Set())
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [photoError, setPhotoError] = useState('')
  // Favoris
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [selectedFavId, setSelectedFavId] = useState<string | null>(null)
  const [favLoading, setFavLoading] = useState(false)
  const [savingFav, setSavingFav] = useState(false)
  const [savedFav, setSavedFav] = useState(false)
  const [favError, setFavError] = useState<string | null>(null)
  const [deletingFavId, setDeletingFavId] = useState<string | null>(null)
  // Recettes
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recLoading, setRecLoading] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [recipePortions, setRecipePortions] = useState(1)
  // Création / édition recette
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null) // null = création, id = édition
  const [recipeName, setRecipeName] = useState('')
  const [recipeDescription, setRecipeDescription] = useState('')
  const [recipeServings, setRecipeServings] = useState(1)
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngr[]>([])
  const [recipeIngSearch, setRecipeIngSearch] = useState('')
  const [recipeIngResults, setRecipeIngResults] = useState<FoodResult[]>([])
  const [recipeIngSearching, setRecipeIngSearching] = useState(false)
  const [recipeIngSelected, setRecipeIngSelected] = useState<FoodResult | null>(null)
  const [recipeIngQty, setRecipeIngQty] = useState('100')
  const [savingRecipe, setSavingRecipe] = useState(false)
  // Unités naturelles ingrédients recette
  const [recipeIngUnitMode, setRecipeIngUnitMode] = useState<'g' | 'unit'>('g')
  const [recipeIngUnitCount, setRecipeIngUnitCount] = useState(1)
  // Erreur ajout recette au journal
  const [recipeLogError, setRecipeLogError] = useState<string | null>(null)
  // Unités naturelles aliment recherche
  const [unitMode, setUnitMode] = useState<'g' | 'unit'>('g')
  const [unitCount, setUnitCount] = useState(1)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recipeIngSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // S3-2 : Repositionner la modale quand le clavier virtuel apparaît
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      // Décalage = hauteur fenêtre − hauteur visible (= hauteur clavier)
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardOffset(offset)
    }
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', onResize)
    }
  }, [])

  // Reset savedFav + restaure préférence unité quand on change d'aliment
  useEffect(() => {
    setFavError(null)
    if (!selectedFood) { setSavedFav(false); return }
    const name = selectedFood.name_fr ?? selectedFood.name
    // Pré-cocher l'étoile si cet aliment est déjà dans les favoris chargés
    const alreadySaved = favorites.some(
      f => f.food_name.toLowerCase() === name.toLowerCase()
    )
    setSavedFav(alreadySaved)
    const serving = getServingInfo(name)
    if (serving) {
      // Par défaut 'unit' pour les aliments avec unité naturelle (oeuf, banane…)
      // Respecte la préférence stockée si l'utilisateur l'a déjà modifiée
      const pref = getStoredUnitMode(name, 'unit')
      setUnitMode(pref)
      if (pref === 'unit') {
        setUnitCount(1)
        setQuantity(String(serving.weightG))
      }
    } else {
      setUnitMode('g')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFood, favorites])

  // Compteur de rechargement favoris — permet de forcer un rechargement même si favorites est vide
  const [favReloadKey, setFavReloadKey] = useState(0)

  // Charger les favoris dès l'ouverture du modal (pour les afficher dans l'écran 'choose')
  // Aussi recharger si la liste a été vidée (cache invalidé après saveFavorite ou suppression)
  useEffect(() => { loadFavorites() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Recharge les favoris à chaque changement de mode sans guard sur la longueur —
    // corrige le bug où le dernier favori supprimé empêchait tout rechargement ultérieur
    loadFavorites()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, favReloadKey])

  // Cycling des messages de chargement analyse photo
  useEffect(() => {
    if (!scanLoading) { setLoadingMsgIdx(0); return }
    const iv = setInterval(() => setLoadingMsgIdx(i => (i + 1) % PHOTO_LOADING_MSGS.length), 1800)
    return () => clearInterval(iv)
  }, [scanLoading])

  // ── Recherche texte ──────────────────────────────────────────

  const handleSearch = useCallback(async (raw: string) => {
    setSearchQuery(raw)
    const q = raw.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 1) { setSearchResults([]); return }

    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(raw.trim())}`)
        const { data } = await res.json()
        setSearchResults(data ?? [])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }, [])

  // ── Barcode ──────────────────────────────────────────────────

  async function lookupBarcode(barcode: string) {
    setScanLoading(true)
    setBarcodeError(null)
    try {
      const res = await fetch(`/api/nutrition/scan?barcode=${barcode}`)
      const { data, error } = await res.json()
      if (error || !data) {
        navigator.vibrate?.([100, 50, 100]) // Double vibration : produit non trouvé
        setBarcodeError('Produit non trouvé. Essaie la recherche manuelle.')
        return
      }
      setSelectedFood({
        id: data.id ?? null,
        name: data.name_fr ?? data.name,
        name_fr: data.name_fr,
        brand: data.brand,
        calories: data.calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        fiber_g: data.fiber_g,
        barcode: data.barcode,
      })
      // Avertissement si valeurs nutritionnelles absentes ou nulles (fix 3e)
      setIncompleteNutrition(data.calories == null || data.calories === 0)
      setMode('confirm')
    } finally {
      setScanLoading(false)
    }
  }

  // ── Photo IA ─────────────────────────────────────────────────

  function compressImage(file: File, maxPx = 1024, quality = 0.78): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        let { width, height } = img

        if (width > height) {
          if (width > maxPx) { height = Math.round((height * maxPx) / width); width = maxPx }
        } else {
          if (height > maxPx) { width = Math.round((width * maxPx) / height); height = maxPx }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas non disponible sur cet appareil')); return }

        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        const base64 = dataUrl.split(',')[1]

        if (!base64 || base64.length < 500) {
          if (file.size < 3 * 1024 * 1024) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              const raw = (ev.target?.result as string).split(',')[1]
              if (raw) resolve(raw)
              else reject(new Error('Lecture image échouée'))
            }
            reader.onerror = () => reject(new Error('Lecture image échouée'))
            reader.readAsDataURL(file)
          } else {
            reject(new Error('Image trop grande. Utilise la galerie plutôt que l\'appareil photo.'))
          }
          return
        }
        resolve(base64)
      }

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Format non supporté. Utilise la galerie pour sélectionner la photo.'))
      }

      img.src = objectUrl
    })
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPhotoError('')
    setScanLoading(true)

    try {
      const base64 = await compressImage(file)

      const res = await fetch('/api/nutrition/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, media_type: 'image/jpeg' }),
      })

      let data: PhotoAnalysis | null = null
      let apiError: string | null = null

      if (!res.ok && res.status !== 400) {
        apiError = `Erreur serveur (${res.status}). Réessaie dans quelques secondes.`
      } else {
        try {
          const json = await res.json()
          data = json.data
          apiError = json.error
        } catch {
          apiError = 'Réponse serveur invalide. Réessaie.'
        }
      }

      if (apiError || !data) {
        setPhotoError(apiError ?? 'Analyse impossible. Prends une photo plus nette et bien éclairée.')
        return
      }

      const quantities: Record<number, string> = {}
      const names: Record<number, string> = {}
      ;(data.aliments as PhotoAliment[]).forEach((a, i) => {
        quantities[i] = String(a.quantite_estimee_g)
        names[i] = a.nom
      })
      setPhotoAnalysis(data)
      setPhotoQuantities(quantities)
      setPhotoNames(names)
      setPhotoDeleted(new Set())
      setMode('photo-confirm')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setPhotoError(msg)
    } finally {
      setScanLoading(false)
    }
  }

  // ── Confirm aliment (recherche / scan) ───────────────────────

  async function confirmAdd() {
    if (!selectedFood) return
    setAdding(true)
    try {
      const qty = parseFloat(quantity) || 100
      const payload = {
        log_date: today,
        meal_type: mealType,
        food_id: selectedFood.id,
        food_name: selectedFood.name_fr ?? selectedFood.name,
        quantity_g: qty,
        calories_per_100g: selectedFood.calories,
        protein_per_100g: selectedFood.protein_g,
        carbs_per_100g: selectedFood.carbs_g,
        fat_per_100g: selectedFood.fat_g,
        fiber_per_100g: selectedFood.fiber_g,
        source: selectedFavId ? 'favorite' : selectedFood.barcode ? 'barcode' : 'search',
      }
      const res = await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const { data } = await res.json()
      if (data) {
        // Si vient d'un favori → mémoriser la dose réellement utilisée
        if (selectedFavId) {
          const usedQty = parseFloat(quantity) || 100
          fetch('/api/nutrition/favorites', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedFavId, last_quantity_g: usedQty }),
          }).catch(() => {})
          // Mise à jour locale immédiate (pas besoin de re-fetch)
          setFavorites(prev => prev.map(f =>
            f.id === selectedFavId
              ? { ...f, default_quantity_g: usedQty, use_count: (f.use_count ?? 0) + 1 }
              : f
          ))
          setSelectedFavId(null)
        }
        onAdded(data); onClose()
      }
    } finally {
      setAdding(false)
    }
  }

  // ── Confirm photo ─────────────────────────────────────────────

  async function confirmAddAll() {
    if (!photoAnalysis) return
    setAdding(true)
    try {
      for (const [idx, aliment] of photoAnalysis.aliments.entries()) {
        if (photoDeleted.has(idx)) continue
        const qty = parseFloat(photoQuantities[idx] ?? String(aliment.quantite_estimee_g)) || aliment.quantite_estimee_g
        const per100 = (val: number | null) =>
          val != null && aliment.quantite_estimee_g > 0
            ? Math.round((val / aliment.quantite_estimee_g) * 100 * 10) / 10
            : null
        const payload = {
          log_date: today,
          meal_type: mealType,
          food_id: null,
          food_name: (photoNames[idx] ?? aliment.nom).trim() || aliment.nom,
          quantity_g: qty,
          calories_per_100g: per100(aliment.calories),
          protein_per_100g: per100(aliment.proteines_g),
          carbs_per_100g: per100(aliment.glucides_g),
          fat_per_100g: per100(aliment.lipides_g),
          fiber_per_100g: per100(aliment.fibres_g),
          source: 'photo',
          ai_note: idx === 0 ? (photoAnalysis.note || null) : null,
        }
        const res = await fetch('/api/nutrition/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const { data } = await res.json()
        if (data) onAdded(data)
      }
      onClose()
    } finally {
      setAdding(false)
    }
  }

  // ── Favoris ──────────────────────────────────────────────────

  async function loadFavorites() {
    // Plus de guard sur favorites.length — permet de recharger après une suppression
    setFavLoading(true)
    try {
      const res = await fetch('/api/nutrition/favorites')
      const { data } = await res.json()
      setFavorites(data ?? [])
    } finally {
      setFavLoading(false)
    }
  }

  async function saveFavorite() {
    if (!selectedFood || savedFav) return
    setSavingFav(true)
    setFavError(null)
    try {
      const res = await fetch('/api/nutrition/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_name: selectedFood.name_fr ?? selectedFood.name,
          food_id: selectedFood.id,
          brand: selectedFood.brand,
          calories_per_100g: selectedFood.calories,
          protein_per_100g: selectedFood.protein_g,
          carbs_per_100g: selectedFood.carbs_g,
          fat_per_100g: selectedFood.fat_g,
          fiber_per_100g: selectedFood.fiber_g,
          default_quantity_g: parseInt(quantity) || 100,
        }),
      })
      const json = await res.json()
      if (json.error) {
        setFavError('Impossible de sauvegarder. Réessaie.')
      } else {
        setSavedFav(true)
        setFavorites([]) // Invalide le cache pour le prochain chargement
      }
    } catch {
      setFavError('Erreur réseau. Réessaie.')
    } finally {
      setSavingFav(false)
    }
  }

  async function deleteFavorite(favId: string) {
    setDeletingFavId(favId)
    try {
      await fetch(`/api/nutrition/favorites?id=${favId}`, { method: 'DELETE' })
      setFavorites(prev => prev.filter(f => f.id !== favId))
      // Déclenche un rechargement du cache pour garantir la cohérence (fix 3a)
      setFavReloadKey(k => k + 1)
    } finally {
      setDeletingFavId(null)
    }
  }

  function addFromFavorite(fav: Favorite) {
    setSelectedFavId(fav.id)
    setSelectedFood({
      id: fav.food_id ?? null,
      name: fav.food_name,
      name_fr: fav.food_name,
      brand: fav.brand ?? null,
      calories: fav.calories_per_100g ?? null,
      protein_g: fav.protein_per_100g ?? null,
      carbs_g: fav.carbs_per_100g ?? null,
      fat_g: fav.fat_per_100g ?? null,
      fiber_g: fav.fiber_per_100g ?? null,
      barcode: null,
    })
    setQuantity(String(fav.default_quantity_g))
    setMode('confirm')
  }

  // ── Recettes ─────────────────────────────────────────────────

  async function loadRecipes() {
    if (recipes.length > 0) return
    setRecLoading(true)
    try {
      const res = await fetch('/api/nutrition/recipes')
      const { data } = await res.json()
      setRecipes(data ?? [])
    } finally {
      setRecLoading(false)
    }
  }

  async function deleteRecipe(id: string) {
    const res = await fetch(`/api/nutrition/recipes?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { setRecipeLogError('Erreur lors de la suppression. Réessaie.'); return }
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  function startEditRecipe(r: Recipe) {
    setEditingRecipeId(r.id)
    setRecipeName(r.name)
    setRecipeDescription(r.description ?? '')
    setRecipeServings(r.total_servings)
    setRecipeIngredients((r.recipe_ingredients ?? []).map((ing, i) => ({
      food_name: ing.food_name,
      food_id: ing.food_id ?? null,
      quantity_g: ing.quantity_g,
      calories_per_100g: ing.calories_per_100g ?? null,
      protein_per_100g: ing.protein_per_100g ?? null,
      carbs_per_100g: ing.carbs_per_100g ?? null,
      fat_per_100g: ing.fat_per_100g ?? null,
      fiber_per_100g: ing.fiber_per_100g ?? null,
      sort_order: ing.sort_order ?? i,
    })))
    setMode('create-recipe')
  }

  async function logRecipe() {
    if (!selectedRecipe) return
    setAdding(true)
    setRecipeLogError(null)
    try {
      // Logger la recette comme UN seul aliment en utilisant les macros par portion
      // quantity_g = recipePortions * 100 (astuce: 100 = 1 portion)
      // → calories affichées = (recipePortions*100)/100 * cal_per_serving = recipePortions * cal_per_serving ✓
      const portionLabel = recipePortions === 1
        ? '1 portion'
        : `${recipePortions} portion${recipePortions > 1 ? 's' : ''}`

      // Micros par portion → convertis en "per 100g" pour compatibilité avec log/route.ts
      // (quantity_g = recipePortions * 100, ratio = recipePortions → micro total = micro/serving * recipePortions)
      const payload = {
        log_date: today,
        meal_type: mealType,
        food_id: null,
        food_name: selectedRecipe.name,
        quantity_g: recipePortions * 100,
        calories_per_100g: selectedRecipe.calories_per_serving ?? null,
        protein_per_100g: selectedRecipe.protein_per_serving ?? null,
        carbs_per_100g: selectedRecipe.carbs_per_serving ?? null,
        fat_per_100g: selectedRecipe.fat_per_serving ?? null,
        fiber_per_100g: selectedRecipe.fiber_per_serving ?? null,
        source: 'recipe',
        ai_note: `🍽️ Recette · ${portionLabel}`,
        // Micros directs (déjà en valeur absolue par portion × nb portions)
        iron_mg_direct:       selectedRecipe.iron_mg_per_serving       != null ? selectedRecipe.iron_mg_per_serving       * recipePortions : null,
        magnesium_mg_direct:  selectedRecipe.magnesium_mg_per_serving  != null ? selectedRecipe.magnesium_mg_per_serving  * recipePortions : null,
        zinc_mg_direct:       selectedRecipe.zinc_mg_per_serving       != null ? selectedRecipe.zinc_mg_per_serving       * recipePortions : null,
        calcium_mg_direct:    selectedRecipe.calcium_mg_per_serving    != null ? selectedRecipe.calcium_mg_per_serving    * recipePortions : null,
        potassium_mg_direct:  selectedRecipe.potassium_mg_per_serving  != null ? selectedRecipe.potassium_mg_per_serving  * recipePortions : null,
        vitamin_c_mg_direct:  selectedRecipe.vitamin_c_mg_per_serving  != null ? selectedRecipe.vitamin_c_mg_per_serving  * recipePortions : null,
        vitamin_d_mcg_direct: selectedRecipe.vitamin_d_mcg_per_serving != null ? selectedRecipe.vitamin_d_mcg_per_serving * recipePortions : null,
      }

      const res = await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const { data, error } = await res.json()
      if (data) {
        // Forcer le source 'recipe' pour l'affichage du badge orange dans le journal
        onAdded({ ...data, source: 'recipe', ai_note: portionLabel })
        onClose()
      } else {
        setRecipeLogError(error ?? 'Erreur lors de l\'ajout. Réessaie.')
      }
    } catch {
      setRecipeLogError('Erreur réseau. Vérifie ta connexion et réessaie.')
    } finally {
      setAdding(false)
    }
  }

  // ── Création recette ─────────────────────────────────────────

  function handleRecipeIngSearch(raw: string) {
    setRecipeIngSearch(raw)
    const q = raw.trim()
    if (recipeIngSearchTimeout.current) clearTimeout(recipeIngSearchTimeout.current)
    if (q.length < 1) { setRecipeIngResults([]); return }
    recipeIngSearchTimeout.current = setTimeout(async () => {
      setRecipeIngSearching(true)
      try {
        const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}`)
        const { data } = await res.json()
        setRecipeIngResults(data ?? [])
      } finally {
        setRecipeIngSearching(false)
      }
    }, 300)
  }

  function addIngredient() {
    if (!recipeIngSelected) return
    const ingName = recipeIngSelected.name_fr ?? recipeIngSelected.name
    const serving = getServingInfo(ingName)
    // En mode unité, convertir le nombre d'unités en grammes
    const finalQtyG = recipeIngUnitMode === 'unit' && serving
      ? Math.round(recipeIngUnitCount * serving.weightG)
      : Math.round(parseFloat(recipeIngQty) || 100)

    setRecipeIngredients(prev => [...prev, {
      food_name: ingName,
      food_id: recipeIngSelected.id,
      quantity_g: finalQtyG,
      calories_per_100g: recipeIngSelected.calories,
      protein_per_100g: recipeIngSelected.protein_g,
      carbs_per_100g: recipeIngSelected.carbs_g,
      fat_per_100g: recipeIngSelected.fat_g,
      fiber_per_100g: recipeIngSelected.fiber_g,
      sort_order: recipeIngredients.length,
    }])
    setRecipeIngSelected(null)
    setRecipeIngSearch('')
    setRecipeIngResults([])
    setRecipeIngQty('100')
    setRecipeIngUnitMode('g')
    setRecipeIngUnitCount(1)
  }

  async function saveRecipe() {
    if (!recipeName.trim() || recipeIngredients.length === 0) return
    setSavingRecipe(true)
    try {
      const isEditing = editingRecipeId !== null
      const res = await fetch('/api/nutrition/recipes', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditing && { id: editingRecipeId }),
          name: recipeName.trim(),
          description: recipeDescription.trim() || null,
          total_servings: recipeServings,
          ingredients: recipeIngredients,
        }),
      })
      const { data } = await res.json()
      if (data) {
        if (isEditing) {
          // Mise à jour locale de la recette modifiée
          setRecipes(prev => prev.map(r => r.id === editingRecipeId ? data : r))
        } else {
          setRecipes(prev => [data, ...prev])
        }
        setEditingRecipeId(null)
        setRecipeName('')
        setRecipeDescription('')
        setRecipeServings(1)
        setRecipeIngredients([])
        setMode('recipes')
      }
    } finally {
      setSavingRecipe(false)
    }
  }

  // ── Navigation retour ────────────────────────────────────────

  function goBack() {
    setIncompleteNutrition(false) // reset warning à chaque navigation retour
    if (mode === 'confirm' || mode === 'search' || mode === 'scan' || mode === 'photo' || mode === 'favorites' || mode === 'recipes') {
      setMode('choose')
    } else if (mode === 'photo-confirm') {
      setMode('photo')
    } else if (mode === 'create-recipe') {
      // Reset état édition si on revient depuis le formulaire (fix 5)
      setEditingRecipeId(null)
      setRecipeName('')
      setRecipeDescription('')
      setRecipeServings(1)
      setRecipeIngredients([])
      setMode('recipes')
    } else if (mode === 'recipe-confirm') {
      setMode('recipes')
    } else {
      setMode('choose')
    }
  }

  // ── Titre modal ───────────────────────────────────────────────

  const modalTitle: Record<ModalMode, string> = {
    'choose': 'Ajouter un aliment',
    'search': '🔍 Rechercher',
    'scan': '📷 Scanner',
    'photo': '📸 Photo IA ForgeIQ',
    'confirm': '✅ Confirmer',
    'photo-confirm': '📸 Aliments détectés',
    'favorites': '⭐ Mes favoris',
    'recipes': '🍽️ Mes recettes',
    'create-recipe': editingRecipeId ? '✏️ Modifier la recette' : '➕ Nouvelle recette',
    'recipe-confirm': '🍽️ Portion & repas',
  }

  // Macros totales de la recette en cours de création
  const recipeTotal = recipeIngredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + (ing.calories_per_100g ?? 0) * ing.quantity_g / 100,
      protein: acc.protein + (ing.protein_per_100g ?? 0) * ing.quantity_g / 100,
    }),
    { calories: 0, protein: 0 }
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-3xl p-5 space-y-4"
        style={{
          background: 'var(--fiq-card)',
          border: '1px solid var(--fiq-border)',
          // Quand le clavier est ouvert, réduire la hauteur max pour que le contenu reste visible
          maxHeight: keyboardOffset > 0
            ? `calc(100dvh - ${keyboardOffset}px - env(safe-area-inset-bottom))`
            : 'calc(92dvh - 4rem - env(safe-area-inset-bottom))',
          overflowY: 'auto',
          // keyboardOffset pousse la modale au-dessus du clavier virtuel iOS/Android
          marginBottom: keyboardOffset > 0
            ? `${keyboardOffset}px`
            : 'calc(4rem + env(safe-area-inset-bottom))',
          paddingBottom: '24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mode !== 'choose' && (
              <button onClick={goBack} className="p-1 -ml-1" style={{ color: 'var(--fiq-muted)' }}>
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>
              {modalTitle[mode]}
            </h2>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
          </button>
        </div>

        {/* ── Choix du mode ── */}
        {mode === 'choose' && (
          <div className="space-y-3">

            {/* Récents — aliments fréquents avec dernière dose mémorisée */}
            {favorites.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] fiq-label px-0.5">Récents</p>
                <div className="space-y-1.5">
                  {[...favorites]
                    .sort((a, b) => (b.use_count ?? 0) - (a.use_count ?? 0))
                    .slice(0, 5)
                    .map(fav => {
                      const kcal = fav.calories_per_100g != null
                        ? Math.round(fav.calories_per_100g * fav.default_quantity_g / 100)
                        : null
                      const prot = fav.protein_per_100g != null
                        ? Math.round(fav.protein_per_100g * fav.default_quantity_g / 100 * 10) / 10
                        : null
                      return (
                        <button
                          key={fav.id}
                          onClick={() => addFromFavorite(fav)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
                        >
                          <Star className="w-3.5 h-3.5 shrink-0" style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--fiq-text)' }}>
                              {fav.food_name}
                            </p>
                            <p className="text-[11px]" style={{ color: 'var(--fiq-muted)' }}>
                              {kcal != null ? `${kcal} kcal` : ''}
                              {prot != null ? ` · ${prot}g prot.` : ''}
                              {fav.use_count > 1 ? ` · ×${fav.use_count}` : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                              {fav.default_quantity_g}g
                            </p>
                          </div>
                        </button>
                      )
                    })
                  }
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1 h-px" style={{ background: 'var(--fiq-border)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>autres options</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--fiq-border)' }} />
                </div>
              </div>
            )}

            {/* Accès rapide */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setMode('favorites'); loadFavorites() }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center transition-all"
                style={{ background: '#F59E0B18', border: '1px solid #F59E0B44' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F59E0B22' }}>
                  <Star className="w-5 h-5" style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                </div>
                <div>
                  <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>Favoris</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Accès rapide</p>
                </div>
              </button>
              <button
                onClick={() => { setMode('recipes'); loadRecipes() }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center transition-all"
                style={{ background: '#FF6B3518', border: '1px solid #FF6B3544' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FF6B3522' }}>
                  <ChefHat className="w-5 h-5" style={{ color: 'var(--fiq-orange)' }} />
                </div>
                <div>
                  <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>Recettes</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>1 tap = tous les ingr.</p>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--fiq-border)' }} />
              <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>ou ajouter manuellement</span>
              <div className="flex-1 h-px" style={{ background: 'var(--fiq-border)' }} />
            </div>

            <button
              onClick={() => { setMode('search'); loadFavorites() }}
              className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#B4FF4A22' }}>
                <Search className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
              </div>
              <div>
                <p className="font-black" style={{ color: 'var(--fiq-text)' }}>Rechercher</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Nom de l&apos;aliment · base OpenFoodFacts</p>
              </div>
            </button>

            <button
              onClick={() => setMode('scan')}
              className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#3D8BFF22' }}>
                <ScanLine className="w-5 h-5" style={{ color: 'var(--fiq-blue)' }} />
              </div>
              <div>
                <p className="font-black" style={{ color: 'var(--fiq-text)' }}>Scanner un code-barres</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Caméra en temps réel → détection automatique</p>
              </div>
            </button>

            <button
              onClick={() => isPro ? setMode('photo') : openPaywall('photo')}
              className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{ background: 'var(--fiq-faint)', border: isPro ? '1px solid var(--fiq-border)' : '1px solid #B4FF4A44' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isPro ? '#FF6B3522' : '#B4FF4A22' }}>
                <Camera className="w-5 h-5" style={{ color: isPro ? 'var(--fiq-orange)' : 'var(--fiq-accent)' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-black" style={{ color: 'var(--fiq-text)' }}>Photo du repas</p>
                  {!isPro && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md"
                      style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>PRO</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  {isPro ? 'IA ForgeIQ identifie les aliments et estime les macros' : 'Analyse ton repas en photo — disponible en Pro'}
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ── Favoris ── */}
        {mode === 'favorites' && (
          <div className="space-y-3">
            {favLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-3xl">⭐</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Aucun favori encore</p>
                <p className="text-xs px-4" style={{ color: 'var(--fiq-muted)' }}>
                  Recherche un aliment et appuie sur l'étoile ⭐ pour l'enregistrer ici.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pb-2">
                {favorites.map(fav => (
                  <div key={fav.id} className="flex items-stretch gap-2">
                    <button
                      onClick={() => addFromFavorite(fav)}
                      className="flex-1 text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3"
                      style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
                    >
                      <Star className="w-4 h-4 shrink-0" style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--fiq-text)' }}>
                          {fav.food_name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                          {fav.brand ? `${fav.brand} · ` : ''}
                          {fav.calories_per_100g ? `${Math.round(fav.calories_per_100g)} kcal` : ''}
                          {fav.protein_per_100g ? ` · ${Math.round(fav.protein_per_100g)}g prot.` : ''}
                          {' /100g'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                          {fav.default_quantity_g}g
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                          {fav.use_count > 1 ? `×${fav.use_count}` : 'dernière dose'}
                        </p>
                      </div>
                    </button>
                    {/* Bouton suppression favori */}
                    <button
                      onClick={() => deleteFavorite(fav.id)}
                      disabled={deletingFavId === fav.id}
                      className="px-3 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
                    >
                      {deletingFavId === fav.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <X className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setMode('search')}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
            >
              <Search className="w-4 h-4" />
              Chercher un autre aliment
            </button>
          </div>
        )}

        {/* ── Recettes ── */}
        {mode === 'recipes' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create-recipe')}
              className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2"
              style={{ background: '#FF6B3518', color: 'var(--fiq-orange)', border: '1px solid #FF6B3544' }}
            >
              <Plus className="w-4 h-4" />
              Créer une nouvelle recette
            </button>

            {recLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
              </div>
            ) : recipes.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-3xl">🍽️</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Aucune recette</p>
                <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                  Crée ta première recette pour l'ajouter en 1 tap.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[45vh] overflow-y-auto pb-2">
                {recipes.map(r => (
                  <div key={r.id} className="flex items-stretch gap-2">
                    <button
                      onClick={() => { setSelectedRecipe(r); setRecipePortions(1); setMode('recipe-confirm') }}
                      className="flex-1 text-left px-3 py-3 rounded-xl transition-all"
                      style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-black truncate" style={{ color: 'var(--fiq-text)' }}>{r.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                            {r.total_servings} portion{r.total_servings > 1 ? 's' : ''}
                            {r.recipe_ingredients ? ` · ${r.recipe_ingredients.length} ingr.` : ''}
                          </p>
                        </div>
                        {r.calories_per_serving != null && (
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                              {Math.round(r.calories_per_serving)} kcal
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>/portion</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 mt-1.5 text-[11px]" style={{ color: 'var(--fiq-muted)' }}>
                        {r.protein_per_serving != null && (
                          <span style={{ color: 'var(--fiq-blue)' }}>{Math.round(r.protein_per_serving)}g prot.</span>
                        )}
                        {r.carbs_per_serving != null && <span>{Math.round(r.carbs_per_serving)}g gluc.</span>}
                        {r.fat_per_serving != null && (
                          <span style={{ color: 'var(--fiq-orange)' }}>{Math.round(r.fat_per_serving)}g lip.</span>
                        )}
                      </div>
                    </button>
                    {/* Bouton édition recette (fix 5) */}
                    <button
                      onClick={() => startEditRecipe(r)}
                      className="px-2.5 rounded-xl flex items-center"
                      style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
                      title="Modifier la recette"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteRecipe(r.id)}
                      className="px-2.5 rounded-xl flex items-center"
                      style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Portion & repas (recette) ── */}
        {mode === 'recipe-confirm' && selectedRecipe && (
          <div className="space-y-4">
            {/* Infos recette */}
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
              <div>
                <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>{selectedRecipe.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  {selectedRecipe.total_servings} portion{selectedRecipe.total_servings > 1 ? 's' : ''} ·{' '}
                  {selectedRecipe.recipe_ingredients?.length ?? 0} ingrédient{(selectedRecipe.recipe_ingredients?.length ?? 0) > 1 ? 's' : ''}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Kcal/p.', value: selectedRecipe.calories_per_serving },
                  { label: 'Prot.', value: selectedRecipe.protein_per_serving },
                  { label: 'Gluc.', value: selectedRecipe.carbs_per_serving },
                  { label: 'Lip.', value: selectedRecipe.fat_per_serving },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-xs font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                      {m.value != null ? Math.round(m.value) : '—'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sélecteur de portions */}
            <div>
              <label className="fiq-label block mb-2">Nombre de portions</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setRecipePortions(p => Math.max(0.5, Math.round((p - 0.5) * 10) / 10))}
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center text-2xl font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                  {recipePortions}
                </span>
                <button
                  onClick={() => setRecipePortions(p => Math.round((p + 0.5) * 10) / 10)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {selectedRecipe.calories_per_serving != null && (
                <p className="text-center text-xs mt-2" style={{ color: 'var(--fiq-muted)' }}>
                  Total ≈{' '}
                  <span className="font-black" style={{ color: 'var(--fiq-accent)' }}>
                    {Math.round(selectedRecipe.calories_per_serving * recipePortions)} kcal
                  </span>
                  {selectedRecipe.protein_per_serving != null &&
                    ` · ${Math.round(selectedRecipe.protein_per_serving * recipePortions)}g prot.`}
                </p>
              )}
            </div>

            {/* Repas */}
            <div>
              <label className="fiq-label block mb-1.5">Repas</label>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_ORDER.map(m => (
                  <button key={m}
                    onClick={() => setMealType(m)}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: mealType === m ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                      color: mealType === m ? 'var(--bg)' : 'var(--fiq-muted)',
                      border: `1px solid ${mealType === m ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                    }}>
                    {MEAL_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Message d'erreur visible si l'ajout échoue */}
            {recipeLogError && (
              <div className="rounded-xl px-3 py-2.5 text-sm"
                style={{ background: '#EF444418', border: '1px solid #EF444433', color: '#EF4444' }}>
                ⚠ {recipeLogError}
              </div>
            )}

            <button
              onClick={logRecipe}
              disabled={adding}
              className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              {adding
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Check className="w-4 h-4" />Ajouter la recette au journal</>}
            </button>
          </div>
        )}

        {/* ── Créer une recette ── */}
        {mode === 'create-recipe' && (
          <div className="space-y-4">
            {/* Nom */}
            <div>
              <label className="fiq-label block mb-1.5">Nom de la recette *</label>
              <input
                autoFocus
                type="text"
                value={recipeName}
                onChange={e => setRecipeName(e.target.value)}
                placeholder="Ex: Glace Ninja Creami vanille protéinée"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
              />
            </div>

            {/* Portions */}
            <div className="flex items-center gap-3">
              <label className="fiq-label text-xs flex-1">Nombre de portions</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRecipeServings(s => Math.max(1, s - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                  {recipeServings}
                </span>
                <button
                  onClick={() => setRecipeServings(s => s + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Ingrédients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="fiq-label text-xs">
                  Ingrédients ({recipeIngredients.length})
                </label>
                {recipeIngredients.length > 0 && (
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--fiq-accent)' }}>
                    {Math.round(recipeTotal.calories)} kcal · {Math.round(recipeTotal.protein)}g prot. total
                  </span>
                )}
              </div>

              {/* Liste des ingrédients ajoutés */}
              {recipeIngredients.length > 0 && (
                <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                  {recipeIngredients.map((ing, idx) => (
                    <div key={idx}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--fiq-text)' }}>
                          {ing.food_name}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                          {(() => {
                            const srv = getServingInfo(ing.food_name)
                            if (srv && ing.quantity_g % srv.weightG === 0 && ing.quantity_g >= srv.weightG) {
                              const units = ing.quantity_g / srv.weightG
                              return `${units} ${srv.unit}${units > 1 ? 's' : ''} (${ing.quantity_g}g)`
                            }
                            return `${ing.quantity_g}g`
                          })()}
                          {ing.calories_per_100g ? ` · ${Math.round(ing.calories_per_100g * ing.quantity_g / 100)} kcal` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => setRecipeIngredients(prev => prev.filter((_, i) => i !== idx))}
                        style={{ color: 'var(--fiq-muted)' }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Ajouter un ingrédient */}
              {recipeIngSelected ? (
                /* Étape quantité — supporte les unités naturelles (oeufs, bananes…) */
                <div className="space-y-3 p-3 rounded-xl"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid #B4FF4A44' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>
                    {recipeIngSelected.name_fr ?? recipeIngSelected.name}
                  </p>
                  {(() => {
                    const ingName = recipeIngSelected.name_fr ?? recipeIngSelected.name
                    const serving = getServingInfo(ingName)
                    if (serving && recipeIngUnitMode === 'unit') {
                      // Mode unité naturelle : stepper sans clavier
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 py-1">
                            <button
                              onClick={() => {
                                const n = Math.max(0.5, Math.round((recipeIngUnitCount - 0.5) * 10) / 10)
                                setRecipeIngUnitCount(n)
                                setRecipeIngQty(String(Math.round(n * serving.weightG)))
                              }}
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black"
                              style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                            >−</button>
                            <div className="flex-1 text-center">
                              <p className="text-3xl font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                                {recipeIngUnitCount}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                                {serving.unit}{recipeIngUnitCount > 1 ? 's' : ''} · ≈{Math.round(recipeIngUnitCount * serving.weightG)}g
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                const n = Math.round((recipeIngUnitCount + 0.5) * 10) / 10
                                setRecipeIngUnitCount(n)
                                setRecipeIngQty(String(Math.round(n * serving.weightG)))
                              }}
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black"
                              style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                            >+</button>
                          </div>
                          <button
                            onClick={() => setRecipeIngUnitMode('g')}
                            className="w-full text-center text-xs"
                            style={{ color: 'var(--fiq-muted)' }}
                          >
                            Saisir en grammes →
                          </button>
                        </div>
                      )
                    }
                    // Mode grammes (défaut ou basculé manuellement)
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            value={recipeIngQty}
                            onChange={e => setRecipeIngQty(e.target.value)}
                            placeholder="Quantité"
                            className="flex-1 px-3 py-3 rounded-xl text-sm outline-none text-center font-black"
                            style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)', fontSize: 20 }}
                            min="1"
                            onKeyDown={e => { if (e.key === 'Enter') addIngredient() }}
                          />
                          <span className="text-sm font-semibold" style={{ color: 'var(--fiq-muted)' }}>g</span>
                        </div>
                        {serving && (
                          <button
                            onClick={() => {
                              setRecipeIngUnitMode('unit')
                              setRecipeIngUnitCount(1)
                              setRecipeIngQty(String(serving.weightG))
                            }}
                            className="w-full text-center text-xs"
                            style={{ color: 'var(--fiq-accent)' }}
                          >
                            ← Saisir en {serving.unit}s
                          </button>
                        )}
                      </div>
                    )
                  })()}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setRecipeIngSelected(null)
                        setRecipeIngSearch('')
                        setRecipeIngResults([])
                        setRecipeIngUnitMode('g')
                        setRecipeIngUnitCount(1)
                        setRecipeIngQty('100')
                      }}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'transparent', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={addIngredient}
                      disabled={recipeIngUnitMode === 'g' ? (!recipeIngQty || parseFloat(recipeIngQty) <= 0) : recipeIngUnitCount <= 0}
                      className="flex-1 py-3 rounded-xl text-sm font-black"
                      style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                    >
                      ✓ Ajouter
                    </button>
                  </div>
                </div>
              ) : (
                /* Étape recherche */
                <div className="space-y-2">
                  <input
                    type="text"
                    value={recipeIngSearch}
                    onChange={e => handleRecipeIngSearch(e.target.value)}
                    placeholder="Chercher un ingrédient..."
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                  />
                  {recipeIngSearching && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
                    </div>
                  )}
                  {recipeIngResults.length > 0 && (
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {recipeIngResults.slice(0, 6).map((f, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const name = f.name_fr ?? f.name
                            const serving = getServingInfo(name)
                            setRecipeIngSelected(f)
                            if (serving) {
                              // Unité naturelle : démarrer à 1 unité (ex: 1 oeuf = 60g)
                              setRecipeIngUnitMode('unit')
                              setRecipeIngUnitCount(1)
                              setRecipeIngQty(String(serving.weightG))
                            } else {
                              setRecipeIngUnitMode('g')
                              setRecipeIngUnitCount(1)
                              setRecipeIngQty('100')
                            }
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl"
                          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
                        >
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--fiq-text)' }}>
                            {f.name_fr ?? f.name}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                            {f.brand ? `${f.brand} · ` : ''}
                            {f.calories ? `${Math.round(f.calories)} kcal` : ''}
                            {f.protein_g ? ` · ${Math.round(f.protein_g)}g prot.` : ''}
                            {' /100g'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bouton sauvegarder */}
            <button
              onClick={saveRecipe}
              disabled={!recipeName.trim() || recipeIngredients.length === 0 || savingRecipe}
              className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: recipeName.trim() && recipeIngredients.length > 0 ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                color: recipeName.trim() && recipeIngredients.length > 0 ? 'var(--bg)' : 'var(--fiq-muted)',
                border: '1px solid var(--fiq-border)',
              }}
            >
              {savingRecipe
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Check className="w-4 h-4" />{editingRecipeId ? 'Mettre à jour la recette' : `Sauvegarder la recette (${recipeIngredients.length} ingr.)`}</>}
            </button>
          </div>
        )}

        {/* ── Recherche texte ── */}
        {mode === 'search' && (
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Ex: poulet grillé, riz, yaourt..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
            />

            {/* Aliments fréquents — affichés quand la recherche est vide */}
            {!searchQuery && favorites.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] fiq-label px-1">Fréquents</p>
                <div className="space-y-1 max-h-[42vh] overflow-y-auto pb-2">
                  {[...favorites]
                    .sort((a, b) => (b.use_count ?? 0) - (a.use_count ?? 0))
                    .slice(0, 8)
                    .map(fav => {
                      const kcal = fav.calories_per_100g != null
                        ? Math.round(fav.calories_per_100g * fav.default_quantity_g / 100)
                        : null
                      const prot = fav.protein_per_100g != null
                        ? Math.round(fav.protein_per_100g * fav.default_quantity_g / 100 * 10) / 10
                        : null
                      return (
                        <button
                          key={fav.id}
                          onClick={() => addFromFavorite(fav)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--fiq-text)' }}>{fav.food_name}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                              {kcal != null ? `${kcal} kcal` : ''}
                              {prot != null ? ` · ${prot}g prot.` : ''}
                              {fav.use_count > 1 ? ` · ×${fav.use_count}` : ''}
                            </p>
                          </div>
                          <p className="text-xs font-black fiq-data shrink-0" style={{ color: 'var(--fiq-accent)' }}>
                            {fav.default_quantity_g}g
                          </p>
                        </button>
                      )
                    })
                  }
                </div>
              </div>
            )}

            {searchLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
              </div>
            )}

            {searchQuery && !searchLoading && searchResults.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--fiq-muted)' }}>
                Aucun résultat pour « {searchQuery} »
              </p>
            )}

            {searchQuery && (
              <div className="space-y-1 max-h-[42vh] overflow-y-auto pb-2">
                {searchResults.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedFood(f); setMode('confirm') }}
                    className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
                  >
                    <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>
                      {f.name_fr ?? f.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                      {f.brand && `${f.brand} · `}
                      {f.calories ? `${Math.round(f.calories)} kcal` : ''}
                      {f.protein_g ? ` · ${Math.round(f.protein_g)}g prot.` : ''}
                      {' pour 100g'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Scanner vidéo temps réel ── */}
        {mode === 'scan' && (
          <div className="space-y-3">
            {barcodeError && (
              <div className="rounded-xl px-3 py-2 text-sm flex items-center gap-2"
                style={{ background: '#EF444418', color: '#EF4444', border: '1px solid #EF444433' }}>
                {barcodeError}
                <button onClick={() => { setBarcodeError(null); setMode('search') }}
                  className="ml-auto text-xs underline">Rechercher</button>
              </div>
            )}
            {scanLoading ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--fiq-blue)' }} />
                <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Recherche du produit…</p>
              </div>
            ) : (
              <BarcodeScannerView
                onDetected={lookupBarcode}
                onManual={() => setMode('search')}
                onClose={onClose}
              />
            )}
          </div>
        )}

        {/* ── Photo IA ── */}
        {mode === 'photo' && (
          <div className="space-y-4">
            {photoError && (
              <div className="rounded-xl px-3 py-2.5 text-sm space-y-1"
                style={{ background: '#EF444418', color: '#EF4444', border: '1px solid #EF444433' }}>
                <p className="font-semibold">⚠ {photoError}</p>
                <p className="text-xs opacity-80">Astuce : bonne lumière, repas bien visible, photo de près.</p>
              </div>
            )}

            {scanLoading ? (
              <div className="flex flex-col items-center gap-3 py-12 rounded-2xl"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--fiq-orange)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--fiq-orange)' }}>
                  {PHOTO_LOADING_MSGS[loadingMsgIdx]}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label
                  htmlFor="camera-input"
                  className="flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all"
                  style={{ borderColor: 'var(--fiq-orange)', background: '#FF6B3508' }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: '#FF6B3522' }}>
                    <Camera className="w-6 h-6" style={{ color: 'var(--fiq-orange)' }} />
                  </div>
                  <div className="text-center px-2">
                    <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>Appareil photo</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Prendre une photo</p>
                  </div>
                </label>

                <label
                  htmlFor="gallery-input"
                  className="flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all"
                  style={{ borderColor: 'var(--fiq-border)', background: 'var(--fiq-faint)' }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                    <span className="text-2xl">🖼️</span>
                  </div>
                  <div className="text-center px-2">
                    <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>Galerie</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Photo existante</p>
                  </div>
                </label>
              </div>
            )}

            <input id="camera-input" type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handlePhotoFile} disabled={scanLoading} />
            <input id="gallery-input" type="file" accept="image/*"
              className="hidden" onChange={handlePhotoFile} disabled={scanLoading} />

            <p className="text-[10px] text-center" style={{ color: 'var(--fiq-muted)' }}>
              Compressé automatiquement · Format JPEG · Compatible IA
            </p>
          </div>
        )}

        {/* ── Confirmation aliment unique ── */}
        {mode === 'confirm' && selectedFood && (
          <div className="space-y-4">
            {/* Infos aliment */}
            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-black" style={{ color: 'var(--fiq-text)' }}>
                    {selectedFood.name_fr ?? selectedFood.name}
                  </p>
                  {selectedFood.brand && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{selectedFood.brand}</p>
                  )}
                  {/* Avertissement valeurs incomplètes après scan (fix 3e) */}
                  {incompleteNutrition && (
                    <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--fiq-yellow, #F59E0B)' }}>
                      ⚠ Valeurs nutritionnelles incomplètes — vérifie avant d'ajouter
                    </p>
                  )}
                </div>
                {/* Bouton favoris */}
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={saveFavorite}
                    disabled={savingFav || savedFav}
                    title={savedFav ? 'Déjà dans les favoris' : 'Ajouter aux favoris'}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: savedFav ? '#F59E0B22' : 'var(--fiq-faint)',
                      border: `1px solid ${savedFav ? '#F59E0B66' : favError ? '#EF444466' : 'var(--fiq-border)'}`,
                      color: savedFav ? '#F59E0B' : favError ? '#EF4444' : 'var(--fiq-muted)',
                    }}
                  >
                    {savingFav
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Star className="w-3.5 h-3.5" style={{ fill: savedFav ? '#F59E0B' : 'none', color: savedFav ? '#F59E0B' : favError ? '#EF4444' : 'var(--fiq-muted)' }} />}
                    {savedFav ? 'Favori ✓' : favError ? '!' : ''}
                  </button>
                  {favError && (
                    <span className="text-[10px]" style={{ color: '#EF4444' }}>{favError}</span>
                  )}
                </div>
              </div>
              {/* Macros pour 100g */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                {[
                  { label: 'Kcal', value: selectedFood.calories },
                  { label: 'Prot.', value: selectedFood.protein_g },
                  { label: 'Gluc.', value: selectedFood.carbs_g },
                  { label: 'Lip.', value: selectedFood.fat_g },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-xs font-bold fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                      {m.value != null ? Math.round(m.value) : '—'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>{m.label}/100g</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quantité — grammes ou unité naturelle */}
            <div>
              {(() => {
                const serving = getServingInfo(selectedFood.name_fr ?? selectedFood.name)
                // ── Live macro preview (calculé à chaque render depuis quantity) ──
                const qty = parseFloat(quantity) || 0
                const ratio = qty / 100
                const liveCal  = selectedFood.calories  != null ? Math.round(selectedFood.calories  * ratio) : null
                const liveProt = selectedFood.protein_g != null ? Math.round(selectedFood.protein_g * ratio) : null
                const liveCarb = selectedFood.carbs_g   != null ? Math.round(selectedFood.carbs_g   * ratio) : null
                const liveFat  = selectedFood.fat_g     != null ? Math.round(selectedFood.fat_g     * ratio) : null
                const MacroPreview = qty > 0 && (liveCal != null || liveProt != null) ? (
                  <div className="mt-2.5 rounded-xl p-3 space-y-2"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                    {/* Valeurs instantanées */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] font-bold" style={{ color: 'var(--fiq-muted)' }}>⚡ Pour {qty}g</span>
                      {liveCal   != null && <span className="text-xs font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>{liveCal} kcal</span>}
                      {liveProt  != null && <span className="text-xs fiq-data" style={{ color: 'var(--fiq-blue)' }}>P {liveProt}g</span>}
                      {liveCarb  != null && <span className="text-xs fiq-data" style={{ color: '#A855F7' }}>G {liveCarb}g</span>}
                      {liveFat   != null && <span className="text-xs fiq-data" style={{ color: 'var(--fiq-orange)' }}>L {liveFat}g</span>}
                    </div>
                    {/* Impact sur objectif protéines — la macro la plus critique */}
                    {targets && liveProt != null && (
                      (() => {
                        const newProt = (consumedToday?.protein_g ?? 0) + liveProt
                        const pct = Math.min(100, Math.round((newProt / targets.protein_g) * 100))
                        const over = newProt > targets.protein_g
                        return (
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                                Protéines après : {newProt}g / {targets.protein_g}g
                              </span>
                              <span className="text-[10px] font-bold" style={{ color: over ? 'var(--fiq-orange)' : 'var(--fiq-accent)' }}>
                                {pct}%
                              </span>
                            </div>
                            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? 'var(--fiq-orange)' : 'var(--fiq-accent)', transition: 'width 0.15s ease' }} />
                            </div>
                          </div>
                        )
                      })()
                    )}
                    {/* Impact calories */}
                    {targets && liveCal != null && (
                      (() => {
                        const newCal = (consumedToday?.calories ?? 0) + liveCal
                        const pct = Math.min(100, Math.round((newCal / targets.calories) * 100))
                        const over = newCal > targets.calories
                        return (
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
                                Calories après : {newCal} / {targets.calories} kcal
                              </span>
                              <span className="text-[10px] font-bold" style={{ color: over ? 'var(--fiq-red)' : 'var(--fiq-muted)' }}>
                                {over ? `+${newCal - targets.calories} dépassé` : `${targets.calories - newCal} restantes`}
                              </span>
                            </div>
                            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? 'var(--fiq-red)' : 'var(--fiq-blue)', transition: 'width 0.15s ease' }} />
                            </div>
                          </div>
                        )
                      })()
                    )}
                  </div>
                ) : null

                if (!serving) {
                  return (
                    <>
                      <label className="fiq-label block mb-1.5">Quantité (grammes)</label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                        min="1" max="2000"
                      />
                      {MacroPreview}
                    </>
                  )
                }
                return (
                  <>
                    {/* Toggle Grammes / Unités */}
                    <div className="flex gap-1 p-1 rounded-xl mb-4"
                      style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                      {(['g', 'unit'] as const).map(m => (
                        <button key={m}
                          onClick={() => {
                            setUnitMode(m)
                            saveStoredUnitMode(selectedFood.name_fr ?? selectedFood.name, m)
                            if (m === 'unit') {
                              const n = Math.max(1, Math.round(parseFloat(quantity) / serving.weightG) || 1)
                              setUnitCount(n)
                              setQuantity(String(Math.round(n * serving.weightG)))
                            }
                          }}
                          className="flex-1 py-2 rounded-lg text-xs font-black transition-all"
                          style={{
                            background: unitMode === m ? 'var(--fiq-accent)' : 'transparent',
                            color: unitMode === m ? 'var(--bg)' : 'var(--fiq-muted)',
                          }}
                        >
                          {m === 'g' ? 'Grammes' : `Unités (${serving.unit})`}
                        </button>
                      ))}
                    </div>

                    {unitMode === 'unit' ? (
                      /* Stepper + affichage unités */
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const n = Math.max(0.5, Math.round((unitCount - 0.5) * 10) / 10)
                              setUnitCount(n)
                              setQuantity(String(Math.round(n * serving.weightG)))
                            }}
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <div className="flex-1 text-center">
                            <p className="text-3xl font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                              {unitCount}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                              {serving.unit}{unitCount > 1 ? 's' : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const n = Math.round((unitCount + 0.5) * 10) / 10
                              setUnitCount(n)
                              setQuantity(String(Math.round(n * serving.weightG)))
                            }}
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-center text-xs" style={{ color: 'var(--fiq-muted)' }}>
                          ≈{' '}
                          <span className="font-black" style={{ color: 'var(--fiq-text)' }}>
                            {Math.round(unitCount * serving.weightG)}g
                          </span>
                          {selectedFood.calories != null && (
                            <> ·{' '}
                              <span className="font-black" style={{ color: 'var(--fiq-accent)' }}>
                                {Math.round(selectedFood.calories * unitCount * serving.weightG / 100)} kcal
                              </span>
                            </>
                          )}
                        </p>
                        {/* MacroPreview également en mode unités — même composant que mode grammes */}
                        {MacroPreview}
                      </div>
                    ) : (
                      /* Input grammes classique */
                      <>
                        <label className="fiq-label block mb-1.5">Quantité (grammes)</label>
                        <input
                          type="number"
                          value={quantity}
                          onChange={e => setQuantity(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                          min="1" max="2000"
                        />
                        {MacroPreview}
                      </>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Repas */}
            <div>
              <label className="fiq-label block mb-1.5">Repas</label>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_ORDER.map(m => (
                  <button key={m}
                    onClick={() => setMealType(m)}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: mealType === m ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                      color: mealType === m ? 'var(--bg)' : 'var(--fiq-muted)',
                      border: `1px solid ${mealType === m ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                    }}>
                    {MEAL_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={confirmAdd}
              disabled={adding}
              className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />Ajouter au journal</>}
            </button>
          </div>
        )}

        {/* ── Résultats analyse photo ── */}
        {mode === 'photo-confirm' && photoAnalysis && (
          <div className="space-y-3">
            {photoAnalysis.note && (
              <p className="text-xs italic px-1" style={{ color: 'var(--fiq-muted)' }}>
                💡 {photoAnalysis.note}
              </p>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {photoAnalysis.aliments.map((aliment, idx) => {
                if (photoDeleted.has(idx)) return null
                const qtyRaw = photoQuantities[idx] ?? String(aliment.quantite_estimee_g)
                const qty = parseFloat(qtyRaw) || aliment.quantite_estimee_g
                const ratio = aliment.quantite_estimee_g > 0 ? qty / aliment.quantite_estimee_g : 1
                return (
                  <div key={idx} className="rounded-xl p-3 space-y-2"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                    {/* Ligne nom + bouton supprimer */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={photoNames[idx] ?? aliment.nom}
                        onChange={e => setPhotoNames(prev => ({ ...prev, [idx]: e.target.value }))}
                        className="flex-1 px-2 py-1 rounded-lg text-sm font-semibold outline-none min-w-0"
                        style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                        placeholder="Nom de l'aliment"
                      />
                      <button
                        onClick={() => setPhotoDeleted(prev => new Set([...prev, idx]))}
                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: '#EF444418', border: '1px solid #EF444433', color: 'var(--fiq-red)' }}
                        title="Retirer cet aliment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {aliment.confiance === 'faible' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B33' }}>
                          ⚠️ approx.
                        </span>
                      )}
                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        <input
                          type="number"
                          value={qtyRaw}
                          onChange={e => setPhotoQuantities(prev => ({ ...prev, [idx]: e.target.value }))}
                          className="w-16 px-2 py-1 rounded-lg text-xs text-center outline-none"
                          style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                          min="1" max="2000"
                        />
                        <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>g</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]" style={{ color: 'var(--fiq-muted)' }}>
                      {aliment.calories != null && (
                        <span>
                          <span className="font-bold fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                            {Math.round(aliment.calories * ratio)}
                          </span> kcal
                        </span>
                      )}
                      {aliment.proteines_g != null && (
                        <span>
                          <span className="font-bold fiq-data" style={{ color: 'var(--fiq-blue)' }}>
                            {(aliment.proteines_g * ratio).toFixed(1)}
                          </span>g prot.
                        </span>
                      )}
                      {aliment.glucides_g != null && (
                        <span>
                          <span className="font-bold fiq-data">
                            {(aliment.glucides_g * ratio).toFixed(1)}
                          </span>g gluc.
                        </span>
                      )}
                      {aliment.lipides_g != null && (
                        <span>
                          <span className="font-bold fiq-data" style={{ color: 'var(--fiq-orange)' }}>
                            {(aliment.lipides_g * ratio).toFixed(1)}
                          </span>g lip.
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {(() => {
              const activeCount = photoAnalysis.aliments.length - photoDeleted.size
              const totalKcal = Math.round(photoAnalysis.aliments.reduce((acc, a, i) => {
                if (photoDeleted.has(i)) return acc
                const q = parseFloat(photoQuantities[i] ?? String(a.quantite_estimee_g)) || a.quantite_estimee_g
                return acc + (a.calories ?? 0) * (a.quantite_estimee_g > 0 ? q / a.quantite_estimee_g : 1)
              }, 0))
              if (activeCount <= 1) return null
              return (
                <div className="rounded-xl px-3 py-2 flex items-center justify-between"
                  style={{ background: '#B4FF4A12', border: '1px solid #B4FF4A33' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--fiq-accent)' }}>
                    Total · {activeCount} aliment{activeCount > 1 ? 's' : ''}
                  </span>
                  <span className="text-sm font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                    {totalKcal} kcal
                  </span>
                </div>
              )
            })()}

            <div>
              <label className="fiq-label block mb-1.5">Repas</label>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_ORDER.map(m => (
                  <button key={m}
                    onClick={() => setMealType(m)}
                    className="py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: mealType === m ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                      color: mealType === m ? 'var(--bg)' : 'var(--fiq-muted)',
                      border: `1px solid ${mealType === m ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                    }}>
                    {MEAL_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const activeCount = photoAnalysis.aliments.length - photoDeleted.size
              return (
                <button
                  onClick={confirmAddAll}
                  disabled={adding || activeCount === 0}
                  className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2"
                  style={{
                    background: activeCount === 0 ? 'var(--fiq-faint)' : 'var(--fiq-accent)',
                    color: activeCount === 0 ? 'var(--fiq-muted)' : 'var(--bg)',
                    border: activeCount === 0 ? '1px solid var(--fiq-border)' : 'none',
                  }}
                >
                  {adding
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : activeCount === 0
                      ? 'Aucun aliment sélectionné'
                      : <><Check className="w-4 h-4" />
                          Ajouter {activeCount > 1 ? `les ${activeCount} aliments` : 'au journal'}
                        </>
                  }
                </button>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────

// ── Formatage date pour la navigation ────────────────────────

function formatViewDate(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Aujourd'hui"
  // Midi local pour éviter les décalages DST
  const d = new Date(dateStr + 'T12:00:00')
  const t = new Date(todayStr + 'T12:00:00')
  const diffDays = Math.round((t.getTime() - d.getTime()) / 86400000)
  if (diffDays === 1) return 'Hier'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ── Quick Add modal state ─────────────────────────────────────

type QuickAddState = {
  meal: string
  name: string
  calories: string
  protein: string
  carbs: string
  fat: string
  adding: boolean
}

export function NutritionClient({ initialLogs, targets, today, initialWaterMl = 0, waterGoalMl = 2500, isRestDay, workoutKcal, isPro = false }: Props) {
  const pathname = usePathname()
  const [logs, setLogs] = useState<FoodLog[]>(initialLogs)
  const [viewDate, setViewDate] = useState(today)       // date affichée (peut être ≠ today)
  const [dateLoading, setDateLoading] = useState(false)
  const [modalMeal, setModalMeal] = useState<string | null>(null)
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set(['breakfast', 'lunch', 'dinner', 'snack']))

  // ── Quick Add inline modal ────────────────────────────────────
  const [quickAdd, setQuickAdd] = useState<QuickAddState | null>(null)
  const [quickAddToast, setQuickAddToast] = useState<string | null>(null)

  // ── Top favorites (Feature 2) — chargés au montage pour les pills ──
  const [topFavorites, setTopFavorites] = useState<Favorite[]>([])
  const [favPillLogging, setFavPillLogging] = useState<string | null>(null) // id du favori en cours de log

  useEffect(() => {
    fetch('/api/nutrition/favorites')
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return
        // Trier par use_count DESC, prendre les 3 premiers
        const sorted = [...(data as Favorite[])].sort((a, b) => (b.use_count ?? 0) - (a.use_count ?? 0))
        setTopFavorites(sorted.slice(0, 3))
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [microCollapsed, setMicroCollapsed] = useState(true)

  // ── Toast "Aliment ajouté" (fix 3d) ─────────────────────────
  const [addedToast, setAddedToast] = useState(false)

  // ── Paywall modal (features Pro) ─────────────────────────────
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallTrigger, setPaywallTrigger] = useState<'photo' | 'general'>('general')

  function openPaywall(trigger: 'photo' | 'general') {
    setPaywallTrigger(trigger)
    setShowPaywall(true)
  }

  // ── Suggestions IA repas ─────────────────────────────────────
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([])
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [suggestMealType, setSuggestMealType] = useState('lunch')

  // ── Import recette URL ───────────────────────────────────────
  const [showUrlImport, setShowUrlImport] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [urlResult, setUrlResult] = useState<{
    nom: string; portions: number; description?: string | null
    ingredients: Array<{ nom: string; quantite_g: number; calories_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number; fiber_per_100g?: number }>
    macros_per_portion: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }
    note?: string | null; source_url: string
  } | null>(null)
  const [urlSaving, setUrlSaving] = useState(false)

  // Limite de navigation : 30 jours en arrière
  const minDate = addDays(today, -30)
  const isToday = viewDate === today
  const canGoBack = viewDate > minDate

  async function navigateToDate(date: string) {
    setDateLoading(true)
    setViewDate(date)
    try {
      const res = await fetch(`/api/nutrition/log?date=${date}`)
      const { data } = await res.json()
      setLogs(data?.logs ?? [])
    } catch {
      setLogs([])
    } finally {
      setDateLoading(false)
    }
  }

  function goToPrevDay() {
    if (!canGoBack) return
    navigateToDate(addDays(viewDate, -1))
  }

  function goToNextDay() {
    if (isToday) return
    navigateToDate(addDays(viewDate, 1))
  }

  const totals = logs.reduce(
    (acc, l) => ({
      calories:  acc.calories  + (l.calories  ?? 0),
      protein_g: acc.protein_g + (l.protein_g ?? 0),
      carbs_g:   acc.carbs_g   + (l.carbs_g   ?? 0),
      fat_g:     acc.fat_g     + (l.fat_g     ?? 0),
      fiber_g:   acc.fiber_g   + (l.fiber_g   ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  )

  // Agrégation micronutriments depuis les logs du jour
  const microTotals: MicroTotals = logs.reduce(
    (acc, l) => ({
      iron_mg:       acc.iron_mg       + (l.iron_mg       ?? 0),
      magnesium_mg:  acc.magnesium_mg  + (l.magnesium_mg  ?? 0),
      zinc_mg:       acc.zinc_mg       + (l.zinc_mg       ?? 0),
      calcium_mg:    acc.calcium_mg    + (l.calcium_mg     ?? 0),
      vitamin_d_mcg: acc.vitamin_d_mcg + (l.vitamin_d_mcg ?? 0),
      potassium_mg:  acc.potassium_mg  + (l.potassium_mg  ?? 0),
      vitamin_c_mg:  acc.vitamin_c_mg  + (l.vitamin_c_mg  ?? 0),
      logsWithData:  acc.logsWithData  + (l.iron_mg != null ? 1 : 0),
      totalLogs:     acc.totalLogs     + 1,
    }),
    { iron_mg: 0, magnesium_mg: 0, zinc_mg: 0, calcium_mg: 0,
      vitamin_d_mcg: 0, potassium_mg: 0, vitamin_c_mg: 0,
      logsWithData: 0, totalLogs: 0 }
  )

  const byMeal = MEAL_ORDER.reduce((acc, m) => {
    acc[m] = logs.filter(l => l.meal_type === m)
    return acc
  }, {} as Record<string, FoodLog[]>)

  function toggleMeal(meal: string) {
    setExpandedMeals(prev => {
      const next = new Set(prev)
      if (next.has(meal)) next.delete(meal)
      else next.add(meal)
      return next
    })
  }

  function handleDelete(id: string) {
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  function handleUpdate(updated: FoodLog) {
    setLogs(prev => prev.map(l => l.id === updated.id ? updated : l))
  }

  function handleAdded(log: FoodLog) {
    setLogs(prev => [...prev, log])
    // Toast discret "Aliment ajouté" — 2 secondes (fix 3d)
    setAddedToast(true)
    setTimeout(() => setAddedToast(false), 2000)
  }

  // ── Quick Add : soumettre les calories rapides ────────────────

  async function submitQuickAdd() {
    if (!quickAdd) return
    const cal = parseFloat(quickAdd.calories)
    if (!cal || cal <= 0) return
    setQuickAdd(prev => prev ? { ...prev, adding: true } : null)
    try {
      const name = quickAdd.name.trim() || 'Ajout rapide'
      // quantity_g = 100 artificiellement ; calories_per_100g = calories totales
      // → le serveur calcule : calories = calories_per_100g * (100/100) = valeur saisie ✓
      const payload = {
        log_date: viewDate,
        meal_type: quickAdd.meal,
        food_id: null,
        food_name: name,
        quantity_g: 100,
        calories_per_100g: cal,
        protein_per_100g:  quickAdd.protein.trim()  ? parseFloat(quickAdd.protein)  : null,
        carbs_per_100g:    quickAdd.carbs.trim()    ? parseFloat(quickAdd.carbs)    : null,
        fat_per_100g:      quickAdd.fat.trim()      ? parseFloat(quickAdd.fat)      : null,
        source: 'manual',
      }
      const res = await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const { data } = await res.json()
      if (data) {
        setLogs(prev => [...prev, data])
        setQuickAdd(null)
        setQuickAddToast('⚡ Ajout rapide enregistré')
        setTimeout(() => setQuickAddToast(null), 2200)
      }
    } finally {
      setQuickAdd(prev => prev ? { ...prev, adding: false } : null)
    }
  }

  // ── Pill favoris : log immédiat depuis la section repas ───────

  async function logFavoritePill(fav: Favorite, meal: string) {
    if (favPillLogging) return
    setFavPillLogging(fav.id)
    try {
      const payload = {
        log_date: viewDate,
        meal_type: meal,
        food_id: fav.food_id ?? null,
        food_name: fav.food_name,
        quantity_g: fav.default_quantity_g,
        calories_per_100g: fav.calories_per_100g ?? null,
        protein_per_100g:  fav.protein_per_100g  ?? null,
        carbs_per_100g:    fav.carbs_per_100g    ?? null,
        fat_per_100g:      fav.fat_per_100g      ?? null,
        fiber_per_100g:    fav.fiber_per_100g    ?? null,
        source: 'favorite',
      }
      const res = await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const { data } = await res.json()
      if (data) {
        setLogs(prev => [...prev, data])
        setQuickAddToast(`✓ ${fav.food_name} ajouté`)
        setTimeout(() => setQuickAddToast(null), 2000)
      }
    } finally {
      setFavPillLogging(null)
    }
  }

  // ── Suggestions IA ───────────────────────────────────────────

  /**
   * Calcule le budget calorique adapté au repas demandé,
   * en répartissant les calories restantes sur les repas à venir dans la journée.
   * Évite de suggérer un repas qui consomme tout le budget journalier restant.
   */
  function getMealBudget(remainingCalories: number, mealType: string): { min: number; target: number; max: number } {
    const hour = new Date().getHours()

    // Poids relatifs des repas sur la journée
    const WEIGHTS: Record<string, number> = {
      breakfast: 0.25,
      lunch:     0.35,
      dinner:    0.30,
      snack:     0.10,
    }

    // Repas encore à venir selon l'heure (incluant le repas demandé)
    const allMeals = ['breakfast', 'lunch', 'dinner', 'snack']
    const upcoming = allMeals.filter(m => {
      if (m === mealType) return true      // toujours inclure le repas cible
      if (m === 'breakfast') return hour < 10
      if (m === 'lunch')     return hour < 14
      if (m === 'dinner')    return hour < 21
      if (m === 'snack')     return hour < 22
      return false
    })

    const totalWeight = upcoming.reduce((s, m) => s + (WEIGHTS[m] ?? 0.1), 0)
    const mealRatio = (WEIGHTS[mealType] ?? 0.25) / Math.max(totalWeight, 0.1)
    const target = Math.round(remainingCalories * mealRatio)

    return {
      min:    Math.round(target * 0.80),
      target: Math.round(target),
      max:    Math.round(target * 1.20),
    }
  }

  async function fetchSuggestions(mealType: string) {
    setSuggestLoading(true)
    setSuggestError(null)
    setSuggestions([])
    try {
      const remaining_calories = Math.max(0, targets.calories - totals.calories)
      const remaining_protein_g = Math.max(0, targets.protein_g - totals.protein_g)
      const remaining_carbs_g = Math.max(0, targets.carbs_g - totals.carbs_g)
      const remaining_fat_g = Math.max(0, targets.fat_g - totals.fat_g)

      // Calculer le budget spécifique à ce repas (pas tout le restant journalier)
      const meal_budget = getMealBudget(remaining_calories, mealType)

      const res = await fetch('/api/nutrition/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remaining_calories,
          remaining_protein_g,
          remaining_carbs_g,
          remaining_fat_g,
          meal_type: mealType,
          meal_budget,
        }),
      })
      const { data, error } = await res.json()
      if (error || !data) {
        setSuggestError(error ?? 'Erreur lors de la génération.')
      } else {
        setSuggestions((data as { suggestions: MealSuggestion[] }).suggestions ?? [])
      }
    } catch {
      setSuggestError('Erreur réseau. Réessaie.')
    } finally {
      setSuggestLoading(false)
    }
  }

  // ── Copier repas de la veille ────────────────────────────────

  const [copying, setCopying] = useState(false)
  const [copyToast, setCopyToast] = useState<string | null>(null)

  // Calcule le jour précédant une date ISO (YYYY-MM-DD)
  function getPrevDay(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }

  async function copyYesterdayMeals() {
    if (copying) return
    setCopying(true)
    try {
      // Passe viewDate comme cible et le jour précédent comme source
      // (corrige le bug où on naviguait sur un jour passé : on copie le bon jour)
      const res = await fetch('/api/nutrition/log/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: viewDate, sourceDate: getPrevDay(viewDate) }),
      })
      const { data, error } = await res.json()
      if (error || !data) {
        setCopyToast('Erreur lors de la copie. Réessaie.')
      } else if (data.count === 0) {
        setCopyToast('Aucun repas à copier (journal de la veille vide).')
      } else {
        setLogs(prev => [...prev, ...data.created])
        setCopyToast(`${data.count} aliment${data.count > 1 ? 's' : ''} copié${data.count > 1 ? 's' : ''} depuis hier !`)
      }
      setTimeout(() => setCopyToast(null), 3500)
    } catch {
      setCopyToast('Erreur réseau. Réessaie.')
      setTimeout(() => setCopyToast(null), 3500)
    } finally {
      setCopying(false)
    }
  }

  // ── Import URL ───────────────────────────────────────────────

  async function importFromUrl() {
    if (!urlInput.trim() || urlLoading) return
    setUrlLoading(true)
    setUrlError(null)
    setUrlResult(null)
    try {
      const res = await fetch('/api/nutrition/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      const { data, error, requiresPro } = await res.json() as { data: typeof urlResult; error: string | null; requiresPro?: boolean }
      if (requiresPro) {
        setUrlError('🔒 Fonctionnalité Pro — Passe au plan Pro pour importer des recettes depuis le web.')
      } else if (error || !data) {
        setUrlError(error ?? 'Impossible d\'extraire la recette.')
      } else {
        setUrlResult(data)
      }
    } catch {
      setUrlError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setUrlLoading(false)
    }
  }

  async function saveUrlAsRecipe() {
    if (!urlResult) return
    setUrlSaving(true)
    try {
      const ingredients = urlResult.ingredients.map((ing, i) => ({
        food_name: ing.nom,
        food_id: null,
        quantity_g: ing.quantite_g,
        calories_per_100g: ing.calories_per_100g,
        protein_per_100g: ing.protein_per_100g,
        carbs_per_100g: ing.carbs_per_100g,
        fat_per_100g: ing.fat_per_100g,
        fiber_per_100g: ing.fiber_per_100g ?? 0,
        sort_order: i,
      }))
      const res = await fetch('/api/nutrition/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: urlResult.nom,
          description: urlResult.description ?? null,
          total_servings: urlResult.portions,
          ingredients,
        }),
      })
      const { data, error } = await res.json()
      if (data && !error) {
        setShowUrlImport(false)
        setUrlInput('')
        setUrlResult(null)
      } else {
        setUrlError(error ?? 'Erreur lors de la sauvegarde.')
      }
    } catch {
      setUrlError('Erreur réseau. Réessaie.')
    } finally {
      setUrlSaving(false)
    }
  }

  const caloriesLeft = targets.calories - Math.round(totals.calories)

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="pt-4 mb-4 flex items-start justify-between">
        <div>
          <p className="fiq-label">Alimentation</p>
          <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Nutrition</h1>
        </div>
        <button
          onClick={() => setModalMeal('breakfast')}
          className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Onglets Aujourd'hui / Planifier */}
      <div className="flex gap-1 p-1 rounded-2xl mb-4" style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
        <Link
          href="/nutrition"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-black transition-all"
          style={pathname === '/nutrition'
            ? { background: 'var(--fiq-card)', color: 'var(--fiq-text)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
            : { color: 'var(--fiq-muted)' }
          }
        >
          Journal
        </Link>
        <Link
          href="/nutrition/planner"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-black transition-all"
          style={pathname === '/nutrition/planner'
            ? { background: 'var(--fiq-card)', color: 'var(--fiq-accent)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
            : { color: 'var(--fiq-muted)' }
          }
        >
          <Calendar className="w-3.5 h-3.5" />
          Planifier
        </Link>
      </div>

      {/* Navigation date — ← Hier | Aujourd'hui | → */}
      <div
        className="flex items-center justify-between mb-4 px-1 py-2 rounded-2xl"
        style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
      >
        <button
          onClick={goToPrevDay}
          disabled={!canGoBack || dateLoading}
          className="p-2 rounded-xl transition-all flex-shrink-0"
          style={{
            color: canGoBack && !dateLoading ? 'var(--fiq-text)' : 'var(--fiq-border)',
            opacity: canGoBack && !dateLoading ? 1 : 0.4,
          }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center gap-0.5 flex-1">
          {dateLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
          ) : (
            <p className="font-black text-sm" style={{ color: isToday ? 'var(--fiq-accent)' : 'var(--fiq-text)' }}>
              {formatViewDate(viewDate, today)}
            </p>
          )}
          {!isToday && !dateLoading && (
            <button
              onClick={() => navigateToDate(today)}
              className="text-[10px] font-semibold"
              style={{ color: 'var(--fiq-accent)' }}
            >
              → Retour aujourd&apos;hui
            </button>
          )}
          {isToday && (
            <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>
              {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(today + 'T12:00:00'))}
            </p>
          )}
        </div>

        <button
          onClick={goToNextDay}
          disabled={isToday || dateLoading}
          className="p-2 rounded-xl transition-all flex-shrink-0"
          style={{
            color: !isToday && !dateLoading ? 'var(--fiq-text)' : 'var(--fiq-border)',
            opacity: !isToday && !dateLoading ? 1 : 0.4,
          }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Toast copie repas */}
      {copyToast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg max-w-[360px] text-center"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
        >
          {copyToast}
        </div>
      )}

      {/* Toast "Aliment ajouté" (fix 3d) — fond accent, 2s */}
      {addedToast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 rounded-xl text-sm font-black shadow-lg pointer-events-none"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          ✓ Ajouté au journal
        </div>
      )}

      {/* Bouton "Copier d'hier" — visible uniquement si le journal du jour est vide */}
      {isToday && logs.length === 0 && (
        <button
          onClick={copyYesterdayMeals}
          disabled={copying}
          className="w-full mb-3 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
          style={{
            background: 'var(--fiq-faint)',
            border: '1px solid var(--fiq-border)',
            color: 'var(--fiq-muted)',
          }}
        >
          {copying
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Copy className="w-3.5 h-3.5" style={{ color: 'var(--fiq-accent)' }} />}
          <span>← Copier les repas d&apos;hier</span>
        </button>
      )}

      {/* Résumé calories */}
      <div className="fiq-card mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="fiq-label">{isToday ? 'Calories du jour' : `Calories · ${formatViewDate(viewDate, today)}`}</p>
            <p className="text-3xl fiq-display mt-0.5" style={{ color: 'var(--fiq-text)' }}>
              {Math.round(totals.calories)}
              <span className="text-base font-normal ml-1" style={{ color: 'var(--fiq-muted)' }}>
                / {targets.calories} kcal
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{caloriesLeft < 0 ? 'Excès' : 'Restant'}</p>
            <p className="text-xl font-black"
              style={{ color: caloriesLeft < 0 ? 'var(--fiq-orange)' : 'var(--fiq-accent)' }}>
              {caloriesLeft < 0 ? `+${Math.abs(caloriesLeft)}` : caloriesLeft} kcal
            </p>
          </div>
        </div>

        {(() => {
          const calPct = (totals.calories / targets.calories) * 100
          const over = totals.calories > targets.calories
          return (
            <>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--fiq-border)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(calPct, 100)}%`,
                    background: over ? 'var(--fiq-orange)' : 'var(--fiq-accent)',
                  }}
                />
              </div>
              <p className="text-[10px] text-right -mt-1" style={{ color: over ? 'var(--fiq-orange)' : 'var(--fiq-muted)' }}>
                {Math.round(calPct)}%{over ? ' ⚠ Objectif dépassé' : ''}
              </p>
            </>
          )
        })()}

        {/* Contexte jour d'entraînement / repos — uniquement aujourd'hui */}
        {isToday && isRestDay !== undefined && (
          <div
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold"
            style={{
              background: isRestDay ? '#6B728018' : '#B4FF4A18',
              color:      isRestDay ? 'var(--fiq-muted)' : 'var(--fiq-accent)',
              border:     `1px solid ${isRestDay ? '#6B728033' : '#B4FF4A33'}`,
            }}
          >
            <span>{isRestDay ? '🛌' : '🏋️'}</span>
            <span>
              {isRestDay
                ? 'Jour de repos — objectif ajusté'
                : workoutKcal
                  ? `Jour d'entraînement +${workoutKcal} kcal séance`
                  : "Jour d'entraînement"
              }
            </span>
          </div>
        )}

        <div className="flex justify-around pt-1">
          <MacroRing value={totals.protein_g} target={targets.protein_g} color="var(--fiq-blue)" label="Protéines" />
          <MacroRing value={totals.carbs_g} target={targets.carbs_g} color="var(--fiq-accent)" label="Glucides" />
          <MacroRing value={totals.fat_g} target={targets.fat_g} color="var(--fiq-orange)" label="Lipides" />
          <MacroRing value={totals.fiber_g} target={25} color="#A855F7" label="Fibres" />
        </div>

        {/* Ligne macros restantes */}
        {(() => {
          const restProt = Math.round(targets.protein_g - totals.protein_g)
          const restCarbs = Math.round(targets.carbs_g - totals.carbs_g)
          const restFat = Math.round(targets.fat_g - totals.fat_g)
          return (
            <p
              className="text-xs text-center tabular-nums"
              style={{ color: 'var(--fiq-muted)', fontVariantNumeric: 'tabular-nums' }}
            >
              Reste · {' '}
              <span style={{ color: restProt < 0 ? 'var(--fiq-red)' : undefined }}>
                Prot: {restProt}g
              </span>
              {' · '}
              <span style={{ color: restCarbs < 0 ? 'var(--fiq-red)' : undefined }}>
                Gluc: {restCarbs}g
              </span>
              {' · '}
              <span style={{ color: restFat < 0 ? 'var(--fiq-red)' : undefined }}>
                Lip: {restFat}g
              </span>
            </p>
          )
        })()}
      </div>

      {/* Widget hydratation */}
      {isToday && (
        <div className="mb-4">
          <WaterWidget initialWaterMl={initialWaterMl} goalMl={waterGoalMl} />
        </div>
      )}

      {/* Widget jeûne intermittent */}
      {isToday && (
        <div className="mb-4">
          <FastingWidget />
        </div>
      )}

      {/* Widget micronutriments — toujours visible (jour courant et historique) */}
      {logs.length > 0 && (
        <div className="mb-4">
          <MicroNutrientWidget
            totals={microTotals}
            collapsed={microCollapsed}
            onToggle={() => setMicroCollapsed(c => !c)}
            totalCalories={totals.calories}
            hasDinnerLogged={logs.some(l => l.meal_type === 'dinner')}
            isToday={isToday}
          />
        </div>
      )}

      {/* Suggestions IA + Import URL — uniquement aujourd'hui */}
      {isToday && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              const hour = new Date().getHours()
              const auto = hour < 10 ? 'breakfast' : hour < 14 ? 'lunch' : hour < 18 ? 'snack' : 'dinner'
              setSuggestMealType(auto)
              setSuggestions([])
              setSuggestError(null)
              setShowSuggest(true)
              fetchSuggestions(auto)
            }}
            className="flex-1 flex items-center gap-2.5 px-3 py-3 rounded-2xl transition-all"
            style={{ background: '#B4FF4A12', border: '1px solid #B4FF4A33' }}
          >
            <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'var(--fiq-accent)' }} />
            <div className="text-left">
              <p className="text-xs font-black" style={{ color: 'var(--fiq-accent)' }}>Suggestions IA</p>
              <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>Repas adapté à tes macros</p>
            </div>
          </button>
          <button
            onClick={() => {
              if (!isPro) { openPaywall('general'); return }
              setShowUrlImport(true); setUrlResult(null); setUrlError(null); setUrlInput('')
            }}
            className="flex-1 flex items-center gap-2.5 px-3 py-3 rounded-2xl transition-all"
            style={{ background: isPro ? '#3D8BFF12' : '#B4FF4A08', border: isPro ? '1px solid #3D8BFF33' : '1px solid #B4FF4A33' }}
          >
            <Link2 className="w-4 h-4 shrink-0" style={{ color: isPro ? 'var(--fiq-blue)' : 'var(--fiq-accent)' }} />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black" style={{ color: isPro ? 'var(--fiq-blue)' : 'var(--fiq-accent)' }}>Import URL</p>
                {!isPro && (
                  <span className="text-[9px] font-black px-1 py-0.5 rounded"
                    style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>PRO</span>
                )}
              </div>
              <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>Recette depuis le web</p>
            </div>
          </button>
        </div>
      )}

      {/* Toast Quick Add / Pill favoris */}
      {quickAddToast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 rounded-xl text-sm font-black shadow-lg pointer-events-none"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          {quickAddToast}
        </div>
      )}

      {/* ── Quick Add mini-modal ─────────────────────────────────── */}
      {quickAdd !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setQuickAdd(null)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl p-5 space-y-4"
            style={{
              background: 'var(--fiq-card)',
              border: '1px solid var(--fiq-border)',
              marginBottom: 'calc(4rem + env(safe-area-inset-bottom))',
              paddingBottom: '24px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>
                ⚡ Ajout rapide · {MEAL_LABELS[quickAdd.meal]}
              </h2>
              <button onClick={() => setQuickAdd(null)}>
                <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
              </button>
            </div>

            {/* Nom (optionnel) */}
            <div>
              <label className="fiq-label block mb-1.5">Nom (optionnel)</label>
              <input
                type="text"
                value={quickAdd.name}
                onChange={e => setQuickAdd(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Repas fait maison"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
              />
            </div>

            {/* Calories (requis) */}
            <div>
              <label className="fiq-label block mb-1.5">Calories (kcal) *</label>
              <input
                autoFocus
                type="number"
                inputMode="numeric"
                value={quickAdd.calories}
                onChange={e => setQuickAdd(prev => prev ? { ...prev, calories: e.target.value } : null)}
                placeholder="Ex: 450"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none font-black text-center"
                style={{
                  background: 'var(--fiq-faint)',
                  border: `1px solid ${quickAdd.calories && parseFloat(quickAdd.calories) > 0 ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                  color: 'var(--fiq-text)',
                  fontSize: 22,
                }}
                min="1" max="9999"
                onKeyDown={e => { if (e.key === 'Enter') void submitQuickAdd() }}
              />
            </div>

            {/* Macros optionnelles — grid 3 colonnes */}
            <div>
              <label className="fiq-label block mb-1.5">Macros (optionnel)</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'protein', label: 'Protéines g', color: 'var(--fiq-blue)' },
                  { key: 'carbs',   label: 'Glucides g',  color: '#A855F7' },
                  { key: 'fat',     label: 'Lipides g',   color: 'var(--fiq-orange)' },
                ] as const).map(({ key, label, color }) => (
                  <div key={key}>
                    <p className="text-[10px] mb-1 text-center font-semibold" style={{ color }}>{label}</p>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={quickAdd[key]}
                      onChange={e => setQuickAdd(prev => prev ? { ...prev, [key]: e.target.value } : null)}
                      placeholder="0"
                      className="w-full px-2 py-2.5 rounded-xl text-sm outline-none text-center font-black"
                      style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                      min="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Bouton Ajouter */}
            <button
              onClick={() => void submitQuickAdd()}
              disabled={quickAdd.adding || !quickAdd.calories || parseFloat(quickAdd.calories) <= 0}
              className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2"
              style={{
                background: quickAdd.calories && parseFloat(quickAdd.calories) > 0 ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                color: quickAdd.calories && parseFloat(quickAdd.calories) > 0 ? 'var(--bg)' : 'var(--fiq-muted)',
                border: '1px solid var(--fiq-border)',
              }}
            >
              {quickAdd.adding
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Check className="w-4 h-4" />Ajouter</>}
            </button>
          </div>
        </div>
      )}

      {/* Journal par repas */}
      <div className="space-y-3">
        {MEAL_ORDER.map(meal => {
          const entries = byMeal[meal] ?? []
          const mealCals = entries.reduce((a, l) => a + (l.calories ?? 0), 0)
          const expanded = expandedMeals.has(meal)

          return (
            <div key={meal} className="fiq-card">
              {/* En-tête section repas */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleMeal(meal)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <span className="text-base">{MEAL_LABELS[meal]}</span>
                  {entries.length > 0 && (
                    <span className="text-xs font-semibold" style={{ color: 'var(--fiq-muted)' }}>
                      {entries.length} aliment{entries.length > 1 ? 's' : ''}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  {mealCals > 0 && (
                    <span className="text-xs font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                      {Math.round(mealCals)} kcal
                    </span>
                  )}
                  {/* Bouton Ajout rapide ⚡ */}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setQuickAdd({ meal, name: '', calories: '', protein: '', carbs: '', fat: '', adding: false })
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-all"
                    style={{
                      background: '#B4FF4A18',
                      border: '1px solid #B4FF4A33',
                      color: 'var(--fiq-accent)',
                    }}
                    title="Ajout rapide calories"
                  >
                    ⚡
                  </button>
                  <button onClick={() => toggleMeal(meal)}>
                    {expanded
                      ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />}
                  </button>
                </div>
              </div>

              {/* Pills aliments fréquents — Feature 2 */}
              {topFavorites.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 mt-2 no-scrollbar">
                  {topFavorites.map(fav => {
                    const kcal = fav.calories_per_100g != null
                      ? Math.round(fav.calories_per_100g * fav.default_quantity_g / 100)
                      : null
                    const isLogging = favPillLogging === fav.id
                    return (
                      <button
                        key={fav.id}
                        onClick={() => void logFavoritePill(fav, meal)}
                        disabled={!!favPillLogging}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all active:scale-95"
                        style={{
                          background: 'var(--fiq-faint)',
                          border: '1px solid var(--fiq-border)',
                          color: 'var(--fiq-text)',
                          opacity: favPillLogging && !isLogging ? 0.5 : 1,
                        }}
                      >
                        {isLogging
                          ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--fiq-accent)' }} />
                          : <Star className="w-3 h-3 shrink-0" style={{ color: '#F59E0B', fill: '#F59E0B' }} />}
                        <span className="font-semibold truncate max-w-[90px]">{fav.food_name}</span>
                        {kcal != null && (
                          <span style={{ color: 'var(--fiq-accent)', fontWeight: 700 }}>{kcal}kcal</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {expanded && (
                <div className="mt-2">
                  {entries.length === 0 ? (
                    <p className="text-xs py-3 text-center" style={{ color: 'var(--fiq-muted)' }}>
                      {dateLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
                      ) : (
                        <>
                          Aucun aliment enregistré —{' '}
                          <button onClick={() => setModalMeal(meal)} style={{ color: 'var(--fiq-accent)' }}>
                            {isToday ? 'Ajouter' : 'Ajouter quand même'}
                          </button>
                        </>
                      )}
                    </p>
                  ) : (
                    <>
                      {entries.map(l => (
                        <FoodCard key={l.id} log={l} onDelete={handleDelete} onUpdate={handleUpdate} />
                      ))}
                      <button
                        onClick={() => setModalMeal(meal)}
                        className="w-full mt-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                        style={{ color: 'var(--fiq-accent)', background: 'var(--fiq-faint)', border: '1px dashed var(--fiq-border)' }}
                      >
                        <Plus className="w-3 h-3" />
                        {isToday ? 'Ajouter un aliment' : 'Ajouter un oubli'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modale ajout */}
      {modalMeal !== null && (
        <AddFoodModal
          onClose={() => setModalMeal(null)}
          onAdded={handleAdded}
          today={viewDate}
          initialMealType={modalMeal}
          targets={targets}
          consumedToday={{
            calories:  totals.calories,
            protein_g: totals.protein_g,
            carbs_g:   totals.carbs_g,
            fat_g:     totals.fat_g,
          }}
          isPro={isPro}
          openPaywall={openPaywall}
        />
      )}

      {/* ── Modale Suggestions IA ────────────────────────────────── */}
      {showSuggest && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowSuggest(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl p-5 space-y-4"
            style={{
              background: 'var(--fiq-card)',
              border: '1px solid var(--fiq-border)',
              maxHeight: 'calc(85dvh - 4rem - env(safe-area-inset-bottom))',
              overflowY: 'auto',
              marginBottom: 'calc(4rem + env(safe-area-inset-bottom))',
              paddingBottom: '24px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            {(() => {
              const remaining = Math.max(0, targets.calories - totals.calories)
              const budget = getMealBudget(remaining, suggestMealType)
              return (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>
                      ✨ Suggestions repas
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                      🎯 Budget {MEAL_LABELS[suggestMealType]} :&nbsp;
                      <span style={{ color: 'var(--fiq-accent)', fontWeight: 700 }}>
                        ~{budget.target} kcal
                      </span>
                      &nbsp;· {Math.round(remaining)} kcal restantes/jour
                    </p>
                  </div>
                  <button onClick={() => setShowSuggest(false)}>
                    <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
                  </button>
                </div>
              )
            })()}

            {/* Sélecteur type de repas */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {MEAL_ORDER.map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setSuggestMealType(m)
                    setSuggestions([])
                    fetchSuggestions(m)
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all"
                  style={{
                    background: suggestMealType === m ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                    color: suggestMealType === m ? 'var(--bg)' : 'var(--fiq-muted)',
                    border: `1px solid ${suggestMealType === m ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                  }}
                >
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>

            {/* Contenu */}
            {suggestLoading ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--fiq-accent)' }} />
                <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>ForgeIQ analyse tes macros…</p>
              </div>
            ) : suggestError ? (
              <div className="rounded-2xl px-4 py-3 text-sm"
                style={{ background: '#EF444418', border: '1px solid #EF444433', color: '#EF4444' }}>
                {suggestError}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--fiq-muted)' }}>
                <p className="text-3xl mb-2">🤖</p>
                <p className="text-sm">Sélectionne un type de repas pour générer des suggestions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const remaining = Math.max(0, targets.calories - totals.calories)
                  const budget = getMealBudget(remaining, suggestMealType)
                  return suggestions.map((s, i) => {
                    const pct = budget.target > 0 ? Math.round((s.calories / budget.target) * 100) : 0
                    const pctColor = pct > 110 ? 'var(--fiq-orange)' : pct < 70 ? 'var(--fiq-muted)' : 'var(--fiq-accent)'
                    return (
                  <div key={i} className="rounded-2xl p-4 space-y-2"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">{s.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>{s.nom}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{s.description}</p>
                      </div>
                      {s.prep_time && (
                        <span className="text-[10px] shrink-0 px-2 py-1 rounded-lg font-semibold"
                          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
                          ⏱ {s.prep_time}
                        </span>
                      )}
                    </div>

                    {/* Macros + % budget */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                        {s.calories} kcal
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: pctColor + '20', color: pctColor, border: `1px solid ${pctColor}40` }}>
                        {pct}% du budget
                      </span>
                      <span className="text-xs fiq-data" style={{ color: 'var(--fiq-blue)' }}>
                        P {s.protein_g}g
                      </span>
                      <span className="text-xs fiq-data" style={{ color: '#A855F7' }}>
                        G {s.carbs_g}g
                      </span>
                      <span className="text-xs fiq-data" style={{ color: 'var(--fiq-orange)' }}>
                        L {s.fat_g}g
                      </span>
                    </div>

                    {/* Liste aliments */}
                    {s.aliments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {s.aliments.map((a, j) => (
                          <span key={j}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                    )    // closes return (JSX)
                  }      // closes (s, i) => { callback
                )        // closes .map(
              })()}

                {/* Régénérer */}
                <button
                  onClick={() => fetchSuggestions(suggestMealType)}
                  className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-accent)' }}
                >
                  <Sparkles className="w-4 h-4" />
                  Nouvelles suggestions
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modale Import URL ────────────────────────────────────── */}
      {showUrlImport && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowUrlImport(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl p-5 space-y-4"
            style={{
              background: 'var(--fiq-card)',
              border: '1px solid var(--fiq-border)',
              maxHeight: 'calc(88dvh - 4rem - env(safe-area-inset-bottom))',
              overflowY: 'auto',
              marginBottom: 'calc(4rem + env(safe-area-inset-bottom))',
              paddingBottom: '24px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>
                  🔗 Importer une recette
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                  Colle l'URL d'une recette — l'IA extrait les macros
                </p>
              </div>
              <button onClick={() => setShowUrlImport(false)}>
                <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
              </button>
            </div>

            {/* Input URL */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://www.marmiton.org/recettes/..."
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                  onKeyDown={e => { if (e.key === 'Enter') importFromUrl() }}
                />
                <button
                  onClick={importFromUrl}
                  disabled={!urlInput.trim() || urlLoading}
                  className="px-4 py-3 rounded-xl font-black text-sm shrink-0 flex items-center gap-2"
                  style={{
                    background: urlInput.trim() && !urlLoading ? 'var(--fiq-blue)' : 'var(--fiq-faint)',
                    color: urlInput.trim() && !urlLoading ? '#fff' : 'var(--fiq-muted)',
                    border: '1px solid var(--fiq-border)',
                  }}
                >
                  {urlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] px-1" style={{ color: 'var(--fiq-muted)' }}>
                Sites supportés : Marmiton, Cuisineaz, 750g, AllRecipes, et la plupart des blogs cuisine.
              </p>
            </div>

            {/* Erreur */}
            {urlError && (
              <div className="rounded-2xl px-4 py-3 text-sm"
                style={{ background: '#EF444418', border: '1px solid #EF444433', color: '#EF4444' }}>
                {urlError}
              </div>
            )}

            {/* Résultat */}
            {urlLoading && !urlResult && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--fiq-blue)' }} />
                <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Analyse de la recette en cours…</p>
              </div>
            )}

            {urlResult && (
              <div className="space-y-3">
                {/* Infos recette */}
                <div className="rounded-2xl p-4 space-y-3"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid #B4FF4A44' }}>
                  <div>
                    <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>{urlResult.nom}</p>
                    {urlResult.description && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{urlResult.description}</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
                      {urlResult.portions} portion{urlResult.portions > 1 ? 's' : ''} · {urlResult.ingredients.length} ingrédients
                    </p>
                  </div>

                  {/* Macros par portion */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Kcal/p.', value: urlResult.macros_per_portion.calories, color: 'var(--fiq-accent)' },
                      { label: 'Prot.', value: urlResult.macros_per_portion.protein_g, color: 'var(--fiq-blue)' },
                      { label: 'Gluc.', value: urlResult.macros_per_portion.carbs_g, color: '#A855F7' },
                      { label: 'Lip.', value: urlResult.macros_per_portion.fat_g, color: 'var(--fiq-orange)' },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <p className="text-sm font-black fiq-data" style={{ color: m.color }}>
                          {Math.round(m.value)}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Liste ingrédients */}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {urlResult.ingredients.map((ing, i) => (
                    <div key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                      style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                      <span className="flex-1 font-semibold truncate" style={{ color: 'var(--fiq-text)' }}>
                        {ing.nom}
                      </span>
                      <span style={{ color: 'var(--fiq-muted)' }}>{ing.quantite_g}g</span>
                      {ing.calories_per_100g && (
                        <span style={{ color: 'var(--fiq-accent)' }}>
                          {Math.round(ing.calories_per_100g * ing.quantite_g / 100)} kcal
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {urlResult.note && (
                  <p className="text-xs px-1 italic" style={{ color: 'var(--fiq-muted)' }}>
                    💡 {urlResult.note}
                  </p>
                )}

                {/* Bouton sauvegarder */}
                <button
                  onClick={saveUrlAsRecipe}
                  disabled={urlSaving}
                  className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2"
                  style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                >
                  {urlSaving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><Check className="w-4 h-4" />Sauvegarder dans mes recettes</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Paywall modal — features Pro ── */}
      {showPaywall && (
        <PaywallModal
          trigger={paywallTrigger}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </div>
  )
}
