import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'ForgeIQ — Build smarter. Lift harder.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Image OG générée dynamiquement — sert à /opengraph-image
// Référencée dans layout.tsx metadata + toutes les pages publiques
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0C0F',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gradient accent background */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: -200,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #B4FF4A18 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -150,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #3D8BFF12 0%, transparent 70%)',
          }}
        />

        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <div
            style={{
              fontSize: 72,
              lineHeight: 1,
            }}
          >
            ⚗️
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: '#F0F2F5',
              letterSpacing: '-3px',
              lineHeight: 1,
            }}
          >
            ForgeIQ
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: '#B4FF4A',
            letterSpacing: '-1px',
            marginBottom: 24,
          }}
        >
          Build smarter. Lift harder.
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 22,
            color: '#6B7280',
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.5,
            marginBottom: 40,
          }}
        >
          Coach IA fitness · Entraînement · Nutrition · Biométrie
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 16 }}>
          {['🤖 Coach IA adaptatif', '📊 PRs automatiques', '🥗 Nutrition intelligente'].map((text) => (
            <div
              key={text}
              style={{
                background: '#161A21',
                border: '1px solid #1F242E',
                borderRadius: 40,
                padding: '10px 20px',
                fontSize: 18,
                color: '#F0F2F5',
                fontWeight: 600,
              }}
            >
              {text}
            </div>
          ))}
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 48,
            background: '#B4FF4A15',
            border: '1px solid #B4FF4A33',
            borderRadius: 20,
            padding: '8px 20px',
            fontSize: 16,
            color: '#B4FF4A',
            fontWeight: 700,
          }}
        >
          getforgeiq.com
        </div>
      </div>
    ),
    { ...size },
  )
}
