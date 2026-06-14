'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, ChevronRight, ChevronLeft, Check, Globe, Lock } from 'lucide-react'

const TOTAL_STEPS = 7

type OnboardingData = {
  display_name: string
  is_public: boolean
  goal: string
  gender: string
  weight_kg: number | undefined
  level: string
  equipment: string
  gym_id: string | undefined
  sessions_per_week: number
  program_slug: string
}

// ── Programmes recommandés selon profil ──────────────────────────────────────
function getRecommendedPrograms(data: Partial<OnboardingData>) {
  const isFemale = data.gender === 'female'
  const programs: { slug: string; name: string; description: string; sessions: number }[] = []

  if (isFemale) {
    if (data.level === 'beginner') {
      if (data.equipment === 'bodyweight' || data.equipment === 'home_basic') {
        programs.push({ slug: 'full-body-femme-debutante', name: 'Full Body Femme Débutante', description: 'Corps complet au poids du corps et haltères.', sessions: 3 })
      }
      programs.push({ slug: 'galbe-fessiers', name: 'Galbe & Fessiers', description: 'Fessiers, jambes et corps complet. Programme féminin phare, 3×/semaine.', sessions: 3 })
      if (data.goal === 'general') {
        programs.push({ slug: 'mobilite-bien-etre', name: 'Mobilité & Bien-être', description: 'Yoga, pilates et renforcement doux.', sessions: 3 })
      }
    } else if (data.level === 'intermediate') {
      if (data.goal === 'weight_loss' || data.goal === 'general') {
        programs.push({ slug: 'tonification-seche-femme', name: 'Tonification & Sèche', description: 'Sculpter et affiner. Combine musculation et cardio.', sessions: 4 })
      }
      if (data.goal === 'strength' || data.goal === 'muscle_gain') {
        programs.push({ slug: 'strong-woman', name: 'Strong Woman', description: 'Force et puissance au féminin. Squat, deadlift, press.', sessions: 4 })
      }
      programs.push({ slug: 'galbe-fessiers', name: 'Galbe & Fessiers', description: 'Développement des fessiers, galbe global.', sessions: 3 })
    } else if (data.level === 'advanced') {
      programs.push({ slug: 'strong-woman', name: 'Strong Woman', description: 'Force et puissance au féminin.', sessions: 4 })
      programs.push({ slug: 'tonification-seche-femme', name: 'Tonification & Sèche', description: 'Volume élevé, cardio intégré.', sessions: 4 })
    }
  } else {
    if (data.level === 'beginner') {
      if (data.equipment === 'bodyweight') {
        programs.push({ slug: 'bodyweight-beginner', name: 'Bodyweight Débutant', description: 'Pompes, tractions, squats. Idéal à la maison.', sessions: 3 })
      }
      programs.push({ slug: 'full-body-3x', name: 'Full Body 3×/semaine', description: 'Apprendre les mouvements de base.', sessions: 3 })
      programs.push({ slug: 'starting-strength', name: 'Starting Strength', description: 'Force fondamentale : squat, deadlift, bench.', sessions: 3 })
    } else if (data.level === 'intermediate') {
      if (data.equipment === 'home_basic' || data.equipment === 'home_advanced') {
        programs.push({ slug: 'home-dumbbell', name: 'Home Dumbbell Program', description: 'Programme complet avec haltères uniquement.', sessions: 4 })
      }
      if ((data.sessions_per_week ?? 4) >= 6) {
        programs.push({ slug: 'ppl-6x', name: 'PPL 6×/semaine', description: 'Push Pull Legs ×2. Volume élevé.', sessions: 6 })
      }
      if (data.goal === 'strength') {
        programs.push({ slug: 'phul', name: 'PHUL — Power Hypertrophy', description: 'Force + volume simultanément.', sessions: 4 })
      }
      programs.push({ slug: 'upper-lower-4x', name: 'Upper/Lower 4×/semaine', description: 'Haut/bas en alternance.', sessions: 4 })
      programs.push({ slug: 'ppl-3x', name: 'PPL 3×/semaine', description: 'Push Pull Legs compact.', sessions: 3 })
    } else if (data.level === 'advanced') {
      if (data.goal === 'strength') {
        programs.push({ slug: 'strength-powerlifting', name: 'Force — Powerlifting', description: 'Squat, Bench, Deadlift.', sessions: 4 })
      }
      if (data.goal === 'muscle_gain') {
        programs.push({ slug: 'arnolds-split', name: 'Arnold Split', description: 'Poitrine+Dos / Épaules+Bras / Jambes ×2.', sessions: 6 })
        programs.push({ slug: 'bro-split-5x', name: 'Bro Split 5×/semaine', description: 'Un muscle par jour.', sessions: 5 })
      }
      programs.push({ slug: 'ppl-6x', name: 'PPL 6×/semaine', description: 'Push Pull Legs ×2. Volume élevé.', sessions: 6 })
    }
    if (data.goal === 'weight_loss') {
      programs.push({ slug: 'cut-cardio', name: 'Sèche — Cardio + Muscu', description: 'Maintien musculaire + cardio LISS.', sessions: 5 })
    }
  }

  programs.push({ slug: 'custom', name: 'Programme Personnalisé', description: 'Crée ton propre programme sur mesure.', sessions: 0 })
  return programs.slice(0, 3)
}

// ── génère un username propre depuis un display_name ──────────────────────────
function toUsername(name: string): string {
  const base = name.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip combining diacriticals
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 20)
  // Garantir 3 chars minimum (requis par USERNAME_REGEX côté API)
  if (base.length === 0) return 'user'
  if (base.length === 1) return base + '00'
  if (base.length === 2) return base + '0'
  return base
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<OnboardingData>>({ is_public: true })
  const [loading, setLoading] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Pré-remplir display_name depuis auth metadata (défini à l'inscription)
  useEffect(() => {
    async function prefill() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Vérifier si l'onboarding est déjà fait
      const { data: profile } = await supabase
        .from('profiles').select('onboarding_done, display_name').eq('id', user.id).maybeSingle()
      if (profile?.onboarding_done) { router.replace('/dashboard'); return }

      // Pré-remplir display_name depuis le profil ou les metadata
      const existing = profile?.display_name || user.user_metadata?.display_name || ''
      if (existing) setData(prev => ({ ...prev, display_name: existing }))
    }
    prefill()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  function next() { if (step < TOTAL_STEPS) setStep((s) => s + 1) }
  function back() { if (step > 1) setStep((s) => s - 1) }

  async function finish() {
    setFinishError(null)
    const programs = getRecommendedPrograms(data)
    const slug = data.program_slug ?? programs[0]?.slug

    setLoading(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/login'); return }

      let programId: string | null = null
      if (slug && slug !== 'custom') {
        const { data: program } = await supabase
          .from('programs').select('id').eq('slug', slug).maybeSingle()
        programId = program?.id ?? null
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name:      data.display_name?.trim() || null,
          goal:              data.goal ?? 'general',
          gender:            data.gender ?? null,
          weight_kg:         data.weight_kg ?? null,
          level:             data.level ?? 'beginner',
          equipment:         data.equipment ?? 'full_gym',
          gym_id:            data.gym_id ?? null,
          sessions_per_week: data.sessions_per_week ?? 3,
          current_program_id: programId,
          onboarding_done:   true,
          updated_at:        new Date().toISOString(),
        }, { onConflict: 'id' })

      if (error) {
        setFinishError('Une erreur est survenue. Réessaie.')
        return
      }

      // Créer le profil social en fire-and-forget
      const displayName = data.display_name?.trim() || ''
      fetch('/api/social/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName || null,
          username:     displayName ? toUsername(displayName) : undefined,
          is_public:    data.is_public ?? true,
        }),
      }).catch(() => null)

      fetch('/api/auth/welcome', { method: 'POST' }).catch(() => {})
      router.push('/dashboard')
    } catch {
      setFinishError('Une erreur est survenue. Vérifie ta connexion et réessaie.')
    } finally {
      setLoading(false)
    }
  }

  const progressPercent = (step / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen flex flex-col p-6" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-2xl">⚗️</span>
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="fiq-label">Étape {step}/{TOTAL_STEPS}</span>
            <span className="fiq-label">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {step === 1 && (
          <StepIdentite
            displayName={data.display_name ?? ''}
            isPublic={data.is_public ?? true}
            onDisplayName={(v) => update('display_name', v)}
            onIsPublic={(v) => update('is_public', v)}
            onNext={next}
          />
        )}
        {step === 2 && (
          <StepGoal value={data.goal} onSelect={(v) => { update('goal', v); next() }} />
        )}
        {step === 3 && (
          <StepBio
            gender={data.gender}
            weight={data.weight_kg}
            onGender={(v) => update('gender', v)}
            onWeight={(v) => update('weight_kg', v)}
            onNext={next}
          />
        )}
        {step === 4 && (
          <StepLevel value={data.level} onSelect={(v) => { update('level', v); next() }} />
        )}
        {step === 5 && (
          <StepEquipment
            value={data.equipment}
            gymId={data.gym_id}
            onSelect={(v) => update('equipment', v)}
            onGymId={(v) => update('gym_id', v)}
            onNext={next}
          />
        )}
        {step === 6 && (
          <StepSessions value={data.sessions_per_week} onSelect={(v) => { update('sessions_per_week', v); next() }} />
        )}
        {step === 7 && (
          <StepProgram
            data={data}
            value={data.program_slug}
            onSelect={(v) => update('program_slug', v)}
            onFinish={finish}
            loading={loading}
            error={finishError}
          />
        )}
      </div>

      {/* Navigation */}
      {step > 1 && step <= TOTAL_STEPS && (
        <div className="flex justify-start mt-6">
          <Button variant="ghost" onClick={back} style={{ color: 'var(--fiq-muted)' }}>
            <ChevronLeft className="w-4 h-4 mr-1" />Retour
          </Button>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   ÉTAPE 1 — Identité
   ============================================================ */
function StepIdentite({
  displayName, isPublic, onDisplayName, onIsPublic, onNext,
}: {
  displayName: string
  isPublic: boolean
  onDisplayName: (v: string) => void
  onIsPublic: (v: boolean) => void
  onNext: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl fiq-display mb-2" style={{ color: 'var(--fiq-text)' }}>
          Comment tu t&apos;appelles ?
        </h2>
        <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
          Ce nom apparaîtra dans ton profil et dans l&apos;appli.
        </p>
      </div>

      {/* Champ nom / pseudo */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Ex: Michel, MikeLifts, Coach_M…"
          value={displayName}
          onChange={(e) => onDisplayName(e.target.value)}
          maxLength={32}
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-base outline-none"
          style={{
            background: 'var(--fiq-faint)',
            border: `2px solid ${displayName.trim() ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
            color: 'var(--fiq-text)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        />
        <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          Prénom, surnom ou pseudo — pas de règles.
        </p>
      </div>

      {/* Visibilité profil */}
      <div className="space-y-3">
        <p className="fiq-label">Visibilité du profil</p>
        <div className="space-y-2">
          {[
            {
              value: true,
              icon: <Globe className="w-5 h-5" />,
              label: 'Profil public',
              sub: 'Visible dans le classement et la recherche sociale',
              color: 'var(--fiq-accent)',
            },
            {
              value: false,
              icon: <Lock className="w-5 h-5" />,
              label: 'Profil privé',
              sub: 'Seulement toi et tes données — aucun partage social',
              color: 'var(--fiq-muted)',
            },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => onIsPublic(opt.value)}
              className="w-full fiq-card flex items-center gap-4 text-left transition-all"
              style={{
                borderColor: isPublic === opt.value ? opt.color : 'var(--fiq-border)',
                background: isPublic === opt.value ? opt.color + '12' : 'var(--fiq-card)',
              }}
            >
              <div style={{ color: isPublic === opt.value ? opt.color : 'var(--fiq-muted)' }}>
                {opt.icon}
              </div>
              <div className="flex-1">
                <div className="font-semibold" style={{ color: 'var(--fiq-text)' }}>{opt.label}</div>
                <div className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{opt.sub}</div>
              </div>
              {isPublic === opt.value && (
                <Check className="w-4 h-4 flex-shrink-0" style={{ color: opt.color }} />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
          Tu pourras changer ça à tout moment dans ton profil.
        </p>
      </div>

      <Button
        className="w-full font-black text-base py-5"
        onClick={onNext}
        disabled={!displayName.trim()}
        style={{
          background: displayName.trim() ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
          color: displayName.trim() ? 'var(--bg)' : 'var(--fiq-muted)',
          border: displayName.trim() ? 'none' : '1px solid var(--fiq-border)',
        }}
      >
        Continuer <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  )
}

/* ============================================================
   ÉTAPE 2 — Objectif
   ============================================================ */
function StepGoal({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const options = [
    { value: 'weight_loss', emoji: '🔥', label: 'Perdre du gras', sub: 'Déficit calorique + préserver le muscle' },
    { value: 'muscle_gain', emoji: '💪', label: 'Prendre du muscle', sub: 'Hypertrophie et prise de masse' },
    { value: 'strength', emoji: '🏋️', label: 'Gagner en force', sub: 'Progresser sur les mouvements de base' },
    { value: 'endurance', emoji: '🏃', label: 'Améliorer l\'endurance', sub: 'Cardio, souffle, récupération' },
    { value: 'general', emoji: '⚡', label: 'Forme générale', sub: 'Rester actif et en bonne santé' },
  ]
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl fiq-display mb-2" style={{ color: 'var(--fiq-text)' }}>Quel est ton objectif ?</h2>
        <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>ForgeIQ adaptera tes recommandations en conséquence.</p>
      </div>
      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="w-full fiq-card flex items-center gap-4 text-left transition-all"
            style={{ borderColor: value === opt.value ? 'var(--fiq-accent)' : 'var(--fiq-border)', background: value === opt.value ? '#B4FF4A12' : 'var(--fiq-card)' }}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <div>
              <div className="font-semibold" style={{ color: 'var(--fiq-text)' }}>{opt.label}</div>
              <div className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{opt.sub}</div>
            </div>
            {value === opt.value && <Check className="ml-auto w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   ÉTAPE 3 — Genre + Poids
   ============================================================ */
function StepBio({ gender, weight, onGender, onWeight, onNext }: {
  gender?: string; weight?: number
  onGender: (v: string) => void; onWeight: (v: number) => void; onNext: () => void
}) {
  const [localWeight, setLocalWeight] = useState(weight ? String(weight) : '')
  const genderOptions = [
    { value: 'male', emoji: '♂️', label: 'Homme' },
    { value: 'female', emoji: '♀️', label: 'Femme' },
    { value: 'other', emoji: '⚡', label: 'Non précisé' },
  ]
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl fiq-display mb-2" style={{ color: 'var(--fiq-text)' }}>Quelques infos rapides</h2>
        <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Pour calibrer tes objectifs et choisir les meilleurs programmes.</p>
      </div>
      <div className="space-y-2">
        <p className="fiq-label">Genre</p>
        <div className="space-y-2">
          {genderOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onGender(opt.value)}
              className="w-full fiq-card flex items-center gap-4 text-left transition-all"
              style={{ borderColor: gender === opt.value ? 'var(--fiq-accent)' : 'var(--fiq-border)', background: gender === opt.value ? '#B4FF4A12' : 'var(--fiq-card)' }}
            >
              <span className="text-xl">{opt.emoji}</span>
              <span className="font-semibold" style={{ color: 'var(--fiq-text)' }}>{opt.label}</span>
              {gender === opt.value && <Check className="ml-auto w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="fiq-label">Poids actuel</p>
          <span className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Optionnel</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" step="0.5" placeholder="70" value={localWeight}
            onChange={(e) => { setLocalWeight(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n) && n > 30 && n < 250) onWeight(n) }}
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
          />
          <span className="text-sm font-bold" style={{ color: 'var(--fiq-muted)' }}>kg</span>
        </div>
      </div>
      <Button className="w-full font-black text-base py-5" onClick={onNext} disabled={!gender}
        style={{ background: gender ? 'var(--fiq-accent)' : 'var(--fiq-faint)', color: gender ? 'var(--bg)' : 'var(--fiq-muted)', border: gender ? 'none' : '1px solid var(--fiq-border)' }}>
        Continuer <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  )
}

/* ============================================================
   ÉTAPE 4 — Niveau
   ============================================================ */
function StepLevel({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const options = [
    { value: 'beginner', emoji: '🌱', label: 'Débutant', sub: 'Moins de 6 mois d\'entraînement' },
    { value: 'intermediate', emoji: '📈', label: 'Intermédiaire', sub: 'De 6 mois à 2 ans d\'expérience' },
    { value: 'advanced', emoji: '🔥', label: 'Avancé', sub: 'Plus de 2 ans d\'entraînement régulier' },
  ]
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl fiq-display mb-2" style={{ color: 'var(--fiq-text)' }}>Quel est ton niveau ?</h2>
        <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Sois honnête — ça permettra de te proposer les bons programmes.</p>
      </div>
      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="w-full fiq-card flex items-center gap-4 text-left transition-all"
            style={{ borderColor: value === opt.value ? 'var(--fiq-accent)' : 'var(--fiq-border)', background: value === opt.value ? '#B4FF4A12' : 'var(--fiq-card)' }}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <div>
              <div className="font-semibold" style={{ color: 'var(--fiq-text)' }}>{opt.label}</div>
              <div className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{opt.sub}</div>
            </div>
            {value === opt.value && <Check className="ml-auto w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   ÉTAPE 5 — Équipement + Salle (si full_gym)
   ============================================================ */
type GymRow = { id: string; name: string; logo_emoji: string | null; tier: string }

function StepEquipment({
  value, gymId, onSelect, onGymId, onNext,
}: {
  value?: string
  gymId?: string
  onSelect: (v: string) => void
  onGymId: (v: string | undefined) => void
  onNext: () => void
}) {
  const supabase = createClient()
  const [gyms, setGyms] = useState<GymRow[]>([])
  const [gymsLoading, setGymsLoading] = useState(false)

  const equipOptions = [
    { value: 'full_gym', emoji: '🏋️', label: 'Salle complète', sub: 'Barres, haltères, machines, câbles' },
    { value: 'home_advanced', emoji: '🏠', label: 'Home gym avancé', sub: 'Barre + haltères + station de traction' },
    { value: 'home_basic', emoji: '🏃', label: 'Home gym basique', sub: 'Haltères ajustables ou fixes' },
    { value: 'bodyweight', emoji: '✊', label: 'Poids du corps', sub: 'Aucun équipement nécessaire' },
  ]

  // Charger les salles populaires quand full_gym est sélectionné
  useEffect(() => {
    if (value !== 'full_gym' || gyms.length > 0) return
    setGymsLoading(true)
    ;(async () => {
      try {
        const { data } = await supabase
          .from('gym_equipment_profiles')
          .select('id, name, logo_emoji, tier')
          .order('name')
          .limit(20)
        setGyms((data ?? []) as GymRow[])
      } catch {
        // silencieux
      } finally {
        setGymsLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Chains connues à prioriser (dans l'ordre souhaité)
  const PRIORITY_CHAINS = ['Basic-Fit', 'Fitness Park', 'On Air', 'Keep Cool', 'Neoness', 'L\'Appart Fitness', 'Moving']
  const sortedGyms = [
    ...PRIORITY_CHAINS.map(name => gyms.find(g => g.name.toLowerCase().includes(name.toLowerCase()))).filter(Boolean) as GymRow[],
    ...gyms.filter(g => !PRIORITY_CHAINS.some(n => g.name.toLowerCase().includes(n.toLowerCase()))),
  ]

  const canContinue = !!value

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl fiq-display mb-2" style={{ color: 'var(--fiq-text)' }}>Quel équipement as-tu ?</h2>
        <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Tes programmes et exercices seront adaptés.</p>
      </div>

      <div className="space-y-3">
        {equipOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { onSelect(opt.value); if (opt.value !== 'full_gym') onGymId(undefined) }}
            className="w-full fiq-card flex items-center gap-4 text-left transition-all"
            style={{ borderColor: value === opt.value ? 'var(--fiq-accent)' : 'var(--fiq-border)', background: value === opt.value ? '#B4FF4A12' : 'var(--fiq-card)' }}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <div>
              <div className="font-semibold" style={{ color: 'var(--fiq-text)' }}>{opt.label}</div>
              <div className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{opt.sub}</div>
            </div>
            {value === opt.value && <Check className="ml-auto w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />}
          </button>
        ))}
      </div>

      {/* Sélecteur de chaîne de salle */}
      {value === 'full_gym' && (
        <div className="space-y-3">
          <p className="fiq-label">Ta salle de sport</p>
          {gymsLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Chargement…</span>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedGyms.map((gym) => (
                <button
                  key={gym.id}
                  onClick={() => onGymId(gymId === gym.id ? undefined : gym.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: gymId === gym.id ? '#3D8BFF18' : 'var(--fiq-faint)',
                    border: `1px solid ${gymId === gym.id ? '#3D8BFF66' : 'var(--fiq-border)'}`,
                  }}
                >
                  <span className="text-xl">{gym.logo_emoji ?? '🏋️'}</span>
                  <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>{gym.name}</span>
                  {gymId === gym.id && <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-blue)' }} />}
                </button>
              ))}
              {/* Option "Autre" */}
              <button
                onClick={() => onGymId(undefined)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  background: !gymId ? '#3D8BFF18' : 'var(--fiq-faint)',
                  border: `1px solid ${!gymId ? '#3D8BFF66' : 'var(--fiq-border)'}`,
                }}
              >
                <span className="text-xl">🏋️</span>
                <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Autre salle / Pas de salle spécifique</span>
                {!gymId && <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-blue)' }} />}
              </button>
            </div>
          )}
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            Ta salle permet d&apos;adapter les exercices aux machines disponibles.
          </p>
        </div>
      )}

      <Button
        className="w-full font-black text-base py-5"
        onClick={onNext}
        disabled={!canContinue}
        style={{
          background: canContinue ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
          color: canContinue ? 'var(--bg)' : 'var(--fiq-muted)',
          border: canContinue ? 'none' : '1px solid var(--fiq-border)',
        }}
      >
        Continuer <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  )
}

/* ============================================================
   ÉTAPE 6 — Disponibilité
   ============================================================ */
function StepSessions({ value, onSelect }: { value?: number; onSelect: (v: number) => void }) {
  const options = [2, 3, 4, 5, 6]
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl fiq-display mb-2" style={{ color: 'var(--fiq-text)' }}>Combien de séances par semaine ?</h2>
        <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Choisis un objectif réaliste que tu peux tenir sur le long terme.</p>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {options.map((n) => (
          <button
            key={n}
            onClick={() => onSelect(n)}
            className="aspect-square flex items-center justify-center rounded-2xl text-xl font-black transition-all"
            style={{
              background: value === n ? 'var(--fiq-accent)' : 'var(--fiq-card)',
              color: value === n ? 'var(--bg)' : 'var(--fiq-text)',
              border: `1px solid ${value === n ? 'var(--fiq-accent)' : 'var(--fiq-border)'}`,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="space-y-2 text-sm" style={{ color: 'var(--fiq-muted)' }}>
        <p>2-3 séances → Débutant ou emploi du temps chargé</p>
        <p>4 séances → Intermédiaire, ratio idéal</p>
        <p>5-6 séances → Avancé, haute priorité fitness</p>
      </div>
    </div>
  )
}

/* ============================================================
   ÉTAPE 7 — Programme recommandé
   ============================================================ */
function StepProgram({
  data, value, onSelect, onFinish, loading, error,
}: {
  data: Partial<OnboardingData>
  value?: string
  onSelect: (v: string) => void
  onFinish: () => void
  loading: boolean
  error?: string | null
}) {
  const programs = getRecommendedPrograms(data)
  const selected = value ?? programs[0]?.slug

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl fiq-display mb-2" style={{ color: 'var(--fiq-text)' }}>Ton programme ✨</h2>
        <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Sélectionné selon ton profil. Tu pourras en changer à tout moment.</p>
      </div>
      <div className="space-y-3">
        {programs.map((prog, i) => (
          <button
            key={prog.slug}
            onClick={() => onSelect(prog.slug)}
            className="w-full fiq-card flex items-start gap-3 text-left transition-all"
            style={{
              borderColor: (selected === prog.slug || (!value && i === 0)) ? 'var(--fiq-accent)' : 'var(--fiq-border)',
              background: (selected === prog.slug || (!value && i === 0)) ? '#B4FF4A12' : 'var(--fiq-card)',
            }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold" style={{ color: 'var(--fiq-text)' }}>{prog.name}</span>
                {i === 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ background: '#B4FF4A22', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A44' }}>
                    Recommandé
                  </span>
                )}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>{prog.description}</div>
              {prog.sessions > 0 && (
                <div className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>{prog.sessions} séances/semaine</div>
              )}
            </div>
            {(selected === prog.slug || (!value && i === 0)) && (
              <Check className="mt-1 w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 text-sm" style={{ background: '#EF444418', color: 'var(--fiq-red)', border: '1px solid #EF444444' }}>
          {error}
        </div>
      )}

      <Button
        className="w-full font-black text-base py-6"
        onClick={onFinish}
        disabled={loading}
        style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>Démarrer ForgeIQ <ChevronRight className="w-5 h-5 ml-2" /></>
        )}
      </Button>
    </div>
  )
}
