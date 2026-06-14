import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // 5 inscriptions max par IP par heure (anti-spam waitlist)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!rateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ data: null, error: 'Trop de requêtes, réessaie plus tard' }, { status: 429 })
    }

    const { email } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ data: null, error: 'Email invalide' }, { status: 400 })
    }

    const supabase = await createClient()

    // Insérer dans la waitlist (ignore si déjà présent)
    const { error } = await supabase
      .from('waitlist')
      .upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email', ignoreDuplicates: true })

    if (error) {
      console.error('Waitlist error:', error)
      return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
