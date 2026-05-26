import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_SIZE_BYTES = 5 * 1024 * 1024   // 5 Mo max
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Lire le fichier depuis le FormData
    const form = await req.formData()
    const file = form.get('avatar') as File | null
    if (!file) return NextResponse.json({ data: null, error: 'Aucun fichier reçu' }, { status: 400 })

    // Validations
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ data: null, error: 'Format non supporté (JPG, PNG, WebP, GIF)' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ data: null, error: 'Fichier trop lourd (max 5 Mo)' }, { status: 400 })
    }

    // Détecter l'extension
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    // Chemin : avatars/{user_id}/avatar.{ext} — écrase l'ancien à chaque upload
    const path = `${user.id}/avatar.${ext}`

    // Upload dans Supabase Storage (bucket "avatars")
    const bytes  = await file.arrayBuffer()
    const buffer = new Uint8Array(bytes)

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,   // remplace l'existant
      })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      return NextResponse.json({ data: null, error: 'Erreur upload : ' + uploadError.message }, { status: 500 })
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    // Ajouter un cache-buster pour forcer le rechargement de l'image
    const avatarUrl = `${publicUrl}?t=${Date.now()}`

    // Mettre à jour le profil
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)

    if (updateError) throw updateError

    return NextResponse.json({ data: { avatar_url: avatarUrl }, error: null })
  } catch (err) {
    console.error('Avatar route error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE : supprimer l'avatar
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Supprimer tous les fichiers avatar de cet utilisateur
    const { data: files } = await supabase.storage
      .from('avatars')
      .list(user.id)

    if (files && files.length > 0) {
      const paths = files.map(f => `${user.id}/${f.name}`)
      await supabase.storage.from('avatars').remove(paths)
    }

    // Effacer l'URL dans le profil
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)

    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch (err) {
    console.error('Avatar delete error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
