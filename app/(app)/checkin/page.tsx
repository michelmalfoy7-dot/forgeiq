'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertBar } from '@/components/ui/AlertBar'
import { Loader2, Save, TrendingDown, TrendingUp, Minus } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────
type LogData = {
  weight_kg: string
  sys_bp: string
  dia_bp: string
  steps: string
  sleep_total_min: string
  sleep_deep_min: string
  sleep_light_min: string
  sleep_rem_min: string
  calories: string
  protein_g: string
  carbs_g: string
  fat_g: string
  fatigue_score: number
  motivation_score: number
  notes: string
}

const EMPTY: LogData = {
  weight_kg: '', sys_bp: '', dia_bp: '', steps: '',
  sleep_total_min: '', sleep_deep_min: '', sleep_light_min: '', sleep_rem_min: '',
  calories: '', protein_g: '', carbs_g: '', fat_g: '',
  fatigue_score: 5, motivation_score: 5, notes: '',
}

// Ratios protéines selon objectif (g/kg poids de corps) — sources ISSN/ACSM
const PROTEIN_RATIO: Record<string, { min: number; max: number }> = {
  muscle_gain: { min: 1.8, max: 2.2 },
  strength:    { min: 1.8, max: 2.2 },
  weight_loss: { min: 1.8, max: 2.0 },
  endurance:   { min: 1.2, max: 1.6 },
  general:     { min: 1.4, max: 1.8 },
}

function calcMacroTargets(goal?: string, weightKg?: number | null) {
  const ratio = PROTEIN_RATIO[goal ?? 'general'] ?? PROTEIN_RATIO['general']
  const w = (weightKg && weightKg > 30 && weightKg < 250) ? weightKg : 75
  const protein_g = Math.round(w * (ratio.min + ratio.max) / 2)
  // Glucides et lipides : ratios standards (40% / 30% des kcal restantes)
  const calories = Math.round(w * 30 + 300) // estimation maintenance
  const carbs_g = Math.round((calories * 0.40) / 4)
  const fat_g = Math.round((calories * 0.28) / 9)
  return { protein_g, carbs_g, fat_g, calories }
}

export default function CheckinPage() {
  const [form, setForm] = useState<LogData>(EMPTY)
  const [ewma, setEwma] = useState<number | null>(null)
  const [ewmaLoading, setEwmaLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{
    goal?: string
    weight_kg?: number | null
    macro_mode?: string | null
    custom_calories?: number | null
    custom_protein_g?: number | null
    custom_carbs_g?: number | null
    custom_fat_g?: number | null
  } | null>(null)
  const router = useRouter()

  // Charger le log existant du jour
  useEffect(() => {
    async function loadToday() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: log }, { data: prof }] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('user_id', user.id)
          .eq('log_date', new Date().toISOString().split('T')[0]).single(),
        supabase.from('profiles').select('goal, weight_kg, macro_mode, custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g').eq('id', user.id).single(),
      ])

      if (prof) setProfile(prof)
      if (log) {
        setForm({
          weight_kg: log.weight_kg?.toString() ?? '',
          sys_bp: log.sys_bp?.toString() ?? '',
          dia_bp: log.dia_bp?.toString() ?? '',
          steps: log.steps?.toString() ?? '',
          sleep_total_min: log.sleep_total_min?.toString() ?? '',
          sleep_deep_min: log.sleep_deep_min?.toString() ?? '',
          sleep_light_min: log.sleep_light_min?.toString() ?? '',
          sleep_rem_min: log.sleep_rem_min?.toString() ?? '',
          calories: log.calories?.toString() ?? '',
          protein_g: log.protein_g?.toString() ?? '',
          carbs_g: log.carbs_g?.toString() ?? '',
          fat_g: log.fat_g?.toString() ?? '',
          fatigue_score: log.fatigue_score ?? 5,
          motivation_score: log.motivation_score ?? 5,
          notes: log.notes ?? '',
        })
        if (log.weight_trend) setEwma(log.weight_trend)
      }
    }
    loadToday()
  }, [])

  // Calcul EWMA dès que le poids change
  const fetchEwma = useCallback(async (weight: string) => {
    if (!weight || isNaN(parseFloat(weight))) { setEwma(null); return }
    setEwmaLoading(true)
    try {
      const res = await fetch('/api/ewma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: parseFloat(weight),
          log_date: new Date().toISOString().split('T')[0],
        }),
      })
      const { data } = await res.json()
      if (data?.weight_trend) setEwma(data.weight_trend)
    } finally {
      setEwmaLoading(false)
    }
  }, [])

  function set(key: keyof LogData, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        weight_kg: parseFloat(form.weight_kg) || null,
        weight_trend: ewma,
        sys_bp: parseInt(form.sys_bp) || null,
        dia_bp: parseInt(form.dia_bp) || null,
        steps: parseInt(form.steps) || null,
        sleep_total_min: parseInt(form.sleep_total_min) || null,
        sleep_deep_min: parseInt(form.sleep_deep_min) || null,
        sleep_light_min: parseInt(form.sleep_light_min) || null,
        sleep_rem_min: parseInt(form.sleep_rem_min) || null,
        calories: parseInt(form.calories) || null,
        protein_g: parseFloat(form.protein_g) || null,
        carbs_g: parseFloat(form.carbs_g) || null,
        fat_g: parseFloat(form.fat_g) || null,
        fatigue_score: form.fatigue_score,
        motivation_score: form.motivation_score,
        notes: form.notes || null,
      }

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const { error: err } = await res.json()
      if (err) { setError(err); return }
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 1200)
    } finally {
      setSaving(false)
    }
  }

  // Cibles macros : custom si définies, sinon auto selon poids + objectif
  const autoTarget = calcMacroTargets(profile?.goal, profile?.weight_kg)
  const macroTarget = profile?.macro_mode === 'custom' && (profile.custom_protein_g || profile.custom_calories)
    ? {
        protein_g: profile.custom_protein_g ?? autoTarget.protein_g,
        carbs_g: profile.custom_carbs_g ?? autoTarget.carbs_g,
        fat_g: profile.custom_fat_g ?? autoTarget.fat_g,
        calories: profile.custom_calories ?? autoTarget.calories,
      }
    : autoTarget

  // ── Alertes inline ───────────────────────────────────────────
  const alerts: { type: 'red' | 'yellow' | 'green' | 'blue'; msg: string; sub: string }[] = []
  const deepSleep = parseInt(form.sleep_deep_min)
  const protein = parseFloat(form.protein_g)
  const sysBP = parseInt(form.sys_bp)
  const proteinTarget = macroTarget.protein_g

  if (!isNaN(deepSleep) && deepSleep < 60)
    alerts.push({ type: 'yellow', msg: '⚠️ Sommeil profond insuffisant', sub: `${deepSleep}min détectés — réduis le volume d'entraînement de 15-20% aujourd'hui.` })
  if (!isNaN(protein) && protein < proteinTarget - 20)
    alerts.push({ type: 'yellow', msg: '🥩 Protéines en dessous de l\'objectif', sub: `${protein}g / ${proteinTarget}g — pense à ajouter une source de protéines.` })
  if (!isNaN(sysBP) && sysBP > 135)
    alerts.push({ type: 'red', msg: '🫀 Tension systolique élevée', sub: `${sysBP} mmHg — consulte un médecin si ça persiste plusieurs jours.` })
  const cal = parseInt(form.calories) || 0
  const prot = parseFloat(form.protein_g) || 0
  const carb = parseFloat(form.carbs_g) || 0
  const fat = parseFloat(form.fat_g) || 0

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center space-y-3">
          <div className="text-5xl">✅</div>
          <p className="text-lg font-bold" style={{ color: 'var(--fiq-text)' }}>Bilan sauvegardé !</p>
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Retour au dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-6">
      <div className="pt-4 mb-6">
        <p className="fiq-label">Bilan quotidien</p>
        <h1 className="text-2xl fiq-display mt-1" style={{ color: 'var(--fiq-text)' }}>
          Check-in du jour
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
          Tout est optionnel — remplis ce que tu as.
        </p>
      </div>

      {/* Alertes inline */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-5">
          {alerts.map((a, i) => (
            <AlertBar key={i} type={a.type as 'red' | 'yellow' | 'green' | 'blue'} message={a.msg} sub={a.sub} />
          ))}
        </div>
      )}

      {/* ── SECTION : Corps ─────────────────────────────────── */}
      <Section title="🏋️ Corps" icon="">
        <Field label="Poids (kg)">
          <Input
            type="number" step="0.1" placeholder="74.5"
            value={form.weight_kg}
            onChange={(e) => { set('weight_kg', e.target.value); fetchEwma(e.target.value) }}
            style={inputStyle}
          />
          {/* EWMA */}
          {form.weight_kg && (
            <div className="flex items-center gap-2 mt-2 px-1">
              {ewmaLoading
                ? <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Calcul tendance…</span>
                : ewma !== null && (
                  <>
                    <EwmaTrend current={parseFloat(form.weight_kg)} trend={ewma} />
                    <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                      Tendance lissée : <strong style={{ color: 'var(--fiq-text)' }}>{ewma} kg</strong>
                    </span>
                  </>
                )
              }
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tension SYS (mmHg)">
            <Input type="number" placeholder="120" value={form.sys_bp}
              onChange={(e) => set('sys_bp', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Tension DIA (mmHg)">
            <Input type="number" placeholder="80" value={form.dia_bp}
              onChange={(e) => set('dia_bp', e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Pas (steps)">
          <Input type="number" placeholder="8000" value={form.steps}
            onChange={(e) => set('steps', e.target.value)} style={inputStyle} />
        </Field>
      </Section>

      {/* ── SECTION : Sommeil ───────────────────────────────── */}
      <Section title="😴 Sommeil">
        <Field label="Total (min)">
          <Input type="number" placeholder="480" value={form.sleep_total_min}
            onChange={(e) => set('sleep_total_min', e.target.value)} style={inputStyle} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Profond (min)">
            <Input type="number" placeholder="90" value={form.sleep_deep_min}
              onChange={(e) => set('sleep_deep_min', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Léger (min)">
            <Input type="number" placeholder="240" value={form.sleep_light_min}
              onChange={(e) => set('sleep_light_min', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="REM (min)">
            <Input type="number" placeholder="90" value={form.sleep_rem_min}
              onChange={(e) => set('sleep_rem_min', e.target.value)} style={inputStyle} />
          </Field>
        </div>
        {form.sleep_deep_min && (
          <SleepBar deepMin={parseInt(form.sleep_deep_min)} totalMin={parseInt(form.sleep_total_min) || 480} />
        )}
      </Section>

      {/* ── SECTION : Nutrition ─────────────────────────────── */}
      <Section title="🥗 Nutrition">
        <Field label="Calories">
          <Input type="number" placeholder="2200" value={form.calories}
            onChange={(e) => set('calories', e.target.value)} style={inputStyle} />
          {cal > 0 && <MacroBar value={cal} target={macroTarget.calories} color="var(--fiq-blue)" label={`${cal} / ${macroTarget.calories} kcal`} />}
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Protéines (g)">
            <Input type="number" placeholder="160" value={form.protein_g}
              onChange={(e) => set('protein_g', e.target.value)} style={inputStyle} />
            {prot > 0 && <MacroBar value={prot} target={macroTarget.protein_g} color="var(--fiq-accent)" label={`${prot}g`} />}
          </Field>
          <Field label="Glucides (g)">
            <Input type="number" placeholder="250" value={form.carbs_g}
              onChange={(e) => set('carbs_g', e.target.value)} style={inputStyle} />
            {carb > 0 && <MacroBar value={carb} target={macroTarget.carbs_g} color="var(--fiq-blue)" label={`${carb}g`} />}
          </Field>
          <Field label="Lipides (g)">
            <Input type="number" placeholder="70" value={form.fat_g}
              onChange={(e) => set('fat_g', e.target.value)} style={inputStyle} />
            {fat > 0 && <MacroBar value={fat} target={macroTarget.fat_g} color="var(--fiq-orange)" label={`${fat}g`} />}
          </Field>
        </div>
      </Section>

      {/* ── SECTION : Ressenti ──────────────────────────────── */}
      <Section title="🧠 Ressenti">
        <div className="space-y-4">
          <ScoreSlider
            label="Fatigue"
            value={form.fatigue_score}
            onChange={(v) => set('fatigue_score', v)}
            lowLabel="Frais" highLabel="Épuisé"
            lowColor="var(--fiq-accent)" highColor="var(--fiq-red)"
          />
          <ScoreSlider
            label="Motivation"
            value={form.motivation_score}
            onChange={(v) => set('motivation_score', v)}
            lowLabel="Démotivé" highLabel="Au top"
            lowColor="var(--fiq-red)" highColor="var(--fiq-accent)"
          />
        </div>

        <Field label="Notes libres">
          <Textarea
            placeholder="Douleur au genou, bonne nuit, stressé au boulot…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </Field>
      </Section>

      {error && <AlertBar type="red" message={error} className="mb-4" />}

      <Button
        className="w-full py-6 text-base font-black"
        onClick={handleSave}
        disabled={saving}
        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" />Sauvegarder le bilan</>}
      </Button>
    </div>
  )
}

// ── Sous-composants ──────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  borderColor: 'var(--fiq-border)',
  color: 'var(--fiq-text)',
  borderRadius: 10,
}

function Section({ title, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="fiq-card mb-4 space-y-4">
      <h2 className="font-bold text-base" style={{ color: 'var(--fiq-text)' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="fiq-label block">{label}</label>
      {children}
    </div>
  )
}

function MacroBar({ value, target, color, label }: { value: number; target: number; color: string; label: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  const over = value > target
  return (
    <div className="mt-1.5">
      <div className="flex justify-between mb-0.5">
        <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>{label}</span>
        <span className="text-[10px]" style={{ color: over ? 'var(--fiq-orange)' : 'var(--fiq-muted)' }}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fiq-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: over ? 'var(--fiq-orange)' : color }}
        />
      </div>
    </div>
  )
}

function SleepBar({ deepMin, totalMin }: { deepMin: number; totalMin: number }) {
  const pct = Math.min(100, Math.round((deepMin / totalMin) * 100))
  const isGood = deepMin >= 60
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--fiq-faint)' }}>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: isGood ? 'var(--fiq-accent)' : 'var(--fiq-orange)' }}>
          {isGood ? '✓ Sommeil profond OK' : '⚠ Sommeil profond faible'}
        </span>
        <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{deepMin}min / {totalMin}min total</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--fiq-border)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: isGood ? 'var(--fiq-accent)' : 'var(--fiq-orange)' }}
        />
      </div>
    </div>
  )
}

function EwmaTrend({ current, trend }: { current: number; trend: number }) {
  const diff = current - trend
  if (Math.abs(diff) < 0.05) return <Minus className="w-3 h-3" style={{ color: 'var(--fiq-muted)' }} />
  if (diff > 0) return <TrendingUp className="w-3 h-3" style={{ color: 'var(--fiq-orange)' }} />
  return <TrendingDown className="w-3 h-3" style={{ color: 'var(--fiq-accent)' }} />
}

function ScoreSlider({
  label, value, onChange, lowLabel, highLabel, lowColor, highColor,
}: {
  label: string; value: number; onChange: (v: number) => void
  lowLabel: string; highLabel: string; lowColor: string; highColor: string
}) {
  const pct = (value - 1) / 9
  const color = interpolateColor(lowColor, highColor, pct)

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="fiq-label">{label}</label>
        <span className="text-lg font-black fiq-data" style={{ color }}>{value}/10</span>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color, background: 'var(--fiq-border)' }}
      />
      <div className="flex justify-between">
        <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>{lowLabel}</span>
        <span className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>{highLabel}</span>
      </div>
    </div>
  )
}

// Interpole entre deux couleurs hex
function interpolateColor(c1: string, c2: string, t: number): string {
  const presets: Record<string, [number, number, number]> = {
    'var(--fiq-accent)':  [180, 255, 74],
    'var(--fiq-red)':     [239, 68,  68],
    'var(--fiq-orange)':  [255, 107, 53],
    'var(--fiq-blue)':    [61,  139, 255],
    'var(--fiq-muted)':   [107, 114, 128],
  }
  const [r1, g1, b1] = presets[c1] ?? [180, 255, 74]
  const [r2, g2, b2] = presets[c2] ?? [239, 68, 68]
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}
