import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — liste des notifications (30 dernières) + count non-lues
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Notifications récentes
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, actor_id, reference_id, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      // Table peut ne pas encore exister
      return NextResponse.json({ data: { notifications: [], unread_count: 0 }, error: null })
    }

    // Profils des acteurs (qui a liké / suivi)
    const actorIds = [...new Set((notifications ?? []).map((n: { actor_id: string }) => n.actor_id))]

    const { data: actorProfiles } = actorIds.length > 0
      ? await supabase
          .from('social_profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', actorIds)
      : { data: [] }

    const actorMap = new Map((actorProfiles ?? []).map((p: {
      user_id: string; username: string | null; display_name: string | null; avatar_url: string | null
    }) => [p.user_id, p]))

    const enriched = (notifications ?? []).map((n: {
      id: string; type: string; actor_id: string; reference_id: string | null; is_read: boolean; created_at: string
    }) => ({
      ...n,
      actor: actorMap.get(n.actor_id) ?? { username: null, display_name: 'Quelqu\'un', avatar_url: null },
    }))

    const unread_count = enriched.filter((n) => !n.is_read).length

    return NextResponse.json({ data: { notifications: enriched, unread_count }, error: null })
  } catch {
    return NextResponse.json({ data: { notifications: [], unread_count: 0 }, error: null })
  }
}

// PATCH — marquer toutes comme lues
export async function PATCH() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return NextResponse.json({ data: { ok: true }, error: null })
  } catch {
    return NextResponse.json({ data: { ok: true }, error: null })
  }
}
