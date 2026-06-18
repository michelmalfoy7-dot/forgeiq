import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Extrait la valeur d'un attribut XML depuis une ligne de texte
function extractAttr(line: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`)
  const match = regex.exec(line)
  return match ? match[1] : null
}

// Convertit une date Apple Health en YYYY-MM-DD
// Format : "2024-01-15 08:32:00 +0100"
function toDateString(rawDate: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(rawDate)
  return match ? match[1] : null
}

type DayData = {
  steps?: number
  weight_kg?: number
}

// Parse le XML Apple Health et extrait steps + poids par date
function parseAppleHealthXML(xml: string): Map<string, DayData> {
  const dayMap = new Map<string, DayData>()

  // Regex sur le texte complet pour gérer les attributs répartis sur plusieurs lignes (iOS 16+)
  const recordRegex = /<Record\b([^>]*(?:>[^<]*<\/Record>)?)/g
  let match: RegExpExecArray | null

  while ((match = recordRegex.exec(xml)) !== null) {
    const tag = match[1]

    const type = extractAttr(tag, 'type')
    if (!type) continue

    const rawDate = extractAttr(tag, 'startDate')
    if (!rawDate) continue

    const dateStr = toDateString(rawDate)
    if (!dateStr) continue

    if (type === 'HKQuantityTypeIdentifierStepCount') {
      const rawValue = extractAttr(tag, 'value')
      if (!rawValue) continue
      const steps = Math.round(parseFloat(rawValue))
      if (isNaN(steps) || steps < 0) continue

      // Accumuler les steps sur la journée (plusieurs records peuvent exister)
      const existing = dayMap.get(dateStr) ?? {}
      existing.steps = (existing.steps ?? 0) + steps
      dayMap.set(dateStr, existing)

    } else if (type === 'HKQuantityTypeIdentifierBodyMass') {
      const rawValue = extractAttr(tag, 'value')
      const unit = extractAttr(tag, 'unit')
      if (!rawValue || !unit) continue

      let weightKg = parseFloat(rawValue)
      if (isNaN(weightKg) || weightKg <= 0) continue

      // Convertir lbs en kg si nécessaire
      if (unit === 'lb') weightKg = weightKg * 0.453592
      weightKg = Math.round(weightKg * 10) / 10

      const existing = dayMap.get(dateStr) ?? {}
      existing.weight_kg = weightKg
      dayMap.set(dateStr, existing)
    }
  }

  return dayMap
}

// Parse un CSV Google Fit (format : Date,Steps ou Date,Weight)
function parseGoogleFitCSV(csv: string): Map<string, DayData> {
  const dayMap = new Map<string, DayData>()
  const lines = csv.split('\n')
  if (lines.length < 2) return dayMap

  const header = lines[0].toLowerCase()
  const isSteps  = /step|pas\b/i.test(header)
  const isWeight = /weight|mass|poids|körpergewicht/i.test(header)

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(',')
    if (parts.length < 2) continue

    const rawDate = parts[0].trim()
    const rawValue = parts[1].trim()

    const dateMatch = /^(\d{4}-\d{2}-\d{2})/.exec(rawDate)
    if (!dateMatch) continue
    const dateStr = dateMatch[1]

    const value = parseFloat(rawValue)
    if (isNaN(value) || value < 0) continue

    const existing = dayMap.get(dateStr) ?? {}
    if (isSteps) {
      existing.steps = Math.round(value)
    } else if (isWeight) {
      existing.weight_kg = Math.round(value * 10) / 10
    }
    dayMap.set(dateStr, existing)
  }

  return dayMap
}

// Type strict pour l'upsert dans daily_logs
type DailyLogUpsert = {
  user_id: string
  log_date: string
  steps?: number
  weight_kg?: number
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Données de formulaire invalides' }, { status: 400 })
  }

  const file = formData.get('file')
  const source = formData.get('source') as string | null

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  }

  if (!source || !['apple_health', 'google_fit'].includes(source)) {
    return NextResponse.json({ error: 'Source invalide (apple_health | google_fit)' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 5MB)' }, { status: 413 })
  }

  let content: string
  try {
    content = await file.text()
  } catch {
    return NextResponse.json({ error: 'Impossible de lire le fichier' }, { status: 400 })
  }

  // Parser selon la source
  let dayMap: Map<string, DayData>

  if (source === 'apple_health') {
    if (!content.includes('<HealthData') && !content.includes('<Record')) {
      return NextResponse.json({ error: 'Fichier Apple Health invalide (export.xml attendu)' }, { status: 400 })
    }
    dayMap = parseAppleHealthXML(content)
  } else {
    dayMap = parseGoogleFitCSV(content)
  }

  if (dayMap.size === 0) {
    return NextResponse.json({ error: 'Aucune donnée exploitable trouvée dans le fichier' }, { status: 400 })
  }

  // Charger les daily_logs existants pour ne pas écraser les données saisies manuellement
  const dates = Array.from(dayMap.keys())
  const { data: existingLogs } = await supabase
    .from('daily_logs')
    .select('log_date, steps, weight_kg')
    .eq('user_id', user.id)
    .in('log_date', dates)

  const existingMap = new Map<string, { steps: number | null; weight_kg: number | null }>()
  for (const log of existingLogs ?? []) {
    existingMap.set(log.log_date as string, {
      steps: log.steps as number | null,
      weight_kg: log.weight_kg as number | null,
    })
  }

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  // Traiter par batch de 50
  const entries = Array.from(dayMap.entries())
  const BATCH_SIZE = 50

  for (let batchStart = 0; batchStart < entries.length; batchStart += BATCH_SIZE) {
    const batch = entries.slice(batchStart, batchStart + BATCH_SIZE)
    const upserts: DailyLogUpsert[] = []

    for (const [dateStr, data] of batch) {
      const existing = existingMap.get(dateStr)
      const row: DailyLogUpsert = { user_id: user.id, log_date: dateStr }
      let hasNewData = false

      // N'importer les steps que si aucune valeur manuelle n'existe
      if (data.steps !== undefined) {
        const existingSteps = existing?.steps ?? null
        if (existingSteps === null || existingSteps === 0) {
          row.steps = data.steps
          hasNewData = true
        }
      }

      // N'importer le poids que si aucune valeur manuelle n'existe
      if (data.weight_kg !== undefined) {
        const existingWeight = existing?.weight_kg ?? null
        if (existingWeight === null) {
          row.weight_kg = data.weight_kg
          hasNewData = true
        }
      }

      if (hasNewData) {
        upserts.push(row)
      } else {
        skipped++
      }
    }

    if (upserts.length === 0) continue

    const { error } = await supabase
      .from('daily_logs')
      .upsert(upserts, { onConflict: 'user_id,log_date' })

    if (error) {
      errors.push(`Batch ${Math.floor(batchStart / BATCH_SIZE) + 1} : ${error.message}`)
    } else {
      imported += upserts.length
    }
  }

  return NextResponse.json({ imported, skipped, total: dayMap.size, errors })
}
