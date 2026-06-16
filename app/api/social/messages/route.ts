import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/social/messages → liste des conversations avec dernier message + profil contact
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Récupérer toutes les conversations de l'utilisateur
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, participant_1, participant_2, last_message_at, created_at')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    if (!conversations || conversations.length === 0) return NextResponse.json({ data: [], error: null })

    // Identifier les IDs des interlocuteurs
    const contactIds = conversations.map((c: { participant_1: string; participant_2: string }) =>
      c.participant_1 === user.id ? c.participant_2 : c.participant_1
    )
    const convIds = conversations.map((c: { id: string }) => c.id)

    // Charger profils sociaux + dernier message de chaque conversation en parallèle
    const [{ data: socialProfiles }, { data: lastMessages }] = await Promise.all([
      supabase
        .from('social_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', contactIds),
      supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_id, read_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false }),
    ])

    const profileMap = new Map(
      (socialProfiles ?? []).map((p: { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }) => [p.user_id, p])
    )

    // Grouper les messages par conversation (garder uniquement le dernier)
    const lastMsgMap = new Map<string, { content: string; created_at: string; sender_id: string; read_at: string | null }>()
    for (const msg of (lastMessages ?? [])) {
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, {
          content: msg.content,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
          read_at: msg.read_at,
        })
      }
    }

    // Compter les messages non lus par conversation (message reçu par moi, non lu)
    const unreadMap = new Map<string, number>()
    for (const msg of (lastMessages ?? [])) {
      if (msg.sender_id !== user.id && !msg.read_at) {
        unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) ?? 0) + 1)
      }
    }

    const data = conversations.map((c: { id: string; participant_1: string; participant_2: string; last_message_at: string; created_at: string }) => {
      const contactId = c.participant_1 === user.id ? c.participant_2 : c.participant_1
      const profile = profileMap.get(contactId)
      const lastMsg = lastMsgMap.get(c.id)

      return {
        id: c.id,
        contact: {
          user_id: contactId,
          username: profile?.username ?? null,
          display_name: profile?.display_name ?? 'Athlète',
          avatar_url: profile?.avatar_url ?? null,
        },
        last_message: lastMsg ?? null,
        last_message_at: c.last_message_at,
        unread_count: unreadMap.get(c.id) ?? 0,
      }
    })

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/social/messages → { recipient_id, content } → créer/trouver conversation + envoyer message
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { recipient_id?: string; content?: string }
    const { recipient_id, content } = body

    if (!recipient_id || !content?.trim()) {
      return NextResponse.json({ data: null, error: 'recipient_id et content requis' }, { status: 400 })
    }
    if (recipient_id === user.id) {
      return NextResponse.json({ data: null, error: 'Impossible de s\'envoyer un message à soi-même' }, { status: 400 })
    }
    if (content.trim().length > 2000) {
      return NextResponse.json({ data: null, error: 'Message trop long (max 2000 caractères)' }, { status: 400 })
    }

    // Normaliser l'ordre des participants pour respecter la contrainte UNIQUE
    const [p1, p2] = [user.id, recipient_id].sort()

    // Upsert conversation (trouver ou créer)
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .upsert(
        { participant_1: p1, participant_2: p2, last_message_at: new Date().toISOString() },
        { onConflict: 'participant_1,participant_2' }
      )
      .select('id')
      .single()

    if (convError || !conv) {
      return NextResponse.json({ data: null, error: convError?.message ?? 'Erreur conversation' }, { status: 400 })
    }

    // Insérer le message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conv.id,
        sender_id: user.id,
        content: content.trim(),
      })
      .select()
      .single()

    if (msgError) return NextResponse.json({ data: null, error: msgError.message }, { status: 400 })

    // Mettre à jour last_message_at de la conversation
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conv.id)

    return NextResponse.json({ data: { conversation_id: conv.id, message }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
