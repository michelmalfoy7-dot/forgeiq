import type { Metadata } from 'next'
import { BottomNav } from '@/components/layout/BottomNav'
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister'
import { ToastProvider } from '@/components/ui/Toast'
import { InstallBanner } from '@/components/pwa/InstallBanner'

export const metadata: Metadata = {
  title: 'ForgeIQ — Build smarter. Lift harder.',
  description: 'Ton coach IA fitness. Entraînement, nutrition, progression.',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <ServiceWorkerRegister />
      <InstallBanner />
      <main className="flex-1 mb-nav">
        {children}
      </main>
      <BottomNav />
      <ToastProvider />
    </div>
  )
}
