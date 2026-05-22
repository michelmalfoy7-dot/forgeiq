'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, Camera, ScanLine, Search, Trash2, ChevronDown, ChevronUp, Loader2, X, Check, Keyboard } from 'lucide-react'

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
  const pct = Math.min((value / target) * 100, 100)
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--fiq-border)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={r} fill="none"
            stroke={color} strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-black" style={{ color }}>
            {Math.round(value)}
          </span>
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
          // ── Scanner natif : Chrome Android / Chrome Desktop ──
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
              // Attendre que la vidéo soit prête (readyState 2 = HAVE_CURRENT_DATA)
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
          // ── Fallback : @zxing/browser — iOS Safari, Firefox ──
          // decodeFromConstraints gère getUserMedia + lecture vidéo en interne
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
      {/* Viewfinder */}
      <div className="relative overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />
        {/* Spinner initialisation caméra */}
        {!camError && !detected && !camReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
            <Loader2 className="w-7 h-7 animate-spin text-white" />
            <span className="text-xs text-white/70">Initialisation caméra…</span>
          </div>
        )}
        {/* Viseur actif */}
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

      {/* Actions */}
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

// ── Modale d'ajout ────────────────────────────────────────────

function AddFoodModal({ onClose, onAdded, today }: {
  onClose: () => void
  onAdded: (log: FoodLog) => void
  today: string
}) {
  const [mode, setMode] = useState<'choose' | 'search' | 'scan' | 'photo' | 'confirm' | 'photo-confirm'>('choose')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FoodResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [mealType, setMealType] = useState('lunch')
  const [adding, setAdding] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysis | null>(null)
  const [photoQuantities, setPhotoQuantities] = useState<Record<number, string>>({})
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [photoError, setPhotoError] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cycling des messages de chargement analyse photo
  useEffect(() => {
    if (!scanLoading) { setLoadingMsgIdx(0); return }
    const iv = setInterval(() => setLoadingMsgIdx(i => (i + 1) % PHOTO_LOADING_MSGS.length), 1800)
    return () => clearInterval(iv)
  }, [scanLoading])

  // Recherche texte avec debounce
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

  const [barcodeError, setBarcodeError] = useState<string | null>(null)

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

  // Analyse photo IA — retourne une liste d'aliments (multi-aliments)
  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')

    const fileReader = new FileReader()
    fileReader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1]
      const mediaType = file.type || 'image/jpeg'

      setScanLoading(true)
      try {
        const res = await fetch('/api/nutrition/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64, media_type: mediaType }),
        })
        const { data, error } = await res.json()
        if (error || !data) {
          setPhotoError(error ?? 'Analyse impossible. Essaie avec une meilleure photo.')
          return
        }
        // Initialiser les quantités éditables avec les estimations IA
        const quantities: Record<number, string> = {}
        ;(data.aliments as PhotoAliment[]).forEach((a, i) => {
          quantities[i] = String(a.quantite_estimee_g)
        })
        setPhotoAnalysis(data as PhotoAnalysis)
        setPhotoQuantities(quantities)
        setMode('photo-confirm')
      } finally {
        setScanLoading(false)
      }
    }
    fileReader.readAsDataURL(file)
  }

  // Ajouter un aliment depuis la recherche ou le scan code-barres
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

  // Ajouter tous les aliments détectés sur la photo
  async function confirmAddAll() {
    if (!photoAnalysis) return
    setAdding(true)
    try {
      for (const [idx, aliment] of photoAnalysis.aliments.entries()) {
        const qty = parseFloat(photoQuantities[idx] ?? String(aliment.quantite_estimee_g)) || aliment.quantite_estimee_g
        // Convertir les valeurs totales en valeurs pour 100g
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl p-5 space-y-4"
        style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)', maxHeight: '90dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>
            {mode === 'choose' && 'Ajouter un aliment'}
            {mode === 'search' && '🔍 Rechercher'}
            {mode === 'scan' && '📷 Scanner'}
            {mode === 'photo' && '📸 Photo IA ForgeIQ'}
            {mode === 'confirm' && '✅ Confirmer'}
            {mode === 'photo-confirm' && '📸 Aliments détectés'}
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: 'var(--fiq-muted)' }} />
          </button>
        </div>

        {/* ── Choix du mode ── */}
        {mode === 'choose' && (
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setMode('search')}
              className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#B4FF4A22' }}>
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#3D8BFF22' }}>
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#FF6B3522' }}>
                <Camera className="w-5 h-5" style={{ color: 'var(--fiq-orange)' }} />
              </div>
              <div>
                <p className="font-black" style={{ color: 'var(--fiq-text)' }}>Photo du repas</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>IA ForgeIQ identifie les aliments et estime les macros</p>
              </div>
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

            <div className="space-y-1 max-h-64 overflow-y-auto">
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
              <p className="text-sm px-3 py-2 rounded-xl"
                style={{ background: '#EF444418', color: '#EF4444', border: '1px solid #EF444433' }}>
                {photoError}
              </p>
            )}

            <div
              className="flex flex-col items-center gap-4 py-10 rounded-2xl border-2 border-dashed cursor-pointer"
              style={{ borderColor: 'var(--fiq-border)' }}
              onClick={() => document.getElementById('photo-input')?.click()}
            >
              {scanLoading ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--fiq-orange)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--fiq-orange)' }}>
                    {PHOTO_LOADING_MSGS[loadingMsgIdx]}
                  </p>
                </>
              ) : (
                <>
                  <Camera className="w-10 h-10" style={{ color: 'var(--fiq-orange)' }} />
                  <div className="text-center">
                    <p className="font-bold text-sm" style={{ color: 'var(--fiq-text)' }}>Prends une photo de ton repas</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
                      IA ForgeIQ identifie les aliments et estime les macros
                    </p>
                  </div>
                </>
              )}
            </div>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoFile}
            />
          </div>
        )}

        {/* ── Confirmation aliment unique (recherche / scan code-barres) ── */}
        {mode === 'confirm' && selectedFood && (
          <div className="space-y-4">
            {/* Infos aliment */}
            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
              <p className="font-black" style={{ color: 'var(--fiq-text)' }}>
                {selectedFood.name_fr ?? selectedFood.name}
              </p>
              {selectedFood.brand && (
                <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{selectedFood.brand}</p>
              )}
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

            {/* Quantité */}
            <div>
              <label className="fiq-label block mb-1.5">Quantité (grammes)</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                min="1" max="2000"
              />
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

        {/* ── Résultats analyse photo — liste d'aliments éditables ── */}
        {mode === 'photo-confirm' && photoAnalysis && (
          <div className="space-y-3">
            {photoAnalysis.note && (
              <p className="text-xs italic px-1" style={{ color: 'var(--fiq-muted)' }}>
                💡 {photoAnalysis.note}
              </p>
            )}

            {/* Liste des aliments */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {photoAnalysis.aliments.map((aliment, idx) => {
                const qtyRaw = photoQuantities[idx] ?? String(aliment.quantite_estimee_g)
                const qty = parseFloat(qtyRaw) || aliment.quantite_estimee_g
                const ratio = aliment.quantite_estimee_g > 0 ? qty / aliment.quantite_estimee_g : 1
                return (
                  <div key={idx} className="rounded-xl p-3 space-y-2"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                    {/* Nom + quantité éditable */}
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
                    {/* Macros ajustées à la quantité */}
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

            {/* Total si plusieurs aliments */}
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

            {/* Repas */}
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
  const [showModal, setShowModal] = useState(false)
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set(['breakfast', 'lunch', 'dinner', 'snack']))

  // Totaux journaliers
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

  // Grouper par repas
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
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="pt-4 mb-5 flex items-start justify-between">
        <div>
          <p className="fiq-label">Alimentation</p>
          <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>Nutrition</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
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
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Restant</p>
            <p className="text-xl font-black"
              style={{ color: caloriesLeft < 0 ? 'var(--fiq-orange)' : 'var(--fiq-accent)' }}>
              {caloriesLeft > 0 ? caloriesLeft : 0} kcal
            </p>
          </div>
        </div>

        {/* Barre calories */}
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--fiq-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min((totals.calories / targets.calories) * 100, 100)}%`,
              background: totals.calories > targets.calories ? 'var(--fiq-orange)' : 'var(--fiq-accent)',
            }}
          />
        </div>

        {/* Macros rings */}
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
                  {expanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />}
                </div>
              </button>

              {expanded && (
                <div className="mt-2">
                  {entries.length === 0 ? (
                    <p className="text-xs py-3 text-center" style={{ color: 'var(--fiq-muted)' }}>
                      Aucun aliment — <button onClick={() => setShowModal(true)} style={{ color: 'var(--fiq-accent)' }}>Ajouter</button>
                    </p>
                  ) : (
                    entries.map(l => (
                      <FoodCard key={l.id} log={l} onDelete={handleDelete} />
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modale ajout */}
      {showModal && (
        <AddFoodModal
          onClose={() => setShowModal(false)}
          onAdded={handleAdded}
          today={today}
        />
      )}
    </div>
  )
}
