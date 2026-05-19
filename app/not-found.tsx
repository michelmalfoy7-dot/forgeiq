import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="text-center space-y-6 max-w-sm">
        <p className="text-8xl font-black" style={{ color: 'var(--fiq-accent)', letterSpacing: '-0.05em' }}>
          404
        </p>
        <div>
          <h1 className="text-2xl fiq-display" style={{ color: 'var(--fiq-text)' }}>
            Page introuvable
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--fiq-muted)' }}>
            Cette page n&apos;existe pas ou a été déplacée.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          ← Retour au dashboard
        </Link>
      </div>
    </div>
  )
}
