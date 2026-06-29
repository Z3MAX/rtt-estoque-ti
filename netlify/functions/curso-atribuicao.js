const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

  await sql`
    CREATE TABLE IF NOT EXISTS curso_atribuicao (
      id             SERIAL PRIMARY KEY,
      colaborador_id INTEGER NOT NULL,
      curso_id       INTEGER NOT NULL,
      created_at     TIMESTAMP DEFAULT NOW(),
      UNIQUE (colaborador_id, curso_id)
    )
  `

  try {
    const auth = requireAuth(event)
    const params = event.queryStringParameters || {}

    // GET — returns course assignments for a colaborador
    if (event.httpMethod === 'GET') {
      let colaboradorId = params.colaborador_id ? parseInt(params.colaborador_id) : null

      // Only admins can query other users' assignments
      if (colaboradorId && !isAdminRole(auth.role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }

      // No colaborador_id param → look up the current user's colaborador_id
      if (!colaboradorId) {
        const rows = await sql`SELECT colaborador_id FROM users WHERE id = ${auth.userId}`
        colaboradorId = rows[0]?.colaborador_id ?? null
      }

      if (!colaboradorId) {
        return { statusCode: 200, headers, body: JSON.stringify({ colaborador_id: null, curso_ids: [] }) }
      }

      const rows = await sql`SELECT curso_id FROM curso_atribuicao WHERE colaborador_id = ${colaboradorId}`
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ colaborador_id: colaboradorId, curso_ids: rows.map(r => r.curso_id) }),
      }
    }

    // PUT — replace all assignments for a colaborador (admin only)
    if (event.httpMethod === 'PUT') {
      if (!isAdminRole(auth.role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }
      const { colaborador_id, curso_ids } = JSON.parse(event.body || '{}')
      if (!colaborador_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'colaborador_id obrigatório' }) }

      await sql`DELETE FROM curso_atribuicao WHERE colaborador_id = ${colaborador_id}`

      if (Array.isArray(curso_ids) && curso_ids.length > 0) {
        for (const cursoId of curso_ids) {
          await sql`
            INSERT INTO curso_atribuicao (colaborador_id, curso_id)
            VALUES (${colaborador_id}, ${cursoId})
            ON CONFLICT DO NOTHING
          `
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, curso_ids: curso_ids ?? [] }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('curso-atribuicao error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
