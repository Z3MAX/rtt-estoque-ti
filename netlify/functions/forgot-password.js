const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function sendResetEmail({ name, email, resetUrl }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { skipped: true }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center">
          <table cellpadding="0" cellspacing="0" align="center">
            <tr>
              <td style="background:#6366f1;border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle">
                <span style="color:#fff;font-size:22px;font-weight:bold;line-height:44px">&#9729;</span>
              </td>
              <td style="padding-left:12px;text-align:left">
                <p style="margin:0;color:#fff;font-size:20px;font-weight:700;line-height:1">RTT</p>
                <p style="margin:2px 0 0;color:#94a3b8;font-size:12px">Controle de Estoque TI</p>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0;color:#fff;font-size:24px;font-weight:700">Redefinição de senha</p>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:14px">Recebemos uma solicitação para redefinir sua senha</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:36px 40px">
          <p style="margin:0 0 8px;color:#64748b;font-size:14px">Olá,</p>
          <p style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700">${name} 👋</p>

          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6">
            Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong> e pode ser usado apenas uma vez.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr><td align="center">
              <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.01em">
                Redefinir minha senha →
              </a>
            </td></tr>
          </table>

          <!-- Link fallback -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px">
            <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Ou copie o link abaixo</p>
            <p style="margin:0;color:#6366f1;font-size:12px;word-break:break-all">${resetUrl}</p>
          </div>

          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center">
            Se você não solicitou a redefinição de senha, ignore este e-mail.<br>
            Sua senha permanecerá a mesma.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© 2025 RTT · Todos os direitos reservados</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'RTT TI <onboarding@resend.dev>',
        to: [email],
        subject: '🔐 Redefinição de senha — RTT',
        html,
      }),
    })
    const data = await res.json()
    return res.ok ? { sent: true, id: data.id } : { sent: false, error: data }
  } catch (err) {
    return { sent: false, error: err.message }
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  let email
  try {
    email = JSON.parse(event.body || '{}').email
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  if (!email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail obrigatório' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  // Ensure token table exists
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(128) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  // Always return success to avoid user enumeration
  const successResponse = {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' }),
  }

  try {
    const users = await sql`SELECT id, name, email FROM users WHERE email = ${email.toLowerCase()} AND active = true`
    if (users.length === 0) return successResponse

    const user = users[0]

    // Invalidate previous tokens
    await sql`UPDATE password_reset_tokens SET used = true WHERE user_id = ${user.id} AND used = false`

    // Generate secure token
    const token = crypto.randomBytes(40).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
    `

    const siteUrl = process.env.SITE_URL || 'https://mellifluous-peony-a229d6.netlify.app'
    const resetUrl = `${siteUrl}/reset-password?token=${token}`

    await sendResetEmail({ name: user.name, email: user.email, resetUrl })

    return successResponse
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
