import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { PostHogProvider } from '@/lib/posthog'
import { SplashScreen } from '@/components/ui/SplashScreen'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'ForgeIQ — Build smarter. Lift harder.',
    template: '%s | ForgeIQ',
  },
  description: 'Coach IA fitness : entraînement, nutrition, suivi biométrique et recommandations personnalisées. La seule app qui connecte tout.',
  keywords: ['fitness', 'coach IA', 'musculation', 'nutrition', 'entraînement', 'suivi sportif', 'workout tracker'],
  authors: [{ name: 'ForgeIQ' }],
  creator: 'ForgeIQ',
  publisher: 'ForgeIQ',
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: APP_URL,
    siteName: 'ForgeIQ',
    title: 'ForgeIQ — Build smarter. Lift harder.',
    description: 'Coach IA fitness : entraînement, nutrition, suivi biométrique. Personnalisé. Instantané.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'ForgeIQ — Coach IA fitness',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ForgeIQ — Build smarter. Lift harder.',
    description: 'Coach IA fitness : entraînement, nutrition, suivi biométrique. Personnalisé. Instantané.',
    images: ['/opengraph-image'],
    creator: '@forgeiq',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ForgeIQ',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon-192.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',   // Requis pour env(safe-area-inset-*) sur iPhone X+
  themeColor: '#0A0C0F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <SplashScreen />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
