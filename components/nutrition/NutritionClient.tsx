'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, Camera, ScanLine, Search, Trash2, ChevronDown, ChevronUp, Loader2, X, Check, Keyboard, Star, ChefHat, Minus, ArrowLeft } from 'lucide-react'

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
  recipe_ingredients?: RecipeIngr[]
}

type Targets = {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

type Props = {
  initialLogs: FoodLog[]
  targets: Targets
  today: string
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

function FoodCard({ log, onDelete }: { log: FoodLog; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/nutrition/log?id=${log.id}`, { method: 'DELETE' })
    onDelete(log.id)
    setDeleting(false)
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
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-1.5 rounded-lg flex-shrink-0 transition-all"
        style={{ color: 'var(--fiq-muted)' }}
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
              detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]>
            }
          }).BarcodeDetector

          const detector = new BarcodeDetectorClass({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
          })

          const scanFrame = async () => {
            if (stopRef.current) return
            try {
              if (video.readyState >= 2) {
                const codes = await detector.detect(video)
                if (codes.length > 0 && !stopRef.current) {
                  stopRef.current = true
                  setDetected(true)
                  controlsRef.current?.stop()
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

function AddFoodModal({ onClose, onAdded, today, initialMealType = 'breakfast' }: {
  onClose: () => void
  onAdded: (log: FoodLog) => void
  today: string
  initialMealType?: string
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
  // Photo IA
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysis | null>(null)
  const [photoQuantities, setPhotoQuantities] = useState<Record<number, string>>({})
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [photoError, setPhotoError] = useState('')
  // Favoris
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [favLoading, setFavLoading] = useState(false)
  const [savingFav, setSavingFav] = useState(false)
  const [savedFav, setSavedFav] = useState(false)
  // Recettes
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recLoading, setRecLoading] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [recipePortions, setRecipePortions] = useState(1)
  // Création recette
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
  // Unités naturelles
  const [unitMode, setUnitMode] = useState<'g' | 'unit'>('g')
  const [unitCount, setUnitCount] = useState(1)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recipeIngSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset savedFav + restaure préférence unité quand on change d'aliment
  useEffect(() => {
    setSavedFav(false)
    if (!selectedFood) return
    const name = selectedFood.name_fr ?? selectedFood.name
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
  }, [selectedFood])

  // Cycling des messages de chargement analyse photo
  useEffect(() => {
    if (!scanLoading) { setLoadingMsgIdx(0); return }
    const iv = setInterval(() => setLoadingMsgIdx(i => (i + 1) % PHOTO_LOADING_MSGS.length), 1800)
    return () => clearInterval(iv)
  }, [scanLoading])

  // ── Recherche texte ──────────────────────────────────────────

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) { setSearchResults([]); return }

    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}`)
        const { data } = await res.json()
        setSearchResults(data ?? [])
      } finally {
        setSearchLoading(false)
      }
    }, 400)
  }, [])

  // ── Barcode ──────────────────────────────────────────────────

  async function lookupBarcode(barcode: string) {
    setScanLoading(true)
    setBarcodeError(null)
    try {
      const res = await fetch(`/api/nutrition/scan?barcode=${barcode}`)
      const { data, error } = await res.json()
      if (error || !data) {
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
      ;(data.aliments as PhotoAliment[]).forEach((a, i) => {
        quantities[i] = String(a.quantite_estimee_g)
      })
      setPhotoAnalysis(data)
      setPhotoQuantities(quantities)
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
        source: selectedFood.barcode ? 'barcode' : 'search',
      }
      const res = await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const { data } = await res.json()
      if (data) { onAdded(data); onClose() }
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
        const qty = parseFloat(photoQuantities[idx] ?? String(aliment.quantite_estimee_g)) || aliment.quantite_estimee_g
        const per100 = (val: number | null) =>
          val != null && aliment.quantite_estimee_g > 0
            ? Math.round((val / aliment.quantite_estimee_g) * 100 * 10) / 10
            : null
        const payload = {
          log_date: today,
          meal_type: mealType,
          food_id: null,
          food_name: aliment.nom,
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
    if (favorites.length > 0) return
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
    if (!selectedFood) return
    setSavingFav(true)
    try {
      await fetch('/api/nutrition/favorites', {
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
      setSavedFav(true)
      setFavorites([]) // Invalide le cache pour le prochain chargement
    } finally {
      setSavingFav(false)
    }
  }

  function addFromFavorite(fav: Favorite) {
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
    // Incrémente use_count en arrière-plan
    fetch('/api/nutrition/favorites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fav.id }),
    }).catch(() => {})
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
    await fetch(`/api/nutrition/recipes?id=${id}`, { method: 'DELETE' })
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  async function logRecipe() {
    if (!selectedRecipe?.recipe_ingredients) return
    setAdding(true)
    try {
      for (const ingr of selectedRecipe.recipe_ingredients) {
        const scaledQty = (ingr.quantity_g / selectedRecipe.total_servings) * recipePortions
        const payload = {
          log_date: today,
          meal_type: mealType,
          food_id: ingr.food_id ?? null,
          food_name: ingr.food_name,
          quantity_g: Math.round(scaledQty * 10) / 10,
          calories_per_100g: ingr.calories_per_100g,
          protein_per_100g: ingr.protein_per_100g,
          carbs_per_100g: ingr.carbs_per_100g,
          fat_per_100g: ingr.fat_per_100g,
          fiber_per_100g: ingr.fiber_per_100g,
          source: 'recipe',
          ai_note: `${selectedRecipe.name} (${recipePortions} portion${recipePortions > 1 ? 's' : ''})`,
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

  // ── Création recette ─────────────────────────────────────────

  function handleRecipeIngSearch(q: string) {
    setRecipeIngSearch(q)
    if (recipeIngSearchTimeout.current) clearTimeout(recipeIngSearchTimeout.current)
    if (q.length < 2) { setRecipeIngResults([]); return }
    recipeIngSearchTimeout.current = setTimeout(async () => {
      setRecipeIngSearching(true)
      try {
        const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}`)
        const { data } = await res.json()
        setRecipeIngResults(data ?? [])
      } finally {
        setRecipeIngSearching(false)
      }
    }, 400)
  }

  function addIngredient() {
    if (!recipeIngSelected) return
    setRecipeIngredients(prev => [...prev, {
      food_name: recipeIngSelected.name_fr ?? recipeIngSelected.name,
      food_id: recipeIngSelected.id,
      quantity_g: parseFloat(recipeIngQty) || 100,
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
  }

  async function saveRecipe() {
    if (!recipeName.trim() || recipeIngredients.length === 0) return
    setSavingRecipe(true)
    try {
      const res = await fetch('/api/nutrition/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipeName.trim(),
          description: recipeDescription.trim() || null,
          total_servings: recipeServings,
          ingredients: recipeIngredients,
        }),
      })
      const { data } = await res.json()
      if (data) {
        setRecipes(prev => [data, ...prev])
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
    if (mode === 'confirm' || mode === 'search' || mode === 'scan' || mode === 'photo' || mode === 'favorites' || mode === 'recipes') {
      setMode('choose')
    } else if (mode === 'photo-confirm') {
      setMode('photo')
    } else if (mode === 'create-recipe') {
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
    'create-recipe': '➕ Nouvelle recette',
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
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)', maxHeight: '90dvh', overflowY: 'auto' }}
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
              onClick={() => setMode('search')}
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
              onClick={() => setMode('photo')}
              className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FF6B3522' }}>
                <Camera className="w-5 h-5" style={{ color: 'var(--fiq-orange)' }} />
              </div>
              <div>
                <p className="font-black" style={{ color: 'var(--fiq-text)' }}>Photo du repas</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>IA ForgeIQ identifie les aliments et estime les macros</p>
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
                  <button
                    key={fav.id}
                    onClick={() => addFromFavorite(fav)}
                    className="w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3"
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
                      {fav.use_count > 1 && (
                        <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>×{fav.use_count}</p>
                      )}
                    </div>
                  </button>
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
                    <button
                      onClick={() => deleteRecipe(r.id)}
                      className="px-3 rounded-xl flex items-center"
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
                          {ing.quantity_g}g
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
                /* Étape quantité */
                <div className="space-y-2 p-3 rounded-xl"
                  style={{ background: 'var(--fiq-faint)', border: '1px solid #B4FF4A44' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>
                    {recipeIngSelected.name_fr ?? recipeIngSelected.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="number"
                      value={recipeIngQty}
                      onChange={e => setRecipeIngQty(e.target.value)}
                      placeholder="Quantité"
                      className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                      min="1"
                      onKeyDown={e => { if (e.key === 'Enter') addIngredient() }}
                    />
                    <span className="text-sm font-semibold" style={{ color: 'var(--fiq-muted)' }}>g</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setRecipeIngSelected(null); setRecipeIngSearch(''); setRecipeIngResults([]) }}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: 'transparent', color: 'var(--fiq-muted)', border: '1px solid var(--fiq-border)' }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={addIngredient}
                      disabled={!recipeIngQty || parseFloat(recipeIngQty) <= 0}
                      className="flex-1 py-2 rounded-xl text-xs font-black"
                      style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                    >
                      Ajouter
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
                          onClick={() => { setRecipeIngSelected(f); setRecipeIngQty('100') }}
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
                : <><Check className="w-4 h-4" />Sauvegarder la recette ({recipeIngredients.length} ingr.)</>}
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

            {searchLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
              </div>
            )}

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
                </div>
                {/* Bouton favoris */}
                <button
                  onClick={saveFavorite}
                  disabled={savingFav}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: savedFav ? '#F59E0B22' : 'var(--fiq-faint)',
                    border: `1px solid ${savedFav ? '#F59E0B66' : 'var(--fiq-border)'}`,
                    color: savedFav ? '#F59E0B' : 'var(--fiq-muted)',
                  }}
                >
                  {savingFav
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Star className="w-3.5 h-3.5" style={{ fill: savedFav ? '#F59E0B' : 'none', color: savedFav ? '#F59E0B' : 'var(--fiq-muted)' }} />}
                  {savedFav ? 'Favori' : ''}
                </button>
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
                const qtyRaw = photoQuantities[idx] ?? String(aliment.quantite_estimee_g)
                const qty = parseFloat(qtyRaw) || aliment.quantite_estimee_g
                const ratio = aliment.quantite_estimee_g > 0 ? qty / aliment.quantite_estimee_g : 1
                return (
                  <div key={idx} className="rounded-xl p-3 space-y-2"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--fiq-text)' }}>
                        {aliment.nom}
                      </p>
                      {aliment.confiance === 'faible' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B33' }}>
                          ⚠️ approx.
                        </span>
                      )}
                      <input
                        type="number"
                        value={qtyRaw}
                        onChange={e => setPhotoQuantities(prev => ({ ...prev, [idx]: e.target.value }))}
                        className="w-16 px-2 py-1 rounded-lg text-xs text-center outline-none shrink-0"
                        style={{ background: 'var(--fiq-surface)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                        min="1" max="2000"
                      />
                      <span className="text-xs shrink-0" style={{ color: 'var(--fiq-muted)' }}>g</span>
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

            {photoAnalysis.aliments.length > 1 && (
              <div className="rounded-xl px-3 py-2 flex items-center justify-between"
                style={{ background: '#B4FF4A12', border: '1px solid #B4FF4A33' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--fiq-accent)' }}>
                  Total · {photoAnalysis.aliments.length} aliments
                </span>
                <span className="text-sm font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                  {Math.round(photoAnalysis.aliments.reduce((acc, a, i) => {
                    const q = parseFloat(photoQuantities[i] ?? String(a.quantite_estimee_g)) || a.quantite_estimee_g
                    return acc + (a.calories ?? 0) * (a.quantite_estimee_g > 0 ? q / a.quantite_estimee_g : 1)
                  }, 0))} kcal
                </span>
              </div>
            )}

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

            <button
              onClick={confirmAddAll}
              disabled={adding}
              className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
            >
              {adding
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Check className="w-4 h-4" />
                    Ajouter {photoAnalysis.aliments.length > 1
                      ? `les ${photoAnalysis.aliments.length} aliments`
                      : 'au journal'}
                  </>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────

export function NutritionClient({ initialLogs, targets, today }: Props) {
  const [logs, setLogs] = useState<FoodLog[]>(initialLogs)
  const [modalMeal, setModalMeal] = useState<string | null>(null)
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set(['breakfast', 'lunch', 'dinner', 'snack']))

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

  function handleAdded(log: FoodLog) {
    setLogs(prev => [...prev, log])
  }

  const caloriesLeft = targets.calories - Math.round(totals.calories)

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="pt-4 mb-5 flex items-start justify-between">
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

      {/* Résumé calories */}
      <div className="fiq-card mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="fiq-label">Calories du jour</p>
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

        <div className="flex justify-around pt-1">
          <MacroRing value={totals.protein_g} target={targets.protein_g} color="var(--fiq-blue)" label="Protéines" />
          <MacroRing value={totals.carbs_g} target={targets.carbs_g} color="var(--fiq-accent)" label="Glucides" />
          <MacroRing value={totals.fat_g} target={targets.fat_g} color="var(--fiq-orange)" label="Lipides" />
          <MacroRing value={totals.fiber_g} target={25} color="#A855F7" label="Fibres" />
        </div>
      </div>

      {/* Journal par repas */}
      <div className="space-y-3">
        {MEAL_ORDER.map(meal => {
          const entries = byMeal[meal] ?? []
          const mealCals = entries.reduce((a, l) => a + (l.calories ?? 0), 0)
          const expanded = expandedMeals.has(meal)

          return (
            <div key={meal} className="fiq-card">
              <button
                onClick={() => toggleMeal(meal)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{MEAL_LABELS[meal]}</span>
                  {entries.length > 0 && (
                    <span className="text-xs font-semibold" style={{ color: 'var(--fiq-muted)' }}>
                      {entries.length} aliment{entries.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {mealCals > 0 && (
                    <span className="text-xs font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                      {Math.round(mealCals)} kcal
                    </span>
                  )}
                  {expanded
                    ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />
                    : <ChevronDown className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />}
                </div>
              </button>

              {expanded && (
                <div className="mt-2">
                  {entries.length === 0 ? (
                    <p className="text-xs py-3 text-center" style={{ color: 'var(--fiq-muted)' }}>
                      Aucun aliment —{' '}
                      <button onClick={() => setModalMeal(meal)} style={{ color: 'var(--fiq-accent)' }}>
                        Ajouter
                      </button>
                    </p>
                  ) : (
                    <>
                      {entries.map(l => (
                        <FoodCard key={l.id} log={l} onDelete={handleDelete} />
                      ))}
                      <button
                        onClick={() => setModalMeal(meal)}
                        className="w-full mt-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                        style={{ color: 'var(--fiq-accent)', background: 'var(--fiq-faint)', border: '1px dashed var(--fiq-border)' }}
                      >
                        <Plus className="w-3 h-3" />
                        Ajouter un aliment
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
          today={today}
          initialMealType={modalMeal}
        />
      )}
    </div>
  )
}
