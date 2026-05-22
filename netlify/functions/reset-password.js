const { neon } = require('@neondatabase/serverless')
const { hashPassword } = require('./_hash')
const { makeHeaders, errorResponse } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  let token, newPassword
  try {
    const body = JSON.parse(event.body || '{}')
    token = body.token
    newPassword = body.newPassword
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  if (!token || !newPassword) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token e nova senha são obrigatórios' }) }
  }
  if (newPassword.length < 8) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'A senha deve ter no mínimo 8 caracteres' }) }
  }
  if (newPassword.length > 200) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Senha muito longa' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    const tokens = await sql`
      SELECT t.id, t.user_id, t.expires_at, t.used, u.name, u.email
      FROM password_reset_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token = ${token}
    `

    if (tokens.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Link inválido. Solicite um novo link de redefinição.' }) }
    }

    const resetToken = tokens[0]

    if (resetToken.used) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Este link já foi utilizado. Solicite um novo link.' }) }
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Link expirado. Solicite um novo link de redefinição.' }) }
    }

    const hash = await hashPassword(newPassword)

    await sql`
      UPDATE users
      SET password_hash = ${hash},
          must_change_password = false,
          updated_at = NOW()
      WHERE id = ${resetToken.user_id}
    `

    await sql`UPDATE password_reset_tokens SET used = true WHERE id = ${resetToken.id}`

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Senha redefinida com sucesso!' }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
