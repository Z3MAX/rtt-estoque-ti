const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}

  try {
    const auth = requireAuth(event)
    const userId = auth.userId

    if (event.httpMethod === 'GET') {
      const rows = await sql`SELECT * FROM pdi_iniciativas WHERE user_id = ${userId} ORDER BY created_at DESC`
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const { titulo, competencia, prazo, status, pct } = JSON.parse(event.body || '{}')
      if (!titulo) return { statusCode: 400, headers, body: JSON.stringify({ error: 'titulo obrigatório' }) }
      const rows = await sql`
        INSERT INTO pdi_iniciativas (user_id, titulo, competencia, prazo, status, pct)
        VALUES (${userId}, ${titulo}, ${competencia ?? null}, ${prazo ?? null}, ${status ?? 'pendente'}, ${pct ?? 0})
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      const id = parseInt(params.id)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      const { titulo, competencia, prazo, status, pct } = JSON.parse(event.body || '{}')
      const rows = await sql`
        UPDATE pdi_iniciativas SET
          titulo = COALESCE(${titulo ?? null}, titulo),
          competencia = COALESCE(${competencia ?? null}, competencia),
          prazo = COALESCE(${prazo ?? null}, prazo),
          status = COALESCE(${status ?? null}, status),
          pct = COALESCE(${pct ?? null}::smallint, pct),
          updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      const id = parseInt(params.id)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      await sql`DELETE FROM pdi_iniciativas WHERE id = ${id} AND user_id = ${userId}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('pdi error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
