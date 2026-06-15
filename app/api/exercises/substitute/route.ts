import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/exercises/substitute?exercise_id=xxx&equipment=full_gym&limit=5
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const exerciseId = searchParams.get('exercise_id')
  const equipment  = searchParams.get('equipment') ?? 'full_gym'
  const limit      = Math.min(parseInt(searchParams.get('limit') ?? '5'), 10)

  if (!exerciseId) {
    return NextResponse.json({ data: null, error: 'exercise_id requis' }, { status: 400 })
  }

  // 1. Récupérer l'exercice source
  const { data: source, error: sourceErr } = await supabase
    .from('exercises_library')
    .select('id, name_fr, primary_muscles, secondary_muscles, equipment, category, force_type')
    .eq('id', exerciseId)
    .maybeSingle()

  if (sourceErr || !source) {
    return NextResponse.json({ data: null, error: 'Exercice source introuvable' }, { status: 404 })
  }

  const primaryMuscles: string[] = source.primary_muscles ?? []
  const category: string         = source.category ?? ''
  const forceType: string        = source.force_type ?? ''

  if (primaryMuscles.length === 0) {
    return NextResponse.json({ data: [], error: null })
  }

  // 2. Définir les équipements compatibles selon le profil de salle
  const compatibleEquipment = buildCompatibleEquipment(equipment)

  // 3. Chercher des substituts :
  //    - Même category
  //    - Au moins 1 muscle primaire en commun (overlap via @> sur chaque muscle)
  //    - Équipement compatible
  //    - Exclure l'exercice source
  //    On fait une requête large puis on trie côté JS pour prioriser force_type + secondary_muscles
  let query = supabase
    .from('exercises_library')
    .select('id, name_fr, primary_muscles, secondary_muscles, equipment, category, force_type, difficulty')
    .eq('category', category)
    .neq('id', exerciseId)
    .in('equipment', compatibleEquipment)

  const { data: candidates, error: candidatesErr } = await query.limit(100)

  if (candidatesErr) {
    return NextResponse.json({ data: null, error: candidatesErr.message }, { status: 500 })
  }

  // 4. Filtrer : au moins 1 muscle primaire en commun
  const sourcePrimarySet = new Set(primaryMuscles)
  const sourceSecondarySet = new Set<string>(source.secondary_muscles ?? [])

  const withOverlap = (candidates ?? []).filter((c) => {
    const cPrimary: string[] = c.primary_muscles ?? []
    return cPrimary.some((m: string) => sourcePrimarySet.has(m))
  })

  // 5. Scorer et trier :
  //    - +3 si même force_type
  //    - +2 pour chaque muscle primaire en commun (au-delà du premier)
  //    - +1 pour chaque muscle secondaire en commun
  const scored = withOverlap.map((c) => {
    const cPrimary: string[]   = c.primary_muscles ?? []
    const cSecondary: string[] = c.secondary_muscles ?? []

    const primaryOverlap   = cPrimary.filter((m: string) => sourcePrimarySet.has(m)).length
    const secondaryOverlap = cSecondary.filter((m: string) => sourceSecondarySet.has(m)).length
    const sameForceType    = c.force_type === forceType ? 3 : 0

    const score = sameForceType + (primaryOverlap - 1) * 2 + secondaryOverlap

    return { ...c, _score: score }
  })

  // Tri par score décroissant, puis alphabétique pour les égalités
  scored.sort((a, b) => b._score - a._score || (a.name_fr ?? '').localeCompare(b.name_fr ?? '', 'fr'))

  // 6. Retourner les N premiers, sans le champ interne _score
  const substitutes = scored.slice(0, limit).map(({ _score: _, ...c }) => ({
    id:              c.id,
    name:            c.name_fr,
    primary_muscles: c.primary_muscles ?? [],
    equipment:       c.equipment,
    difficulty:      c.difficulty,
  }))

  return NextResponse.json({ data: substitutes, error: null })
}

/**
 * Retourne la liste des équipements acceptables selon le contexte de salle.
 * bodyweight est toujours accepté.
 */
function buildCompatibleEquipment(equipment: string): string[] {
  const always = ['bodyweight']

  switch (equipment) {
    case 'full_gym':
      return [...always, 'barbell', 'dumbbell', 'cable', 'machine', 'smith', 'kettlebell', 'band', 'ez_bar', 'trap_bar', 'hex_bar']
    case 'home':
      return [...always, 'dumbbell', 'band', 'kettlebell']
    case 'dumbbells':
      return [...always, 'dumbbell', 'kettlebell']
    case 'barbell':
      return [...always, 'barbell', 'dumbbell', 'ez_bar']
    default:
      // Fallback : accepter tous les équipements courants
      return [...always, 'barbell', 'dumbbell', 'cable', 'machine', 'smith', 'kettlebell', 'band']
  }
}
