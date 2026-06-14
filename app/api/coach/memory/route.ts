import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_CATEGORIES = ['injury', 'goal', 'preference', 'milestone', 'note'] as const
type Category = typeof VALID_CATEGORIES[number]

// GET /api/coach/memory — liste les entrées actives (non expirées)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('coach_memory')
      .select('id, category, content, source, created_at, expires_at')
      .eq('user_id', user.id)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/coach/memory — ajouter une note manuelle
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const category: Category = body.category
    const content: string = (body.content ?? '').trim()
    const expiresAt: string | null = body.expires_at ?? null

    if (!VALID_CATEGORIES.includes(category))
      return NextResponse.json({ data: null, error: 'Catégorie invalide' }, { status: 400 })
    if (!content || content.length < 3)
      return NextResponse.json({ data: null, error: 'Contenu trop court' }, { status: 400 })
    if (content.length > 500)
      return NextResponse.json({ data: null, error: 'Contenu trop long (max 500 caractères)' }, { status: 400 })

    // Limite : 100 entrées actives max par user
    const now = new Date().toISOString()
    const { count } = await supabase
      .from('coach_memory')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
    if ((count ?? 0) >= 100)
      return NextResponse.json({ data: null, error: 'Limite de 100 entrées atteinte' }, { status: 429 })

    const { data, error } = await supabase
      .from('coach_memory')
      .insert({ user_id: user.id, category, content, source: 'manual', expires_at: expiresAt })
      .select('id, category, content, source, created_at, expires_at')
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
