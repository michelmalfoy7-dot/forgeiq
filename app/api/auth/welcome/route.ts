import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'ForgeIQ <noreply@getforgeiq.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'

function buildWelcomeEmail(firstName: string, goal: string): string {
  const goalMessages: Record<string, { emoji: string; tip: string }> = {
    muscle_gain:  { emoji: '💪', tip: 'Ton coach va suivre ton tonnage semaine par semaine et ajuster le volume pour maximiser ta progression.' },
    weight_loss:  { emoji: '🔥', tip: 'Ton coach surveille tes calories restantes et ton bilan quotidien pour t\'aider à garder le cap sans te priver.' },
    strength:     { emoji: '⚡', tip: 'Chaque PR sera détecté automatiquement. Ton coach ajuste l\'intensité selon ton sommeil et ta récupération.' },
    endurance:    { emoji: '🏃', tip: 'Ton coach suit tes pas, ta fréquence d\'entraînement et ton énergie pour progresser sans te blesser.' },
    general:      { emoji: '🎯', tip: 'Ton coach IA analyse tous tes indicateurs pour te proposer la séance parfaite chaque jour.' },
  }
  const { emoji, tip } = goalMessages[goal] ?? goalMessages.general

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0C0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0C0F;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111318;border-radius:16px;border:1px solid #1F242E;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#B4FF4A;padding:24px 32px;text-align:center;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#0A0C0F;letter-spacing:-0.03em;">FORGEIQ</h1>
            <p style="margin:4px 0 0;font-size:11px;font-weight:700;color:#0A0C0F;opacity:0.7;letter-spacing:0.08em;text-transform:uppercase;">Build smarter. Lift harder.</p>
          </td>
        </tr>

        <!-- Contenu principal -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#F0F2F5;letter-spacing:-0.02em;">
              ${firstName}, ta forge est prête ${emoji}
            </h2>
            <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.7;">
              Ton profil est configuré. Voici ce que ton coach IA va faire pour toi&nbsp;:
            </p>

            <!-- Tips -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              ${[
                ['📊', 'Bilan quotidien', 'Poids lissé EWMA, sommeil profond, fatigue — des données qui ont du sens.'],
                ['🏋️', 'Séance adaptée chaque jour', tip],
                ['🥩', 'Nutrition intelligente', 'Scanner un aliment, scanner un repas en photo — enregistrer en 10 secondes.'],
              ].map(([ico, title, desc]) => `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #1F242E;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:36px;vertical-align:top;padding-top:2px;font-size:18px;">${ico}</td>
                      <td>
                        <p style="margin:0 0 2px;font-size:13px;font-weight:800;color:#F0F2F5;">${title}</p>
                        <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.5;">${desc}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`).join('')}
            </table>

            <!-- CTA principal -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr>
                <td align="center">
                  <a href="${APP_URL}/dashboard"
                    style="display:inline-block;background:#B4FF4A;color:#0A0C0F;font-size:15px;font-weight:900;text-decoration:none;padding:14px 40px;border-radius:10px;letter-spacing:-0.01em;">
                    Voir mon dashboard →
                  </a>
                </td>
              </tr>
            </table>

            <!-- CTA secondaire -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${APP_URL}/coach"
                    style="display:inline-block;background:#1A1F2A;color:#B4FF4A;font-size:13px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:10px;border:1px solid #B4FF4A33;">
                    Poser une question au coach IA
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Conseil -->
        <tr>
          <td style="padding:16px 32px;background:#161A21;border-top:1px solid #1F242E;">
            <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.6;">
              💡 <strong style="color:#F0F2F5;">Conseil pro :</strong> Fais ton bilan quotidien chaque matin (moins de 60 secondes).
              Plus tu alimentes ForgeIQ en données, plus tes recommandations seront précises.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #1F242E;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6B7280;">
              © 2025 ForgeIQ —
              <a href="${APP_URL}" style="color:#B4FF4A;text-decoration:none;">getforgeiq.com</a>
              &nbsp;·&nbsp;
              <a href="${APP_URL}/profile" style="color:#6B7280;text-decoration:none;">Paramètres</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// POST — appelé depuis le client après completion de l'onboarding
export async function POST() {
  try {
    if (!RESEND_API_KEY) {
      // Pas de clé Resend → on skip silencieusement (dev local)
      return NextResponse.json({ data: { sent: false }, error: null })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ data: null, error: 'Non authentifié' }, { status: 401 })

    // Récupérer le profil pour personnaliser l'email
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, goal, welcome_email_sent')
      .eq('id', user.id)
      .single()

    // Ne pas renvoyer si déjà envoyé
    if (profile?.welcome_email_sent) {
      return NextResponse.json({ data: { sent: false, reason: 'already_sent' }, error: null })
    }

    const firstName = profile?.display_name?.split(' ')[0] ?? user.email.split('@')[0]
    const goal = profile?.goal ?? 'general'
    const html = buildWelcomeEmail(firstName, goal)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [user.email],
        subject: `${firstName}, ta forge est prête 🏋️`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Welcome email error:', err)
      return NextResponse.json({ data: null, error: 'Email send failed' }, { status: 500 })
    }

    // Marquer comme envoyé pour ne pas renvoyer
    await supabase
      .from('profiles')
      .update({ welcome_email_sent: true })
      .eq('id', user.id)

    return NextResponse.json({ data: { sent: true }, error: null })
  } catch (err) {
    console.error('Welcome email route error:', err)
    return NextResponse.json({ data: null, error: 'Erreur serveur' }, { status: 500 })
  }
}
