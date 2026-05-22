const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { requireAdmin, makeHeaders, errorResponse } = require('./_auth')
const { sendInviteEmail } = require('./_email')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  if (!process.env.DATABASE_URL)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL não configurado' }) }

  const siteUrl = process.env.SITE_URL
  if (!siteUrl)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'SITE_URL não configurado nas variáveis de ambiente do Netlify' }) }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'GMAIL_USER ou GMAIL_APP_PASSWORD não configurado nas variáveis de ambiente do Netlify' }) }

  try {
    requireAdmin(event)
    const sql = neon(process.env.DATABASE_URL)

    const { userId } = JSON.parse(event.body || '{}')
    if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId obrigatório' }) }

    const users = await sql`
      SELECT id, name, email, role, active FROM users WHERE id = ${userId}
    `
    if (users.length === 0)
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }

    const user = users[0]
    if (!user.active)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Usuário está desativado' }) }

    // Garante que a tabela de tokens existe
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

    // Invalida tokens anteriores não utilizados
    await sql`UPDATE password_reset_tokens SET used = true WHERE user_id = ${user.id} AND used = false`

    // Gera novo token com validade de 7 dias
    const inviteToken = crypto.randomBytes(40).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${inviteToken}, ${expiresAt.toISOString()})
    `

    const result = await sendInviteEmail({
      name:      user.name,
      email:     user.email,
      inviteUrl: `${siteUrl}/reset-password?token=${inviteToken}`,
      role:      user.role,
    })

    if (result.skipped)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Credenciais de e-mail não configuradas no Netlify' }) }
    if (result.error)
      return { statusCode: 500, headers, body: JSON.stringify({ error: `Falha ao enviar e-mail: ${result.error}` }) }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, email: user.email }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
