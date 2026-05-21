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
        INSERT INTO users (name, email, password_hash, role)
        VALUES (${name}, ${email.toLowerCase()}, ${passwordHash}, ${role || 'Técnico de TI'})
        RETURNING id, name, email, role, active, created_at, updated_at
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    // PUT — update user
    if (event.httpMethod === 'PUT' && id) {
      const { name, email, password, role, active } = JSON.parse(event.body || '{}')

      // Build dynamic update
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
