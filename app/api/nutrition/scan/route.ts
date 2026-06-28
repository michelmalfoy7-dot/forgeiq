import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Lookup barcode → OpenFoodFacts → cache dans foods_library
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Rate-limit — empêche l'énumération scriptée des barcodes OpenFoodFacts (60/min/user, large pour un usage réel)
    if (!rateLimit(`scan:${user.id}`, 60, 60 * 1000)) {
      return NextResponse.json({ data: null, error: 'Trop de scans — réessaie dans une minute.' }, { status: 429 })
    }

    const barcode = req.nextUrl.searchParams.get('barcode')
    if (!barcode) return NextResponse.json({ data: null, error: 'Barcode manquant' }, { status: 400 })

    // 1. Chercher dans le cache local d'abord
    const { data: cached } = await supabase
      .from('foods_library')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle()

    if (cached) {
      return NextResponse.json({ data: cached, error: null, source: 'cache' })
    }

    // 2. Appeler OpenFoodFacts API — isolé dans son propre try/catch pour que
    //    un timeout ou une erreur réseau renvoie 404 et non 500
    let food: {
      name: string; name_fr: string | null; brand: string | null; barcode: string
      calories: number | null; protein_g: number | null; carbs_g: number | null
      fat_g: number | null; fiber_g: number | null; sugar_g: number | null
      sodium_mg: number | null; source: 'openfoodfacts'; image_url: string | null
      iron_mg: number | null; magnesium_mg: number | null; zinc_mg: number | null
      calcium_mg: number | null; potassium_mg: number | null
      vitamin_c_mg: number | null; vitamin_d_mcg: number | null
    }

    try {
      const offRes = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,product_name_fr,brands,nutriments,image_url`,
        {
          headers: { 'User-Agent': 'ForgeIQ/1.0 (https://getforgeiq.com)' },
          signal: AbortSignal.timeout(5000),
        }
      )

      if (!offRes.ok) {
        return NextResponse.json({ data: null, error: 'Produit non trouvé' }, { status: 404 })
      }

      const offData = await offRes.json()
      if (offData.status !== 1 || !offData.product) {
        return NextResponse.json({ data: null, error: 'Produit non trouvé dans OpenFoodFacts' }, { status: 404 })
      }

      const p = offData.product
      const n = p.nutriments ?? {}

      // Open Food Facts a des noms de champs inconsistants selon les produits
      // On essaie toutes les variantes connues
      const kcal =
        n['energy-kcal_100g'] ?? n['energy-kcal'] ??
        n['energy_kcal_100g'] ?? n['energy_kcal'] ??
        // Fallback kJ → kcal (1 kcal ≈ 4.184 kJ)
        (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184) : null) ??
        (n['energy-kj_100g'] ? Math.round(n['energy-kj_100g'] / 4.184) : null) ?? null

      // Helper : extraire une valeur micro depuis OFF (retourne null si absent ou 0)
      const micro = (key: string): number | null => {
        const v = n[key] ?? n[key.replace('_100g', '')] ?? null
        return v != null && v > 0 ? v : null
      }

      food = {
        name:      p.product_name_fr ?? p.product_name ?? 'Produit inconnu',
        name_fr:   p.product_name_fr ?? p.product_name ?? null,
        brand:     p.brands ?? null,
        barcode,
        calories:  kcal,
        protein_g: n.proteins_100g ?? n.protein_100g ?? n['proteins-dry-matter_100g'] ?? null,
        carbs_g:   n.carbohydrates_100g ?? n.carbohydrate_100g ?? null,
        fat_g:     n.fat_100g ?? n.fats_100g ?? null,
        fiber_g:   n.fiber_100g ?? n.fibers_100g ?? null,
        sugar_g:   n.sugars_100g ?? n.sugar_100g ?? null,
        sodium_mg: n.sodium_100g ? Math.round(n.sodium_100g * 1000) : null,
        source:    'openfoodfacts' as const,
        image_url: p.image_front_url ?? p.image_url ?? null,
        iron_mg:       micro('iron_100g'),
        magnesium_mg:  micro('magnesium_100g'),
        zinc_mg:       micro('zinc_100g'),
        calcium_mg:    micro('calcium_100g'),
        potassium_mg:  micro('potassium_100g'),
        vitamin_c_mg:  micro('vitamin-c_100g'),
        vitamin_d_mcg: micro('vitamin-d_100g'),
      }
    } catch {
      // Timeout (5s) ou erreur réseau → 404 propre, pas de 500
      return NextResponse.json({ data: null, error: 'Produit non trouvé (OpenFoodFacts indisponible)' }, { status: 404 })
    }

    // 3. Mettre en cache dans foods_library
    // Race condition : deux requêtes simultanées peuvent tenter l'insert en même temps
    // → en cas de contrainte unique (barcode), récupérer la ligne existante plutôt que crasher
    let inserted: typeof food | null = null
    try {
      const { data } = await supabase
        .from('foods_library')
        .insert(food)
        .select()
        .maybeSingle()
      inserted = data
    } catch (insertErr) {
      const code = (insertErr as { code?: string })?.code
      if (code === '23505') {
        // Doublon barcode : récupérer la ligne déjà présente
        const { data: existing } = await supabase
          .from('foods_library')
          .select('*')
          .eq('barcode', barcode)
          .maybeSingle()
        inserted = existing
      }
      // Autre erreur → on retourne les données OFF sans cache
    }

    return NextResponse.json({ data: inserted ?? food, error: null, source: 'openfoodfacts' })
  } catch (err) {
    console.error('Nutrition scan error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
