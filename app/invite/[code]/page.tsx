import { Metadata } from 'next'
import Link from 'next/link'

type Props = { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  return {
    title: 'Rejoins ForgeIQ — Ton coach IA fitness',
    description: 'Un ami t\'invite à rejoindre ForgeIQ. Entraînement, nutrition, coach IA. Build smarter. Lift harder.',
    openGraph: {
      title: 'Rejoins ForgeIQ 🏋️',
      description: 'Ton coach IA fitness personnel — entraînement, nutrition, progression. Rejoins maintenant.',
      images: ['/opengraph-image'],
    },
  }
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params

  const features = [
    { emoji: '🏋️', title: 'Logger en 2 min', desc: 'Timer repos, PRs auto-détectés, comparaison séance précédente' },
    { emoji: '🧬', title: 'Nutrition complète', desc: 'Scan code-barres, photo IA, macros + 7 micronutriments' },
    { emoji: '🤖', title: 'Coach IA 24/7', desc: 'Contexte complet : séances, sommeil, fatigue, objectifs' },
    { emoji: '🔥', title: 'Streaks & Milestones', desc: 'Suivi de consistance, célébration des paliers' },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-5xl">⚗️</div>
          <h1 className="fiq-display text-3xl" style={{ color: 'var(--fiq-text)', letterSpacing: '-0.03em' }}>
            ForgeIQ
          </h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--fiq-accent)' }}>
            Build smarter. Lift harder.
          </p>
        </div>

        {/* Invite card */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: '#B4FF4A12', border: '1px solid #B4FF4A33' }}
        >
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Un ami t&apos;a invité à rejoindre</p>
          <p className="text-lg font-black mt-1" style={{ color: 'var(--fiq-text)' }}>ForgeIQ</p>
          <p className="text-xs mt-2" style={{ color: 'var(--fiq-accent)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.1em' }}>
            CODE : {code}
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3">
          {features.map(f => (
            <div key={f.title} className="flex items-start gap-3 fiq-card p-4">
              <span className="text-2xl">{f.emoji}</span>
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--fiq-text)' }}>{f.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fiq-muted)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Prix */}
        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}
        >
          <p className="text-xs uppercase tracking-widest font-black" style={{ color: 'var(--fiq-muted)' }}>Pro</p>
          <p className="text-3xl font-black mt-1" style={{ color: 'var(--fiq-text)' }}>
            4,99€<span className="text-base font-normal" style={{ color: 'var(--fiq-muted)' }}>/mois</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>ou 39,99€/an · Accès vie 99,99€</p>
        </div>

        {/* CTA */}
        <Link
          href={`/register?ref=${code}`}
          className="block w-full py-4 rounded-2xl text-center text-base font-black transition-all active:scale-95"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          Créer mon compte gratuit
        </Link>

        <p className="text-center text-xs" style={{ color: 'var(--fiq-muted)' }}>
          Gratuit pour commencer · Aucune CB requise
        </p>
      </div>
    </div>
  )
}
