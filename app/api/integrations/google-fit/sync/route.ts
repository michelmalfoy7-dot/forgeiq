import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Rafraîchit le token Google si expiré
async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_FIT_CLIENT_ID!,
      client_secret: process.env.GOOGLE_FIT_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) return null
  return res.json()
}

// Requête Google Fit Aggregate API
async function fitAggregate(accessToken: string, dataSourceId: string, startMs: number, endMs: number) {
  const res = await fetch(
    'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: dataSourceId }],
        bucketByTime: { durationMillis: endMs - startMs },
        startTimeMillis: startMs,
        endTimeMillis:   endMs,
      }),
    }
  )
  if (!res.ok) return null
  return res.json()
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Charger la connexion Google Fit
    const { data: conn } = await supabase
      .from('wearable_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'google_fit')
      .maybeSingle()

    if (!conn) return NextResponse.json({ data: null, error: 'Google Fit non connecté' }, { status: 404 })

    let accessToken = conn.access_token

    // Rafraîchir si expiré (avec marge 5 min)
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0
    if (expiresAt < Date.now() + 5 * 60 * 1000 && conn.refresh_token) {
      const refreshed = await refreshGoogleToken(conn.refresh_token)
      if (refreshed) {
        accessToken = refreshed.access_token
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        await admin.from('wearable_connections').update({
          access_token:     refreshed.access_token,
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        }).eq('user_id', user.id).eq('provider', 'google_fit')
      }
    }

    // Bornes : hier minuit → ce soir minuit (heure locale via sv locale)
    const today = new Date().toLocaleDateString('sv')
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('sv')
    const targetDate = today // on sync pour aujourd'hui

    const startMs = new Date(`${targetDate}T00:00:00`).getTime()
    const endMs   = new Date(`${targetDate}T23:59:59`).getTime()

    // Requêtes parallèles : pas, fréquence cardiaque, sommeil, calories
    const [stepsData, hrData, sleepData, calData] = await Promise.all([
      fitAggregate(accessToken, 'com.google.step_count.delta', startMs, endMs),
      fitAggregate(accessToken, 'com.google.heart_rate.bpm',   startMs, endMs),
      fitAggregate(accessToken, 'com.google.sleep.segment',    startMs, endMs),
      fitAggregate(accessToken, 'com.google.calories.expended', startMs, endMs),
    ])

    // Parser les pas
    let steps: number | null = null
    try {
      const bucket = stepsData?.bucket?.[0]
      const val = bucket?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal
      if (val != null) steps = val
    } catch { /* données absentes */ }

    // Parser FC repos (min sur la journée)
    let restingHr: number | null = null
    try {
      const hrPoints = hrData?.bucket?.[0]?.dataset?.[0]?.point ?? []
      if (hrPoints.length > 0) {
        const values = hrPoints.map((p: { value: { fpVal?: number }[] }) => p.value?.[0]?.fpVal ?? 0).filter((v: number) => v > 30)
        if (values.length > 0) restingHr = Math.round(Math.min(...values))
      }
    } catch { /* données absentes */ }

    // Parser sommeil (minutes par stade)
    let sleepTotal: number | null = null
    let sleepDeep: number | null = null
    let sleepLight: number | null = null
    let sleepRem: number | null = null
    try {
      const sleepPoints = sleepData?.bucket?.[0]?.dataset?.[0]?.point ?? []
      // Types Google Fit sleep: 1=awake, 2=sleep, 3=out-of-bed, 4=light, 5=deep, 6=REM
      let deepMs = 0, lightMs = 0, remMs = 0, totalMs = 0
      for (const p of sleepPoints) {
        const stage = p.value?.[0]?.intVal
        const dMs = (parseInt(p.endTimeNanos) - parseInt(p.startTimeNanos)) / 1e6
        if ([4, 5, 6, 2].includes(stage)) totalMs += dMs
        if (stage === 5) deepMs  += dMs
        if (stage === 4) lightMs += dMs
        if (stage === 6) remMs   += dMs
      }
      if (totalMs > 0) {
        sleepTotal = Math.round(totalMs / 60000)
        sleepDeep  = Math.round(deepMs  / 60000)
        sleepLight = Math.round(lightMs / 60000)
        sleepRem   = Math.round(remMs   / 60000)
      }
    } catch { /* données absentes */ }

    // Parser calories
    let calories: number | null = null
    try {
      const calVal = calData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal
      if (calVal != null) calories = Math.round(calVal)
    } catch { /* données absentes */ }

    // Upsert dans daily_logs (uniquement les champs non-null)
    const updates: Record<string, number> = {}
    if (steps     !== null) updates.steps            = steps
    if (sleepTotal !== null) updates.sleep_total_min = sleepTotal
    if (sleepDeep  !== null) updates.sleep_deep_min  = sleepDeep
    if (sleepLight !== null) updates.sleep_light_min = sleepLight
    if (sleepRem   !== null) updates.sleep_rem_min   = sleepRem
    if (calories   !== null) updates.calories        = calories

    if (Object.keys(updates).length > 0) {
      await supabase.from('daily_logs').upsert({
        user_id:  user.id,
        log_date: targetDate,
        ...updates,
      }, { onConflict: 'user_id,log_date', ignoreDuplicates: false })
    }

    // Marquer la dernière sync
    await supabase.from('wearable_connections').update({
      last_synced_at: new Date().toISOString(),
    }).eq('user_id', user.id).eq('provider', 'google_fit')

    return NextResponse.json({
      data: { steps, restingHr, sleepTotal, sleepDeep, sleepRem, calories, date: targetDate },
      error: null,
    })
  } catch (err) {
    console.error('Google Fit sync error:', err)
    return NextResponse.json({ data: null, error: 'Erreur sync' }, { status: 500 })
  }
}

// Déconnecter Google Fit
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    await supabase.from('wearable_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'google_fit')

    return NextResponse.json({ data: { disconnected: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
