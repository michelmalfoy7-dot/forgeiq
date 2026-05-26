import Link from 'next/link'
import { Users } from 'lucide-react'

export default function UserNotFound() {
  return (
    <div className="max-w-lg mx-auto p-4 flex items-center justify-center min-h-[60vh]">
      <div className="fiq-card text-center py-12 space-y-4 w-full">
        <Users className="w-12 h-12 mx-auto" style={{ color: 'var(--fiq-muted)' }} />
        <div>
          <p className="font-black text-xl" style={{ color: 'var(--fiq-text)' }}>
            Profil introuvable
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--fiq-muted)' }}>
            Ce profil n&apos;existe pas ou est privé
          </p>
        </div>
        <Link
          href="/social"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
        >
          Retour à la communauté
        </Link>
      </div>
    </div>
  )
}
