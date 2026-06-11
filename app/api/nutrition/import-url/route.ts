import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AI_MODELS } from '@/lib/utils/ai-models'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Nettoie le HTML en texte brut (supprime balises, scripts, styles)
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim()
    .slice(0, 8000) // Limite contexte IA
}

/**
 * POST /api/nutrition/import-url
 * Extrait une recette depuis une URL web et retourne les ingrédients avec macros estimées.
 * Réservé aux utilisateurs Pro (coût IA).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Vérification plan — feature Pro uniquement
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, is_admin, referral_pro_until')
      .eq('id', user.id)
      .single()

    const { isProUser } = await import('@/lib/utils/plan')
    const isPro = isProUser(profile)
    if (!isPro) {
      return NextResponse.json({
        data: null,
        error: 'L\'import depuis URL est réservé aux membres Pro.',
        requiresPro: true,
      }, { status: 403 })
    }

    const { url } = await req.json() as { url: string }
    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ data: null, error: 'URL invalide' }, { status: 400 })
    }

    // Télécharger la page web
    let pageText: string
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ForgeIQ/1.0; +https://getforgeiq.com)',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const html = await response.text()
      pageText = htmlToText(html)
    } catch (err) {
      return NextResponse.json({
        data: null,
        error: 'Impossible de charger cette URL. Vérifie qu\'elle est accessible.',
      }, { status: 400 })
    }

    if (pageText.length < 100) {
      return NextResponse.json({
        data: null,
        error: 'Page trop courte ou vide. Essaie une autre URL.',
      }, { status: 400 })
    }

    // Extraction IA
    const prompt = `Tu es un nutritionniste expert. Extrait la recette du texte suivant et estime les valeurs nutritionnelles de chaque ingrédient.

Texte de la page :
---
${pageText}
---

Retourne UNIQUEMENT ce JSON valide (sans markdown, sans texte avant/après) :
{
  "nom": "Nom de la recette",
  "description": "Description courte (optionnel)",
  "portions": 4,
  "ingredients": [
    {
      "nom": "Nom de l'ingrédient",
      "quantite_g": 150,
      "calories_per_100g": 89,
      "protein_per_100g": 3.5,
      "carbs_per_100g": 20,
      "fat_per_100g": 0.3,
      "fiber_per_100g": 2.6
    }
  ],
  "note": "Conseil de préparation ou note nutritionnelle (optionnel)"
}

Règles :
- Si une quantité est en unités (œufs, tranches...), convertis en grammes estimés
- Estime les macros pour 100g de chaque ingrédient (données CIQUAL/USDA approximatives)
- Si la recette est introuvable dans le texte, retourne : {"erreur": "Recette non trouvée dans cette page"}
- Extrais uniquement les ingrédients réels (pas les ustensiles, pas les étapes de préparation)`

    const res = await anthropic.messages.create({
      model: AI_MODELS.import,
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : ''

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ data: null, error: 'Réponse IA invalide' }, { status: 500 })
      parsed = JSON.parse(match[0]) as Record<string, unknown>
    }

    if (parsed.erreur) {
      return NextResponse.json({ data: null, error: String(parsed.erreur) }, { status: 400 })
    }

    // Calculer les macros par portion
    type Ingredient = {
      nom: string; quantite_g: number
      calories_per_100g: number; protein_per_100g: number
      carbs_per_100g: number; fat_per_100g: number; fiber_per_100g?: number
    }
    const ingredients = (parsed.ingredients as Ingredient[] | undefined) ?? []
    const portions = Math.max(1, Number(parsed.portions ?? 1))

    const totals = ingredients.reduce((acc, ing) => {
      const mult = (ing.quantite_g ?? 100) / 100
      return {
        calories: acc.calories + (ing.calories_per_100g ?? 0) * mult,
        protein_g: acc.protein_g + (ing.protein_per_100g ?? 0) * mult,
        carbs_g: acc.carbs_g + (ing.carbs_per_100g ?? 0) * mult,
        fat_g: acc.fat_g + (ing.fat_per_100g ?? 0) * mult,
        fiber_g: acc.fiber_g + (ing.fiber_per_100g ?? 0) * mult,
      }
    }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 })

    return NextResponse.json({
      data: {
        nom: String(parsed.nom ?? 'Recette importée'),
        description: parsed.description ? String(parsed.description) : null,
        portions,
        ingredients,
        macros_per_portion: {
          calories: Math.round(totals.calories / portions),
          protein_g: Math.round(totals.protein_g / portions * 10) / 10,
          carbs_g: Math.round(totals.carbs_g / portions * 10) / 10,
          fat_g: Math.round(totals.fat_g / portions * 10) / 10,
          fiber_g: Math.round(totals.fiber_g / portions * 10) / 10,
        },
        note: parsed.note ? String(parsed.note) : null,
        source_url: url,
      },
      error: null,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ data: null, error: `Erreur: ${detail}` }, { status: 500 })
  }
}
