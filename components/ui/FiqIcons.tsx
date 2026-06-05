/**
 * ForgeIQ — Icônes custom SVG
 *
 * Remplacent les emojis dans l'UI pour une identité visuelle cohérente.
 * Style : stroke, strokeWidth 1.75, strokeLinecap round, grille 24×24
 * Couleur : currentColor (hérite du parent — coloriable via className/style)
 *
 * Usage :
 *   import { FiqBreakfast, FiqLunch } from '@/components/ui/FiqIcons'
 *   <FiqBreakfast size={18} className="text-[var(--fiq-accent)]" />
 *
 * Mapping emoji → icône :
 *   🌅  → FiqBreakfast    (petit-déjeuner)
 *   ☀️  → FiqLunch        (déjeuner)
 *   🌙  → FiqDinner       (dîner)
 *   ⚡  → FiqSnack        (collation / énergie rapide)
 *   🔥  → FiqStreak       (streak / intensité)
 *   🏆  → FiqPR           (record personnel)
 *   💪  → FiqDumbbell     (séance / workout)
 *   🧬  → FiqMicros       (micronutriments)
 *   🫀  → FiqHeartPulse   (tension / cardio)
 *   💧  → FiqDrop         (hydratation)
 *   ⚠️  → FiqAlert        (alerte)
 *   ✅  → FiqCheck        (succès / confirmé)
 *   📊  → FiqVolume       (stats / volume hebdo)
 *   🔄  → FiqCircuit      (circuit / repos)
 *
 * Pour les icônes fonctionnelles (back, close, add, etc.) → utiliser Lucide directement.
 */

type FiqIconProps = {
  size?: number
  className?: string
  style?: React.CSSProperties
}

const STROKE = { strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

// ── Repas ──────────────────────────────────────────────────────────────────────

/** 🌅 Petit-déjeuner — lever de soleil géométrique */
export function FiqBreakfast({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      {/* Horizon */}
      <line x1="2" y1="17" x2="22" y2="17" />
      {/* Demi-cercle soleil */}
      <path d="M7 17A5 5 0 0 1 17 17" />
      {/* Rayons */}
      <line x1="12" y1="10" x2="12" y2="8" />
      <line x1="18.2" y1="13.2" x2="19.6" y2="11.8" />
      <line x1="5.8" y1="13.2" x2="4.4" y2="11.8" />
    </svg>
  )
}

/** ☀️ Déjeuner — soleil plein */
export function FiqLunch({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="3"  x2="12" y2="5"  />
      <line x1="12" y1="19" x2="12" y2="21" />
      <line x1="3"  y1="12" x2="5"  y2="12" />
      <line x1="19" y1="12" x2="21" y2="12" />
      <line x1="5.64"  y1="5.64"  x2="7.05"  y2="7.05"  />
      <line x1="16.95" y1="16.95" x2="18.36" y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="16.95" y2="7.05"  />
      <line x1="7.05"  y1="16.95" x2="5.64"  y2="18.36" />
    </svg>
  )
}

/** 🌙 Dîner — lune croissante */
export function FiqDinner({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

/** ⚡ Collation — éclair (énergie rapide) */
export function FiqSnack({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

// ── Performance ────────────────────────────────────────────────────────────────

/** 🔥 Streak — flamme (fill semi-transparent pour distinction avec goutte) */
export function FiqStreak({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      {/* Corps externe — forme flamme (plus large en bas, effilée en haut avec courbe) */}
      <path
        d="M12 2C9.5 7 7 10 7 14.5a5 5 0 0 0 10 0C17 10 14.5 7 12 2z"
        fill="currentColor" fillOpacity="0.15"
      />
      {/* Cœur interne — différencie flamme de goutte */}
      <path
        d="M12 10c-1 2.5-2 4-2 6a2 2 0 0 0 4 0c0-2-1-3.5-2-6z"
        fill="currentColor" fillOpacity="0.3"
        stroke="none"
      />
    </svg>
  )
}

/** 🏆 Record personnel — bouclier avec éclair */
export function FiqPR({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      {/* Étoile-médaille */}
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

/** 💪 Séance / workout — haltère */
export function FiqDumbbell({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      {/* Barre */}
      <line x1="9" y1="12" x2="15" y2="12" />
      {/* Côté gauche */}
      <line x1="5" y1="9"  x2="5"  y2="15" strokeWidth={2.5} />
      <line x1="3" y1="10" x2="3"  y2="14" strokeWidth={3}   />
      {/* Côté droit */}
      <line x1="19" y1="9"  x2="19" y2="15" strokeWidth={2.5} />
      <line x1="21" y1="10" x2="21" y2="14" strokeWidth={3}   />
      {/* Raccords barre-disque */}
      <line x1="5"  y1="12" x2="9"  y2="12" />
      <line x1="15" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ── Santé / Nutrition ──────────────────────────────────────────────────────────

/** 🧬 Micronutriments — molécule 3 atomes (triangle) */
export function FiqMicros({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      {/* 3 atomes */}
      <circle cx="12" cy="4.5" r="2" />
      <circle cx="4.5" cy="18" r="2" />
      <circle cx="19.5" cy="18" r="2" />
      {/* Liaisons */}
      <line x1="12"  y1="6.5"  x2="6"   y2="16.3" />
      <line x1="12"  y1="6.5"  x2="18"  y2="16.3" />
      <line x1="6.5" y1="18"   x2="17.5" y2="18"  />
    </svg>
  )
}

/** 🫀 Tension / cardio — pulsation cardiaque */
export function FiqHeartPulse({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l1.5-3 2 5 1.5-2.5h4.28" />
    </svg>
  )
}

/** 💧 Hydratation — goutte */
export function FiqDrop({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  )
}

// ── Système / UI ───────────────────────────────────────────────────────────────

/** ⚠️ Alerte — triangle */
export function FiqAlert({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9"  x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/** ✅ Succès — cercle avec coche */
export function FiqCheck({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

/** 📊 Volume / stats — graphe barres */
export function FiqVolume({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4"  />
      <line x1="6"  y1="20" x2="6"  y2="14" />
      <line x1="2"  y1="20" x2="22" y2="20" />
    </svg>
  )
}

/** 🔄 Circuit / repos — flèches en boucle */
export function FiqCircuit({ size = 20, className = '', style }: FiqIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" {...STROKE} className={className} style={style}>
      <polyline points="1 4 1 10 7 10" />
      <polyline points="23 20 23 14 17 14" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  )
}
