import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED_EMOJIS = ['🔥', '💪', '⚡'] as const
type Emoji = typeof ALLOWED_EMOJIS[number]

// GET /api/social/reactions?share_id=xxx[&detail=true]
// Retourne { counts, mine } ou { counts, mine, users } si detail=true
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('share_id')
    const detail  = searchParams.get('detail') === 'true'
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
    const usersByEmoji: Record<string, string[]> = { '🔥': [], '💪': [], '⚡': [] }

    for (const row of (data ?? [])) {
      if (ALLOWED_EMOJIS.includes(row.emoji as Emoji)) {
        counts[row.emoji] = (counts[row.emoji] ?? 0) + 1
        if (row.user_id === user.id) mine.push(row.emoji)
        usersByEmoji[row.emoji].push(row.user_id)
      }
    }

    if (!detail) {
      return NextResponse.json({ data: { counts, mine }, error: null })
    }

    // Mode detail : résoudre les profils par user_id
    const allUserIds = [...new Set(Object.values(usersByEmoji).flat())]
    type Profile = { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }
    let profileMap = new Map<string, Profile>()

    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('social_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', allUserIds)
      for (const p of (profiles ?? []) as Profile[]) profileMap.set(p.user_id, p)
    }

    const users: Record<string, Profile[]> = { '🔥': [], '💪': [], '⚡': [] }
    for (const emoji of ALLOWED_EMOJIS) {
      users[emoji] = usersByEmoji[emoji].map(uid => profileMap.get(uid) ?? { user_id: uid, username: null, display_name: 'Athlète', avatar_url: null })
    }

    return NextResponse.json({ data: { counts, mine, users }, error: null })
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
