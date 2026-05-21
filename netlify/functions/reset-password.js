const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

exports.handler = async (event) => {
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

  if (newPassword.length < 6) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    // Validate token
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

    // Update password
    await sql`
      UPDATE users SET password_hash = ${hashPassword(newPassword)}, updated_at = NOW()
      WHERE id = ${resetToken.user_id}
    `

    // Mark token as used
    await sql`UPDATE password_reset_tokens SET used = true WHERE id = ${resetToken.id}`

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Senha redefinida com sucesso!' }),
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
