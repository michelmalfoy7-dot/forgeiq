import { NextRequest, NextResponse } from 'next/server'

// Supabase Auth Hook — reçoit les événements d'auth et envoie les emails via Resend
// Bypass total du SMTP Supabase

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const FROM = 'ForgeIQ <noreply@getforgeiq.com>'

interface AuthHookPayload {
  user: {
    id: string
    email: string
    email_confirmed_at?: string
    user_metadata?: Record<string, unknown>
  }
  email_data: {
    token?: string
    token_hash?: string
    redirect_to?: string
    email_action_type: 'signup' | 'recovery' | 'invite' | 'email_change' | 'magic_link'
    site_url?: string
    verification_type?: string
  }
}

function buildConfirmUrl(payload: AuthHookPayload): string {
  const { email_data } = payload
  const base = email_data.site_url ?? 'https://getforgeiq.com'
  const tokenHash = email_data.token_hash ?? email_data.token ?? ''
  const redirectTo = email_data.redirect_to ?? `${base}/dashboard`
  return `${base}/auth/confirm?token_hash=${tokenHash}&type=${email_data.email_action_type}&next=${encodeURIComponent(redirectTo)}`
}

function signupEmail(email: string, confirmUrl: string): { subject: string; html: string } {
  return {
    subject: '🏋️ Confirme ton compte ForgeIQ',
    html: `
<!DOCTYPE html>
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
            <p style="margin:4px 0 0;font-size:12px;font-weight:700;color:#0A0C0F;opacity:0.7;letter-spacing:0.08em;text-transform:uppercase;">Build smarter. Lift harder.</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#F0F2F5;">Bienvenue dans la forge 🔥</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.6;">
              Ton compte a bien été créé. Clique sur le bouton ci-dessous pour le confirmer et commencer ton programme personnalisé.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${confirmUrl}" style="display:inline-block;background:#B4FF4A;color:#0A0C0F;font-size:15px;font-weight:900;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.01em;">
                    Confirmer mon compte →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:12px;color:#6B7280;text-align:center;">
              Ce lien expire dans 24h. Si tu n'as pas créé de compte, ignore cet email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #1F242E;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6B7280;">
              © 2025 ForgeIQ — <a href="https://getforgeiq.com" style="color:#B4FF4A;text-decoration:none;">getforgeiq.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

function recoveryEmail(email: string, confirmUrl: string): { subject: string; html: string } {
  return {
    subject: '🔐 Réinitialisation de ton mot de passe ForgeIQ',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0C0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0C0F;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111318;border-radius:16px;border:1px solid #1F242E;overflow:hidden;">
        <tr>
          <td style="background:#B4FF4A;padding:24px 32px;text-align:center;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#0A0C0F;letter-spacing:-0.03em;">FORGEIQ</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#F0F2F5;">Réinitialisation du mot de passe</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.6;">
              Tu as demandé à réinitialiser ton mot de passe. Clique ci-dessous pour choisir un nouveau mot de passe.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${confirmUrl}" style="display:inline-block;background:#B4FF4A;color:#0A0C0F;font-size:15px;font-weight:900;text-decoration:none;padding:14px 32px;border-radius:10px;">
                    Choisir un nouveau mot de passe →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:12px;color:#6B7280;text-align:center;">
              Ce lien expire dans 1h. Si tu n'as pas fait cette demande, ignore cet email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #1F242E;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6B7280;">
              © 2025 ForgeIQ — <a href="https://getforgeiq.com" style="color:#B4FF4A;text-decoration:none;">getforgeiq.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

function magicLinkEmail(email: string, confirmUrl: string): { subject: string; html: string } {
  return {
    subject: '🔑 Ton lien de connexion ForgeIQ',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0C0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0C0F;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111318;border-radius:16px;border:1px solid #1F242E;overflow:hidden;">
        <tr>
          <td style="background:#B4FF4A;padding:24px 32px;text-align:center;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#0A0C0F;letter-spacing:-0.03em;">FORGEIQ</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#F0F2F5;">Connexion sans mot de passe</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.6;">
              Clique sur ce lien magique pour te connecter instantanément à ForgeIQ.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${confirmUrl}" style="display:inline-block;background:#B4FF4A;color:#0A0C0F;font-size:15px;font-weight:900;text-decoration:none;padding:14px 32px;border-radius:10px;">
                    Se connecter →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:12px;color:#6B7280;text-align:center;">
              Ce lien expire dans 1h et ne peut être utilisé qu'une seule fois.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #1F242E;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6B7280;">
              © 2025 ForgeIQ — <a href="https://getforgeiq.com" style="color:#B4FF4A;text-decoration:none;">getforgeiq.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload: AuthHookPayload = await req.json()
    const { user, email_data } = payload

    if (!user?.email) {
      return NextResponse.json({ error: 'No email' }, { status: 400 })
    }

    const confirmUrl = buildConfirmUrl(payload)

    let emailContent: { subject: string; html: string }

    switch (email_data.email_action_type) {
      case 'signup':
        emailContent = signupEmail(user.email, confirmUrl)
        break
      case 'recovery':
        emailContent = recoveryEmail(user.email, confirmUrl)
        break
      case 'magic_link':
        emailContent = magicLinkEmail(user.email, confirmUrl)
        break
      case 'invite':
        emailContent = signupEmail(user.email, confirmUrl)
        break
      default:
        emailContent = {
          subject: 'Action requise — ForgeIQ',
          html: `<p>Clique ici : <a href="${confirmUrl}">${confirmUrl}</a></p>`,
        }
    }

    // Appel Resend REST API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [user.email],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Email sent' })
  } catch (err) {
    console.error('Email hook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
