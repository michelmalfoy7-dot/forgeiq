import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Analyse une photo d'aliment avec Claude Vision
// Accepte : base64 image (jpeg/png/webp) ou URL
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { image_base64, media_type = 'image/jpeg' } = body as {
      image_base64: string
      media_type?: string
    }

    if (!image_base64) {
      return NextResponse.json({ data: null, error: 'Image manquante' }, { status: 400 })
    }

    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: media_type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: image_base64,
              },
            },
            {
              type: 'text',
              text: `Analyse cette photo d'aliment et estime les valeurs nutritionnelles pour la portion visible.

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{
  "food_name": "nom de l'aliment en français",
  "quantity_g": 150,
  "calories": 250,
  "protein_g": 15,
  "carbs_g": 30,
  "fat_g": 8,
  "fiber_g": 3,
  "confidence": "high|medium|low",
  "note": "explication courte de l'estimation (max 15 mots)"
}

Si tu vois plusieurs aliments, estime l'ensemble de la photo comme une seule portion.
Si l'image n'est pas un aliment, retourne { "error": "Pas d'aliment détecté" }.`,
            },
          ],
        },
      ],
    })

    const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
    const parsed = JSON.parse(raw)

    if (parsed.error) {
      return NextResponse.json({ data: null, error: parsed.error }, { status: 400 })
    }

    return NextResponse.json({
      data: {
        food_name: parsed.food_name ?? 'Aliment inconnu',
        quantity_g: parsed.quantity_g ?? 100,
        calories: parsed.calories ?? null,
        protein_g: parsed.protein_g ?? null,
        carbs_g: parsed.carbs_g ?? null,
        fat_g: parsed.fat_g ?? null,
        fiber_g: parsed.fiber_g ?? null,
        confidence: parsed.confidence ?? 'low',
        note: parsed.note ?? 'Estimation IA',
      },
      error: null,
    })
  } catch (err) {
    console.error('Nutrition photo error:', err)
    return NextResponse.json({ data: null, error: 'Erreur analyse photo' }, { status: 500 })
  }
}
