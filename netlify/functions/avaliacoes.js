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
  const id = params.id ? parseInt(params.id) : null

  try {
    const authPayload = requireAuth(event)

    if (event.httpMethod === 'GET') {
      if (id) {
        const rows = await sql`SELECT * FROM ciclos_avaliacao WHERE id = ${id}`
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }

      const colaboradorId = params.colaborador_id ? parseInt(params.colaborador_id) : null
      let rows
      if (colaboradorId) {
        rows = await sql`
          SELECT * FROM ciclos_avaliacao
          WHERE colaborador_id = ${colaboradorId}
          ORDER BY created_at DESC
        `
      } else {
        rows = await sql`
          SELECT * FROM ciclos_avaliacao
          ORDER BY created_at DESC
          LIMIT 100
        `
      }
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const {
        colaborador_id, colaborador_nome, tipo, periodo_inicial, periodo_final,
        nivel_cargo, score_desempenho, score_potencial, nivel_desempenho,
        nivel_potencial, quadrante, respostas, status,
      } = body

      if (!colaborador_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'colaborador_id é obrigatório' }) }
      }

      const rows = await sql`
        INSERT INTO ciclos_avaliacao (
          colaborador_id, colaborador_nome, avaliador_id, avaliador_nome,
          tipo, periodo_inicial, periodo_final, nivel_cargo,
          score_desempenho, score_potencial, nivel_desempenho, nivel_potencial,
          quadrante, respostas, status
        ) VALUES (
          ${colaborador_id}, ${colaborador_nome || null},
          ${authPayload.id || null}, ${authPayload.name || null},
          ${tipo || 'lideranca'}, ${periodo_inicial || null}, ${periodo_final || null},
          ${nivel_cargo || null}, ${score_desempenho ?? null}, ${score_potencial ?? null},
          ${nivel_desempenho || null}, ${nivel_potencial || null},
          ${quadrante || null}, ${respostas ? JSON.stringify(respostas) : null},
          ${status || 'concluido'}
        )
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID necessário' }) }
      const body = JSON.parse(event.body || '{}')
      const rows = await sql`
        UPDATE ciclos_avaliacao
        SET status = ${body.status ?? 'concluido'}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID necessário' }) }
      await sql`DELETE FROM ciclos_avaliacao WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
