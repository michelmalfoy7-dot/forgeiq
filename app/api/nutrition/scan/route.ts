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

    const food = {
      name:      p.product_name ?? p.product_name_fr ?? 'Produit inconnu',
      name_fr:   p.product_name_fr ?? p.product_name ?? null,
      brand:     p.brands ?? null,
      barcode,
      calories:  n['energy-kcal_100g'] ?? n['energy-kcal'] ?? null,
      protein_g: n.proteins_100g ?? null,
      carbs_g:   n.carbohydrates_100g ?? null,
      fat_g:     n.fat_100g ?? null,
      fiber_g:   n.fiber_100g ?? null,
      sugar_g:   n.sugars_100g ?? null,
      sodium_mg: n.sodium_100g ? n.sodium_100g * 1000 : null,
      source:    'openfoodfacts' as const,
      image_url: p.image_url ?? null,
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
