import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Erreur réseau lors de la vérification de session — laisser passer,
    // la page server-side gérera elle-même l'auth avec son propre client
  }

  const { pathname } = request.nextUrl

  // Routes totalement publiques (landing + auth + install PWA + pages marketing)
  const publicRoutes = ['/', '/login', '/register', '/auth/callback', '/auth/confirm', '/auth/reset', '/onboarding', '/forgot-password', '/install', '/pricing', '/privacy', '/invite']
  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + '/')
  )

  // "/" connecté → dashboard
  if (user && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 1c. Flash onboarding : user connecté qui a déjà fini l'onboarding → redirect immédiat
  if (user && pathname.startsWith('/onboarding')) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.onboarding_done) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } catch {
      // En cas d'erreur réseau, laisser passer — la page gérera elle-même
    }
  }

  // Routes app protégées → /login?next=<path> si non connecté
  // Note : /pricing est une route publique et n'a pas besoin d'être dans isAppRoute
  const isAppRoute = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/workout') ||
    pathname.startsWith('/checkin') ||
    pathname.startsWith('/progress') ||
    pathname.startsWith('/programs') ||
    pathname.startsWith('/exercises') ||
    pathname.startsWith('/coach') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/nutrition') ||
    pathname.startsWith('/social') ||
    pathname.startsWith('/admin')

  if (!user && isAppRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Mémoriser la page cible pour y revenir après login
    if (pathname !== '/login') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // 1b. Protection /admin : vérifier is_admin dans profiles
  if (user && pathname.startsWith('/admin')) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()
      if (!profile?.is_admin) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } catch {
      // En cas d'erreur réseau, bloquer par précaution
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
