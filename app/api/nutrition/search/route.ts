import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Recherche d'aliments : cache local d'abord, puis OpenFoodFacts
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const q = req.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) return NextResponse.json({ data: [], error: null })

    // 1. Chercher dans le cache local (foods_library)
    const { data: local } = await supabase
      .from('foods_library')
      .select('id, name, name_fr, brand, calories, protein_g, carbs_g, fat_g, fiber_g, barcode')
      .or(`name.ilike.%${q}%,name_fr.ilike.%${q}%`)
      .limit(10)

    if (local && local.length >= 5) {
      return NextResponse.json({ data: local, error: null, source: 'cache' })
    }

    // 2. Compléter avec OpenFoodFacts si pas assez de résultats locaux
    const offRes = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,product_name_fr,brands,nutriments`,
      {
        headers: { 'User-Agent': 'ForgeIQ/1.0 (https://getforgeiq.com)' },
        signal: AbortSignal.timeout(4000),
      }
    )

    const remote: typeof local = local ? [...local] : []

    if (offRes.ok) {
      const offData = await offRes.json()
      const products = (offData.products ?? []) as {
        code: string
        product_name?: string
        product_name_fr?: string
        brands?: string
        nutriments?: Record<string, number>
      }[]

      for (const p of products.slice(0, 10)) {
        const n = p.nutriments ?? {}
        // Skip si pas de données nutritionnelles
        if (!n['energy-kcal_100g'] && !n['energy-kcal']) continue
        // Skip si déjà dans les résultats locaux
        if (local?.some(l => l.barcode === p.code)) continue

        remote.push({
          id: null as unknown as string,
          name: p.product_name ?? p.product_name_fr ?? 'Produit inconnu',
          name_fr: p.product_name_fr ?? null,
          brand: p.brands ?? null,
          calories: n['energy-kcal_100g'] ?? n['energy-kcal'] ?? null,
          protein_g: n.proteins_100g ?? null,
          carbs_g: n.carbohydrates_100g ?? null,
          fat_g: n.fat_100g ?? null,
          fiber_g: n.fiber_100g ?? null,
          barcode: p.code ?? null,
        })
      }
    }

    return NextResponse.json({ data: remote.slice(0, 15), error: null, source: 'mixed' })
  } catch {
    return NextResponse.json({ data: [], error: null }) // Silent fallback
  }
}
