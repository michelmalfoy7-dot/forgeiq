import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pages statiques publiques
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${APP_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/register`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ]

  // Pages dynamiques : profils publics (/u/username)
  try {
    const supabase = await createClient()
    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, updated_at')
      .eq('is_public', true)
      .not('username', 'is', null)
      .limit(5000)

    const profilePages: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
      url: `${APP_URL}/u/${p.username}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...staticPages, ...profilePages]
  } catch {
    // En cas d'erreur DB, on retourne au moins les pages statiques
    return staticPages
  }
}
