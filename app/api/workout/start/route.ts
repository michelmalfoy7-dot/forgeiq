import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { session_name, program_id } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Valider et normaliser le nom de séance
    const rawName = typeof session_name === 'string' ? session_name.trim() : ''
    const safeName = rawName.length > 0 ? rawName.slice(0, 100) : 'Séance libre'

    const { data, error } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        program_id: program_id ?? null,
        session_name: safeName,
        session_date: new Date().toISOString().split('T')[0],
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    return NextResponse.json({ data, error: null })
  } catch (e) {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
