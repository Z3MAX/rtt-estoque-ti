const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS curso_avaliacao (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL,
        curso_id    INTEGER NOT NULL,
        nota        INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
        comentario  TEXT,
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, curso_id)
      )
    `
  } catch (e) {
    console.error('curso-avaliacao setup error:', e)
  }

  try {
    const auth = requireAuth(event)
    const userId = auth.userId
    const params = event.queryStringParameters || {}

    if (event.httpMethod === 'GET') {
      const cursoId = params.curso_id ? parseInt(params.curso_id) : null
      if (!cursoId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'curso_id obrigatório' }) }
      const rows = await sql`SELECT nota, comentario FROM curso_avaliacao WHERE user_id = ${userId} AND curso_id = ${cursoId}`
      return { statusCode: 200, headers, body: JSON.stringify(rows[0] ?? null) }
    }

    if (event.httpMethod === 'POST') {
      const { curso_id, nota, comentario } = JSON.parse(event.body || '{}')
      if (!curso_id || !nota) return { statusCode: 400, headers, body: JSON.stringify({ error: 'curso_id e nota obrigatórios' }) }
      await sql`
        INSERT INTO curso_avaliacao (user_id, curso_id, nota, comentario)
        VALUES (${userId}, ${curso_id}, ${nota}, ${comentario ?? null})
        ON CONFLICT (user_id, curso_id) DO UPDATE SET nota = ${nota}, comentario = ${comentario ?? null}, created_at = NOW()
      `
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('curso-avaliacao error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
