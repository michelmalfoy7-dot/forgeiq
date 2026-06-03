import type { Metadata } from 'next'
import { BottomNav } from '@/components/layout/BottomNav'
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { ToastProvider } from '@/components/ui/Toast'
import { InstallBanner } from '@/components/pwa/InstallBanner'

export const metadata: Metadata = {
  title: {
    default: 'ForgeIQ — Build smarter. Lift harder.',
    template: '%s | ForgeIQ',
  },
  description: 'Ton coach IA fitness. Entraînement, nutrition, progression.',
  // Pages privées (authentifiées) : pas d'indexation, les robots sont bloqués dans robots.ts
  robots: { index: false, follow: false },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative">
        <ServiceWorkerRegister />
        <InstallBanner />
        <OfflineBanner />
        <main className="flex-1 mb-nav overflow-x-hidden">
          {children}
        </main>
        <BottomNav />
        <ToastProvider />
      </div>
    </div>
  )
}
