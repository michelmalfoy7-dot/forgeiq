'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics'
import { AlertBar } from '@/components/ui/AlertBar'
import { StreakMilestoneModal } from '@/components/ui/StreakMilestoneModal'
import { Loader2, Save, TrendingDown, TrendingUp, Minus, CheckCircle2, ChevronDown, ChevronUp, Moon, Footprints, Utensils, Brain, Activity, Scale, RefreshCw } from 'lucide-react'
import { calcTDEESimple } from '@/lib/utils/tdee'
import { hMinToMinutes, minutesToHMin, formatSleep } from '@/lib/formatSleep'

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
  hrv_ms: string
  temp_deviation_c: string
}

const EMPTY: LogData = {
  weight_kg: '', sys_bp: '', dia_bp: '', steps: '',
  sleep_total_min: '', sleep_deep_min: '', sleep_light_min: '', sleep_rem_min: '',
  calories: '', protein_g: '', carbs_g: '', fat_g: '',
  fatigue_score: 5, motivation_score: 5, notes: '',
  hrv_ms: '', temp_deviation_c: '',
}

// Chips preset pour les pas
const STEPS_CHIPS = [
  { label: '5k', value: 5000 },
  { label: '7.5k', value: 7500 },
  { label: '8k', value: 8000 },
  { label: '10k', value: 10000 },
  { label: '12k', value: 12000 },
  { label: '15k+', value: 15000 },
]

// Formate la date du jour en français
function formatDateFR(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).replace(/^\w/, (c) => c.toUpperCase())
}

function getLogDate(isYesterday: boolean): string {
  const d = new Date()
  if (isYesterday) d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export default function CheckinPage() {
  const [form, setForm] = useState<LogData>(EMPTY)
  const [ewma, setEwma] = useState<number | null>(null)
  const [ewmaLoading, setEwmaLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [milestone, setMilestone] = useState<{ streak: number; type: 'checkin' | 'training' } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isYesterday, setIsYesterday] = useState(false)
  const [stepsChip, setStepsChip] = useState<number | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [wearableSyncing, setWearableSyncing] = useState(false)
  const [wearableConnected, setWearableConnected] = useState(false)
  const ewmaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [profile, setProfile] = useState<{
    goal?: string | null
    weight_kg?: number | null
    height_cm?: number | null
    age?: number | null
    gender?: string | null
    sessions_per_week?: number | null
    macro_mode?: string | null
    custom_calories?: number | null
    custom_protein_g?: number | null
    custom_carbs_g?: number | null
    custom_fat_g?: number | null
  } | null>(null)
  const router = useRouter()

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
          log_date: getLogDate(isYesterday),
        }),
      })
      const { data } = await res.json()
      if (data?.weight_trend) setEwma(data.weight_trend)
    } finally {
      setEwmaLoading(false)
    }
  }, [isYesterday])

  // Cleanup debounce au unmount
  useEffect(() => {
    return () => { if (ewmaDebounceRef.current) clearTimeout(ewmaDebounceRef.current) }
  }, [])

  // Charger le log existant du jour
  useEffect(() => {
    async function loadToday() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: log }, { data: prof }] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('user_id', user.id)
          .eq('log_date', getLogDate(isYesterday)).maybeSingle(),
        supabase.from('profiles').select('goal, weight_kg, height_cm, age, gender, sessions_per_week, macro_mode, custom_calories, custom_protein_g, custom_carbs_g, custom_fat_g').eq('id', user.id).maybeSingle(),
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
          hrv_ms: log.hrv_ms?.toString() ?? '',
          temp_deviation_c: log.temp_deviation_c?.toString() ?? '',
        })
        if (log.weight_kg) fetchEwma(log.weight_kg.toString())
      }
    }
    loadToday()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchEwma, isYesterday])

  // Vérifier si Google Fit est connecté
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('wearable_connections')
        .select('provider')
        .eq('user_id', user.id)
        .eq('provider', 'google_fit')
        .maybeSingle()
        .then(({ data }) => setWearableConnected(!!data))
    })
  }, [])

  async function syncWearable() {
    setWearableSyncing(true)
    try {
      const res = await fetch('/api/integrations/google-fit/sync', { method: 'POST' })
      const { data, error: syncErr } = await res.json()
      if (syncErr || !data) return
      // Pré-remplir le formulaire avec les données wearable
      if (data.steps != null) set('steps', data.steps.toString())
      if (data.sleepTotal != null) set('sleep_total_min', data.sleepTotal.toString())
      if (data.sleepDeep  != null) set('sleep_deep_min',  data.sleepDeep.toString())
      if (data.sleepRem   != null) set('sleep_rem_min',   data.sleepRem.toString())
    } finally {
      setWearableSyncing(false)
    }
  }

  function set(key: keyof LogData, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      // Helpers : convertit une string en number ou null, sans effacer la valeur 0
      const toInt = (s: string) => s.trim() !== '' && !isNaN(parseInt(s)) ? parseInt(s) : null
      const toFloat = (s: string) => s.trim() !== '' && !isNaN(parseFloat(s)) ? parseFloat(s) : null

      const payload = {
        log_date: getLogDate(isYesterday),
        weight_kg: toFloat(form.weight_kg),
        weight_trend: ewma,
        sys_bp: toInt(form.sys_bp),
        dia_bp: toInt(form.dia_bp),
        steps: toInt(form.steps),
        sleep_total_min: toInt(form.sleep_total_min),
        sleep_deep_min: toInt(form.sleep_deep_min),
        sleep_light_min: toInt(form.sleep_light_min),
        sleep_rem_min: toInt(form.sleep_rem_min),
        calories: toInt(form.calories),
        protein_g: toFloat(form.protein_g),
        carbs_g: toFloat(form.carbs_g),
        fat_g: toFloat(form.fat_g),
        fatigue_score: form.fatigue_score,
        motivation_score: form.motivation_score,
        notes: form.notes || null,
        hrv_ms: toInt(form.hrv_ms),
        temp_deviation_c: toFloat(form.temp_deviation_c),
      }

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const { error: err, milestone: ms } = await res.json()
      if (err) { setError(err); return }
      setSaved(true)
      // North-star event — activation recovery (1ère occurrence calculée côté PostHog)
      track('checkin_completed')
      if (ms) {
        setMilestone(ms)
        // Laisser le modal ouvert, puis rediriger après fermeture
        return
      }
      setTimeout(() => router.push('/dashboard'), 1400)
    } finally {
      setSaving(false)
    }
  }

  // Cibles macros : custom si définies, sinon TDEE Mifflin-St Jeor + activité
  const autoTarget = profile?.weight_kg
    ? calcTDEESimple({
        weight_kg: profile.weight_kg,
        height_cm: profile.height_cm,
        age: profile.age,
        gender: profile.gender,
        goal: profile.goal,
        sessions_per_week: profile.sessions_per_week,
      })
    : { protein_g: 150, carbs_g: 200, fat_g: 70, calories: 2000 }

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
    alerts.push({ type: 'yellow', msg: 'Sommeil profond insuffisant', sub: `${deepSleep}min détectés — réduis le volume d'entraînement de 15-20% aujourd'hui.` })
  if (!isNaN(protein) && protein < proteinTarget - 20)
    alerts.push({ type: 'yellow', msg: 'Protéines en dessous de l\'objectif', sub: `${protein}g / ${proteinTarget}g — pense à ajouter une source de protéines.` })
  if (!isNaN(sysBP) && sysBP > 135)
    alerts.push({ type: 'red', msg: 'Tension systolique élevée', sub: `${sysBP} mmHg — consulte un médecin si ça persiste plusieurs jours.` })
  const cal = parseInt(form.calories) || 0
  const prot = parseFloat(form.protein_g) || 0
  const carb = parseFloat(form.carbs_g) || 0
  const fat = parseFloat(form.fat_g) || 0

  // Toast de confirmation flottant
  const SavedToast = saved ? (
    <div
      className="fixed left-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg"
      style={{
        transform: 'translateX(-50%)',
        bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
        background: '#B4FF4A22',
        border: '1px solid #B4FF4A66',
        backdropFilter: 'blur(12px)',
        color: 'var(--accent)',
        whiteSpace: 'nowrap',
      }}
    >
      <CheckCircle2 className="w-4 h-4 shrink-0" />
      <span className="text-sm font-bold">Bilan sauvegardé ✓</span>
    </div>
  ) : null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {milestone && (
        <StreakMilestoneModal
          streak={milestone.streak}
          type={milestone.type}
          onClose={() => { setMilestone(null); router.push('/dashboard') }}
        />
      )}
      <div className="p-4 max-w-lg mx-auto pb-32">
        {SavedToast}

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="pt-4 mb-6">
          <p className="fiq-label" style={{ color: 'var(--accent)' }}>Bilan quotidien</p>
          <h1 className="fiq-display mt-1" style={{ fontSize: 28, color: 'var(--text)' }}>
            Check-in
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {formatDateFR(isYesterday ? new Date(Date.now() - 86400000) : new Date())}
          </p>

          {/* Toggle Aujourd'hui / Hier */}
          <div
            className="flex mt-3 rounded-xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', width: 'fit-content' }}
          >
            {['Aujourd\'hui', 'Hier'].map((label, i) => {
              const active = i === 0 ? !isYesterday : isYesterday
              return (
                <button
                  key={label}
                  onClick={() => setIsYesterday(i === 1)}
                  style={{
                    padding: '6px 16px',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? 'var(--bg)' : 'var(--muted)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    borderRadius: active ? 10 : 0,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Tout est optionnel — remplis ce que tu as.
            </p>
            {wearableConnected && (
              <button
                onClick={syncWearable}
                disabled={wearableSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black disabled:opacity-50"
                style={{ background: '#3D8BFF22', border: '1px solid #3D8BFF44', color: 'var(--fiq-blue)' }}
              >
                <RefreshCw className={`w-3 h-3 ${wearableSyncing ? 'animate-spin' : ''}`} />
                {wearableSyncing ? 'Sync...' : '⌚ Google Fit'}
              </button>
            )}
          </div>
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
        <SectionCard
          icon={<Scale className="w-4 h-4" />}
          iconColor="var(--blue)"
          title="Corps"
        >
          <Field label="Poids (kg)">
            <input
              type="number"
              step="0.1"
              placeholder="74.5"
              value={form.weight_kg}
              onChange={(e) => {
                const val = e.target.value
                set('weight_kg', val)
                // Debounce EWMA 500ms pour éviter les calculs aberrants pendant la saisie
                if (ewmaDebounceRef.current) clearTimeout(ewmaDebounceRef.current)
                ewmaDebounceRef.current = setTimeout(() => fetchEwma(val), 500)
              }}
              style={fiqInput}
            />
            {/* EWMA */}
            {form.weight_kg && (
              <div className="flex items-center gap-2 mt-2 px-1">
                {ewmaLoading
                  ? <span className="text-xs" style={{ color: 'var(--muted)' }}>Calcul tendance…</span>
                  : ewma !== null && (
                    <>
                      <EwmaTrend current={parseFloat(form.weight_kg)} trend={ewma} />
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        Tendance lissée : <strong style={{ color: 'var(--text)' }}>{ewma} kg</strong>
                      </span>
                    </>
                  )
                }
              </div>
            )}
          </Field>
        </SectionCard>

        {/* ── SECTION : Sommeil ───────────────────────────────── */}
        <SectionCard
          icon={<Moon className="w-4 h-4" />}
          iconColor="#8B5CF6"
          title="Sommeil"
        >
          {/* Total : saisie h + min */}
          <Field label="Total de sommeil">
            <SleepHMinInput
              valueMin={form.sleep_total_min}
              onChange={(min) => set('sleep_total_min', min ? String(min) : '')}
              placeholderH="8"
              placeholderMin="30"
            />
          </Field>

          {/* Détail phases */}
          <div>
            <p className="fiq-label mb-2">Phases (données montre / app)</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'sleep_deep_min' as keyof LogData, label: 'Profond', color: '#8B5CF6', phH: '1', phM: '30' },
                { key: 'sleep_light_min' as keyof LogData, label: 'Léger',   color: '#6366F1', phH: '4', phM: '00' },
                { key: 'sleep_rem_min'   as keyof LogData, label: 'REM',     color: '#A78BFA', phH: '1', phM: '30' },
              ].map(({ key, label, color, phH, phM }) => (
                <div key={key}>
                  <p className="text-[10px] mb-1.5 text-center font-semibold" style={{ color }}>{label}</p>
                  <SleepHMinInput
                    valueMin={form[key] as string}
                    onChange={(min) => set(key, min ? String(min) : '')}
                    placeholderH={phH}
                    placeholderMin={phM}
                    compact
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] mt-2" style={{ color: 'var(--muted)' }}>
              Données depuis ta montre ou app sommeil
            </p>
          </div>

          {/* Aperçu formaté */}
          {form.sleep_total_min && parseInt(form.sleep_total_min) > 0 && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Total : <strong style={{ color: 'var(--text)' }}>{formatSleep(parseInt(form.sleep_total_min))}</strong>
              {form.sleep_deep_min && parseInt(form.sleep_deep_min) > 0 && (
                <span> · Profond : <strong style={{ color: '#8B5CF6' }}>{formatSleep(parseInt(form.sleep_deep_min))}</strong></span>
              )}
            </p>
          )}

          {form.sleep_deep_min && (
            <SleepBar deepMin={parseInt(form.sleep_deep_min)} totalMin={parseInt(form.sleep_total_min) || 480} />
          )}
        </SectionCard>

        {/* ── SECTION : Pas ───────────────────────────────────── */}
        <SectionCard
          icon={<Footprints className="w-4 h-4" />}
          iconColor="var(--accent)"
          title="Activité"
        >
          <Field label="Pas aujourd'hui">
            {/* Chips preset */}
            <div className="flex flex-wrap gap-2 mb-3">
              {STEPS_CHIPS.map((chip) => {
                const active = stepsChip === chip.value
                return (
                  <button
                    key={chip.label}
                    onClick={() => {
                      setStepsChip(chip.value)
                      set('steps', String(chip.value))
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 20,
                      border: active ? 'none' : '1px solid var(--border)',
                      background: active ? 'var(--accent)' : 'var(--surface)',
                      color: active ? 'var(--bg)' : 'var(--text)',
                      fontSize: 13,
                      fontWeight: active ? 800 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>
            {/* Input numérique optionnel */}
            <div>
              <p className="fiq-label mb-1.5">Autre valeur</p>
              <input
                type="number"
                placeholder="ex : 9200"
                value={stepsChip ? '' : form.steps}
                onChange={(e) => {
                  setStepsChip(null)
                  set('steps', e.target.value)
                }}
                style={fiqInput}
              />
            </div>
          </Field>
        </SectionCard>

        {/* ── SECTION : Nutrition ─────────────────────────────── */}
        <SectionCard
          icon={<Utensils className="w-4 h-4" />}
          iconColor="var(--orange)"
          title="Nutrition"
        >
          <Field label="Calories">
            <input
              type="number"
              placeholder="2200"
              value={form.calories}
              onChange={(e) => set('calories', e.target.value)}
              style={fiqInput}
            />
            {cal > 0 && <MacroBar value={cal} target={macroTarget.calories} color="var(--blue)" label={`${cal} / ${macroTarget.calories} kcal`} />}
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Protéines">
              <input
                type="number"
                placeholder="160"
                value={form.protein_g}
                onChange={(e) => set('protein_g', e.target.value)}
                style={{ ...fiqInput, textAlign: 'center' }}
              />
              <p className="text-[9px] text-center mt-0.5" style={{ color: 'var(--muted)' }}>grammes</p>
              {prot > 0 && <MacroBar value={prot} target={macroTarget.protein_g} color="var(--accent)" label={`${prot}g`} />}
            </Field>
            <Field label="Glucides">
              <input
                type="number"
                placeholder="250"
                value={form.carbs_g}
                onChange={(e) => set('carbs_g', e.target.value)}
                style={{ ...fiqInput, textAlign: 'center' }}
              />
              <p className="text-[9px] text-center mt-0.5" style={{ color: 'var(--muted)' }}>grammes</p>
              {carb > 0 && <MacroBar value={carb} target={macroTarget.carbs_g} color="var(--blue)" label={`${carb}g`} />}
            </Field>
            <Field label="Lipides">
              <input
                type="number"
                placeholder="70"
                value={form.fat_g}
                onChange={(e) => set('fat_g', e.target.value)}
                style={{ ...fiqInput, textAlign: 'center' }}
              />
              <p className="text-[9px] text-center mt-0.5" style={{ color: 'var(--muted)' }}>grammes</p>
              {fat > 0 && <MacroBar value={fat} target={macroTarget.fat_g} color="var(--orange)" label={`${fat}g`} />}
            </Field>
          </div>
        </SectionCard>

        {/* ── SECTION : Ressenti ──────────────────────────────── */}
        <SectionCard
          icon={<Brain className="w-4 h-4" />}
          iconColor="#EC4899"
          title="Ressenti"
        >
          <div className="space-y-5">
            <ScoreSlider
              label="Fatigue"
              value={form.fatigue_score}
              onChange={(v) => set('fatigue_score', v)}
              lowLabel="Frais" highLabel="Épuisé"
              lowColor="var(--accent)" highColor="var(--red)"
            />
            <ScoreSlider
              label="Motivation"
              value={form.motivation_score}
              onChange={(v) => set('motivation_score', v)}
              lowLabel="Démotivé" highLabel="Au top"
              lowColor="var(--red)" highColor="var(--accent)"
            />
          </div>

          <Field label="Notes libres">
            <textarea
              placeholder="Douleur au genou, bonne nuit, stressé au boulot…"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              style={{
                ...fiqInput,
                resize: 'none',
                lineHeight: 1.6,
                paddingTop: 12,
                paddingBottom: 12,
              }}
            />
          </Field>
        </SectionCard>

        {/* ── SECTION : Données avancées (collapsible) ─────────── */}
        <div
          style={{
            borderRadius: 16,
            border: '1px solid var(--border)',
            background: 'var(--card)',
            marginBottom: 16,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setAdvancedOpen((o) => !o)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: '#EF444422',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Activity className="w-4 h-4" style={{ color: 'var(--red)' }} />
              </span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Données avancées</span>
            </div>
            {advancedOpen
              ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--muted)' }} />
              : <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            }
          </button>

          {advancedOpen && (
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p className="text-xs" style={{ color: 'var(--muted)', marginTop: -4 }}>
                Nécessite un tensiomètre. Consultez un médecin si SYS &gt; 135 mmHg de façon répétée.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Tension SYS (mmHg)">
                  <input
                    type="number"
                    placeholder="120"
                    value={form.sys_bp}
                    onChange={(e) => set('sys_bp', e.target.value)}
                    style={fiqInput}
                  />
                </Field>
                <Field label="Tension DIA (mmHg)">
                  <input
                    type="number"
                    placeholder="80"
                    value={form.dia_bp}
                    onChange={(e) => set('dia_bp', e.target.value)}
                    style={fiqInput}
                  />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="HRV (ms)">
                  <input
                    type="number"
                    placeholder="55"
                    value={form.hrv_ms}
                    onChange={(e) => set('hrv_ms', e.target.value)}
                    style={fiqInput}
                  />
                </Field>
                <Field label="Temp. basale (±°C)">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="+0.2"
                    value={form.temp_deviation_c}
                    onChange={(e) => set('temp_deviation_c', e.target.value)}
                    style={fiqInput}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        {error && <AlertBar type="red" message={error} className="mb-4" />}

        {/* ── Bouton Save ─────────────────────────────────────── */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '18px 24px',
            borderRadius: 18,
            background: saving ? 'var(--accent-dim)' : 'var(--accent)',
            color: 'var(--bg)',
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'opacity 0.15s',
            opacity: saving ? 0.8 : 1,
          }}
        >
          {saving
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : (
              <>
                <Save className="w-5 h-5" />
                Sauvegarder le bilan
              </>
            )
          }
        </button>
      </div>
    </div>
  )
}

// ── Sous-composants ──────────────────────────────────────────

// Style input natif réutilisable
const fiqInput: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text)',
  fontSize: 16,
  padding: '11px 14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontVariantNumeric: 'tabular-nums',
}

function SectionCard({
  icon, iconColor, title, children,
}: {
  icon: React.ReactNode
  iconColor: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--border)',
        background: 'var(--card)',
        padding: 20,
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* En-tête de section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: iconColor + '22',
            border: `1px solid ${iconColor}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <h2 style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', margin: 0 }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="fiq-label">{label}</label>
      {children}
    </div>
  )
}

function MacroBar({ value, target, color, label }: { value: number; target: number; color: string; label: string }) {
  const rawPct = Math.round((value / target) * 100)
  const barPct = Math.min(100, rawPct)
  const over = value > target
  return (
    <div className="mt-1.5">
      <div className="flex justify-between mb-0.5">
        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{label}</span>
        <span className="text-[10px] font-semibold" style={{ color: over ? 'var(--orange)' : 'var(--muted)' }}>
          {rawPct}%{over && ' ⚠'}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${barPct}%`, background: over ? 'var(--orange)' : color }}
        />
      </div>
    </div>
  )
}

function SleepBar({ deepMin, totalMin }: { deepMin: number; totalMin: number }) {
  const pct = Math.min(100, Math.round((deepMin / totalMin) * 100))
  const isGood = deepMin >= 60
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--faint)' }}>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: isGood ? 'var(--accent)' : 'var(--orange)' }}>
          {isGood ? '✓ Sommeil profond OK' : '⚠ Sommeil profond faible'}
        </span>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{deepMin}min / {totalMin}min</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: isGood ? 'var(--accent)' : 'var(--orange)' }}
        />
      </div>
    </div>
  )
}

function EwmaTrend({ current, trend }: { current: number; trend: number }) {
  const diff = current - trend
  if (Math.abs(diff) < 0.05) return <Minus className="w-3 h-3" style={{ color: 'var(--muted)' }} />
  if (diff > 0) return <TrendingUp className="w-3 h-3" style={{ color: 'var(--orange)' }} />
  return <TrendingDown className="w-3 h-3" style={{ color: 'var(--accent)' }} />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="fiq-label">{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="fiq-data" style={{ fontSize: 20, fontWeight: 900, color }}>{value}<span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>/10</span></span>
        </div>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        inputMode="none"
        onChange={(e) => onChange(parseInt(e.target.value))}
        onFocus={(e) => e.currentTarget.blur()} // empêche ouverture clavier mobile
        style={{
          width: '100%',
          height: 6,
          borderRadius: 99,
          appearance: 'none',
          cursor: 'pointer',
          accentColor: color,
          touchAction: 'pan-x',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          background: `linear-gradient(to right, ${color} ${(value - 1) / 9 * 100}%, var(--border) ${(value - 1) / 9 * 100}%)`,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{lowLabel}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{highLabel}</span>
      </div>
    </div>
  )
}

// ── SleepHMinInput : saisie heures + minutes ────────────────
function SleepHMinInput({
  valueMin,
  onChange,
  placeholderH = '0',
  placeholderMin = '00',
  compact = false,
}: {
  valueMin: string
  onChange: (minutes: number | null) => void
  placeholderH?: string
  placeholderMin?: string
  compact?: boolean
}) {
  const parsed = minutesToHMin(valueMin)

  function handleH(v: string) {
    const h = parseInt(v) || 0
    const m = parsed.min
    onChange(hMinToMinutes(h, m))
  }
  function handleMin(v: string) {
    const h = parsed.h
    const m = Math.min(59, parseInt(v) || 0)
    onChange(hMinToMinutes(h, m))
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: compact ? 14 : 16,
    padding: compact ? '8px 6px' : '11px 10px',
    outline: 'none',
    textAlign: 'center',
    width: '100%',
    fontVariantNumeric: 'tabular-nums',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : 8 }}>
      <div style={{ flex: 1 }}>
        <input
          type="number"
          min={0}
          max={12}
          placeholder={placeholderH}
          value={parsed.h > 0 ? parsed.h : ''}
          onChange={(e) => handleH(e.target.value)}
          style={inputStyle}
        />
        <p style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', marginTop: 2 }}>h</p>
      </div>
      <span style={{ color: 'var(--muted)', fontSize: compact ? 14 : 18, fontWeight: 700, flexShrink: 0 }}>:</span>
      <div style={{ flex: 1 }}>
        <input
          type="number"
          min={0}
          max={59}
          placeholder={placeholderMin}
          value={parsed.min > 0 ? parsed.min : ''}
          onChange={(e) => handleMin(e.target.value)}
          style={inputStyle}
        />
        <p style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', marginTop: 2 }}>min</p>
      </div>
    </div>
  )
}

// Interpole entre deux couleurs hex
function interpolateColor(c1: string, c2: string, t: number): string {
  const presets: Record<string, [number, number, number]> = {
    'var(--accent)':  [180, 255, 74],
    'var(--red)':     [239, 68,  68],
    'var(--orange)':  [255, 107, 53],
    'var(--blue)':    [61,  139, 255],
    'var(--muted)':   [107, 114, 128],
    // Compatibilité anciens noms fiq-
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
