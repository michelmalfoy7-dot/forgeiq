import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // Compression gzip/brotli des assets
  compress: true,

  // Optimisation des images (avif/webp auto, lazy loading, resize)
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 1 jour
    remotePatterns: [
      {
        // Supabase Storage — avatars + photos progression
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Headers de cache pour les assets statiques
  async headers() {
    return [
      {
        // Assets Next.js — immuables (hash dans le nom)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Icônes PWA et manifest — cache 1 semaine
        source: '/(manifest.json|icons/:path*|sw.js)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      {
        // Pages API — pas de cache (données temps réel)
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        // TWA Digital Asset Links — nécessaire pour Google Play Store
        // Content-Type JSON explicite + pas de cache agressif (le fingerprint peut changer)
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ]
  },

  // Logs expérimentaux pour identifier les slow routes
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
}

export default withBundleAnalyzer(nextConfig)
