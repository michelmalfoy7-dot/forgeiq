import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { MessagesClient } from '@/components/social/MessagesClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Messages | ForgeIQ' }

type Conversation = {
  id: string
  contact: {
    user_id: string
    username: string | null
    display_name: string
    avatar_url: string | null
  }
  last_message: {
    content: string
    created_at: string
    sender_id: string
    read_at: string | null
  } | null
  last_message_at: string
  unread_count: number
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { new: newRecipientId } = await searchParams

  // Si ?new=<recipientId> → créer/trouver conversation et rediriger directement
  if (newRecipientId && newRecipientId !== user.id) {
    const [p1, p2] = [user.id, newRecipientId].sort()

    // Chercher une conversation existante d'abord
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('participant_1', p1)
      .eq('participant_2', p2)
      .maybeSingle()

    if (existingConv) {
      redirect(`/social/messages/${existingConv.id}`)
    }

    // Créer la conversation
    const { data: newConv, error: insertErr } = await supabase
      .from('conversations')
      .insert({ participant_1: p1, participant_2: p2 })
      .select('id')
      .maybeSingle()

    if (newConv) {
      redirect(`/social/messages/${newConv.id}`)
    }
    // En cas de conflit (race condition), relire la conv existante
    if (insertErr?.code === '23505') {
      const { data: raceConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', p1)
        .eq('participant_2', p2)
        .maybeSingle()
      if (raceConv) redirect(`/social/messages/${raceConv.id}`)
    }
    // Si erreur création → afficher la liste normalement
  }

  // Charger les conversations via Supabase directement (pas de fetch HTTP interne)
  const { data: convRaw } = await supabase
    .from('conversations')
    .select('id, participant_1, participant_2, last_message_at, created_at')
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .order('last_message_at', { ascending: false })
    .limit(50)

  let conversations: Conversation[] = []

  if (convRaw && convRaw.length > 0) {
    const contactIds = convRaw.map((c: { participant_1: string; participant_2: string }) =>
      c.participant_1 === user.id ? c.participant_2 : c.participant_1
    )
    const convIds = convRaw.map((c: { id: string }) => c.id)

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
    const lastMsgMap = new Map<string, { content: string; created_at: string; sender_id: string; read_at: string | null }>()
    const unreadMap = new Map<string, number>()

    for (const msg of (lastMessages ?? [])) {
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, {
          content: msg.content,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
          read_at: msg.read_at,
        })
      }
      if (msg.sender_id !== user.id && !msg.read_at) {
        unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) ?? 0) + 1)
      }
    }

    conversations = convRaw.map((c: { id: string; participant_1: string; participant_2: string; last_message_at: string; created_at: string }) => {
      const contactId = c.participant_1 === user.id ? c.participant_2 : c.participant_1
      const profile = profileMap.get(contactId)
      return {
        id: c.id,
        contact: {
          user_id: contactId,
          username: profile?.username ?? null,
          display_name: profile?.display_name ?? 'Athlète',
          avatar_url: profile?.avatar_url ?? null,
        },
        last_message: lastMsgMap.get(c.id) ?? null,
        last_message_at: c.last_message_at,
        unread_count: unreadMap.get(c.id) ?? 0,
      }
    })
  }

  return <MessagesClient conversations={conversations} currentUserId={user.id} />
}
