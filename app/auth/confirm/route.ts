import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Gère la confirmation d'email via token_hash (auth hook flow)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const baseUrl = isLocalEnv ? origin : (forwardedHost ? `https://${forwardedHost}` : origin)

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_link`)
  }

  const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookies) { cookies.forEach(c => cookiesToSet.push(c)) },
      },
    }
  )

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

  if (!error && data.user) {
    // Vérifie si l'onboarding est nécessaire
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_done')
      .eq('id', data.user.id)
      .maybeSingle()

    const redirectTo = !profile?.onboarding_done
      ? `${baseUrl}/onboarding`
      : `${baseUrl}${next.startsWith('/') ? next : '/' + next}`

    const response = NextResponse.redirect(redirectTo)
    cookiesToSet.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
    )
    return response
  }

  return NextResponse.redirect(`${baseUrl}/login?error=confirmation_failed`)
}
