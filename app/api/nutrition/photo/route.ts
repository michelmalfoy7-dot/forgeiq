import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Analyse une photo d'aliments avec l'IA ForgeIQ (vision)
// Retourne une liste d'aliments avec macros estimées (format multi-aliments)
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
      model: 'claude-3-5-sonnet-20241022', // Vision confirmée — claude-sonnet-4 ne supporte pas les images
      max_tokens: 800,
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
              text: `Tu es un expert en nutrition. Analyse cette photo d'aliments et retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après, sans markdown, sans backticks.

Format attendu :
{
  "aliments": [
    {
      "nom": "Pomme",
      "quantite_estimee_g": 182,
      "calories": 95,
      "proteines_g": 0.5,
      "glucides_g": 25,
      "lipides_g": 0.3,
      "fibres_g": 4.4,
      "confiance": "haute"
    }
  ],
  "total": {
    "calories": 190,
    "proteines_g": 1,
    "glucides_g": 50,
    "lipides_g": 0.6
  },
  "note": "2 pommes moyennes estimées à 182g chacune"
}

Règles :
- Liste chaque aliment séparément (ex: 2 pommes = 2 entrées, ou 1 entrée avec quantite_estimee_g = 364)
- "confiance" vaut "haute", "moyenne" ou "faible"
- Si tu ne peux pas identifier les aliments, retourne : {"erreur": "aliments non identifiés"}`,
            },
          ],
        },
      ],
    })

    const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : ''

    // Parse JSON avec fallback regex si le modèle ajoute du texte ou du markdown
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return NextResponse.json({ data: null, error: 'Réponse IA invalide — réessaie' }, { status: 500 })
      }
      try {
        parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
      } catch {
        return NextResponse.json({ data: null, error: 'Format invalide — réessaie' }, { status: 500 })
      }
    }

    // Gestion des erreurs retournées par l'IA
    if (parsed.erreur || parsed.error) {
      return NextResponse.json({
        data: null,
        error: String(parsed.erreur ?? parsed.error),
      }, { status: 400 })
    }

    // Validation et normalisation
    const alimentsRaw = Array.isArray(parsed.aliments) ? parsed.aliments : []
    if (alimentsRaw.length === 0) {
      return NextResponse.json({ data: null, error: 'Aucun aliment identifié sur la photo' }, { status: 400 })
    }

    type AlimentRaw = Record<string, unknown>
    const total = (parsed.total as Record<string, number> | undefined) ?? {}

    return NextResponse.json({
      data: {
        aliments: alimentsRaw.map((a: AlimentRaw) => ({
          nom: String(a.nom ?? 'Aliment inconnu'),
          quantite_estimee_g: Math.max(1, Number(a.quantite_estimee_g ?? 100)),
          calories: a.calories != null ? Number(a.calories) : null,
          proteines_g: a.proteines_g != null ? Number(a.proteines_g) : null,
          glucides_g: a.glucides_g != null ? Number(a.glucides_g) : null,
          lipides_g: a.lipides_g != null ? Number(a.lipides_g) : null,
          fibres_g: a.fibres_g != null ? Number(a.fibres_g) : null,
          confiance: String(a.confiance ?? 'faible') as 'haute' | 'moyenne' | 'faible',
        })),
        total: {
          calories: Number(total.calories ?? 0),
          proteines_g: Number(total.proteines_g ?? 0),
          glucides_g: Number(total.glucides_g ?? 0),
          lipides_g: Number(total.lipides_g ?? 0),
        },
        note: String(parsed.note ?? ''),
      },
      error: null,
    })
  } catch (err) {
    console.error('Nutrition photo error:', err)
    // Exposer le message réel pour faciliter le debug (à retirer en prod stable)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ data: null, error: `Erreur analyse photo: ${detail}` }, { status: 500 })
  }
}
