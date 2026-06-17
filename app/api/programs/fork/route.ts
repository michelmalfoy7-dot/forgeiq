import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { program_id } = await req.json()
    if (!program_id) return NextResponse.json({ data: null, error: 'program_id manquant' }, { status: 400 })

    // Récupérer le programme source
    const { data: source } = await supabase
      .from('programs')
      .select('id, name, description, level, goal, equipment, sessions_per_week, duration_weeks, structure, is_public')
      .eq('id', program_id)
      .maybeSingle()

    if (!source) return NextResponse.json({ data: null, error: 'Programme introuvable' }, { status: 404 })

    // Vérifier que le programme est accessible (public ou appartient à l'user)
    if (!source.is_public) {
      const { data: own } = await supabase
        .from('programs')
        .select('id')
        .eq('id', program_id)
        .eq('created_by', user.id)
        .maybeSingle()
      if (!own) return NextResponse.json({ data: null, error: 'Programme non accessible' }, { status: 403 })
    }

    const slug = `fork-${user.id.slice(0, 8)}-${Date.now()}`

    // Créer la copie
    const { data: fork, error: insertError } = await supabase
      .from('programs')
      .insert({
        name: `${source.name} (copie)`,
        slug,
        description: source.description,
        level: source.level,
        goal: source.goal,
        equipment: source.equipment,
        sessions_per_week: source.sessions_per_week,
        duration_weeks: source.duration_weeks,
        structure: source.structure,
        is_custom: true,
        is_public: false,
        created_by: user.id,
        adopted_count: 0,
      })
      .select('id, name, slug')
      .maybeSingle()

    if (insertError) return NextResponse.json({ data: null, error: insertError.message }, { status: 500 })
    if (!fork) return NextResponse.json({ data: null, error: 'Fork non créé' }, { status: 500 })

    // Adopter la copie comme programme actif
    await supabase
      .from('profiles')
      .update({ current_program_id: fork.id, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    // Incrémenter le compteur d'adoptions sur la source (si communauté)
    await supabase.rpc('increment_program_adopted', { pid: program_id })

    return NextResponse.json({ data: { id: fork.id, name: fork.name, slug: fork.slug }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
