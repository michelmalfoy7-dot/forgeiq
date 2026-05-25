import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BUCKET = 'progress-photos'
const MAX_SIZE_MB = 10

// GET — Liste des photos de l'utilisateur (paths signés)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { data: photos, error } = await supabase
      .from('progress_photos')
      .select('id, photo_date, storage_path, note, weight_kg, created_at')
      .eq('user_id', user.id)
      .order('photo_date', { ascending: false })
      .limit(50)

    if (error) throw error

    // Générer des URLs signées (1h) pour chaque photo
    const withUrls = await Promise.all(
      (photos ?? []).map(async (photo) => {
        const { data: signedData } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(photo.storage_path, 3600)
        return { ...photo, signed_url: signedData?.signedUrl ?? null }
      })
    )

    return NextResponse.json({ data: withUrls, error: null })
  } catch (err) {
    console.error('GET progress photos error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — Upload une nouvelle photo
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const note = formData.get('note') as string | null
    const weightKg = formData.get('weight_kg') as string | null
    const photoDate = formData.get('photo_date') as string | null

    if (!file) return NextResponse.json({ data: null, error: 'Fichier manquant' }, { status: 400 })

    // Validation taille
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ data: null, error: `Fichier trop lourd (max ${MAX_SIZE_MB}MB)` }, { status: 400 })
    }

    // Validation type MIME
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ data: null, error: 'Seules les images sont acceptées' }, { status: 400 })
    }

    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
    const date = photoDate ?? new Date().toISOString().split('T')[0]
    const storagePath = `${user.id}/${date}_${Date.now()}.${ext}`

    const bytes = await file.arrayBuffer()

    // Upload dans Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ data: null, error: 'Erreur upload' }, { status: 500 })
    }

    // Enregistrer en base
    const { data: photo, error: dbError } = await supabase
      .from('progress_photos')
      .insert({
        user_id: user.id,
        photo_date: date,
        storage_path: storagePath,
        note: note?.trim() || null,
        weight_kg: weightKg ? Number(weightKg) : null,
        is_private: true,
      })
      .select('id, photo_date, storage_path, note, weight_kg, created_at')
      .single()

    if (dbError) throw dbError

    // Retourner URL signée
    const { data: signedData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json({
      data: { ...photo, signed_url: signedData?.signedUrl ?? null },
      error: null,
    })
  } catch (err) {
    console.error('POST progress photos error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE — Supprimer une photo (id en query param)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const photoId = searchParams.get('id')
    if (!photoId) return NextResponse.json({ data: null, error: 'ID manquant' }, { status: 400 })

    // Récupérer le chemin (RLS garantit que c'est la bonne photo)
    const { data: photo, error: fetchError } = await supabase
      .from('progress_photos')
      .select('storage_path')
      .eq('id', photoId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json({ data: null, error: 'Photo introuvable' }, { status: 404 })
    }

    // Supprimer du storage
    await supabase.storage.from(BUCKET).remove([photo.storage_path])

    // Supprimer de la base
    await supabase.from('progress_photos').delete().eq('id', photoId).eq('user_id', user.id)

    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch (err) {
    console.error('DELETE progress photos error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
