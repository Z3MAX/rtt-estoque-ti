const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

  // Lazy migration
  await sql`
    CREATE TABLE IF NOT EXISTS modulo_config (
      id         SERIAL PRIMARY KEY,
      curso_id   INTEGER NOT NULL,
      modulo_id  INTEGER NOT NULL,
      video_url  TEXT,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (curso_id, modulo_id)
    )
  `

  try {
    const auth = requireAuth(event)

    // GET — qualquer usuário autenticado
    if (event.httpMethod === 'GET') {
      const rows = await sql`SELECT curso_id, modulo_id, video_url FROM modulo_config`
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    // PUT — somente admins
    if (event.httpMethod === 'PUT') {
      if (!isAdminRole(auth.role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }
      const { curso_id, modulo_id, video_url } = JSON.parse(event.body || '{}')
      if (!curso_id || !modulo_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'curso_id e modulo_id obrigatórios' }) }
      }
      await sql`
        INSERT INTO modulo_config (curso_id, modulo_id, video_url)
        VALUES (${curso_id}, ${modulo_id}, ${video_url ?? null})
        ON CONFLICT (curso_id, modulo_id)
        DO UPDATE SET video_url = ${video_url ?? null}, updated_at = NOW()
      `
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('modulo-config error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
