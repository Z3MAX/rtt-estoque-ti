const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS humor_feedbacks (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL,
        user_name   TEXT,
        humor       TEXT NOT NULL,
        comentario  TEXT,
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `

    const auth = requireAuth(event)

    if (event.httpMethod === 'POST') {
      const { humor, comentario } = JSON.parse(event.body || '{}')
      if (!humor) return { statusCode: 400, headers, body: JSON.stringify({ error: 'humor obrigatório' }) }

      // Busca o nome do usuário
      const userRows = await sql`SELECT name FROM users WHERE id = ${auth.userId} LIMIT 1`
      const userName = userRows[0]?.name ?? null

      await sql`
        INSERT INTO humor_feedbacks (user_id, user_name, humor, comentario)
        VALUES (${auth.userId}, ${userName}, ${humor}, ${comentario ?? null})
      `
      return { statusCode: 201, headers, body: JSON.stringify({ success: true }) }
    }

    if (event.httpMethod === 'GET') {
      // Apenas admins de RH e Master podem ver os feedbacks
      if (!isAdminRole(auth.role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }
      }
      const params = event.queryStringParameters || {}
      const limit = Math.min(parseInt(params.limit || '100'), 500)
      const offset = parseInt(params.offset || '0')
      const humor = params.humor || null

      let rows
      if (humor) {
        rows = await sql`
          SELECT * FROM humor_feedbacks
          WHERE humor = ${humor}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else {
        rows = await sql`
          SELECT * FROM humor_feedbacks
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }
      const total = await sql`SELECT COUNT(*)::int AS count FROM humor_feedbacks ${humor ? sql`WHERE humor = ${humor}` : sql``}`
      return { statusCode: 200, headers, body: JSON.stringify({ items: rows, total: total[0].count }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('humor-feedback error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
