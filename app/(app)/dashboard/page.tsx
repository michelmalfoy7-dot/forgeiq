import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertBar } from '@/components/ui/AlertBar'
import { StatCard } from '@/components/ui/StatCard'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Dumbbell, TrendingUp, ClipboardList, MessageCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PROTEIN_TARGET = 160
const STEPS_TARGET = 8000
const SESSIONS_TARGET = 4

async function generateAIAlerts(
  logs: { log_date: string; sleep_deep_min: number | null; protein_g: number | null; fatigue_score: number | null; steps: number | null }[],
  profile: { goal: string; level: string }
): Promise<{ type: 'red' | 'yellow' | 'green' | 'blue'; message: string; sub: string }[]> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') return []
  if (!logs.length) return []

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const logSummary = logs.map(l =>
      `${l.log_date}: sommeil_profond=${l.sleep_deep_min ?? '?'}min fatigue=${l.fatigue_score ?? '?'}/10 proteines=${l.protein_g ?? '?'}g pas=${l.steps ?? '?'}`
    ).join('\n')

    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Analyse ces 7 jours de données fitness et génère 1-2 alertes pertinentes en JSON.

Profil: objectif=${profile.goal}, niveau=${profile.level}
Données:
${logSummary}

Réponds UNIQUEMENT avec ce JSON (sans markdown):
[
  { "type": "yellow", "message": "🔑 Titre court", "sub": "Explication actionnable max 15 mots" }
]

Types disponibles: "red" (urgence), "yellow" (attention), "green" (bien joué), "blue" (info).
Max 2 alertes. Si tout va bien, retourne [].`,
      }],
    })

    const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : '[]'
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, 2) : []
  } catch {
    return []
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [
    { data: profile },
    { data: todayLog },
    { data: lastWorkout },
    { data: weekWorkouts },
    { data: weekLogs },
  ] = await Promise.all([
    supabase.from('profiles')
      .select('display_name, goal, level, current_program_id, onboarding_done, sessions_per_week')
      .eq('id', user.id).single(),

    supabase.from('daily_logs').select('*')
      .eq('user_id', user.id).eq('log_date', today).single(),

    supabase.from('workouts').select('session_name, session_date, total_tonnage_kg, total_sets')
      .eq('user_id', user.id).not('completed_at', 'is', null)
      .order('session_date', { ascending: false }).limit(1).single(),

    supabase.from('workouts').select('id, session_date')
      .eq('user_id', user.id).not('completed_at', 'is', null)
      .gte('session_date', getWeekStart())
      .order('session_date', { ascending: false }),

    supabase.from('daily_logs')
      .select('log_date, sleep_deep_min, protein_g, fatigue_score, steps')
      .eq('user_id', user.id)
      .gte('log_date', sevenDaysAgo)
      .order('log_date', { ascending: false }),
  ])

  if (!profile?.onboarding_done) redirect('/onboarding')

  // Suggestion séance
  let suggestion: {
    session_name: string
    program_name: string
    volume_adjustment: string
    adjustment_reason: string
    adaptation_reason: string
    exercises: { name: string; sets: number; reps: string; weight_kg: number | null; note: string }[]
  } | null = null

  if (profile?.current_program_id) {
    const { data: program } = await supabase
      .from('programs').select('name, structure').eq('id', profile.current_program_id).single()

    if (program) {
      const days: string[] = program.structure?.days ?? []
      const { data: lastProgramWorkout } = await supabase
        .from('workouts').select('session_name')
        .eq('user_id', user.id).eq('program_id', profile.current_program_id)
        .not('completed_at', 'is', null)
        .order('session_date', { ascending: false }).limit(1).single()

      const lastIdx = lastProgramWorkout ? days.indexOf(lastProgramWorkout.session_name) : -1
      const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % days.length : 0
      const nextSession = days[nextIdx] ?? 'Séance libre'

      let volumeAdj = 'normal'
      let adjReason = ''
      let adaptReason = ''

      if (todayLog) {
        if ((todayLog.sleep_deep_min ?? 90) < 60 || (todayLog.fatigue_score ?? 5) >= 8) {
          volumeAdj = 'reduce'
          adjReason = (todayLog.sleep_deep_min ?? 90) < 60 ? 'Sommeil profond insuffisant' : 'Fatigue élevée'
          adaptReason = 'Volume réduit pour optimiser ta récupération'
        } else if ((todayLog.sleep_deep_min ?? 90) > 90 && (todayLog.fatigue_score ?? 5) <= 4) {
          volumeAdj = 'increase'
          adjReason = 'Récupération optimale'
          adaptReason = 'Conditions idéales — repousse tes limites'
        } else {
          adaptReason = 'Récupération normale, séance standard'
        }
      }

      suggestion = {
        session_name: nextSession,
        program_name: program.name,
        volume_adjustment: volumeAdj,
        adjustment_reason: adjReason,
        adaptation_reason: adaptReason,
        exercises: [],
      }
    }
  }

  // Alertes statiques immédiates
  const staticAlerts: { type: 'red' | 'yellow' | 'green' | 'blue'; message: string; sub: string }[] = []

  if (todayLog) {
    const deepSleep = todayLog.sleep_deep_min
    const protein = todayLog.protein_g
    const sysBP = todayLog.sys_bp

    if (deepSleep !== null && deepSleep < 60)
      staticAlerts.push({ type: 'yellow', message: '😴 Sommeil profond insuffisant', sub: `${deepSleep}min — réduis le volume d'entraînement de 15-20% aujourd'hui.` })

    if (protein !== null && protein < PROTEIN_TARGET - 20)
      staticAlerts.push({ type: 'yellow', message: '🥩 Protéines en dessous de l\'objectif', sub: `${protein}g / ${PROTEIN_TARGET}g — pense à une source de protéines supplémentaire.` })

    if (sysBP !== null && sysBP > 135)
      staticAlerts.push({ type: 'red', message: '🫀 Tension systolique élevée', sub: `${sysBP} mmHg — consulte un médecin si ça persiste.` })
  } else {
    staticAlerts.push({ type: 'blue', message: '📋 Bilan du jour non renseigné', sub: 'Complète ton check-in pour des recommandations personnalisées.' })
  }

  // Alertes IA sur 7 jours (uniquement si données disponibles)
  const aiAlerts = await generateAIAlerts(weekLogs ?? [], {
    goal: profile?.goal ?? 'force',
    level: profile?.level ?? 'intermédiaire',
  })

  // Fusionner alertes (statiques d'abord, puis IA si pas de doublon)
  const allAlerts = [...staticAlerts, ...aiAlerts].slice(0, 4)

  const prenom = profile?.display_name?.split(' ')[0] ?? 'Athlete'
  const sessionsThisWeek = weekWorkouts?.length ?? 0
  const sessionsTarget = profile?.sessions_per_week ?? SESSIONS_TARGET

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="pt-4 flex items-start justify-between">
        <div>
          <p className="fiq-label">Bonjour</p>
          <h1 className="text-2xl fiq-display mt-0.5" style={{ color: 'var(--fiq-text)' }}>
            {prenom} 👋
          </h1>
        </div>
        <Link href="/profile" className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          {prenom[0]?.toUpperCase()}
        </Link>
      </div>

      {/* Alertes */}
      {allAlerts.length > 0 && (
        <div className="space-y-2">
          {allAlerts.map((a, i) => <AlertBar key={i} type={a.type} message={a.message} sub={a.sub} />)}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Poids lissé"
          value={todayLog?.weight_trend ? `${todayLog.weight_trend}` : '—'}
          unit={todayLog?.weight_trend ? 'kg' : ''}
          sub={todayLog?.weight_kg ? `Brut : ${todayLog.weight_kg}kg` : 'Non renseigné'}
          trend={todayLog?.weight_trend && todayLog?.weight_kg
            ? todayLog.weight_kg > todayLog.weight_trend ? 'up' : todayLog.weight_kg < todayLog.weight_trend ? 'down' : 'flat'
            : undefined}
        />
        <StatCard
          label="Sommeil profond"
          value={todayLog?.sleep_deep_min !== null && todayLog?.sleep_deep_min !== undefined ? `${todayLog.sleep_deep_min}` : '—'}
          unit={todayLog?.sleep_deep_min !== null && todayLog?.sleep_deep_min !== undefined ? 'min' : ''}
          sub={todayLog?.sleep_total_min ? `Total : ${Math.round(todayLog.sleep_total_min / 60)}h` : 'Non renseigné'}
          alert={!!todayLog?.sleep_deep_min && todayLog.sleep_deep_min < 60}
        />
        <StatCard
          label="Protéines"
          value={todayLog?.protein_g !== null && todayLog?.protein_g !== undefined ? `${todayLog.protein_g}` : '—'}
          unit={todayLog?.protein_g !== null && todayLog?.protein_g !== undefined ? 'g' : ''}
          sub={`Objectif : ${PROTEIN_TARGET}g`}
          alert={!!todayLog?.protein_g && todayLog.protein_g < PROTEIN_TARGET - 20}
        />
        <StatCard
          label="Pas"
          value={todayLog?.steps ? todayLog.steps.toLocaleString('fr-FR') : '—'}
          sub={`Objectif : ${STEPS_TARGET.toLocaleString('fr-FR')}`}
        />
      </div>

      {/* Card séance proposée */}
      <div className="fiq-card space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="fiq-label">Séance du jour</p>
            <h2 className="text-lg font-black mt-0.5" style={{ color: 'var(--fiq-text)' }}>
              {suggestion?.session_name ?? 'Séance libre'}
            </h2>
            {suggestion?.program_name && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{suggestion.program_name}</p>
            )}
          </div>
          <Dumbbell className="w-5 h-5 mt-1" style={{ color: 'var(--fiq-accent)' }} />
        </div>

        {/* Raison IA adaptation */}
        {suggestion?.adaptation_reason && (
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            💡 {suggestion.adaptation_reason}
          </p>
        )}

        {suggestion?.volume_adjustment === 'reduce' && (
          <div className="text-xs px-3 py-2 rounded-lg font-semibold"
            style={{ background: '#FF6B3518', color: 'var(--fiq-orange)', border: '1px solid #FF6B3544' }}>
            ⚠️ Volume réduit — {suggestion.adjustment_reason}
          </div>
        )}
        {suggestion?.volume_adjustment === 'increase' && (
          <div className="text-xs px-3 py-2 rounded-lg font-semibold"
            style={{ background: '#3D8BFF18', color: 'var(--fiq-blue)', border: '1px solid #3D8BFF44' }}>
            ⚡ Récupération optimale — {suggestion.adjustment_reason}
          </div>
        )}

        <Link
          href="/workout"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-sm transition-all"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          <Dumbbell className="w-4 h-4" />
          Démarrer la séance
        </Link>

        {/* Bouton Demander au coach */}
        <Link
          href="/coach?q=Analyse+mon+dashboard+et+dis-moi+ce+que+je+dois+améliorer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-xs transition-all"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Demander au coach
        </Link>

        {lastWorkout && (
          <p className="text-xs text-center" style={{ color: 'var(--fiq-muted)' }}>
            Dernière : {lastWorkout.session_name} ·{' '}
            {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(lastWorkout.session_date))}
            {lastWorkout.total_tonnage_kg ? ` · ${lastWorkout.total_tonnage_kg.toLocaleString('fr-FR')}kg` : ''}
          </p>
        )}
      </div>

      {/* Objectifs semaine */}
      <div className="fiq-card space-y-4">
        <p className="font-bold" style={{ color: 'var(--fiq-text)' }}>Cette semaine</p>

        <ProgressBar
          value={sessionsThisWeek}
          max={sessionsTarget}
          color="var(--fiq-accent)"
          label={`Séances : ${sessionsThisWeek}/${sessionsTarget}`}
          showPercent
        />
        <ProgressBar
          value={todayLog?.protein_g ?? 0}
          max={PROTEIN_TARGET}
          color="var(--fiq-accent)"
          label={`Protéines : ${todayLog?.protein_g ?? 0}g/${PROTEIN_TARGET}g`}
        />
        <ProgressBar
          value={todayLog?.steps ?? 0}
          max={STEPS_TARGET}
          color="var(--fiq-blue)"
          label={`Pas : ${(todayLog?.steps ?? 0).toLocaleString('fr-FR')}/${STEPS_TARGET.toLocaleString('fr-FR')}`}
        />
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/checkin" className="fiq-card flex items-center gap-3">
          <ClipboardList className="w-5 h-5" style={{ color: 'var(--fiq-blue)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Check-in</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{todayLog ? 'Mis à jour ✓' : 'Non renseigné'}</p>
          </div>
        </Link>
        <Link href="/progress" className="fiq-card flex items-center gap-3">
          <TrendingUp className="w-5 h-5" style={{ color: 'var(--fiq-accent)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Progression</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Voir mes stats</p>
          </div>
        </Link>
        <Link href="/exercises" className="fiq-card flex items-center gap-3">
          <Dumbbell className="w-5 h-5" style={{ color: 'var(--fiq-orange)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Exercices</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>230+ exercices</p>
          </div>
        </Link>
        <Link href="/programs" className="fiq-card flex items-center gap-3">
          <ClipboardList className="w-5 h-5" style={{ color: '#A855F7' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fiq-text)' }}>Programmes</p>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Guidés & custom</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}
