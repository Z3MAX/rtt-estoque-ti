const { neon } = require('@neondatabase/serverless')
const { requireAdmin, makeHeaders, errorResponse } = require('./_auth')
const { logAudit } = require('./_audit')

function classificarEixo(media) {
  if (media == null) return null
  const m = Number(media)
  if (m >= 4) return 'Alto'
  if (m >= 2.7) return 'Médio'
  return 'Baixo'
}

function getQuadrante(potencial, desempenho) {
  const row = potencial === 'Alto' ? 'E' : potencial === 'Médio' ? 'M' : 'B'
  const col = desempenho === 'Alto' ? '3' : desempenho === 'Médio' ? '2' : '1'
  return row + col
}

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    const authPayload = requireAdmin(event)
    const params = event.queryStringParameters || {}
    const cicloId = params.id ? parseInt(params.id) : null
    if (!cicloId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id do ciclo é obrigatório' }) }

    const ciclos = await sql`SELECT id, periodo_inicial FROM ciclos WHERE id = ${cicloId}`
    const ciclo = ciclos[0]
    if (!ciclo) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ciclo não encontrado' }) }

    const rows = await sql`
      SELECT id, colaborador_nome, score_desempenho, score_potencial, nivel_desempenho, nivel_potencial, quadrante
      FROM ciclos_avaliacao
      WHERE periodo_inicial = ${ciclo.periodo_inicial}
        AND score_desempenho IS NOT NULL
        AND score_potencial IS NOT NULL
    `

    const alterados = []
    for (const r of rows) {
      const novoDesemp = classificarEixo(r.score_desempenho)
      const novoPot = classificarEixo(r.score_potencial)
      const novoQuadrante = getQuadrante(novoPot, novoDesemp)
      if (novoDesemp !== r.nivel_desempenho || novoPot !== r.nivel_potencial || novoQuadrante !== r.quadrante) {
        alterados.push({
          id: r.id, colaborador_nome: r.colaborador_nome,
          nivel_desempenho: { de: r.nivel_desempenho, para: novoDesemp },
          nivel_potencial: { de: r.nivel_potencial, para: novoPot },
          quadrante: { de: r.quadrante, para: novoQuadrante },
        })
        await sql`
          UPDATE ciclos_avaliacao
          SET nivel_desempenho = ${novoDesemp}, nivel_potencial = ${novoPot}, quadrante = ${novoQuadrante}, updated_at = NOW()
          WHERE id = ${r.id}
        `
      }
    }

    await logAudit(sql, {
      entityType: 'ciclo_avaliacao', entityId: ciclo.id, entityName: ciclo.periodo_inicial,
      action: 'recalcular_niveis', changes: alterados,
      userId: authPayload.userId, userName: authPayload.name,
    })

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ total_avaliadas: rows.length, total_alterado: alterados.length, alterados }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
