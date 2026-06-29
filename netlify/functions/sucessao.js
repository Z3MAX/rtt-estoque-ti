const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders, errorResponse } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}
  const colaboradorId = params.colaborador_id ? parseInt(params.colaborador_id) : null

  try {
    requireAuth(event)

    if (event.httpMethod === 'GET') {
      if (!colaboradorId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'colaborador_id required' }) }
      const rows = await sql`
        SELECT * FROM sucessao_colaborador WHERE colaborador_id = ${colaboradorId} LIMIT 1
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows[0] || null) }
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      if (!colaboradorId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'colaborador_id required' }) }
      const body = JSON.parse(event.body || '{}')
      const { candidato, probabilidade, impacto, dificuldade, prontidao, acoes } = body

      const existing = await sql`SELECT id FROM sucessao_colaborador WHERE colaborador_id = ${colaboradorId} LIMIT 1`

      if (existing.length > 0) {
        await sql`
          UPDATE sucessao_colaborador SET
            candidato      = ${candidato},
            probabilidade  = ${probabilidade},
            impacto        = ${impacto},
            dificuldade    = ${dificuldade},
            prontidao      = ${prontidao},
            acoes          = ${JSON.stringify(acoes)},
            updated_at     = NOW()
          WHERE colaborador_id = ${colaboradorId}
        `
      } else {
        await sql`
          INSERT INTO sucessao_colaborador (colaborador_id, candidato, probabilidade, impacto, dificuldade, prontidao, acoes)
          VALUES (${colaboradorId}, ${candidato}, ${probabilidade}, ${impacto}, ${dificuldade}, ${prontidao}, ${JSON.stringify(acoes)})
        `
      }

      const rows = await sql`SELECT * FROM sucessao_colaborador WHERE colaborador_id = ${colaboradorId} LIMIT 1`
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      if (!colaboradorId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'colaborador_id required' }) }
      await sql`DELETE FROM sucessao_colaborador WHERE colaborador_id = ${colaboradorId}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('sucessao error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
