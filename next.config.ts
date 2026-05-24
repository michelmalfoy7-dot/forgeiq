import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Compression gzip/brotli des assets
  compress: true,

  // Optimisation des images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 1 jour
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
    ]
  },

  // Logs expérimentaux pour identifier les slow routes
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
}

export default nextConfig
