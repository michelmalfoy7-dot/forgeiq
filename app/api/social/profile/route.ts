import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Regex validation username : 3-20 chars, alphanumérique + underscore uniquement
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase
      .from('social_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as {
      username?: string
      bio?: string
      is_public?: boolean
      display_name?: string
    }

    // Validation username si fourni
    if (body.username !== undefined) {
      const normalized = body.username.toLowerCase().trim()
      if (!USERNAME_REGEX.test(normalized)) {
        return NextResponse.json({
          data: null,
          error: 'Le username doit contenir 3-20 caractères (lettres minuscules, chiffres, underscore uniquement)',
        }, { status: 400 })
      }
      body.username = normalized
    }

    // Upsert profil social avec conflit sur user_id
    const { data, error } = await supabase
      .from('social_profiles')
      .upsert(
        {
          user_id: user.id,
          username: body.username,
          bio: body.bio ?? null,
          is_public: body.is_public ?? false,
          display_name: body.display_name ?? null,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      // Erreur de contrainte unicité sur username
      if (error.code === '23505') {
        return NextResponse.json({ data: null, error: 'Ce username est déjà pris, choisis-en un autre.' }, { status: 409 })
      }
      return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
