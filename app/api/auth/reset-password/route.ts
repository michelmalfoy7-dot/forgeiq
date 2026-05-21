import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// POST : génère un lien de reset et l'envoie via Resend (bypass SMTP Supabase)
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email manquant' }, { status: 400 })

    // Client admin pour générer le lien de reset
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforgeiq.com'}/auth/reset`,
      },
    })

    if (error) {
      // Ne pas révéler si l'email existe ou non (sécurité)
      console.error('Generate link error:', error.message)
      return NextResponse.json({ success: true }) // Toujours répondre OK
    }

    const resetUrl = data.properties?.action_link
    if (!resetUrl) return NextResponse.json({ success: true })

    // Envoi via Resend API directement
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ForgeIQ <noreply@getforgeiq.com>',
        to: [email],
        subject: '🔐 Réinitialise ton mot de passe ForgeIQ',
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
            <p style="margin:4px 0 0;font-size:12px;font-weight:700;color:#0A0C0F;opacity:0.7;letter-spacing:0.08em;text-transform:uppercase;">Build smarter. Lift harder.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#F0F2F5;">Réinitialisation du mot de passe</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.6;">
              Tu as demandé à réinitialiser ton mot de passe ForgeIQ. Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${resetUrl}" style="display:inline-block;background:#B4FF4A;color:#0A0C0F;font-size:15px;font-weight:900;text-decoration:none;padding:14px 32px;border-radius:10px;">
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
      }),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ success: true }) // Toujours OK pour ne pas révéler les erreurs
  }
}
