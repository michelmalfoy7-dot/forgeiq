'use client'

import { useState, useEffect } from 'react'
import { Ruler, Plus, X, ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Measurement = {
  id: string
  measured_at: string
  body_fat_pct: number | null
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  shoulders_cm: number | null
  neck_cm: number | null
  left_arm_cm: number | null
  right_arm_cm: number | null
  left_thigh_cm: number | null
  right_thigh_cm: number | null
  left_calf_cm: number | null
  right_calf_cm: number | null
  notes: string | null
}

type FormData = {
  measured_at: string
  body_fat_pct: string
  chest_cm: string
  waist_cm: string
  hips_cm: string
  shoulders_cm: string
  neck_cm: string
  left_arm_cm: string
  right_arm_cm: string
  left_thigh_cm: string
  right_thigh_cm: string
  left_calf_cm: string
  right_calf_cm: string
  notes: string
}

const EMPTY_FORM: FormData = {
  measured_at: new Date().toISOString().split('T')[0],
  body_fat_pct: '', chest_cm: '', waist_cm: '', hips_cm: '',
  shoulders_cm: '', neck_cm: '',
  left_arm_cm: '', right_arm_cm: '',
  left_thigh_cm: '', right_thigh_cm: '',
  left_calf_cm: '', right_calf_cm: '',
  notes: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fromMeasurement(m: Measurement): FormData {
  const n = (v: number | null) => v?.toString() ?? ''
  return {
    measured_at:    m.measured_at,
    body_fat_pct:   n(m.body_fat_pct),
    chest_cm:       n(m.chest_cm),
    waist_cm:       n(m.waist_cm),
    hips_cm:        n(m.hips_cm),
    shoulders_cm:   n(m.shoulders_cm),
    neck_cm:        n(m.neck_cm),
    left_arm_cm:    n(m.left_arm_cm),
    right_arm_cm:   n(m.right_arm_cm),
    left_thigh_cm:  n(m.left_thigh_cm),
    right_thigh_cm: n(m.right_thigh_cm),
    left_calf_cm:   n(m.left_calf_cm),
    right_calf_cm:  n(m.right_calf_cm),
    notes:          m.notes ?? '',
  }
}

function delta(current: number | null, previous: number | null): string | null {
  if (current === null || previous === null) return null
  const d = current - previous
  if (Math.abs(d) < 0.05) return null
  return `${d > 0 ? '+' : ''}${d.toFixed(1)}`
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(dateStr + 'T12:00:00'))
}

// ── Champ numérique ────────────────────────────────────────────────────────────

function MeasureInput({
  label, field, form, unit = 'cm', onChange,
}: {
  label: string
  field: keyof FormData
  form: FormData
  unit?: string
  onChange: (f: keyof FormData, v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--fiq-muted)' }}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          max="999"
          value={form[field]}
          onChange={e => onChange(field, e.target.value)}
          placeholder="—"
          className="flex-1 text-sm text-right outline-none px-2 py-2 rounded-lg"
          style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
        />
        <span className="text-[11px] w-6 flex-shrink-0" style={{ color: 'var(--fiq-muted)' }}>{unit}</span>
      </div>
    </div>
  )
}

// ── Ligne de mesure ────────────────────────────────────────────────────────────

function MeasureRow({
  label, value, unit = 'cm', diff,
}: {
  label: string; value: number | null; unit?: string; diff?: string | null
}) {
  if (value === null) return null
  const isPositiveDiff = diff && !diff.startsWith('+') === false
  // Pour le corps gras et la taille, + = mauvais ; pour le reste, + = bon
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
      <span className="text-sm" style={{ color: 'var(--fiq-muted)' }}>{label}</span>
      <div className="flex items-center gap-2">
        {diff && (
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
            style={{
              color: isPositiveDiff ? 'var(--fiq-accent)' : 'var(--fiq-muted)',
              background: isPositiveDiff ? '#B4FF4A15' : 'var(--fiq-faint)',
            }}>
            {diff}
          </span>
        )}
        <span className="text-sm font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
          {value}<span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--fiq-muted)' }}>{unit}</span>
        </span>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export function MeasurementsSection() {
  const [entries, setEntries]   = useState<Measurement[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAll, setShowAll]   = useState(false)
  const [form, setForm]         = useState<FormData>({ ...EMPTY_FORM, measured_at: new Date().toISOString().split('T')[0] })
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    fetch('/api/progress/measurements')
      .then(r => r.json())
      .then((json: { data: Measurement[] | null }) => { if (json.data) setEntries(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleChange(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function openModal() {
    // Pré-remplir avec les dernières valeurs si disponibles
    if (entries[0]) {
      setForm({ ...fromMeasurement(entries[0]), measured_at: new Date().toISOString().split('T')[0] })
    } else {
      setForm({ ...EMPTY_FORM, measured_at: new Date().toISOString().split('T')[0] })
    }
    setShowModal(true)
    setSaved(false)
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/progress/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json() as { data: Measurement | null; error: string | null }
      if (json.data) {
        // Mettre à jour la liste locale
        setEntries(prev => {
          const idx = prev.findIndex(e => e.measured_at === json.data!.measured_at)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = json.data!
            return next
          }
          return [json.data!, ...prev].slice(0, 2)
        })
        setSaved(true)
        setTimeout(() => setShowModal(false), 800)
      }
    } catch { /* silencieux */ }
    finally   { setSaving(false) }
  }

  const latest   = entries[0]
  const previous = entries[1]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="fiq-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4" style={{ color: 'var(--fiq-accent)' }} />
            <p className="font-black text-sm" style={{ color: 'var(--fiq-text)' }}>Mensurations</p>
            {latest && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}>
                {formatDate(latest.measured_at)}
              </span>
            )}
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
            style={{ background: 'var(--fiq-accent)', color: 'var(--bg)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            {latest ? 'Mettre à jour' : 'Première mesure'}
          </button>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fiq-muted)' }} />
          </div>
        ) : !latest ? (
          <div className="text-center py-8 px-4">
            <p className="text-3xl mb-2">📏</p>
            <p className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>Aucune mesure enregistrée</p>
            <p className="text-xs mt-1" style={{ color: 'var(--fiq-muted)' }}>
              Suis l'évolution de ton corps en détail
            </p>
          </div>
        ) : (
          <div className="px-4 pb-1">
            {/* Corps gras en avant si disponible */}
            {latest.body_fat_pct !== null && (
              <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--fiq-text)' }}>Corps gras</span>
                <div className="flex items-center gap-2">
                  {delta(latest.body_fat_pct, previous?.body_fat_pct ?? null) && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ color: 'var(--fiq-muted)', background: 'var(--fiq-faint)' }}>
                      {delta(latest.body_fat_pct, previous?.body_fat_pct ?? null)}%
                    </span>
                  )}
                  <span className="text-xl font-black fiq-data" style={{ color: 'var(--fiq-blue)' }}>
                    {latest.body_fat_pct}<span className="text-sm font-normal ml-0.5" style={{ color: 'var(--fiq-muted)' }}>%</span>
                  </span>
                </div>
              </div>
            )}

            {/* Mesures principales — toujours visibles */}
            <MeasureRow label="Taille (tour)" value={latest.waist_cm} diff={delta(latest.waist_cm, previous?.waist_cm ?? null)} />
            <MeasureRow label="Poitrine" value={latest.chest_cm} diff={delta(latest.chest_cm, previous?.chest_cm ?? null)} />
            <MeasureRow label="Hanches" value={latest.hips_cm} diff={delta(latest.hips_cm, previous?.hips_cm ?? null)} />

            {/* Mesures secondaires — toggle */}
            {showAll && (
              <>
                <MeasureRow label="Épaules" value={latest.shoulders_cm} diff={delta(latest.shoulders_cm, previous?.shoulders_cm ?? null)} />
                <MeasureRow label="Cou" value={latest.neck_cm} diff={delta(latest.neck_cm, previous?.neck_cm ?? null)} />
                {(latest.left_arm_cm !== null || latest.right_arm_cm !== null) && (
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Bras G / D</span>
                    <span className="text-sm font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                      {latest.left_arm_cm ?? '—'} / {latest.right_arm_cm ?? '—'} <span className="text-[10px] font-normal" style={{ color: 'var(--fiq-muted)' }}>cm</span>
                    </span>
                  </div>
                )}
                {(latest.left_thigh_cm !== null || latest.right_thigh_cm !== null) && (
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Cuisse G / D</span>
                    <span className="text-sm font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                      {latest.left_thigh_cm ?? '—'} / {latest.right_thigh_cm ?? '—'} <span className="text-[10px] font-normal" style={{ color: 'var(--fiq-muted)' }}>cm</span>
                    </span>
                  </div>
                )}
                {(latest.left_calf_cm !== null || latest.right_calf_cm !== null) && (
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--fiq-muted)' }}>Mollet G / D</span>
                    <span className="text-sm font-black fiq-data" style={{ color: 'var(--fiq-text)' }}>
                      {latest.left_calf_cm ?? '—'} / {latest.right_calf_cm ?? '—'} <span className="text-[10px] font-normal" style={{ color: 'var(--fiq-muted)' }}>cm</span>
                    </span>
                  </div>
                )}
                {latest.notes && (
                  <p className="text-xs italic py-2" style={{ color: 'var(--fiq-muted)' }}>💬 {latest.notes}</p>
                )}
              </>
            )}

            {/* Toggle voir plus */}
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full flex items-center justify-center gap-1 py-2.5 text-xs font-semibold"
              style={{ color: 'var(--fiq-muted)' }}
            >
              {showAll ? <><ChevronUp className="w-3.5 h-3.5" /> Réduire</> : <><ChevronDown className="w-3.5 h-3.5" /> Voir tout</>}
            </button>
          </div>
        )}
      </div>

      {/* ── Modal saisie ─────────────────────────────────────────────────────── */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => !saving && setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div
              className="w-full max-w-[480px] rounded-t-3xl flex flex-col"
              style={{ background: 'var(--surface)', border: '1px solid var(--fiq-border)', borderBottom: 'none', maxHeight: '90dvh' }}
            >
              {/* Header modal */}
              <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--fiq-border)' }}>
                <p className="font-black text-base" style={{ color: 'var(--fiq-text)' }}>Saisir les mensurations</p>
                <button onClick={() => !saving && setShowModal(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--fiq-faint)', color: 'var(--fiq-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulaire */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>

                {/* Date */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1" style={{ color: 'var(--fiq-muted)' }}>Date</label>
                  <input
                    type="date"
                    value={form.measured_at}
                    onChange={e => handleChange('measured_at', e.target.value)}
                    className="w-full text-sm outline-none px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                  />
                </div>

                {/* Corps */}
                <section className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--fiq-accent)', letterSpacing: '0.08em' }}>Corps</p>
                  <div className="grid grid-cols-2 gap-3">
                    <MeasureInput label="Corps gras" field="body_fat_pct" form={form} unit="%" onChange={handleChange} />
                    <MeasureInput label="Tour de taille" field="waist_cm" form={form} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <MeasureInput label="Poitrine" field="chest_cm" form={form} onChange={handleChange} />
                    <MeasureInput label="Hanches" field="hips_cm" form={form} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <MeasureInput label="Épaules" field="shoulders_cm" form={form} onChange={handleChange} />
                    <MeasureInput label="Cou" field="neck_cm" form={form} onChange={handleChange} />
                  </div>
                </section>

                {/* Bras */}
                <section className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--fiq-blue)', letterSpacing: '0.08em' }}>Bras</p>
                  <div className="grid grid-cols-2 gap-3">
                    <MeasureInput label="Bras gauche" field="left_arm_cm" form={form} onChange={handleChange} />
                    <MeasureInput label="Bras droit" field="right_arm_cm" form={form} onChange={handleChange} />
                  </div>
                </section>

                {/* Jambes */}
                <section className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--fiq-orange)', letterSpacing: '0.08em' }}>Jambes</p>
                  <div className="grid grid-cols-2 gap-3">
                    <MeasureInput label="Cuisse gauche" field="left_thigh_cm" form={form} onChange={handleChange} />
                    <MeasureInput label="Cuisse droite" field="right_thigh_cm" form={form} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <MeasureInput label="Mollet gauche" field="left_calf_cm" form={form} onChange={handleChange} />
                    <MeasureInput label="Mollet droit" field="right_calf_cm" form={form} onChange={handleChange} />
                  </div>
                </section>

                {/* Notes */}
                <section>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1" style={{ color: 'var(--fiq-muted)' }}>Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => handleChange('notes', e.target.value)}
                    placeholder="Contexte, heure de mesure…"
                    rows={2}
                    className="w-full text-sm outline-none resize-none px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--fiq-faint)', border: '1px solid var(--fiq-border)', color: 'var(--fiq-text)' }}
                  />
                </section>
              </div>

              {/* Bouton sauvegarder */}
              <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--fiq-border)', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-70"
                  style={{ background: saved ? '#B4FF4A' : 'var(--fiq-accent)', color: 'var(--bg)' }}
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
                    : saved
                    ? <><Check className="w-4 h-4" /> Sauvegardé !</>
                    : 'Enregistrer les mensurations'
                  }
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
