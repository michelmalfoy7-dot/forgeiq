import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function sanitizeLike(raw: string): string {
  return raw.trim().slice(0, 100).replace(/[,()]/g, ' ').trim()
}

// USDA (SR Legacy) renvoie des descriptions en MAJUSCULES ("CHICKEN, BROILERS…").
// Sentence case pour la lisibilité côté FR. Ne touche pas aux noms déjà en casse mixte.
function cleanUsdaName(desc: string): string {
  const t = desc.trim()
  if (t !== t.toUpperCase()) return t // déjà en casse mixte → laisser
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

type FoodResult = {
  id: string | null
  name: string | null
  name_fr: string | null
  brand: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  barcode: string | null
  _src?: 'local' | 'usda' | 'off'
}

type UsdaNutrient = { nutrientId: number; value: number }
type UsdaFood = {
  fdcId: number
  description: string
  brandOwner?: string
  foodNutrients?: UsdaNutrient[]
}

// Mots-clés qui signalent un plat préparé / produit industriel
const PROCESSED_KW = [
  'préparé', 'cuisiné', 'assaisonné', 'aromatisé', 'royal', 'recette',
  'spécial', 'spéciale', 'allégé', 'light', 'saveur', 'aux herbes',
  'à l\'ail', 'bio ', 'halal', 'en conserve', 'surgelé', 'plat ',
  'sauce ', 'garni', 'farci', 'risotto', 'paella',
]

function rawScore(item: FoodResult): number {
  // OFF → toujours en fin
  if (!item.id && item._src === 'off') return 4
  // USDA sans marque → traité comme brut local
  const nameLow = (item.name_fr ?? item.name ?? '').toLowerCase()
  const wordCount = nameLow.trim().split(/\s+/).length
  const hasBrand = !!item.brand
  const isProcessed = PROCESSED_KW.some(k => nameLow.includes(k))
  if (!hasBrand && wordCount <= 3 && !isProcessed) return 0
  if (!hasBrand && !isProcessed) return 1
  if (hasBrand && wordCount <= 2) return 2
  return 3
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    if (!rateLimit(`nutrition-search:${user.id}`, 100, 60 * 1000)) {
      return NextResponse.json({ data: [], error: null })
    }

    const raw = req.nextUrl.searchParams.get('q') ?? ''
    const q = sanitizeLike(raw)
    if (!q || q.length < 2) return NextResponse.json({ data: [], error: null })

    // ── 1. Recherche locale — deux passes ──────────────────────────────────
    const [{ data: passA }, { data: passB }] = await Promise.all([
      supabase.from('foods_library')
        .select('id, name, name_fr, brand, calories, protein_g, carbs_g, fat_g, fiber_g, barcode')
        .or(`name.ilike.%${q}%,name_fr.ilike.%${q}%`)
        .limit(15),
      supabase.from('foods_library')
        .select('id, name, name_fr, brand, calories, protein_g, carbs_g, fat_g, fiber_g, barcode')
        .textSearch('name_fr', q, { type: 'websearch', config: 'french' })
        .limit(10),
    ])

    const seenIds = new Set<string>()
    const merged: FoodResult[] = []

    for (const r of [...(passA ?? []), ...(passB ?? [])]) {
      if (!r.id || seenIds.has(r.id)) continue
      seenIds.add(r.id)
      merged.push({ ...r, _src: 'local' })
    }

    const qLow = q.toLowerCase()

    // Si 5+ résultats locaux avec calories → retourne directement
    const withData = merged.filter(r => r.calories != null)
    if (withData.length >= 5) {
      withData.sort((a, b) => {
        const aFr = (a.name_fr ?? a.name ?? '').toLowerCase()
        const bFr = (b.name_fr ?? b.name ?? '').toLowerCase()
        const aMatch = aFr.startsWith(qLow) ? 0 : aFr.includes(qLow) ? 1 : 2
        const bMatch = bFr.startsWith(qLow) ? 0 : bFr.includes(qLow) ? 1 : 2
        return (aMatch * 10 + rawScore(a)) - (bMatch * 10 + rawScore(b))
      })
      return NextResponse.json({ data: withData.slice(0, 15), error: null, source: 'local' })
    }

    const remote: FoodResult[] = [...merged]
    const existingNames = new Set(merged.map(m => (m.name_fr ?? m.name ?? '').toLowerCase()))

    // ── 2. USDA FoodData Central (aliments bruts haute qualité) ────────────
    const usdaKey = process.env.USDA_API_KEY ?? 'DEMO_KEY'
    try {
      const usdaRes = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${encodeURIComponent(q)}&dataType=Foundation,SR%20Legacy&pageSize=20&sortBy=score&sortOrder=desc`,
        { signal: AbortSignal.timeout(4000) }
      )
      if (usdaRes.ok) {
        const { foods = [] } = await usdaRes.json() as { foods: UsdaFood[] }

        for (const food of foods) {
          const getNutrient = (id: number) =>
            (food.foodNutrients ?? []).find(n => n.nutrientId === id)?.value ?? null

          const kcal = getNutrient(1008)
          if (!kcal || !food.description) continue

          const nameLow = food.description.toLowerCase()
          if (existingNames.has(nameLow)) continue
          existingNames.add(nameLow)

          remote.push({
            id: null,
            name: cleanUsdaName(food.description),
            name_fr: null,
            brand: food.brandOwner ?? null,
            calories: kcal,
            protein_g: getNutrient(1003),
            carbs_g: getNutrient(1005),
            fat_g: getNutrient(1004),
            fiber_g: getNutrient(1079),
            barcode: null,
            _src: 'usda',
          })
        }
      }
    } catch {
      // USDA timeout → continuer sans
    }

    // ── 3. OpenFoodFacts (produits packagés avec code-barres) ──────────────
    const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&action=process&json=1&page_size=20&fields=code,product_name,product_name_fr,brands,nutriments&sort_by=unique_scans_n`
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
          const kcal = n['energy-kcal_100g']
            ?? n['energy-kcal']
            ?? (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184 * 10) / 10 : null)
          if (!kcal) continue

          const name = p.product_name_fr ?? p.product_name
          if (!name || name.length < 3) continue
          if (p.code && existingBarcodes.has(p.code)) continue

          remote.push({
            id: null,
            name: p.product_name ?? name,
            name_fr: p.product_name_fr ?? null,
            brand: p.brands?.split(',')[0].trim() ?? null,
            calories: kcal,
            protein_g: n['proteins_100g'] ?? null,
            carbs_g: n['carbohydrates_100g'] ?? null,
            fat_g: n['fat_100g'] ?? null,
            fiber_g: n['fiber_100g'] ?? n['fibre_100g'] ?? null,
            barcode: p.code ?? null,
            _src: 'off',
          })
        }
      }
    } catch {
      // OFF timeout → résultats sans OFF
    }

    // ── Tri final : local > USDA > OFF, puis pertinence ────────────────────
    remote.sort((a, b) => {
      const aFr = (a.name_fr ?? a.name ?? '').toLowerCase()
      const bFr = (b.name_fr ?? b.name ?? '').toLowerCase()
      const aMatch = aFr.startsWith(qLow) ? 0 : aFr.includes(qLow) ? 1 : 2
      const bMatch = bFr.startsWith(qLow) ? 0 : bFr.includes(qLow) ? 1 : 2
      return (aMatch * 10 + rawScore(a)) - (bMatch * 10 + rawScore(b))
    })

    return NextResponse.json({ data: remote.slice(0, 15), error: null, source: 'mixed' })
  } catch {
    return NextResponse.json({ data: [], error: null })
  }
}
