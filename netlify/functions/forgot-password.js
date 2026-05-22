const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { makeHeaders, errorResponse } = require('./_auth')
const { sendResetEmail } = require('./_email')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
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

  // Resposta genérica para evitar enumeração de usuários
  const successResponse = {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' }),
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
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

    const users = await sql`SELECT id, name, email FROM users WHERE email = ${email.toLowerCase()} AND active = true`
    if (users.length === 0) {
      await new Promise((r) => setTimeout(r, 400)) // previne enumeração por timing
      return successResponse
    }

    const user = users[0]

    // Invalida tokens anteriores para este usuário
    await sql`UPDATE password_reset_tokens SET used = true WHERE user_id = ${user.id} AND used = false`

    const token = crypto.randomBytes(40).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
    `

    const siteUrl = process.env.SITE_URL
    if (!siteUrl) {
      console.error('[forgot-password] SITE_URL não configurado')
      return successResponse
    }

    await sendResetEmail({ name: user.name, email: user.email, resetUrl: `${siteUrl}/reset-password?token=${token}` })

    return successResponse
  } catch (err) {
    return errorResponse(headers, err)
  }
}
