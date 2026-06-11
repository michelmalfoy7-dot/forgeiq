import type { Metadata } from 'next'
import { BottomNav } from '@/components/layout/BottomNav'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
// ServiceWorkerRegister est dans le root layout (app/layout.tsx) pour être détecté par PWABuilder
import { ToastProvider } from '@/components/ui/Toast'
import { InstallBanner } from '@/components/pwa/InstallBanner'
import { PushPermissionPrompt } from '@/components/social/PushPermissionPrompt'
import { ReferralTrialBanner } from '@/components/ui/ReferralTrialBanner'

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
        <InstallBanner />
        <ReferralTrialBanner />
        <OfflineBanner />
        <main className="flex-1 pb-nav overflow-x-hidden">
          {children}
        </main>
        <BottomNav />
        <ToastProvider />
        <PushPermissionPrompt />
      </div>
    </div>
  )
}
