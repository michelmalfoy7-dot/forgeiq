import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion — ForgeIQ',
  description: 'Connecte-toi à ForgeIQ pour accéder à ton coach IA fitness, suivre tes entraînements et ta nutrition.',
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
