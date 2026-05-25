import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Recherche d'aliments : cache local (foods_library) d'abord, puis OpenFoodFacts
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const q = req.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) return NextResponse.json({ data: [], error: null })

    // ── 1. Recherche locale — deux passes pour couvrir accents et ligatures ──

    // Passe A : ILIKE simple (exact substring, sans transformation)
    const { data: passA } = await supabase
      .from('foods_library')
      .select('id, name, name_fr, brand, calories, protein_g, carbs_g, fat_g, fiber_g, barcode')
      .or(`name.ilike.%${q}%,name_fr.ilike.%${q}%`)
      .limit(15)

    // Passe B : Full-text search français (gère les accents, déclinaisons, Œ/oe, etc.)
    // L'index GIN 'french' sur to_tsvector('french', coalesce(name_fr, name)) est déjà en place
    const { data: passB } = await supabase
      .from('foods_library')
      .select('id, name, name_fr, brand, calories, protein_g, carbs_g, fat_g, fiber_g, barcode')
      .textSearch('name_fr', q, { type: 'websearch', config: 'french' })
      .limit(10)

    // Fusionner et dédupliquer par id — passA en premier (plus précis), passB complète
    const seenIds = new Set<string>()
    const merged: typeof passA = []

    for (const r of [...(passA ?? []), ...(passB ?? [])]) {
      if (!r.id || seenIds.has(r.id)) continue
      seenIds.add(r.id)
      merged.push(r)
    }

    // Trier : priorité aux résultats dont le name_fr commence par la query (meilleur match)
    const qLow = q.toLowerCase()
    merged.sort((a, b) => {
      const aFr = (a.name_fr ?? '').toLowerCase()
      const bFr = (b.name_fr ?? '').toLowerCase()
      const aScore = aFr.startsWith(qLow) ? 0 : aFr.includes(qLow) ? 1 : 2
      const bScore = bFr.startsWith(qLow) ? 0 : bFr.includes(qLow) ? 1 : 2
      return aScore - bScore
    })

    // Si on a 5+ résultats locaux avec données → on retourne directement
    const withData = merged.filter(r => r.calories != null)
    if (withData.length >= 5) {
      return NextResponse.json({ data: withData.slice(0, 15), error: null, source: 'local' })
    }

    // ── 2. Compléter avec OpenFoodFacts (produits packagés avec code-barres) ──
    const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&action=process&json=1&page_size=20&fields=code,product_name,product_name_fr,brands,nutriments&sort_by=unique_scans_n`

    const remote: typeof merged = [...merged]

    try {
      const offRes = await fetch(offUrl, {
        headers: { 'User-Agent': 'ForgeIQ/1.0 (https://getforgeiq.com; contact@getforgeiq.com)' },
        signal: AbortSignal.timeout(5000),
      })

      if (offRes.ok) {
        const offData = await offRes.json()
        const products = (offData.products ?? []) as {
          code: string
          product_name?: string
          product_name_fr?: string
          brands?: string
          nutriments?: Record<string, number>
        }[]

        const existingBarcodes = new Set((merged ?? []).map(l => l.barcode).filter(Boolean))

        for (const p of products.slice(0, 15)) {
          const n = p.nutriments ?? {}
          // Parsing robuste des calories OFF (plusieurs formats possibles)
          const kcal = n['energy-kcal_100g']
            ?? n['energy-kcal']
            ?? (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184 * 10) / 10 : null)
          if (!kcal) continue

          const name = p.product_name_fr ?? p.product_name
          if (!name || name.length < 3) continue

          if (p.code && existingBarcodes.has(p.code)) continue

          remote.push({
            id: null as unknown as string,
            name: p.product_name ?? name,
            name_fr: p.product_name_fr ?? null,
            brand: p.brands?.split(',')[0].trim() ?? null,
            calories: kcal,
            protein_g: n['proteins_100g'] ?? null,
            carbs_g: n['carbohydrates_100g'] ?? null,
            fat_g: n['fat_100g'] ?? null,
            fiber_g: n['fiber_100g'] ?? n['fibre_100g'] ?? null,
            barcode: p.code ?? null,
          })
        }
      }
    } catch {
      // OpenFoodFacts timeout → résultats locaux seulement
    }

    return NextResponse.json({ data: remote.slice(0, 15), error: null, source: 'mixed' })
  } catch {
    return NextResponse.json({ data: [], error: null })
  }
}
