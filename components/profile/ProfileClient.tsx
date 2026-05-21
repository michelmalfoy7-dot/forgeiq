'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, LogOut, Trash2, Dumbbell, Trophy, Flame, BarChart2, ChevronRight, MessageCircle } from 'lucide-react'

// Ratios protéines selon objectif (g/kg de poids de corps)
const PROTEIN_RATIO: Record<string, { min: number; max: number }> = {
  muscle_gain: { min: 1.8, max: 2.2 },
  strength:    { min: 1.8, max: 2.2 },
  weight_loss: { min: 1.8, max: 2.0 },
  endurance:   { min: 1.2, max: 1.6 },
  general:     { min: 1.4, max: 1.8 },
}

function calcMacroTargets(goal?: string | null, weightKg?: number | null) {
  const ratio = PROTEIN_RATIO[goal ?? 'general'] ?? PROTEIN_RATIO['general']
  const w = (weightKg && weightKg > 30 && weightKg < 250) ? weightKg : 75
  const protein_g = Math.round(w * (ratio.min + ratio.max) / 2)
  const calories = Math.round(w * 30 + 300)
  const carbs_g = Math.round((calories * 0.40) / 4)
  const fat_g = Math.round((calories * 0.28) / 9)
  return { protein_g, carbs_g, fat_g, calories }
}

type Profile = {
  display_name: string | null
  username: string | null
  goal: string | null
  level: string | null
  equipment: string | null
  sessions_per_week: number | null
  age: number | null
  height_cm: number | null
  gender: string | null
  weight_kg: number | null
  macro_mode: string | null
  custom_calories: number | null
  custom_protein_g: number | null
  custom_carbs_g: number | null
  custom_fat_g: number | null
  created_at: string
} | null

type Stats = {
  totalSessions: number
  totalTonnageKg: number
  prCount: number
  streak: number
}

const GOAL_OPTIONS = [
  { value: 'weight_loss', label: 'Perte de poids' },
  { value: 'muscle_gain', label: 'Prise de masse' },
  { value: 'strength', label: 'Force' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general', label: 'Général' },
]
const GENDER_OPTIONS = [
  { value: 'male', label: '♂ Homme' },
  { value: 'female', label: '♀ Femme' },
  { value: 'other', label: '⚡ Non précisé' },
]
const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
]
const EQUIP_OPTIONS = [
  { value: 'full_gym', label: 'Salle complète' },
  { value: 'home_basic', label: 'Maison basique' },
  { value: 'home_advanced', label: 'Maison avancé' },
  { value: 'bodyweight', label: 'Poids du corps' },
]

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string | number; unit?: string }) {
  return (
    <div className="fiq-card text-center space-y-1">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="fiq-label">{label}</p>
      <p className="text-xl fiq-data font-black" style={{ color: 'var(--fiq-accent)' }}>
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
        {unit && <span className="text-sm font-normal ml-1" style={{ color: 'var(--fiq-muted)' }}>{unit}</span>}
      </p>
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div>
      <p className="fiq-label mb-1.5">{label}</p>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
        style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function NumberField({ label, value, onChange, min, max, unit }: {
  label: string; value: string; onChange: (v: string) => void; min?: number; max?: number; unit?: string
}) {
  return (
    <div>
      <p className="fiq-label mb-1.5">{label}{unit && <span className="ml-1" style={{ color: 'var(--fiq-muted)' }}>({unit})</span>}</p>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min}
        max={max}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
        style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
      />
    </div>
  )
}

export function ProfileClient({ profile, email, stats }: { profile: Profile; email: string; stats: Stats }) {
  const router = useRouter()
  const [goal, setGoal] = useState(profile?.goal ?? 'general')
  const [level, setLevel] = useState(profile?.level ?? 'beginner')
  const [equipment, setEquipment] = useState(profile?.equipment ?? 'full_gym')
  const [sessionsPerWeek, setSessionsPerWeek] = useState(String(profile?.sessions_per_week ?? 3))
  const [age, setAge] = useState(String(profile?.age ?? ''))
  const [heightCm, setHeightCm] = useState(String(profile?.height_cm ?? ''))
  const [gender, setGender] = useState(profile?.gender ?? '')
  const [weightKg, setWeightKg] = useState(String(profile?.weight_kg ?? ''))
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')

  const [macroMode, setMacroMode] = useState<'auto' | 'custom'>(profile?.macro_mode === 'custom' ? 'custom' : 'auto')
  const [customCalories, setCustomCalories] = useState(String(profile?.custom_calories ?? ''))
  const [customProtein, setCustomProtein] = useState(String(profile?.custom_protein_g ?? ''))
  const [customCarbs, setCustomCarbs] = useState(String(profile?.custom_carbs_g ?? ''))
  const [customFat, setCustomFat] = useState(String(profile?.custom_fat_g ?? ''))

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [resetStep, setResetStep] = useState(0) // 0=hidden, 1=first, 2=confirm
  const [resetting, setResetting] = useState(false)

  async function saveProfile() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          goal, level, equipment,
          sessions_per_week: Number(sessionsPerWeek) || 3,
          age: age ? Number(age) : null,
          height_cm: heightCm ? Number(heightCm) : null,
          gender: gender || null,
          weight_kg: weightKg ? Number(weightKg) : null,
          macro_mode: macroMode,
          custom_calories: macroMode === 'custom' && customCalories ? Number(customCalories) : null,
          custom_protein_g: macroMode === 'custom' && customProtein ? Number(customProtein) : null,
          custom_carbs_g: macroMode === 'custom' && customCarbs ? Number(customCarbs) : null,
          custom_fat_g: macroMode === 'custom' && customFat ? Number(customFat) : null,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function resetData() {
    setResetting(true)
    try {
      await fetch('/api/profile/reset', { method: 'POST' })
      router.push('/dashboard')
      router.refresh()
    } finally {
      setResetting(false)
      setResetStep(0)
    }
  }

  const memberSince = profile?.created_at
    ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(profile.created_at))
    : '—'

  return (
    <div className="space-y-5 pb-8">
      {/* Avatar + infos */}
      <div className="fiq-card flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          {(displayName || email)[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>
            {displayName || email.split('@')[0]}
          </p>
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{email}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Membre depuis {memberSince}</p>
        </div>
      </div>

      {/* Stats globales */}
      <div>
        <p className="font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>Mes statistiques</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Dumbbell className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />}
            label="Séances"
            value={stats.totalSessions}
          />
          <StatCard
            icon={<BarChart2 className="w-5 h-5" style={{ color: 'var(--fiq-blue)' }} />}
            label="Tonnage total"
            value={stats.totalTonnageKg}
            unit="kg"
          />
          <StatCard
            icon={<Trophy className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />}
            label="Records (PRs)"
            value={stats.prCount}
          />
          <StatCard
            icon={<Flame className="w-5 h-5" style={{ color: 'var(--fiq-orange)' }} />}
            label="Streak"
            value={stats.streak}
            unit="jours"
          />
        </div>
      </div>

      {/* Paramètres */}
      <div className="fiq-card space-y-4">
        <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Paramètres</p>

        <div>
          <p className="fiq-label mb-1.5">Prénom / Pseudo</p>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Ton prénom"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
          />
        </div>

        <SelectField label="Genre" value={gender} onChange={setGender} options={GENDER_OPTIONS} />
        <SelectField label="Objectif" value={goal} onChange={setGoal} options={GOAL_OPTIONS} />
        <SelectField label="Niveau" value={level} onChange={setLevel} options={LEVEL_OPTIONS} />
        <SelectField label="Équipement" value={equipment} onChange={setEquipment} options={EQUIP_OPTIONS} />

        <div>
          <p className="fiq-label mb-1.5">Séances par semaine</p>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map(n => (
              <button key={n}
                onClick={() => setSessionsPerWeek(String(n))}
                className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
                style={{
                  background: Number(sessionsPerWeek) === n ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                  color: Number(sessionsPerWeek) === n ? 'var(--bg)' : 'var(--fiq-muted)',
                  border: `1px solid ${Number(sessionsPerWeek) === n ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Poids" value={weightKg} onChange={setWeightKg} min={30} max={250} unit="kg" />
          <NumberField label="Âge" value={age} onChange={setAge} min={10} max={100} unit="ans" />
          <NumberField label="Taille" value={heightCm} onChange={setHeightCm} min={100} max={250} unit="cm" />
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2"
          style={{ background: saved ? '#B4FF4A33' : 'var(--fiq-accent)', color: saved ? 'var(--fiq-accent)' : 'var(--bg)', border: saved ? '1px solid var(--fiq-accent)' : 'none' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
        </button>
      </div>

      {/* Objectifs nutritionnels */}
      {(() => {
        const autoTargets = calcMacroTargets(goal, weightKg ? Number(weightKg) : null)
        const GOAL_LABEL = GOAL_OPTIONS.find(o => o.value === goal)?.label ?? goal
        const coachQ = macroMode === 'custom' && (customProtein || customCalories)
          ? `J'ai défini mes macros en mode personnalisé : ${customCalories || '?'}kcal, ${customProtein || '?'}g protéines, ${customCarbs || '?'}g glucides, ${customFat || '?'}g lipides. Est-ce cohérent avec mon objectif "${GOAL_LABEL}" ?`
          : `Mon objectif est "${GOAL_LABEL}". Les macros auto calculées sont ${autoTargets.calories}kcal, ${autoTargets.protein_g}g protéines, ${autoTargets.carbs_g}g glucides, ${autoTargets.fat_g}g lipides. Est-ce adapté à mon profil ?`

        return (
          <div className="fiq-card space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Objectifs nutritionnels</p>
              {/* Toggle Auto / Manuel */}
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--fiq-border)' }}>
                {(['auto', 'custom'] as const).map(mode => (
                  <button key={mode} onClick={() => setMacroMode(mode)}
                    className="px-3 py-1.5 text-xs font-black transition-all"
                    style={{
                      background: macroMode === mode ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                      color: macroMode === mode ? 'var(--bg)' : 'var(--fiq-muted)',
                    }}>
                    {mode === 'auto' ? 'Auto' : 'Manuel'}
                  </button>
                ))}
              </div>
            </div>

            {macroMode === 'auto' ? (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                  Calculé selon ton poids ({weightKg || '?'}kg) et ton objectif ({GOAL_LABEL}).
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Calories', value: autoTargets.calories, unit: 'kcal', color: 'var(--fiq-blue)' },
                    { label: 'Protéines', value: autoTargets.protein_g, unit: 'g', color: 'var(--fiq-accent)' },
                    { label: 'Glucides', value: autoTargets.carbs_g, unit: 'g', color: '#A855F7' },
                    { label: 'Lipides', value: autoTargets.fat_g, unit: 'g', color: 'var(--fiq-orange)' },
                  ].map(({ label, value, unit, color }) => (
                    <div key={label} className="rounded-xl p-3" style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                      <p className="fiq-label mb-1">{label}</p>
                      <p className="text-lg font-black fiq-data" style={{ color }}>
                        {value}<span className="text-xs font-normal ml-1" style={{ color: 'var(--fiq-muted)' }}>{unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                  Définis tes propres objectifs nutritionnels quotidiens (phase sèche, bulk, etc.).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Calories" value={customCalories} onChange={setCustomCalories} min={800} max={6000} unit="kcal" />
                  <NumberField label="Protéines" value={customProtein} onChange={setCustomProtein} min={30} max={400} unit="g" />
                  <NumberField label="Glucides" value={customCarbs} onChange={setCustomCarbs} min={0} max={800} unit="g" />
                  <NumberField label="Lipides" value={customFat} onChange={setCustomFat} min={10} max={300} unit="g" />
                </div>
              </div>
            )}

            <Link
              href={`/coach?q=${encodeURIComponent(coachQ)}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-xs transition-all"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Demander au coach IA
            </Link>
          </div>
        )
      })()}

      {/* Actions compte */}
      <div className="fiq-card space-y-3">
        <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Compte</p>

        <button
          onClick={signOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}>
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" style={{ color: 'var(--fiq-muted)' }} />}
          Se déconnecter
          <ChevronRight className="w-4 h-4 ml-auto" style={{ color: 'var(--fiq-muted)' }} />
        </button>

        {/* Reset données */}
        {resetStep === 0 && (
          <button
            onClick={() => setResetStep(1)}
            className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold"
            style={{ background: '#EF444410', border: '1px solid #EF444430', color: 'var(--fiq-red)' }}>
            <Trash2 className="w-4 h-4" />
            Réinitialiser mes données
          </button>
        )}

        {resetStep === 1 && (
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--fiq-red)' }}>
              ⚠️ Supprimer toutes mes données ?
            </p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
              Séances, bilans, PRs et historique seront effacés définitivement. Cette action est irréversible.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setResetStep(0)}
                className="py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
                Annuler
              </button>
              <button onClick={() => setResetStep(2)}
                className="py-2.5 rounded-xl text-sm font-black"
                style={{ background: 'var(--fiq-red)', color: 'white' }}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {resetStep === 2 && (
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: '#EF444415', border: '1px solid #EF444444' }}>
            <p className="text-sm font-black" style={{ color: 'var(--fiq-red)' }}>
              🚨 Confirmation finale
            </p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
              Clique sur &quot;Supprimer&quot; pour effacer TOUTES tes données. Impossible d&apos;annuler après.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setResetStep(0)}
                className="py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
                Non, garder
              </button>
              <button onClick={resetData} disabled={resetting}
                className="py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-1"
                style={{ background: 'var(--fiq-red)', color: 'white' }}>
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : '🗑️ Supprimer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
