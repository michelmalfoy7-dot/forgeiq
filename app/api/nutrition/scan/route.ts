import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Lookup barcode → OpenFoodFacts → cache dans foods_library
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const barcode = req.nextUrl.searchParams.get('barcode')
    if (!barcode) return NextResponse.json({ data: null, error: 'Barcode manquant' }, { status: 400 })

    // 1. Chercher dans le cache local d'abord
    const { data: cached } = await supabase
      .from('foods_library')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (cached) {
      return NextResponse.json({ data: cached, error: null, source: 'cache' })
    }

    // 2. Appeler OpenFoodFacts API
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

    const food = {
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
    }

    // 3. Mettre en cache dans foods_library
    const { data: inserted } = await supabase
      .from('foods_library')
      .insert(food)
      .select()
      .single()

    return NextResponse.json({ data: inserted ?? food, error: null, source: 'openfoodfacts' })
  } catch (err) {
    console.error('Nutrition scan error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
