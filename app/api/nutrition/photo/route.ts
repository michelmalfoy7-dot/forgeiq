import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AI_MODELS } from '@/lib/utils/ai-models'
import { PLAN_SELECT, isRealProUser, isLifetimeUser, type ProfileForPlan } from '@/lib/utils/plan'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Vercel — analyse vision peut prendre jusqu'à 30s

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Limites analyses photo selon le plan
// Photo IA = feature Pro uniquement — coût Anthropic Vision non négligeable
const PHOTO_LIMITS = {
  free:     0,        // Gratuit : 0 — feature Pro
  monthly:  60,       // Pro mensuel — ~2/jour
  annual:   Infinity, // Pro annuel — illimité
  lifetime: Infinity, // À vie — illimité
}

// Analyse une photo d'aliments avec l'IA (vision)
// Retourne une liste d'aliments avec macros estimées
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // ── Vérification des limites ────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select(PLAN_SELECT)
      .eq('id', user.id)
      .maybeSingle()

    const planProfile = profile as ProfileForPlan
    const proUser = isRealProUser(planProfile)

    let photoLimit: number
    if (planProfile?.is_admin || isLifetimeUser(planProfile)) {
      photoLimit = PHOTO_LIMITS.lifetime
    } else if (planProfile?.subscription_status === 'pro' && planProfile?.subscription_plan === 'annual') {
      photoLimit = PHOTO_LIMITS.annual
    } else if (planProfile?.subscription_status === 'pro') {
      photoLimit = PHOTO_LIMITS.monthly
    } else {
      photoLimit = PHOTO_LIMITS.free
    }

    if (!proUser) {
      return NextResponse.json({
        data: null,
        error: 'L\'analyse photo est réservée aux abonnés Pro. Passe en Pro pour scanner tes repas en photo.',
        limitReached: true,
        isPro: false,
      }, { status: 403 })
    }

    if (!planProfile?.is_admin && photoLimit !== Infinity) {
      // Pro mensuel → compter ce mois-ci
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('food_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source', 'photo')
        .gte('created_at', startOfMonth.toISOString())
      const photoCount = count ?? 0

      if (photoCount >= photoLimit) {
        return NextResponse.json({
          data: null,
          error: `Limite de ${photoLimit} analyses photo atteinte ce mois-ci.`,
          limitReached: true,
          count: photoCount,
          limit: photoLimit,
          isFree: !proUser,
        }, { status: 429 })
      }
    }
    // ───────────────────────────────────────────────────────────────────

    const body = await req.json()
    const { image_base64, media_type = 'image/jpeg' } = body as {
      image_base64: string
      media_type?: string
    }

    if (!image_base64) {
      return NextResponse.json({ data: null, error: 'Image manquante' }, { status: 400 })
    }

    // Vérification taille image (base64) — limite ~4MB décodé ≈ ~5.5MB base64
    if (image_base64.length > 5_500_000) {
      return NextResponse.json({
        data: null,
        error: 'Photo trop lourde. Prends une photo plus proche ou utilise la galerie.',
      }, { status: 400 })
    }

    const res = await anthropic.messages.create({
      // claude-haiku-4-5 : modèle vision Haiku — ~$0.003/analyse, qualité suffisante
      model: AI_MODELS.photo,
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
    return NextResponse.json({ data: null, error: 'Erreur analyse photo — réessaie dans quelques instants' }, { status: 500 })
  }
}
