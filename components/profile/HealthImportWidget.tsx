'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2, Smartphone, Activity } from 'lucide-react'

type ImportResult = {
  imported: number
  skipped: number
  total: number
  errors: string[]
}

type UploadState = 'idle' | 'loading' | 'success' | 'error'

type SourceState = {
  state: UploadState
  message: string
}

export function HealthImportWidget() {
  const appleInputRef = useRef<HTMLInputElement>(null)
  const googleInputRef = useRef<HTMLInputElement>(null)

  const [apple, setApple] = useState<SourceState>({ state: 'idle', message: '' })
  const [google, setGoogle] = useState<SourceState>({ state: 'idle', message: '' })

  async function handleFile(
    file: File,
    source: 'apple_health' | 'google_fit',
    setState: (s: SourceState) => void
  ) {
    setState({ state: 'loading', message: '' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('source', source)

    try {
      const res = await fetch('/api/profile/import-health', {
        method: 'POST',
        body: formData,
      })

      const json = (await res.json()) as ImportResult & { error?: string }

      if (!res.ok) {
        setState({ state: 'error', message: json.error ?? 'Erreur lors de l\'import' })
        return
      }

      const label = source === 'apple_health' ? 'Apple Santé' : 'Google Fit'
      setState({
        state: 'success',
        message: `✓ ${json.imported} jour${json.imported > 1 ? 's' : ''} importé${json.imported > 1 ? 's' : ''} depuis ${label}${json.skipped > 0 ? ` (${json.skipped} ignoré${json.skipped > 1 ? 's' : ''})` : ''}`,
      })
    } catch {
      setState({ state: 'error', message: 'Erreur réseau — réessaie' })
    }
  }

  const MAX_SIZE = 5 * 1024 * 1024 // 5MB

  function onAppleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > MAX_SIZE) {
      setApple({ state: 'error', message: 'Fichier trop volumineux (max 5 MB)' })
      return
    }
    void handleFile(file, 'apple_health', setApple)
  }

  function onGoogleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > MAX_SIZE) {
      setGoogle({ state: 'error', message: 'Fichier trop volumineux (max 5 MB)' })
      return
    }
    void handleFile(file, 'google_fit', setGoogle)
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--fiq-border)' }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ background: 'var(--fiq-faint)' }}>
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--fiq-muted)' }}>
          <Upload className="w-3 h-3 inline mr-1.5" />
          Importer données wearable
        </p>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--fiq-border)' }}>
        {/* Apple Health */}
        <div
          className="px-4 py-4"
          style={{ background: 'var(--fiq-card)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: '#FF454518' }}
            >
              <Smartphone className="w-4 h-4" style={{ color: '#FF4545' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>
                Apple Santé
              </p>
              <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--fiq-muted)' }}>
                Réglages &rsaquo; Santé &rsaquo; Exporter les données de santé
              </p>

              {/* Feedback état */}
              {apple.state !== 'idle' && (
                <p
                  className="text-xs mb-3 font-semibold"
                  style={{
                    color: apple.state === 'success'
                      ? 'var(--fiq-accent)'
                      : apple.state === 'error'
                        ? 'var(--fiq-red)'
                        : 'var(--fiq-muted)',
                  }}
                >
                  {apple.state === 'loading' && (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin inline" />
                      Import en cours…
                    </span>
                  )}
                  {(apple.state === 'success' || apple.state === 'error') && apple.message}
                </p>
              )}

              <input
                ref={appleInputRef}
                type="file"
                accept=".xml"
                className="hidden"
                onChange={onAppleChange}
              />
              <button
                onClick={() => appleInputRef.current?.click()}
                disabled={apple.state === 'loading'}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-opacity disabled:opacity-50"
                style={{
                  background: '#FF454518',
                  border: '1px solid #FF454530',
                  color: '#FF4545',
                }}
              >
                {apple.state === 'loading'
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Upload className="w-3 h-3" />
                }
                Choisir export.xml
              </button>
            </div>
          </div>
        </div>

        {/* Google Fit */}
        <div
          className="px-4 py-4"
          style={{ background: 'var(--fiq-card)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: '#3D8BFF18' }}
            >
              <Activity className="w-4 h-4" style={{ color: 'var(--fiq-blue)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>
                Google Fit
              </p>
              <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--fiq-muted)' }}>
                Google Takeout &rsaquo; Google Fit &rsaquo; CSV Steps ou Weight
              </p>

              {/* Feedback état */}
              {google.state !== 'idle' && (
                <p
                  className="text-xs mb-3 font-semibold"
                  style={{
                    color: google.state === 'success'
                      ? 'var(--fiq-accent)'
                      : google.state === 'error'
                        ? 'var(--fiq-red)'
                        : 'var(--fiq-muted)',
                  }}
                >
                  {google.state === 'loading' && (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin inline" />
                      Import en cours…
                    </span>
                  )}
                  {(google.state === 'success' || google.state === 'error') && google.message}
                </p>
              )}

              <input
                ref={googleInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={onGoogleChange}
              />
              <button
                onClick={() => googleInputRef.current?.click()}
                disabled={google.state === 'loading'}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-opacity disabled:opacity-50"
                style={{
                  background: '#3D8BFF18',
                  border: '1px solid #3D8BFF30',
                  color: 'var(--fiq-blue)',
                }}
              >
                {google.state === 'loading'
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Upload className="w-3 h-3" />
                }
                Choisir fichier CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
