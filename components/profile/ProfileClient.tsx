'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Loader2, LogOut, Trash2, Dumbbell, Flame, BarChart2, ChevronRight, MessageCircle, Info, Crown, Users, Globe, Lock, Camera, X, Download, Share2, Copy, Check } from 'lucide-react'
import type { TDEEBreakdown } from '@/lib/utils/tdee'
import type { Big5PR } from '@/lib/utils/big5'

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
  steps_goal: number | null
  target_weight_kg: number | null
  created_at: string
  include_warmup_in_tonnage?: boolean | null
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

type GymProfile = {
  id: string
  slug: string
  name: string
  tier: string
  logo_emoji: string
}

export function ProfileClient({
  profile, email, stats, big5 = [],
  subscriptionStatus = 'free',
  subscriptionPlan = null,
  hasStripeCustomer = false,
  gymId = null,
  gymProfiles = [],
}: {
  profile: Profile
  email: string
  stats: Stats
  big5?: Big5PR[]
  subscriptionStatus?: string
  subscriptionPlan?: string | null
  hasStripeCustomer?: boolean
  gymId?: string | null
  gymProfiles?: GymProfile[]
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Avatar — initialisé depuis le profil serveur
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (profile as unknown as { avatar_url?: string | null })?.avatar_url ?? null
  )
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const [gymIdState, setGymIdState] = useState<string>(gymId ?? '')

  const [goal, setGoal] = useState(profile?.goal ?? 'general')
  const [level, setLevel] = useState(profile?.level ?? 'beginner')
  const [equipment, setEquipment] = useState(profile?.equipment ?? 'full_gym')
  const [sessionsPerWeek, setSessionsPerWeek] = useState(String(profile?.sessions_per_week ?? 3))
  const [age, setAge] = useState(String(profile?.age ?? ''))
  const [heightCm, setHeightCm] = useState(String(profile?.height_cm ?? ''))
  const [gender, setGender] = useState(profile?.gender ?? '')
  const [weightKg, setWeightKg] = useState(String(profile?.weight_kg ?? ''))
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')

  const [stepsGoal, setStepsGoal] = useState(String(profile?.steps_goal ?? 8000))
  const [targetWeightKg, setTargetWeightKg] = useState(String(profile?.target_weight_kg ?? ''))
  const [includeWarmupInTonnage, setIncludeWarmupInTonnage] = useState(profile?.include_warmup_in_tonnage ?? false)

  const [macroMode, setMacroMode] = useState<'auto' | 'custom'>(profile?.macro_mode === 'custom' ? 'custom' : 'auto')

  // TDEE réel depuis l'API (données steps + tonnage 30 derniers jours)
  const [tdee, setTdee] = useState<TDEEBreakdown | null>(null)
  const [tdeeLoading, setTdeeLoading] = useState(true)
  useEffect(() => {
    fetch('/api/profile/tdee')
      .then(r => r.json())
      .then(({ data }) => { if (data) setTdee(data) })
      .catch(() => {/* silencieux — fallback affiché */})
      .finally(() => setTdeeLoading(false))
  }, [])
  const [customCalories, setCustomCalories] = useState(String(profile?.custom_calories ?? ''))
  const [customProtein, setCustomProtein] = useState(String(profile?.custom_protein_g ?? ''))
  const [customCarbs, setCustomCarbs] = useState(String(profile?.custom_carbs_g ?? ''))
  const [customFat, setCustomFat] = useState(String(profile?.custom_fat_g ?? ''))

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralCount, setReferralCount] = useState(0)
  const [referralMax, setReferralMax] = useState(3)
  const [referralLoading, setReferralLoading] = useState(false)
  const [referralCopied, setReferralCopied] = useState(false)

  // État profil social
  type SocialProfile = {
    username: string | null
    display_name: string | null
    bio: string | null
    is_public: boolean
    followers_count: number
    following_count: number
  }
  const [socialProfile, setSocialProfile] = useState<SocialProfile | null>(null)
  const [socialLoading, setSocialLoading] = useState(true)
  const [socialUsername, setSocialUsername] = useState('')
  const [socialBio, setSocialBio] = useState('')
  const [socialPublic, setSocialPublic] = useState(false)
  const [socialSaving, setSocialSaving] = useState(false)
  const [socialSaved, setSocialSaved] = useState(false)
  const [socialError, setSocialError] = useState<string | null>(null)

  // Charger le profil social au montage
  useEffect(() => {
    fetch('/api/social/profile')
      .then(r => r.json())
      .then(({ data }) => {
        if (data) {
          setSocialProfile(data as SocialProfile)
          setSocialUsername(data.username ?? '')
          setSocialBio(data.bio ?? '')
          setSocialPublic(data.is_public ?? false)
        }
      })
      .catch(() => {/* silencieux */})
      .finally(() => setSocialLoading(false))
  }, [])

  const isPro = subscriptionStatus === 'pro' || subscriptionStatus === 'lifetime'
  const isLifetime = subscriptionStatus === 'lifetime'

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError(null)
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append('avatar', file)
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: form })
      const { data, error } = await res.json()
      if (error) { setAvatarError(error); return }
      setAvatarUrl(data.avatar_url)
      router.refresh()
    } catch {
      setAvatarError('Erreur réseau')
    } finally {
      setAvatarUploading(false)
      // Reset input pour permettre de re-sélectionner le même fichier
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleAvatarDelete() {
    setAvatarError(null)
    setAvatarUploading(true)
    try {
      await fetch('/api/profile/avatar', { method: 'DELETE' })
      setAvatarUrl(null)
      router.refresh()
    } finally {
      setAvatarUploading(false)
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { data, error: err } = await res.json()
      if (data?.url) window.location.href = data.url
      else console.error('Portal error:', err)
    } finally {
      setPortalLoading(false)
    }
  }
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
          steps_goal: Number(stepsGoal) || 8000,
          target_weight_kg: targetWeightKg ? Number(targetWeightKg) : null,
          include_warmup_in_tonnage: includeWarmupInTonnage,
          gym_id: gymIdState || null,
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

  async function loadReferral() {
    if (referralCode) return
    setReferralLoading(true)
    try {
      const res = await fetch('/api/referral')
      const { data } = await res.json()
      if (data) { setReferralCode(data.code); setReferralCount(data.count); setReferralMax(data.max ?? 3) }
    } finally {
      setReferralLoading(false)
    }
  }

  async function copyReferralLink() {
    if (!referralCode) return
    const url = `${window.location.origin}/invite/${referralCode}`
    if (navigator.share) {
      await navigator.share({ title: 'ForgeIQ', text: 'Rejoins-moi sur ForgeIQ 🏋️', url }).catch(() => null)
    } else {
      await navigator.clipboard.writeText(url).catch(() => null)
      setReferralCopied(true)
      setTimeout(() => setReferralCopied(false), 2000)
    }
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

  async function saveSocialProfile() {
    setSocialSaving(true)
    setSocialSaved(false)
    setSocialError(null)
    try {
      const res = await fetch('/api/social/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: socialUsername.trim() || undefined,
          bio: socialBio.trim() || null,
          is_public: socialPublic,
          display_name: displayName || null,
        }),
      })
      const json = await res.json() as { data: unknown; error: string | null }
      if (json.error) {
        setSocialError(json.error)
      } else {
        setSocialSaved(true)
        setSocialProfile(json.data as SocialProfile)
        setTimeout(() => setSocialSaved(false), 3000)
      }
    } catch {
      setSocialError('Erreur réseau')
    } finally {
      setSocialSaving(false)
    }
  }

  const memberSince = profile?.created_at
    ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(profile.created_at))
    : '—'

  return (
    <div className="space-y-5 pb-8">
      {/* Avatar + infos */}
      <div className="fiq-card flex items-center gap-4">
        {/* Avatar cliquable */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-black group"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            {avatarUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--bg)' }} />
            ) : avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill className="object-cover" sizes="64px" />
            ) : (
              <span>{(displayName || email)[0]?.toUpperCase()}</span>
            )}
            {/* Overlay caméra au hover */}
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.45)' }}
            >
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>

          {/* Bouton supprimer (croix) si avatar présent */}
          {avatarUrl && !avatarUploading && (
            <button
              type="button"
              onClick={handleAvatarDelete}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--fiq-red)', border: '2px solid var(--bg)' }}
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          )}

          {/* Input fichier caché */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-black text-lg truncate" style={{ color: 'var(--fiq-text)' }}>
            {displayName || email.split('@')[0]}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--fiq-muted)' }}>{email}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Membre depuis {memberSince}</p>
          {avatarError && (
            <p className="text-xs mt-1" style={{ color: 'var(--fiq-red)' }}>⚠ {avatarError}</p>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs mt-1.5 font-semibold"
            style={{ color: 'var(--fiq-muted)' }}
          >
            {avatarUrl ? 'Changer la photo' : '+ Ajouter une photo'}
          </button>
        </div>
      </div>

      {/* Stats globales */}
      <div>
        <p className="font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>Mes statistiques</p>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Dumbbell className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />}
            label="Séances"
            value={stats.totalSessions}
          />
          <StatCard
            icon={<BarChart2 className="w-5 h-5" style={{ color: 'var(--fiq-blue)' }} />}
            label="Tonnage"
            value={stats.totalTonnageKg > 1000
              ? `${(stats.totalTonnageKg / 1000).toFixed(1)}t`
              : stats.totalTonnageKg}
            unit={stats.totalTonnageKg > 1000 ? undefined : 'kg'}
          />
          <StatCard
            icon={<Flame className="w-5 h-5" style={{ color: 'var(--fiq-orange)' }} />}
            label="Streak"
            value={stats.streak}
            unit="j"
          />
        </div>
      </div>

      {/* Big 5 — Records par mouvement fondamental */}
      {big5.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Mes records — Big 5</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#B4FF4A15', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A30' }}>
              {big5.filter(b => b.value !== null).length}/5
            </span>
          </div>
          <div className="fiq-card divide-y" style={{ borderColor: 'var(--fiq-border)', padding: 0, overflow: 'hidden' }}>
            {big5.map((cat, i) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderColor: 'var(--fiq-border)' }}
              >
                {/* Emoji + barre colorée */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: `${cat.color}18` }}
                >
                  {cat.emoji}
                </div>

                {/* Label + exercice */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide" style={{ color: 'var(--fiq-muted)', letterSpacing: '0.06em' }}>
                    {cat.label}
                  </p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                    {cat.exerciseName ?? cat.sublabel}
                  </p>
                </div>

                {/* Valeur PR */}
                {cat.value !== null ? (
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black fiq-data" style={{ color: cat.color }}>
                      {cat.value}
                      <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--fiq-muted)' }}>kg</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--fiq-muted)' }}>—</p>
                )}
              </div>
            ))}
          </div>
          {big5.every(b => b.value === null) && (
            <p className="text-xs mt-2 px-1" style={{ color: 'var(--fiq-muted)' }}>
              Complète tes premières séances pour voir tes records apparaître ici.
            </p>
          )}
        </div>
      )}

      {/* Abonnement */}
      {isPro ? (
        <div className="fiq-card space-y-3">
          {/* Badge statut Pro */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: isLifetime ? '#A855F720' : '#B4FF4A20' }}>
              <Crown className="w-5 h-5" style={{ color: isLifetime ? '#A855F7' : 'var(--fiq-accent)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>
                  {isLifetime ? 'ForgeIQ Pro — À vie' : 'ForgeIQ Pro'}
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                  style={{
                    background: isLifetime ? '#A855F720' : '#B4FF4A20',
                    color: isLifetime ? '#A855F7' : 'var(--fiq-accent)',
                    border: `1px solid ${isLifetime ? '#A855F744' : '#B4FF4A44'}`,
                  }}>
                  {isLifetime ? '∞ VIE' : subscriptionPlan === 'annual' ? 'ANNUEL' : 'MENSUEL'}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                {isLifetime ? 'Accès permanent — Coach IA illimité' : 'Actif — Coach IA illimité'}
              </p>
            </div>
          </div>

          {/* Bouton gérer (uniquement si customer Stripe, pas lifetime sans subscription) */}
          {hasStripeCustomer && !isLifetime && (
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Gérer mon abonnement
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <Link
          href="/pricing"
          className="fiq-card flex items-center gap-4 transition-all"
          style={{ background: '#B4FF4A10', borderColor: '#B4FF4A40' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#B4FF4A20' }}>
            <Crown className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>Passer à Pro</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>À partir de 4,99€/mois · Coach IA illimité</p>
          </div>
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
        </Link>
      )}

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

        {/* Salle de sport — sélection pour exercices adaptés dans les programmes */}
        {gymProfiles.length > 0 && (
          <div>
            <p className="fiq-label mb-1.5">Ma salle de sport</p>
            <div className="grid grid-cols-1 gap-2">
              {/* Option "Aucune / non configurée" */}
              <button
                type="button"
                onClick={() => setGymIdState('')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
                style={{
                  background: !gymIdState ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                  border: `1px solid ${!gymIdState ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                  color: !gymIdState ? 'var(--bg)' : 'var(--fiq-muted)',
                }}>
                <span className="text-lg">🚫</span>
                <span className="font-semibold">Non configurée</span>
              </button>
              {gymProfiles.map(gym => {
                const isSelected = gymIdState === gym.id
                return (
                  <button
                    key={gym.id}
                    type="button"
                    onClick={() => setGymIdState(gym.id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
                    style={{
                      background: isSelected ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                      border: `1px solid ${isSelected ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                      color: isSelected ? 'var(--bg)' : 'var(--fiq-text)',
                    }}>
                    <span className="text-lg">{gym.logo_emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold">{gym.name}</span>
                      <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                        style={{
                          background: isSelected
                            ? 'rgba(0,0,0,0.15)'
                            : gym.tier === 'premium' ? '#B4FF4A22' : gym.tier === 'home' ? '#3D8BFF22' : 'var(--fiq-faint)',
                          color: isSelected ? 'inherit' : gym.tier === 'premium' ? 'var(--fiq-accent)' : gym.tier === 'home' ? 'var(--fiq-blue)' : 'var(--fiq-muted)',
                        }}>
                        {gym.tier === 'premium' ? 'PREMIUM' : gym.tier === 'home' ? 'DOMICILE' : 'STANDARD'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] mt-2 px-1" style={{ color: 'var(--fiq-muted)' }}>
              Les programmes adaptent leurs exercices selon ton équipement de salle.
            </p>
          </div>
        )}

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
          <NumberField label="Poids actuel" value={weightKg} onChange={setWeightKg} min={30} max={250} unit="kg" />
          <NumberField label="Âge" value={age} onChange={setAge} min={10} max={100} unit="ans" />
          <NumberField label="Taille" value={heightCm} onChange={setHeightCm} min={100} max={250} unit="cm" />
        </div>

        {/* Objectifs corps */}
        <div>
          <p className="fiq-label mb-2">Objectifs physiques</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="fiq-label mb-1.5">Poids cible <span style={{ color: 'var(--fiq-muted)' }}>(kg)</span></p>
              <input
                type="number"
                step="0.5"
                min={30}
                max={250}
                placeholder={weightKg || '70'}
                value={targetWeightKg}
                onChange={e => setTargetWeightKg(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
              />
            </div>
            <div>
              <p className="fiq-label mb-1.5">Objectif pas <span style={{ color: 'var(--fiq-muted)' }}>/jour</span></p>
              <div className="flex gap-1 flex-wrap">
                {[5000, 7500, 8000, 10000, 12000].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStepsGoal(String(n))}
                    className="px-2 py-1.5 rounded-lg text-xs font-black transition-all"
                    style={{
                      background: Number(stepsGoal) === n ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                      color: Number(stepsGoal) === n ? 'var(--bg)' : 'var(--fiq-muted)',
                      border: `1px solid ${Number(stepsGoal) === n ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
                    }}
                  >
                    {(n / 1000).toFixed(n % 1000 === 500 ? 1 : 0)}k
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="500"
                min={1000}
                max={30000}
                value={stepsGoal}
                onChange={e => setStepsGoal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none mt-2"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
              />
            </div>
          </div>
          {/* Toggle séries échauffement dans le tonnage */}
          <div className="flex items-center justify-between py-2">
            <div className="flex-1 pr-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Séries échauffement dans le tonnage</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Inclure les séries W dans le volume total calculé</p>
            </div>
            <button
              type="button"
              onClick={() => setIncludeWarmupInTonnage(v => !v)}
              className="relative flex-shrink-0 w-12 h-6 rounded-full transition-colors"
              style={{
                background: includeWarmupInTonnage ? 'var(--fiq-accent)' : 'var(--fiq-border)',
              }}
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full transition-transform"
                style={{
                  left: includeWarmupInTonnage ? '28px' : '4px',
                  background: includeWarmupInTonnage ? 'var(--bg)' : 'var(--fiq-muted)',
                }}
              />
            </button>
          </div>

          {/* Aperçu poids cible */}
          {targetWeightKg && weightKg && Number(targetWeightKg) !== Number(weightKg) && (
            <div className="mt-2 px-3 py-2 rounded-xl flex items-center gap-2"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
              <span className="text-lg">{Number(targetWeightKg) < Number(weightKg) ? '📉' : '📈'}</span>
              <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
                {Number(targetWeightKg) < Number(weightKg) ? 'Perte' : 'Prise'} de{' '}
                <strong style={{ color: 'var(--fiq-accent)' }}>
                  {Math.abs(Number(weightKg) - Number(targetWeightKg)).toFixed(1)} kg
                </strong>{' '}
                à atteindre
              </span>
            </div>
          )}
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
        const GOAL_LABEL = GOAL_OPTIONS.find(o => o.value === goal)?.label ?? goal

        // Macros actives (TDEE API si auto, sinon custom)
        const activeMacros = macroMode === 'custom' && (customProtein || customCalories)
          ? {
              calories: Number(customCalories) || tdee?.macros.calories || 2000,
              protein_g: Number(customProtein) || tdee?.macros.protein_g || 150,
              carbs_g: Number(customCarbs) || tdee?.macros.carbs_g || 200,
              fat_g: Number(customFat) || tdee?.macros.fat_g || 70,
            }
          : tdee?.macros

        const coachQ = macroMode === 'custom' && (customProtein || customCalories)
          ? `Mes macros en mode personnalisé : ${customCalories || '?'}kcal, ${customProtein || '?'}g protéines, ${customCarbs || '?'}g glucides, ${customFat || '?'}g lipides. Cohérent avec mon objectif "${GOAL_LABEL}" ?`
          : tdee
            ? `Mon TDEE calculé est ${tdee.tdee}kcal (BMR ${tdee.bmr} + steps ${tdee.stepsCalories} + training ${tdee.trainingCalories}). Objectif ${GOAL_LABEL}, cible ${tdee.targetCalories}kcal. Est-ce adapté à mon profil ?`
            : `Mon objectif est "${GOAL_LABEL}". Est-ce que mes macros auto sont adaptées ?`

        return (
          <div className="fiq-card space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Objectifs nutritionnels</p>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--fiq-border)' }}>
                {(['auto', 'custom'] as const).map(mode => (
                  <button key={mode} onClick={() => setMacroMode(mode)}
                    className="px-3 py-1.5 text-xs font-black transition-all"
                    style={{
                      background: macroMode === mode ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                      color: macroMode === mode ? 'var(--bg)' : 'var(--fiq-muted)',
                    }}>
                    {mode === 'auto' ? 'Auto IA' : 'Manuel'}
                  </button>
                ))}
              </div>
            </div>

            {macroMode === 'auto' ? (
              <div className="space-y-4">

                {/* Breakdown TDEE détaillé */}
                {tdeeLoading ? (
                  <div className="flex items-center gap-2 py-3">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Calcul depuis tes données…</span>
                  </div>
                ) : tdee ? (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--fiq-border)' }}>
                    {/* En-tête */}
                    <div className="px-3 py-2 flex items-center gap-2"
                      style={{ background: 'var(--fiq-faint)', borderBottom: '1px solid var(--fiq-border)' }}>
                      <Info className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fiq-blue)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--fiq-muted)' }}>
                        {tdee.hasEnoughData
                          ? `Calculé depuis tes données réelles (${tdee.logsCount} jours)`
                          : `Estimé — continue ton bilan pour affiner (${tdee.logsCount}/7 jours)`
                        }
                      </span>
                    </div>

                    {/* Lignes calcul */}
                    <div className="divide-y" style={{ borderColor: 'var(--fiq-border)' }}>
                      {[
                        { label: 'BMR (Mifflin-St Jeor)', value: tdee.bmr, unit: 'kcal', color: 'var(--fiq-text)', sub: `${profile?.gender === 'female' ? 'Femme' : 'Homme'} · ${weightKg || '?'}kg · ${profile?.height_cm || '?'}cm · ${profile?.age || '?'}ans` },
                        ...(tdee.hasEnoughData ? [{ label: `Steps moyens (${tdee.logsCount}j)`, value: `+${tdee.stepsCalories}`, unit: 'kcal/j', color: 'var(--fiq-blue)', sub: `${tdee.avgStepsPerDay.toLocaleString('fr-FR')} pas × 0.04` }] : []),
                        { label: 'Entraînement moyen', value: `+${tdee.trainingCalories}`, unit: 'kcal/j', color: 'var(--fiq-blue)', sub: `${profile?.sessions_per_week || 3}j/semaine` },
                        { label: 'TDEE estimé', value: tdee.tdee, unit: 'kcal/j', color: 'var(--fiq-accent)', sub: 'Total dépenses journalières', bold: true },
                        {
                          label: `Ajustement ${GOAL_LABEL}`,
                          value: tdee.adjustment >= 0 ? `+${tdee.adjustment}` : tdee.adjustment,
                          unit: 'kcal',
                          color: tdee.adjustment < 0 ? 'var(--fiq-orange)' : '#A855F7',
                          sub: tdee.adjustment < 0 ? 'Déficit modéré — préserve la masse musculaire' : tdee.adjustment > 0 ? 'Surplus contrôlé — favorise la prise de masse' : 'Maintien',
                        },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2.5">
                          <div>
                            <p className="text-xs font-semibold" style={{ color: row.bold ? 'var(--fiq-text)' : 'var(--fiq-muted)' }}>{row.label}</p>
                            {row.sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{row.sub}</p>}
                          </div>
                          <p className="text-sm font-black fiq-data shrink-0 ml-2" style={{ color: row.color }}>
                            {row.value}<span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--fiq-muted)' }}>{row.unit}</span>
                          </p>
                        </div>
                      ))}

                      {/* Total cible */}
                      <div className="flex items-center justify-between px-3 py-3"
                        style={{ background: '#B4FF4A10' }}>
                        <p className="text-sm font-black" style={{ color: 'var(--fiq-accent)' }}>🎯 Cible journalière</p>
                        <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                          {tdee.targetCalories.toLocaleString('fr-FR')}<span className="text-xs font-normal ml-1" style={{ color: 'var(--fiq-muted)' }}>kcal</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs px-1" style={{ color: 'var(--fiq-muted)' }}>
                    Impossible de calculer le TDEE. Vérifie que ton profil (poids, taille, âge) est renseigné.
                  </p>
                )}

                {/* Macros résultantes */}
                {activeMacros && (
                  <div>
                    <p className="fiq-label mb-2">Répartition macros cibles</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Calories', value: activeMacros.calories, unit: 'kcal', color: 'var(--fiq-blue)' },
                        { label: 'Protéines', value: activeMacros.protein_g, unit: 'g', color: 'var(--fiq-accent)' },
                        { label: 'Glucides', value: activeMacros.carbs_g, unit: 'g', color: '#A855F7' },
                        { label: 'Lipides', value: activeMacros.fat_g, unit: 'g', color: 'var(--fiq-orange)' },
                      ].map(({ label, value, unit, color }) => (
                        <div key={label} className="rounded-xl p-3" style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                          <p className="fiq-label mb-1">{label}</p>
                          <p className="text-lg font-black fiq-data" style={{ color }}>
                            {value.toLocaleString('fr-FR')}<span className="text-xs font-normal ml-1" style={{ color: 'var(--fiq-muted)' }}>{unit}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] mt-2 px-1" style={{ color: 'var(--fiq-muted)' }}>
                      Priorité : 2.2g prot./kg · 1g lip./kg minimum · glucides en résidu
                    </p>
                  </div>
                )}
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

      {/* Profil social */}
      <div className="fiq-card space-y-4">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
          <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Profil social</p>
        </div>

        {socialLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Chargement…</span>
          </div>
        ) : (
          <>
            {/* Toggle profil public */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 pr-3">
                {socialPublic
                  ? <Globe className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-blue)' }} />
                  : <Lock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-muted)' }} />
                }
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>
                    {socialPublic ? 'Profil public' : 'Profil privé'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>
                    {socialPublic ? 'Tes séances peuvent être vues par la communauté' : 'Seul toi vois tes séances'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSocialPublic(v => !v)}
                className="relative flex-shrink-0 w-12 h-6 rounded-full transition-colors"
                style={{ background: socialPublic ? 'var(--fiq-blue)' : 'var(--fiq-border)' }}
              >
                <span
                  className="absolute top-1 w-4 h-4 rounded-full transition-transform"
                  style={{
                    left: socialPublic ? '28px' : '4px',
                    background: socialPublic ? 'white' : 'var(--fiq-muted)',
                  }}
                />
              </button>
            </div>

            {/* Username */}
            <div>
              <p className="fiq-label mb-1.5">Username public</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--fiq-muted)' }}>@</span>
                <input
                  type="text"
                  value={socialUsername}
                  onChange={(e) => {
                    setSocialUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    setSocialError(null)
                  }}
                  placeholder="ton_username"
                  maxLength={20}
                  className="w-full pl-7 pr-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--fiq-faint)', border: `1px solid ${socialError ? 'var(--fiq-red)' : 'var(--fiq-border)'}`, color: 'var(--fiq-text)' }}
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--fiq-muted)' }}>3-20 caractères · lettres minuscules, chiffres, _</p>
            </div>

            {/* Bio */}
            <div>
              <p className="fiq-label mb-1.5">Bio (optionnelle)</p>
              <textarea
                value={socialBio}
                onChange={(e) => setSocialBio(e.target.value)}
                placeholder="Parle de toi en quelques mots..."
                rows={2}
                maxLength={160}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)', resize: 'none' }}
              />
            </div>

            {socialError && (
              <p className="text-xs" style={{ color: 'var(--fiq-red)' }}>{socialError}</p>
            )}

            <button
              onClick={saveSocialProfile}
              disabled={socialSaving}
              className="w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2"
              style={{
                background: socialSaved ? '#3D8BFF33' : 'var(--fiq-blue)',
                color: socialSaved ? 'var(--fiq-blue)' : 'white',
                border: socialSaved ? '1px solid var(--fiq-blue)' : 'none',
              }}
            >
              {socialSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : socialSaved ? '✓ Profil mis à jour !' : 'Sauvegarder le profil social'}
            </button>

            {/* Lien vers profil public */}
            {socialProfile?.username && socialProfile.is_public && (
              <Link
                href={`/u/${socialProfile.username}`}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl text-sm"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
              >
                <span>Voir mon profil public</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}

            {/* Stats followers */}
            {socialProfile && (socialProfile.followers_count > 0 || socialProfile.following_count > 0) && (
              <div className="flex gap-4 pt-1">
                <div>
                  <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>{socialProfile.followers_count}</p>
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>abonnés</p>
                </div>
                <div>
                  <p className="text-lg font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>{socialProfile.following_count}</p>
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>abonnements</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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

        {/* Inviter un ami */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--fiq-border)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--fiq-faint)' }}>
            <div>
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--fiq-muted)' }}>
                <Users className="w-3 h-3 inline mr-1.5" />
                Inviter des amis
              </p>
            </div>
            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: '#B4FF4A22', color: 'var(--fiq-accent)' }}>
              {referralCode ? `${referralCount}/${referralMax} mois` : '+1 mois/ami'}
            </span>
          </div>
          <div className="p-4 space-y-3" style={{ background: 'var(--fiq-card)' }}>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: '#B4FF4A12', border: '1px solid #B4FF4A33' }}
            >
              <p className="text-xs font-black" style={{ color: 'var(--fiq-accent)' }}>🎁 Pour toi</p>
              <p className="text-sm font-black mt-0.5" style={{ color: 'var(--fiq-text)' }}>+1 mois Pro par ami invité</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>Ton ami reçoit 14 jours Pro · Max {referralMax} mois pour toi</p>
            </div>
            {referralCode ? (
              <div className="space-y-2">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono"
                  style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-text)' }}
                >
                  <span className="flex-1 truncate">{typeof window !== 'undefined' ? `${window.location.origin}/invite/${referralCode}` : `/invite/${referralCode}`}</span>
                </div>
                <button
                  onClick={copyReferralLink}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all active:scale-95"
                  style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
                >
                  {referralCopied
                    ? <><Check className="w-4 h-4" />Copié !</>
                    : <><Share2 className="w-4 h-4" />Partager mon lien</>
                  }
                </button>
              </div>
            ) : (
              <button
                onClick={loadReferral}
                disabled={referralLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all active:scale-95"
                style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
              >
                {referralLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Copy className="w-4 h-4" />Générer mon lien d&apos;invitation</>}
              </button>
            )}
          </div>
        </div>

        {/* Export données (RGPD) */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--fiq-border)' }}>
          <div className="px-4 py-3" style={{ background: 'var(--fiq-faint)' }}>
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--fiq-muted)' }}>
              <Download className="w-3 h-3 inline mr-1.5" />
              Exporter mes données
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--fiq-border)' }}>
            {([
              ['workouts',  '🏋️ Séances',      'CSV de tes séances et tonnages'],
              ['checkins',  '📊 Bilans quotidiens', 'Poids, sommeil, fatigue…'],
              ['nutrition', '🥗 Nutrition',     'Journal alimentaire complet'],
            ] as const).map(([type, label, sub]) => (
              <a
                key={type}
                href={`/api/export?type=${type}`}
                download
                className="flex items-center gap-3 px-4 py-3 text-sm"
                style={{ background: 'var(--fiq-card)', color: 'var(--fiq-text)', textDecoration: 'none' }}
              >
                <div className="flex-1">
                  <p className="font-semibold">{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{sub}</p>
                </div>
                <Download className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-muted)' }} />
              </a>
            ))}
          </div>
        </div>

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
