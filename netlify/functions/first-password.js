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

  let userId, newPassword
  try {
    const body = JSON.parse(event.body || '{}')
    userId = body.userId
    newPassword = body.newPassword
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  if (!userId || !newPassword) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId e newPassword são obrigatórios' }) }
  }

  if (newPassword.length < 6) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    const rows = await sql`
      UPDATE users
      SET password_hash = ${hashPassword(newPassword)},
          must_change_password = false,
          updated_at = NOW()
      WHERE id = ${userId} AND must_change_password = true
      RETURNING id, name, email, role, active
    `

    if (rows.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Usuário não encontrado ou senha já definida.' }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, user: rows[0] }),
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
