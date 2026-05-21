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

  let email, password
  try {
    const body = JSON.parse(event.body || '{}')
    email = body.email
    password = body.password
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  if (!email || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail e senha obrigatórios' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    const passwordHash = hashPassword(password)
    const rows = await sql`
      SELECT id, name, email, role, active
      FROM users
      WHERE email = ${email.toLowerCase()} AND password_hash = ${passwordHash}
    `

    if (rows.length === 0) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'E-mail ou senha incorretos' }) }
    }

    const user = rows[0]

    if (!user.active) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Usuário desativado. Contate o administrador.' }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }),
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
