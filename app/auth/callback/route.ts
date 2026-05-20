import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Reconstruit l'origine correcte (Vercel forwarded host)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const baseUrl = isLocalEnv ? origin : (forwardedHost ? `https://${forwardedHost}` : origin)

  if (code) {
    // Collecte les cookies que Supabase veut écrire, pour les appliquer sur la réponse finale
    const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            // On collecte ici, on appliquera sur la réponse redirect
            cookies.forEach((c) => cookiesToSet.push(c))
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Vérifie si l'onboarding est nécessaire
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', data.user.id)
        .single()

      const redirectTo = !profile?.onboarding_done
        ? `${baseUrl}/onboarding`
        : `${baseUrl}${next}`

      // Crée la réponse redirect et y applique les cookies de session
      const response = NextResponse.redirect(redirectTo)
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
      )
      return response
    }
  }

  // Échec → retour login avec message d'erreur
  return NextResponse.redirect(`${baseUrl}/login?error=auth_failed`)
}
