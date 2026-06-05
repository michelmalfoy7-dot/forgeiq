import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED_EMOJIS = ['🔥', '💪', '⚡'] as const
type Emoji = typeof ALLOWED_EMOJIS[number]

// GET /api/social/reactions?share_id=xxx
// Retourne { counts: Record<emoji, number>, mine: string[] }
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('share_id')
    if (!shareId) return NextResponse.json({ data: null, error: 'share_id requis' }, { status: 400 })

    // Toutes les réactions pour ce post
    const { data, error } = await supabase
      .from('reactions')
      .select('emoji, user_id')
      .eq('share_id', shareId)

    // Table absente (pas encore migrée) → réponse vide gracieuse
    if (error) {
      return NextResponse.json({
        data: { counts: { '🔥': 0, '💪': 0, '⚡': 0 }, mine: [] },
        error: null,
      })
    }

    const counts: Record<string, number> = { '🔥': 0, '💪': 0, '⚡': 0 }
    const mine: string[] = []

    for (const row of (data ?? [])) {
      if (ALLOWED_EMOJIS.includes(row.emoji as Emoji)) {
        counts[row.emoji] = (counts[row.emoji] ?? 0) + 1
        if (row.user_id === user.id) mine.push(row.emoji)
      }
    }

    return NextResponse.json({ data: { counts, mine }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/social/reactions — toggle une réaction
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { share_id?: string; emoji?: string }
    if (!body.share_id) return NextResponse.json({ data: null, error: 'share_id requis' }, { status: 400 })
    if (!body.emoji || !ALLOWED_EMOJIS.includes(body.emoji as Emoji)) {
      return NextResponse.json({ data: null, error: 'emoji invalide' }, { status: 400 })
    }

    // Vérifier si la réaction existe déjà
    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('share_id', body.share_id)
      .eq('user_id', user.id)
      .eq('emoji', body.emoji)
      .maybeSingle()

    if (existing) {
      // Supprimer la réaction (toggle off)
      await supabase
        .from('reactions')
        .delete()
        .eq('id', existing.id)
      return NextResponse.json({ data: { action: 'removed' }, error: null })
    } else {
      // Ajouter la réaction (toggle on)
      await supabase
        .from('reactions')
        .insert({ share_id: body.share_id, user_id: user.id, emoji: body.emoji })
      return NextResponse.json({ data: { action: 'added' }, error: null })
    }
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
