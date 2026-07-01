'use client'

/**
 * Mini graphique de tendance (SVG) — progression du top set d'un exercice.
 * Inline dans le logger pour voir sa courbe sans quitter la séance (vs Hevy).
 */
export function Sparkline({
  points,
  width = 220,
  height = 44,
}: {
  points: number[]
  width?: number
  height?: number
}) {
  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const pad = 5
  const w = width - pad * 2
  const h = height - pad * 2

  const coords = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * w,
    y: pad + h - ((p - min) / range) * h,
  }))

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${height - pad} L ${coords[0].x.toFixed(1)} ${height - pad} Z`
  const last = coords[coords.length - 1]
  const up = points[points.length - 1] >= points[0]
  const color = up ? 'var(--fiq-accent)' : 'var(--fiq-orange)'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }} aria-hidden="true">
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={3} fill={color} />
    </svg>
  )
}
