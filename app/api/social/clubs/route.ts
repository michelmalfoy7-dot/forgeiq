'use server'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/social/clubs
// - ?my=true  → clubs de l'utilisateur connecté
// - ?id=X     → détail d'un club (membres + isMember)
// - (aucun)   → liste des clubs publics triés par member_count DESC
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const my = searchParams.get('my') === 'true'
  const id = searchParams.get('id')

  // Détail d'un club spécifique
  if (id) {
    const { data: club, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !club) {
      return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })
    }

    const [{ data: members }, { data: membership }] = await Promise.all([
      supabase
        .from('club_members')
        .select('user_id, role, joined_at')
        .eq('club_id', id)
        .order('joined_at', { ascending: true })
        .limit(50),
      supabase
        .from('club_members')
        .select('role')
        .eq('club_id', id)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    return NextResponse.json({
      data: {
        ...club,
        members: members ?? [],
        isMember: !!membership,
        myRole: membership?.role ?? null,
      },
    })
  }

  // Clubs de l'utilisateur
  if (my) {
    const { data: memberships, error } = await supabase
      .from('club_members')
      .select('club_id, role, joined_at')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const clubIds = (memberships ?? []).map((m) => m.club_id)
    if (clubIds.length === 0) return NextResponse.json({ data: [] })

    const { data: clubs } = await supabase
      .from('clubs')
      .select('*')
      .in('id', clubIds)
      .order('member_count', { ascending: false })

    const roleMap = new Map((memberships ?? []).map((m) => [m.club_id, m.role]))
    const enriched = (clubs ?? []).map((c) => ({ ...c, myRole: roleMap.get(c.id) ?? 'member' }))

    return NextResponse.json({ data: enriched })
  }

  // Tous les clubs publics
  const { data: clubs, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('is_public', true)
    .order('member_count', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Injecter isMember pour l'utilisateur courant
  const clubIds = (clubs ?? []).map((c) => c.id)
  let memberSet = new Set<string>()
  if (clubIds.length > 0) {
    const { data: myMemberships } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', user.id)
      .in('club_id', clubIds)
    memberSet = new Set((myMemberships ?? []).map((m) => m.club_id))
  }

  const enriched = (clubs ?? []).map((c) => ({ ...c, isMember: memberSet.has(c.id) }))
  return NextResponse.json({ data: enriched })
}

// POST /api/social/clubs — créer un club
// Body: { name: string, description?: string, emoji?: string }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const name: string = (body.name ?? '').trim()
  const description: string = (body.description ?? '').trim()
  const emoji: string = body.emoji ?? '🏋️'

  if (!name) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
  if (name.length > 50) return NextResponse.json({ error: 'Nom trop long (50 car. max)' }, { status: 400 })

  // Créer le club (member_count = 1 : le créateur)
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .insert({ name, description: description || null, emoji, creator_id: user.id, member_count: 1 })
    .select()
    .maybeSingle()

  if (clubError || !club) {
    return NextResponse.json({ error: clubError?.message ?? 'Erreur création club' }, { status: 500 })
  }

  // Auto-rejoindre en tant qu'admin
  const { error: memberError } = await supabase
    .from('club_members')
    .insert({ club_id: club.id, user_id: user.id, role: 'admin' })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json({ data: club }, { status: 201 })
}

// PATCH /api/social/clubs — rejoindre ou quitter un club
// Body: { club_id: string, action: 'join' | 'leave' }
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const club_id: string = body.club_id ?? ''
  const action: 'join' | 'leave' = body.action

  if (!club_id) return NextResponse.json({ error: 'club_id requis' }, { status: 400 })
  if (action !== 'join' && action !== 'leave') {
    return NextResponse.json({ error: "action doit être 'join' ou 'leave'" }, { status: 400 })
  }

  // Vérifier que le club existe
  const { data: club } = await supabase
    .from('clubs')
    .select('id, creator_id, member_count')
    .eq('id', club_id)
    .maybeSingle()

  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  if (action === 'join') {
    // Vérifier que l'user n'est pas déjà membre
    const { data: existing } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('club_id', club_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) return NextResponse.json({ data: { action: 'join', already_member: true } })

    const { error } = await supabase
      .from('club_members')
      .insert({ club_id, user_id: user.id, role: 'member' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase
      .from('clubs')
      .update({ member_count: (club.member_count ?? 0) + 1 })
      .eq('id', club_id)

    return NextResponse.json({ data: { action: 'join' } })
  }

  // Leave — le créateur ne peut pas quitter
  if (club.creator_id === user.id) {
    return NextResponse.json(
      { error: 'Le créateur ne peut pas quitter le club.' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('club_members')
    .delete()
    .eq('club_id', club_id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('clubs')
    .update({ member_count: Math.max(0, (club.member_count ?? 1) - 1) })
    .eq('id', club_id)

  return NextResponse.json({ data: { action: 'leave' } })
}
