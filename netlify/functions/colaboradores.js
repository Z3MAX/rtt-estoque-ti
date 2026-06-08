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
    requireAuth(event)

    if (event.httpMethod === 'GET') {
      if (id) {
        const rows = await sql`
          SELECT c.*,
            (SELECT COUNT(*) FROM ciclos_avaliacao ca
             WHERE ca.colaborador_id = c.id AND ca.status = 'concluido')::int AS total_avaliacoes,
            (SELECT ca2.quadrante FROM ciclos_avaliacao ca2
             WHERE ca2.colaborador_id = c.id AND ca2.status = 'concluido'
             ORDER BY ca2.created_at DESC LIMIT 1) AS ultimo_quadrante,
            (SELECT ca3.created_at FROM ciclos_avaliacao ca3
             WHERE ca3.colaborador_id = c.id AND ca3.status = 'concluido'
             ORDER BY ca3.created_at DESC LIMIT 1) AS ultima_avaliacao
          FROM colaboradores c
          WHERE c.id = ${id}
        `
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Colaborador não encontrado' }) }
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }

      const search = (params.search || '').toLowerCase()
      let rows
      if (search) {
        rows = await sql`
          SELECT c.*,
            (SELECT COUNT(*) FROM ciclos_avaliacao ca
             WHERE ca.colaborador_id = c.id AND ca.status = 'concluido')::int AS total_avaliacoes,
            (SELECT ca2.quadrante FROM ciclos_avaliacao ca2
             WHERE ca2.colaborador_id = c.id AND ca2.status = 'concluido'
             ORDER BY ca2.created_at DESC LIMIT 1) AS ultimo_quadrante,
            (SELECT ca3.created_at FROM ciclos_avaliacao ca3
             WHERE ca3.colaborador_id = c.id AND ca3.status = 'concluido'
             ORDER BY ca3.created_at DESC LIMIT 1) AS ultima_avaliacao
          FROM colaboradores c
          WHERE c.ativo = true AND (
            LOWER(c.nome)        LIKE ${'%' + search + '%'} OR
            LOWER(c.cargo)       LIKE ${'%' + search + '%'} OR
            LOWER(c.area)        LIKE ${'%' + search + '%'} OR
            LOWER(c.gestor_nome) LIKE ${'%' + search + '%'}
          )
          ORDER BY c.nome ASC
        `
      } else {
        rows = await sql`
          SELECT c.*,
            (SELECT COUNT(*) FROM ciclos_avaliacao ca
             WHERE ca.colaborador_id = c.id AND ca.status = 'concluido')::int AS total_avaliacoes,
            (SELECT ca2.quadrante FROM ciclos_avaliacao ca2
             WHERE ca2.colaborador_id = c.id AND ca2.status = 'concluido'
             ORDER BY ca2.created_at DESC LIMIT 1) AS ultimo_quadrante,
            (SELECT ca3.created_at FROM ciclos_avaliacao ca3
             WHERE ca3.colaborador_id = c.id AND ca3.status = 'concluido'
             ORDER BY ca3.created_at DESC LIMIT 1) AS ultima_avaliacao
          FROM colaboradores c
          WHERE c.ativo = true
          ORDER BY c.nome ASC
        `
      }
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')

      if (body.bulk && Array.isArray(body.colaboradores)) {
        let inserted = 0
        for (const c of body.colaboradores) {
          if (!c.nome || !c.nome.trim()) continue
          await sql`
            INSERT INTO colaboradores (nome, cargo, nivel, area, email, gestor_nome)
            VALUES (${c.nome.trim()}, ${c.cargo || null}, ${c.nivel || null},
                    ${c.area || null}, ${c.email || null}, ${c.gestor_nome || null})
          `
          inserted++
        }
        return { statusCode: 201, headers, body: JSON.stringify({ success: true, inserted }) }
      }

      const { nome, cargo, nivel, area, email, gestor_nome } = body
      if (!nome || !nome.trim()) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome é obrigatório' }) }
      }
      const rows = await sql`
        INSERT INTO colaboradores (nome, cargo, nivel, area, email, gestor_nome)
        VALUES (${nome.trim()}, ${cargo || null}, ${nivel || null},
                ${area || null}, ${email || null}, ${gestor_nome || null})
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID necessário' }) }
      const body = JSON.parse(event.body || '{}')
      const { nome, cargo, nivel, area, email, gestor_nome } = body
      const rows = await sql`
        UPDATE colaboradores
        SET nome       = ${nome       ?? null},
            cargo      = ${cargo      ?? null},
            nivel      = ${nivel      ?? null},
            area       = ${area       ?? null},
            email      = ${email      ?? null},
            gestor_nome= ${gestor_nome ?? null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID necessário' }) }
      await sql`UPDATE colaboradores SET ativo = false, updated_at = NOW() WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
