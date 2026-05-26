import { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/pricing',
          '/login',
          '/register',
          '/install',
          '/u/',       // profils publics indexables
        ],
        disallow: [
          '/dashboard',
          '/workout',
          '/checkin',
          '/coach',
          '/progress',
          '/programs',
          '/profile',
          '/nutrition',
          '/exercises',
          '/social',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
