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

    // Vérifier que le programme existe
    const { data: program } = await supabase
      .from('programs').select('id, name').eq('id', program_id).maybeSingle()
    if (!program) return NextResponse.json({ data: null, error: 'Programme introuvable' }, { status: 404 })

    // Mettre à jour le programme actuel du profil
    const { error } = await supabase
      .from('profiles')
      .update({ current_program_id: program_id, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

    return NextResponse.json({ data: { program_id, program_name: program.name }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
