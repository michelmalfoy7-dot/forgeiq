'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, Plus, Trash2, Loader2, Lock, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

type Photo = {
  id: string
  photo_date: string
  storage_path: string
  note: string | null
  weight_kg: number | null
  created_at: string
  signed_url: string | null
}

/**
 * Composant photos de progression — 100% opt-in.
 * Jamais affiché automatiquement, jamais partagé.
 * L'utilisateur doit explicitement activer la fonctionnalité.
 */
export function ProgressPhotos() {
  // Consentement explicite requis avant tout accès caméra/stockage
  const [opted, setOpted] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [note, setNote] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/progress/photos')
      const { data, error: err } = await res.json()
      if (err) setError(err)
      else setPhotos(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (opted) fetchPhotos()
  }, [opted, fetchPhotos])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Seules les images sont acceptées'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Fichier trop lourd (max 10MB)'); return }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  async function uploadPhoto() {
    if (!selectedFile) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      if (note.trim()) fd.append('note', note.trim())
      fd.append('photo_date', new Date().toISOString().split('T')[0])

      const res = await fetch('/api/progress/photos', { method: 'POST', body: fd })
      const { data, error: err } = await res.json()
      if (err) { setError(err); return }

      setPhotos(prev => [data, ...prev])
      setShowForm(false)
      setSelectedFile(null)
      setPreviewUrl(null)
      setNote('')
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  async function deletePhoto(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/progress/photos?id=${id}`, { method: 'DELETE' })
      setPhotos(prev => prev.filter(p => p.id !== id))
      if (lightboxIdx !== null) setLightboxIdx(null)
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d))

  // ── Pas encore activé → prompt opt-in ──────────────────────────────
  if (!opted) {
    return (
      <div className="fiq-card text-center space-y-4 py-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: '#3D8BFF18', border: '1px solid #3D8BFF30' }}>
          <Camera className="w-6 h-6" style={{ color: 'var(--fiq-blue)' }} />
        </div>
        <div>
          <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>Photos de progression</p>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--fiq-muted)' }}>
            Documente ta transformation en photos. Uniquement visible par toi.
          </p>
        </div>

        {/* Badge confidentialité — toujours visible avant activation */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl mx-auto"
          style={{ background: '#3D8BFF12', border: '1px solid #3D8BFF30' }}>
          <Lock className="w-3.5 h-3.5" style={{ color: 'var(--fiq-blue)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--fiq-blue)' }}>
            100% privées · Jamais partagées · Supprimables à tout moment
          </span>
        </div>

        <button
          onClick={() => setOpted(true)}
          className="px-6 py-2.5 rounded-xl font-black text-sm"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}>
          Activer les photos de progression
        </button>
      </div>
    )
  }

  // ── Activé ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4" style={{ color: 'var(--fiq-blue)' }} />
          <p className="font-bold text-sm" style={{ color: 'var(--fiq-text)' }}>Photos de progression</p>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: '#3D8BFF12', border: '1px solid #3D8BFF30' }}>
            <Lock className="w-2.5 h-2.5" style={{ color: 'var(--fiq-blue)' }} />
            <span className="text-[9px] font-semibold" style={{ color: 'var(--fiq-blue)' }}>PRIVÉ</span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
          style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}>
          <Plus className="w-3.5 h-3.5" />
          Ajouter
        </button>
      </div>

      {/* Formulaire upload */}
      {showForm && (
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
          {/* Zone sélection photo */}
          <div
            onClick={() => fileRef.current?.click()}
            className="rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
            style={{
              background: previewUrl ? 'transparent' : 'var(--fiq-faint)',
              border: `2px dashed ${previewUrl ? 'transparent' : 'var(--fiq-border)'}`,
              position: 'relative',
              overflow: 'hidden',
              minHeight: previewUrl ? '200px' : '100px',
            }}>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Aperçu" className="w-full rounded-xl object-cover" style={{ maxHeight: '280px' }} />
            ) : (
              <>
                <Camera className="w-8 h-8" style={{ color: 'var(--fiq-muted)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--fiq-muted)' }}>
                  Appuie pour choisir une photo
                </p>
                <p className="text-[10px]" style={{ color: 'var(--fiq-muted)' }}>JPG, PNG · Max 10MB</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="user"
            className="hidden" onChange={handleFileChange} />

          {/* Note optionnelle */}
          <div>
            <p className="fiq-label mb-1.5">Note <span style={{ color: 'var(--fiq-muted)' }}>(optionnel)</span></p>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex: Semaine 8 de bulk, 82kg..."
              maxLength={200}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
            />
          </div>

          {error && (
            <p className="text-xs px-1" style={{ color: 'var(--fiq-red)' }}>{error}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setShowForm(false); setSelectedFile(null); setPreviewUrl(null); setNote('') }}
              className="py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
              Annuler
            </button>
            <button
              onClick={uploadPhoto}
              disabled={!selectedFile || uploading}
              className="py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2"
              style={{
                background: selectedFile ? 'var(--fiq-accent)' : 'var(--fiq-faint)',
                color: selectedFile ? 'var(--bg)' : 'var(--fiq-muted)',
                opacity: uploading ? 0.7 : 1,
              }}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* Grille photos */}
      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Chargement…</span>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Aucune photo pour le moment.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>Ajoute ta première photo de référence.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="relative rounded-xl overflow-hidden cursor-pointer"
              style={{ aspectRatio: '1', background: 'var(--fiq-faint)' }}
              onClick={() => setLightboxIdx(idx)}>
              {photo.signed_url ? (
                <Image
                  src={photo.signed_url}
                  alt={photo.note ?? formatDate(photo.photo_date)}
                  fill
                  className="object-cover"
                  sizes="(max-width: 480px) 33vw, 160px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-6 h-6" style={{ color: 'var(--fiq-muted)' }} />
                </div>
              )}
              {/* Date overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                <p className="text-[9px] font-semibold text-white leading-tight">
                  {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(photo.photo_date))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightboxIdx(null)}>

          {/* Barre top */}
          <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 flex-shrink-0"
            onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-white">
              {formatDate(photos[lightboxIdx].photo_date)}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => deletePhoto(photos[lightboxIdx].id)}
                disabled={deleting === photos[lightboxIdx].id}
                className="p-2 rounded-xl"
                style={{ background: '#EF444420', border: '1px solid #EF444430' }}>
                {deleting === photos[lightboxIdx].id
                  ? <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                  : <Trash2 className="w-4 h-4 text-red-400" />}
              </button>
              <button onClick={() => setLightboxIdx(null)} className="p-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Photo */}
          <div className="flex-1 flex items-center justify-center px-4 relative"
            onClick={e => e.stopPropagation()}>
            {photos[lightboxIdx].signed_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photos[lightboxIdx].signed_url!}
                alt={photos[lightboxIdx].note ?? ''}
                className="max-w-full max-h-full rounded-2xl object-contain"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              />
            ) : (
              <div className="w-32 h-32 flex items-center justify-center rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <Camera className="w-10 h-10 text-white opacity-50" />
              </div>
            )}

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIdx(Math.max(0, lightboxIdx - 1))}
                  disabled={lightboxIdx === 0}
                  className="absolute left-2 p-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.15)', opacity: lightboxIdx === 0 ? 0.3 : 1 }}>
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setLightboxIdx(Math.min(photos.length - 1, lightboxIdx + 1))}
                  disabled={lightboxIdx === photos.length - 1}
                  className="absolute right-2 p-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.15)', opacity: lightboxIdx === photos.length - 1 ? 0.3 : 1 }}>
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}
          </div>

          {/* Note + poids */}
          {(photos[lightboxIdx].note || photos[lightboxIdx].weight_kg) && (
            <div className="px-4 pb-safe pb-6 pt-3 flex-shrink-0"
              onClick={e => e.stopPropagation()}>
              {photos[lightboxIdx].note && (
                <p className="text-sm text-white text-center">{photos[lightboxIdx].note}</p>
              )}
              {photos[lightboxIdx].weight_kg && (
                <p className="text-xs text-center mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {photos[lightboxIdx].weight_kg} kg
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
