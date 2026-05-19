'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

type ToastItem = { id: string; type: ToastType; message: string }

let addToast: ((type: ToastType, message: string) => void) | null = null

export function toast(type: ToastType, message: string) {
  addToast?.(type, message)
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    addToast = (type, message) => {
      const id = Math.random().toString(36).slice(2)
      setToasts(prev => [...prev, { id, type, message }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 3500)
    }
    return () => { addToast = null }
  }, [])

  if (!toasts.length) return null

  const icons = {
    success: <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-accent)' }} />,
    error: <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-red)' }} />,
    info: <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fiq-blue)' }} />,
  }
  const colors = {
    success: { bg: '#B4FF4A15', border: '#B4FF4A30' },
    error: { bg: '#EF444415', border: '#EF444430' },
    info: { bg: '#3D8BFF15', border: '#3D8BFF30' },
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 flex flex-col items-center gap-2 px-4 z-50 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="w-full max-w-sm flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold pointer-events-auto"
          style={{
            background: colors[t.type].bg,
            border: `1px solid ${colors[t.type].border}`,
            color: 'var(--fiq-text)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {icons[t.type]}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>
            <X className="w-3.5 h-3.5" style={{ color: 'var(--fiq-muted)' }} />
          </button>
        </div>
      ))}
    </div>
  )
}
