import Link from 'next/link'
import { ChevronRight, Dumbbell, Brain, BarChart2, Check, ChevronDown } from 'lucide-react'
import { WaitlistForm } from '@/components/WaitlistForm'

// ── Données ────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🤖',
    title: 'Coach IA adaptatif',
    desc: 'Dormis mal ? Volume réduit automatiquement. Récupération optimale ? L\'IA te pousse à dépasser tes limites.',
  },
  {
    icon: '⚡',
    title: 'Tonnage & Records',
    desc: 'Vois ta progression semaine par semaine. Chaque PR détecté automatiquement, confetti inclus.',
  },
  {
    icon: '📊',
    title: 'Bilan intelligent',
    desc: 'Poids lissé EWMA, sommeil profond, protéines — fini les fausses variations. Des données qui ont du sens.',
  },
]

const PROGRAMS_PREVIEW = [
  { name: 'Full Body 3×', level: 'beginner', sessions: 3 },
  { name: 'Upper/Lower 4×', level: 'intermediate', sessions: 4 },
  { name: 'PPL 6×', level: 'advanced', sessions: 6 },
  { name: 'Starting Strength', level: 'beginner', sessions: 3 },
  { name: 'Arnold Split', level: 'advanced', sessions: 6 },
  { name: 'PHUL', level: 'intermediate', sessions: 4 },
  { name: 'Bodyweight', level: 'beginner', sessions: 3 },
  { name: 'Powerlifting', level: 'advanced', sessions: 4 },
  { name: 'Sèche Cardio+Muscu', level: 'intermediate', sessions: 5 },
]

const TESTIMONIALS = [
  {
    name: 'Thomas R.',
    role: 'Intermédiaire · 2 ans de salle',
    text: 'ForgeIQ a remplacé mon Excel de suivi et mon app de coaching. Le coach IA connaît vraiment mes données — c\'est bluffant.',
    pr: '+12kg au squat en 8 semaines',
  },
  {
    name: 'Sarah M.',
    role: 'Débutante · 6 mois',
    text: 'J\'ai enfin compris pourquoi je ne progressais pas : je manquais de protéines et je dormais mal. Le dashboard m\'a ouvert les yeux.',
    pr: 'Première traction en 10 semaines',
  },
  {
    name: 'Karim B.',
    role: 'Avancé · Powerlifter amateur',
    text: 'Le suivi du tonnage hebdomadaire est une révélation. Je gère ma fatigue comme jamais. Mon coach humain est jaloux.',
    pr: '+25kg au deadlift en 12 semaines',
  },
]

const FAQS = [
  {
    q: "C'est quoi le coach IA ?",
    a: "Le coach est alimenté par Claude (Anthropic). Il connaît ton poids EWMA, ton sommeil, tes séances des 7 derniers jours et tes records. Il adapte ses conseils à ta récupération réelle — pas des conseils génériques.",
  },
  {
    q: "Ça marche sans montre connectée ?",
    a: "Oui. Tu entres manuellement ton poids, sommeil, protéines et fatigue lors du bilan quotidien (moins de 60 secondes). Aucun wearable requis.",
  },
  {
    q: "Puis-je créer mon propre programme ?",
    a: "Oui, avec le constructeur de programme custom. Tu nommes tes séances, tu y ajoutes les exercices parmi les 89 disponibles, et c'est adopté instantanément.",
  },
  {
    q: "Comment annuler ?",
    a: "À tout moment depuis ton profil. Aucun engagement. Si tu es sur le plan annuel, tu conserves l'accès jusqu'à la fin de la période.",
  },
  {
    q: "C'est adapté aux débutants ?",
    a: "Totalement. ForgeIQ propose des programmes débutants (Full Body, Bodyweight, Starting Strength) et le coach IA adapte ses recommandations à ton niveau déclaré.",
  },
]

const LEVEL_COLOR: Record<string, { bg: string; text: string }> = {
  beginner: { bg: '#B4FF4A22', text: '#B4FF4A' },
  intermediate: { bg: '#3D8BFF22', text: '#3D8BFF' },
  advanced: { bg: '#FF6B3522', text: '#FF6B35' },
}
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé',
}

// ── Composants ─────────────────────────────────────────────────────
function NavBar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
      style={{ background: 'rgba(10,12,15,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--fiq-border)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">⚗️</span>
        <span className="font-black text-lg tracking-tight" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.04em' }}>
          ForgeIQ
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm font-semibold hidden sm:block" style={{ color: 'var(--fiq-muted)' }}>
          Connexion
        </Link>
        <Link href="/register"
          className="px-4 py-2 rounded-xl text-sm font-black"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          Essai gratuit
        </Link>
      </div>
    </header>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="fiq-label text-center mb-3" style={{ color: 'var(--fiq-accent)' }}>{children}</p>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group">
      <summary
        className="flex items-center justify-between py-4 cursor-pointer list-none font-semibold text-sm"
        style={{ color: 'var(--fiq-text)', borderBottom: '1px solid var(--fiq-border)' }}
      >
        {q}
        <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-180" style={{ color: 'var(--fiq-muted)' }} />
      </summary>
      <p className="pt-3 pb-4 text-sm leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
        {a}
      </p>
    </details>
  )
}

// ── Page ───────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fiq-text)' }}>
      <NavBar />

      {/* ── A. HERO ──────────────────────────────────────────── */}
      <section className="pt-28 pb-20 px-4 text-center max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-5xl">⚗️</span>
        </div>

        <h1
          className="text-5xl fiq-display mb-4 leading-none"
          style={{ color: 'var(--fiq-text)', fontSize: 'clamp(2.5rem, 8vw, 4rem)' }}
        >
          Build smarter.<br />
          <span style={{ color: 'var(--fiq-accent)' }}>Lift harder.</span>
        </h1>

        <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--fiq-muted)', maxWidth: 340, margin: '0 auto 2rem' }}>
          Le seul coach fitness qui lit tes données et adapte chaque séance à ta récupération réelle.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black text-base"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            Commencer gratuitement
            <ChevronRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
          >
            Déjà un compte
          </Link>
        </div>

        <span
          className="inline-block text-xs font-semibold px-4 py-2 rounded-full"
          style={{ background: '#B4FF4A15', border: '1px solid #B4FF4A33', color: 'var(--fiq-accent)' }}
        >
          ✓ Essai 14 jours gratuit — sans carte bancaire
        </span>

        {/* App preview mockup */}
        <div
          className="mt-12 rounded-2xl overflow-hidden mx-auto max-w-xs"
          style={{ border: '1px solid var(--fiq-border)', background: 'var(--fiq-card)' }}
        >
          {/* Faux header app */}
          <div className="px-4 pt-5 pb-3" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fiq-muted)' }}>Bonjour</p>
            <p className="text-xl font-black mt-0.5" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>Thomas 👋</p>
          </div>
          {/* Alert mock */}
          <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl flex items-start gap-2"
            style={{ background: '#F59E0B12', borderLeft: '3px solid #F59E0B' }}>
            <span>😴</span>
            <div>
              <p className="text-xs font-bold" style={{ color: '#F59E0B' }}>Sommeil profond insuffisant</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>52min — volume réduit de 15% aujourd&apos;hui.</p>
            </div>
          </div>
          {/* Stats mock */}
          <div className="grid grid-cols-2 gap-2 mx-3 mt-3 mb-3">
            {[
              { label: 'Poids lissé', value: '83.2', unit: 'kg' },
              { label: 'Sommeil profond', value: '52', unit: 'min', alert: true },
              { label: 'Protéines', value: '142', unit: 'g' },
              { label: 'Pas', value: '7 842', unit: '' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl px-3 py-2.5" style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)' }}>
                <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fiq-muted)' }}>{s.label}</p>
                <p className="text-lg font-black mt-0.5 fiq-data" style={{ color: s.alert ? '#F59E0B' : 'var(--fiq-accent)' }}>
                  {s.value} <span className="text-xs font-normal" style={{ color: 'var(--fiq-muted)' }}>{s.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── B. PROBLÈME ──────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-lg mx-auto" style={{ borderTop: '1px solid var(--fiq-border)' }}>
        <SectionLabel>Le problème</SectionLabel>
        <h2 className="text-3xl fiq-display text-center mb-10" style={{ color: 'var(--fiq-text)' }}>
          Les autres apps te loggent.<br />
          <span style={{ color: 'var(--fiq-accent)' }}>ForgeIQ te coache.</span>
        </h2>

        <div className="space-y-3">
          {[
            { vs: 'Hevy / Strong', them: 'Tu logges tes séances', us: 'Le coach adapte le volume à ta récupération' },
            { vs: 'MyFitnessPal', them: 'Tu comptes tes calories', us: 'ForgeIQ corrèle nutrition + performance' },
            { vs: 'Coach humain ($200/mois)', them: 'Conseils génériques hebdomadaires', us: 'Coach IA disponible 24h/24 avec tes vraies données' },
          ].map((row, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--fiq-border)' }}>
              <div className="px-4 py-2.5" style={{ background: 'var(--fiq-faint)' }}>
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--fiq-muted)' }}>{row.vs}</p>
              </div>
              <div className="grid grid-cols-2 divide-x" style={{ borderTop: '1px solid var(--fiq-border)' }}>
                <div className="px-4 py-3">
                  <p className="text-xs line-through" style={{ color: 'var(--fiq-muted)' }}>{row.them}</p>
                </div>
                <div className="px-4 py-3" style={{ background: '#B4FF4A08' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--fiq-accent)' }}>✓ {row.us}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── C. FONCTIONNALITÉS ───────────────────────────────── */}
      <section className="py-16 px-4 max-w-lg mx-auto" style={{ borderTop: '1px solid var(--fiq-border)' }}>
        <SectionLabel>Fonctionnalités</SectionLabel>
        <h2 className="text-3xl fiq-display text-center mb-10" style={{ color: 'var(--fiq-text)' }}>
          Tout ce dont tu as besoin,<br />rien de superflu.
        </h2>
        <div className="space-y-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="fiq-card flex gap-4 items-start">
              <span className="text-3xl flex-shrink-0">{f.icon}</span>
              <div>
                <p className="font-black mb-1" style={{ color: 'var(--fiq-text)' }}>{f.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── D. PROGRAMMES ────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-lg mx-auto" style={{ borderTop: '1px solid var(--fiq-border)' }}>
        <SectionLabel>Programmes</SectionLabel>
        <h2 className="text-3xl fiq-display text-center mb-3" style={{ color: 'var(--fiq-text)' }}>
          12 programmes,<br />tous les niveaux.
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--fiq-muted)' }}>
          De débutant à avancé. Ou crée le tien en 2 minutes.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {PROGRAMS_PREVIEW.map((p, i) => (
            <div key={i} className="rounded-xl px-3 py-3 text-center"
              style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
              <p className="text-xs font-bold leading-tight mb-2" style={{ color: 'var(--fiq-text)' }}>{p.name}</p>
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: LEVEL_COLOR[p.level].bg, color: LEVEL_COLOR[p.level].text }}>
                {LEVEL_LABEL[p.level]}
              </span>
              <p className="text-[9px] mt-1.5" style={{ color: 'var(--fiq-muted)' }}>{p.sessions}×/sem</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link href="/register" className="text-sm font-semibold" style={{ color: 'var(--fiq-accent)' }}>
            + 3 autres programmes →
          </Link>
        </div>
      </section>

      {/* ── E. SOCIAL PROOF ──────────────────────────────────── */}
      <section className="py-16 px-4 max-w-lg mx-auto" style={{ borderTop: '1px solid var(--fiq-border)' }}>
        <SectionLabel>Témoignages</SectionLabel>
        <h2 className="text-3xl fiq-display text-center mb-10" style={{ color: 'var(--fiq-text)' }}>
          Ce que disent<br />nos bêta testeurs.
        </h2>

        <div className="space-y-4">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="fiq-card space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fiq-text)' }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>{t.role}</p>
                </div>
                <span
                  className="text-[10px] font-black px-2 py-1 rounded-full"
                  style={{ background: '#B4FF4A22', color: 'var(--fiq-accent)', border: '1px solid #B4FF4A44' }}
                >
                  🎯 {t.pr}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div
          className="mt-8 grid grid-cols-3 gap-3 text-center rounded-2xl p-4"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
        >
          {[
            { value: '89', label: 'exercices' },
            { value: '12', label: 'programmes' },
            { value: '24/7', label: 'coach IA' },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-2xl font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>{s.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── F. PRICING ───────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-lg mx-auto" style={{ borderTop: '1px solid var(--fiq-border)' }}>
        <SectionLabel>Tarifs</SectionLabel>
        <h2 className="text-3xl fiq-display text-center mb-10" style={{ color: 'var(--fiq-text)' }}>
          Simple et honnête.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* FREE */}
          <div className="fiq-card space-y-4">
            <div>
              <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>Gratuit</p>
              <p className="text-3xl font-black fiq-data mt-1" style={{ color: 'var(--fiq-text)' }}>
                $0<span className="text-sm font-normal" style={{ color: 'var(--fiq-muted)' }}>/mois</span>
              </p>
            </div>
            <ul className="space-y-2">
              {[
                'Logger tes séances',
                '12 programmes inclus',
                'Bilan quotidien',
                'Suivi du poids EWMA',
                'Records personnels',
                '5 messages coach IA/mois',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fiq-muted)' }}>
                  <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--fiq-muted)' }} />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/register"
              className="flex items-center justify-center py-3 rounded-xl font-black text-sm"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}>
              Commencer
            </Link>
          </div>

          {/* PRO */}
          <div className="rounded-2xl p-5 space-y-4 relative overflow-hidden"
            style={{ background: 'var(--fiq-card)', border: '2px solid var(--fiq-accent)' }}>
            <div
              className="absolute top-3 right-3 text-[10px] font-black px-2 py-1 rounded-full"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
              POPULAIRE
            </div>
            <div>
              <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>Pro</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-black fiq-data" style={{ color: 'var(--fiq-accent)' }}>
                  $7.99<span className="text-sm font-normal" style={{ color: 'var(--fiq-muted)' }}>/mois</span>
                </p>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>ou $59.99/an — économise 37%</p>
            </div>
            <ul className="space-y-2">
              {[
                'Tout du plan gratuit',
                'Coach IA illimité (Claude)',
                'Suggestions séances adaptatives',
                'Alertes IA contextuelles',
                'Programme custom',
                'Historique illimité',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fiq-text)' }}>
                  <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/pricing"
              className="flex items-center justify-center py-3 rounded-xl font-black text-sm"
              style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
              Essai 14 jours gratuit
            </Link>
          </div>

          {/* LIFETIME */}
          <div className="rounded-2xl p-5 space-y-4 relative overflow-hidden"
            style={{ background: 'var(--fiq-card)', border: '1px solid #FF6B3544' }}>
            <div
              className="absolute top-3 right-3 text-[10px] font-black px-2 py-1 rounded-full"
              style={{ background: '#FF6B3522', color: '#FF6B35' }}>
              BEST VALUE
            </div>
            <div>
              <p className="font-black text-lg" style={{ color: 'var(--fiq-text)' }}>Lifetime</p>
              <p className="text-3xl font-black fiq-data mt-1" style={{ color: '#FF6B35' }}>
                $149<span className="text-sm font-normal" style={{ color: 'var(--fiq-muted)' }}> une fois</span>
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>Accès à vie · aucun abonnement</p>
            </div>
            <ul className="space-y-2">
              {[
                'Tout le plan Pro',
                'Accès à toutes les futures features',
                'Support prioritaire',
                'Badge Founder exclusif',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fiq-text)' }}>
                  <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#FF6B35' }} />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/pricing"
              className="flex items-center justify-center py-3 rounded-xl font-black text-sm"
              style={{ background: '#FF6B3520', border: '1px solid #FF6B3544', color: '#FF6B35' }}>
              Obtenir l'accès à vie
            </Link>
          </div>
        </div>
      </section>

      {/* ── G. FAQ ───────────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-lg mx-auto" style={{ borderTop: '1px solid var(--fiq-border)' }}>
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="text-3xl fiq-display text-center mb-10" style={{ color: 'var(--fiq-text)' }}>
          Questions fréquentes.
        </h2>
        <div className="divide-y" style={{ borderTop: '1px solid var(--fiq-border)' }}>
          {FAQS.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ── CTA Final ────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center" style={{ borderTop: '1px solid var(--fiq-border)', background: 'var(--fiq-card)' }}>
        <p className="text-4xl mb-2">⚗️</p>
        <h2 className="text-3xl fiq-display mb-3" style={{ color: 'var(--fiq-text)' }}>
          Prêt à forger<br />
          <span style={{ color: 'var(--fiq-accent)' }}>ton meilleur physique ?</span>
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--fiq-muted)' }}>
          Rejoins les athlètes qui s&apos;entraînent avec intelligence.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-base"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          Commencer gratuitement
          <ChevronRight className="w-5 h-5" />
        </Link>
        <p className="mt-4 text-xs" style={{ color: 'var(--fiq-muted)' }}>
          Essai 14 jours · Sans carte bancaire · Annulation en 1 clic
        </p>
      </section>

      {/* ── NEWSLETTER / RESTEZ INFORMÉ ──────────────────────── */}
      <section className="py-14 px-4" style={{ borderTop: '1px solid var(--fiq-border)' }}>
        <div className="max-w-md mx-auto text-center">
          <p className="fiq-label mb-2" style={{ color: 'var(--fiq-accent)' }}>Newsletter fitness</p>
          <h2 className="text-2xl font-black mb-2" style={{ letterSpacing: '-0.03em' }}>
            1 conseil IA par semaine
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--fiq-muted)' }}>
            Récupération, nutrition, programmation — condensé en 2 min. Zéro spam.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* ── H. FOOTER ────────────────────────────────────────── */}
      <footer className="py-8 px-4" style={{ borderTop: '1px solid var(--fiq-border)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚗️</span>
              <span className="font-black" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.04em' }}>ForgeIQ</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>Build smarter. Lift harder.</p>
          </div>
          <div className="flex flex-wrap gap-4 mb-6">
            {[
              { href: '/login', label: 'Connexion' },
              { href: '/register', label: 'Inscription' },
              { href: '/programs', label: 'Programmes' },
              { href: 'mailto:contact@forgeiq.app', label: 'Contact' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--fiq-muted)' }}>
            © 2026 ForgeIQ — Build smarter. Lift harder.
          </p>
        </div>
      </footer>
    </div>
  )
}
