import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { program_id, publish } = await req.json()
    if (!program_id) return NextResponse.json({ data: null, error: 'program_id manquant' }, { status: 400 })

    // Vérifier que l'user est bien l'auteur
    const { data: program } = await supabase
      .from('programs')
      .select('id, name, is_custom, created_by, community_published_at')
      .eq('id', program_id)
      .eq('created_by', user.id)
      .eq('is_custom', true)
      .maybeSingle()

    if (!program) return NextResponse.json({ data: null, error: 'Programme introuvable ou non autorisé' }, { status: 403 })

    const updates: Record<string, unknown> = {
      is_public: publish,
      updated_at: new Date().toISOString(),
    }
    if (publish && !(program as Record<string, unknown>).community_published_at) {
      updates.community_published_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('programs')
      .update(updates)
      .eq('id', program_id)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

    return NextResponse.json({ data: { program_id, published: publish }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
