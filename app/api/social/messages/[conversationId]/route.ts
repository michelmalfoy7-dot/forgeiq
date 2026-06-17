import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ conversationId: string }> }

const PAGE_LIMIT = 50

// GET /api/social/messages/[conversationId]?before=<message_id>
// Retourne les PAGE_LIMIT derniers messages (ordre ASC).
// Pagination vers le passé : passer ?before=<id> pour charger les messages antérieurs.
// Réponse : { messages, contact, current_user_id, hasMore }
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { conversationId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Curseur optionnel pour pagination vers le passé
    const { searchParams } = new URL(req.url)
    const before = searchParams.get('before') // ID du message le plus ancien déjà chargé

    // Vérifier que l'utilisateur est bien dans cette conversation (RLS le fait aussi, mais garde explicite)
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, participant_1, participant_2')
      .eq('id', conversationId)
      .maybeSingle()

    if (!conv) return NextResponse.json({ data: null, error: 'Conversation introuvable' }, { status: 404 })
    if (conv.participant_1 !== user.id && conv.participant_2 !== user.id) {
      return NextResponse.json({ data: null, error: 'Accès refusé' }, { status: 403 })
    }

    // Construire la requête de base
    let query = supabase
      .from('messages')
      .select('id, sender_id, content, created_at, read_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(PAGE_LIMIT + 1) // +1 pour détecter s'il y a une page précédente

    // Pagination par curseur : si `before` fourni, on récupère les messages antérieurs
    if (before) {
      // Récupérer le created_at du message-curseur pour filtrer par date
      const { data: cursorMsg } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', before)
        .maybeSingle()

      if (cursorMsg) {
        query = query.lt('created_at', cursorMsg.created_at)
      }
    }

    const { data: rawMessages, error } = await query

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    // Déterminer s'il existe des messages encore plus anciens
    const hasMore = (rawMessages ?? []).length > PAGE_LIMIT
    const messages = hasMore ? rawMessages!.slice(0, PAGE_LIMIT) : (rawMessages ?? [])

    // Marquer les messages reçus non lus comme lus (uniquement sur la première page, pas les pages historiques)
    if (!before) {
      const unreadIds = messages
        .filter((m: { sender_id: string; read_at: string | null }) => m.sender_id !== user.id && !m.read_at)
        .map((m: { id: string }) => m.id)

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds)
      }
    }

    // Retourner en ordre chronologique ASC (les plus récents à la fin)
    const ordered = [...messages].reverse()

    // Charger le profil du contact pour le header (seulement à la première page)
    const contactId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
    const { data: contactProfile } = !before
      ? await supabase
          .from('social_profiles')
          .select('user_id, username, display_name, avatar_url')
          .eq('user_id', contactId)
          .maybeSingle()
      : { data: null }

    return NextResponse.json({
      data: {
        messages: ordered,
        hasMore,
        contact: contactProfile
          ? {
              user_id: contactProfile.user_id,
              username: contactProfile.username,
              display_name: contactProfile.display_name ?? 'Athlète',
              avatar_url: contactProfile.avatar_url ?? null,
            }
          : (!before ? { user_id: contactId, username: null, display_name: 'Athlète', avatar_url: null } : null),
        current_user_id: user.id,
      },
      error: null,
    })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/social/messages/[conversationId] → { content } → envoyer un message
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { conversationId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json() as { content?: string }
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ data: null, error: 'content requis' }, { status: 400 })
    }
    if (content.trim().length > 2000) {
      return NextResponse.json({ data: null, error: 'Message trop long (max 2000 caractères)' }, { status: 400 })
    }

    // Vérifier que l'utilisateur est dans cette conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, participant_1, participant_2')
      .eq('id', conversationId)
      .maybeSingle()

    if (!conv) return NextResponse.json({ data: null, error: 'Conversation introuvable' }, { status: 404 })
    if (conv.participant_1 !== user.id && conv.participant_2 !== user.id) {
      return NextResponse.json({ data: null, error: 'Accès refusé' }, { status: 403 })
    }

    // Insérer le message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

    // Mettre à jour last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    return NextResponse.json({ data: message, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
