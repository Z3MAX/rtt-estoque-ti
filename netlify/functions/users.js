const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

async function sendWelcomeEmail({ name, email, password, role, loginUrl }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { skipped: true, reason: 'RESEND_API_KEY not configured' }

  const roleLabel = role === 'Administrador de TI' ? 'Administrador de TI' : 'Técnico de TI'
  const roleColor = role === 'Administrador de TI' ? '#6366f1' : '#10b981'

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
          <p style="margin:24px 0 0;color:#fff;font-size:24px;font-weight:700">Bem-vindo à plataforma!</p>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:14px">Seu acesso foi criado com sucesso</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:36px 40px">
          <p style="margin:0 0 8px;color:#64748b;font-size:14px">Olá,</p>
          <p style="margin:0 0 24px;color:#0f172a;font-size:22px;font-weight:700">${name} 👋</p>

          <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6">
            Seu acesso ao sistema de controle de estoque de TI da <strong>RTT</strong> foi criado. Use as credenciais abaixo para entrar na plataforma.
          </p>

          <!-- Credentials box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 14px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Suas credenciais</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px;width:80px">E-mail</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600">${email}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px">Senha</td>
                  <td style="padding:6px 0">
                    <span style="background:#0f172a;color:#e2e8f0;font-family:monospace;font-size:14px;font-weight:600;padding:3px 10px;border-radius:6px">${password}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px">Perfil</td>
                  <td style="padding:6px 0">
                    <span style="background:${roleColor}20;color:${roleColor};font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px">${roleLabel}</span>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td align="center">
              <a href="${loginUrl}" style="display:inline-block;background:#6366f1;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.01em">
                Acessar a Plataforma →
              </a>
            </td></tr>
          </table>

          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center">
            Recomendamos que você altere sua senha após o primeiro acesso.<br>
            Em caso de dúvidas, contate o administrador do sistema.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© 2025 RTT · Todos os direitos reservados</p>
          <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px">Este e-mail foi gerado automaticamente pelo sistema de TI da RTT.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'RTT TI <onboarding@resend.dev>',
        to: [email],
        subject: `🔐 Seu acesso à plataforma RTT foi criado`,
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) return { skipped: false, error: data }
    return { skipped: false, id: data.id }
  } catch (err) {
    return { skipped: false, error: err.message }
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)
  const id = event.queryStringParameters?.id

  try {
    // GET — list all users
    if (event.httpMethod === 'GET' && !id) {
      const rows = await sql`
        SELECT id, name, email, role, active, created_at, updated_at
        FROM users
        ORDER BY name ASC
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    // GET — single user
    if (event.httpMethod === 'GET' && id) {
      const rows = await sql`
        SELECT id, name, email, role, active, created_at, updated_at
        FROM users WHERE id = ${id}
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    // POST — create user
    if (event.httpMethod === 'POST') {
      const { name, email, password, role } = JSON.parse(event.body || '{}')
      if (!name || !email || !password) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome, e-mail e senha são obrigatórios' }) }
      }

      // Check duplicate email
      const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
      if (existing.length > 0) {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'E-mail já cadastrado' }) }
      }

      const passwordHash = hashPassword(password)
      const rows = await sql`
        INSERT INTO users (name, email, password_hash, role, must_change_password)
        VALUES (${name}, ${email.toLowerCase()}, ${passwordHash}, ${role || 'Técnico de TI'}, true)
        RETURNING id, name, email, role, active, must_change_password, created_at, updated_at
      `

      // Send welcome email (non-blocking — if it fails, user is still created)
      const loginUrl = process.env.SITE_URL || 'https://mellifluous-peony-a229d6.netlify.app'
      const emailResult = await sendWelcomeEmail({ name, email: email.toLowerCase(), password, role: role || 'Técnico de TI', loginUrl })

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ ...rows[0], emailSent: !emailResult.skipped && !emailResult.error }),
      }
    }

    // PUT — update user
    if (event.httpMethod === 'PUT' && id) {
      const { name, email, password, role, active } = JSON.parse(event.body || '{}')

      const updates = {}
      if (name !== undefined)   updates.name = name
      if (email !== undefined)  updates.email = email.toLowerCase()
      if (role !== undefined)   updates.role = role
      if (active !== undefined) updates.active = active
      if (password)             updates.password_hash = hashPassword(password)

      if (email !== undefined) {
        const dup = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} AND id != ${id}`
        if (dup.length > 0) {
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'E-mail já utilizado por outro usuário' }) }
        }
      }

      const rows = await sql`
        UPDATE users SET
          name          = COALESCE(${updates.name ?? null}, name),
          email         = COALESCE(${updates.email ?? null}, email),
          role          = COALESCE(${updates.role ?? null}, role),
          active        = COALESCE(${updates.active ?? null}, active),
          password_hash = COALESCE(${updates.password_hash ?? null}, password_hash),
          updated_at    = NOW()
        WHERE id = ${id}
        RETURNING id, name, email, role, active, created_at, updated_at
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    // DELETE — deactivate user (soft delete)
    if (event.httpMethod === 'DELETE' && id) {
      const rows = await sql`
        UPDATE users SET active = false, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Rota não encontrada' }) }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
