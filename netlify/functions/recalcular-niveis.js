const { neon } = require('@neondatabase/serverless')
const { requireAdmin, makeHeaders, errorResponse } = require('./_auth')
const { logAudit } = require('./_audit')

const COMP_DESEMPENHO = ['qualidade-entregas', 'cumprimento-prazos', 'autonomia-proatividade', 'impacto-time', 'evolucao-periodo']
const COMP_POTENCIAL  = ['foco-cliente', 'foco-resultado', 'empreendedorismo', 'resiliencia', 'alta-performance']
const COMP_LIDERANCA  = ['liderando-negocio', 'liderando-pessoas', 'liderando-si']
const NIVEIS_LIDERANCA = ['supervisor', 'especialista', 'coordenador', 'gerente', 'gerente_executivo', 'diretor']

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

function getRating(respostas, id) {
  if (!respostas) return 0
  const r = respostas[id]
  if (!r) return 0
  return Number(r.nota ?? r.rating ?? 0) || 0
}

function calcularScores(respostas, nivelCargo) {
  const temLideranca = NIVEIS_LIDERANCA.includes(nivelCargo)

  const somaDesemp = COMP_DESEMPENHO.reduce((s, id) => s + getRating(respostas, id), 0)
  const avgDesempenho = somaDesemp / COMP_DESEMPENHO.length

  const compsPot = temLideranca ? [...COMP_POTENCIAL, ...COMP_LIDERANCA] : COMP_POTENCIAL
  const somaPot  = compsPot.reduce((s, id) => s + getRating(respostas, id), 0)
  const avgPotencial = somaPot / compsPot.length

  return {
    score_desempenho: parseFloat(avgDesempenho.toFixed(2)),
    score_potencial:  parseFloat(avgPotencial.toFixed(2)),
  }
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

    // ── action=scores: recalculate raw scores from respostas ─────────────────
    if (params.action === 'scores') {
      const rows = await sql`
        SELECT id, colaborador_nome, nivel_cargo, respostas,
               score_desempenho, score_potencial, nivel_desempenho, nivel_potencial, quadrante
        FROM ciclos_avaliacao
        WHERE periodo_inicial = ${ciclo.periodo_inicial}
          AND respostas IS NOT NULL
      `

      const alterados = []
      for (const r of rows) {
        const { score_desempenho: novoD, score_potencial: novoP } = calcularScores(r.respostas, r.nivel_cargo)
        const novoNivelD = classificarEixo(novoD)
        const novoNivelP = classificarEixo(novoP)
        const novoQuadrante = getQuadrante(novoNivelP, novoNivelD)

        const mudou = novoD !== Number(r.score_desempenho) || novoP !== Number(r.score_potencial)
        if (mudou) {
          alterados.push({
            id: r.id, colaborador_nome: r.colaborador_nome,
            score_desempenho: { de: r.score_desempenho, para: novoD },
            score_potencial:  { de: r.score_potencial,  para: novoP },
            quadrante:        { de: r.quadrante, para: novoQuadrante },
          })
        }
        await sql`
          UPDATE ciclos_avaliacao
          SET score_desempenho = ${novoD}, score_potencial = ${novoP},
              nivel_desempenho = ${novoNivelD}, nivel_potencial = ${novoNivelP},
              quadrante = ${novoQuadrante}, updated_at = NOW()
          WHERE id = ${r.id}
        `
      }

      await logAudit(sql, {
        entityType: 'ciclo_avaliacao', entityId: ciclo.id, entityName: ciclo.periodo_inicial,
        action: 'recalcular_scores', changes: alterados,
        userId: authPayload.userId, userName: authPayload.name,
      })

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ total_avaliadas: rows.length, total_alterado: alterados.length, alterados }),
      }
    }

    // ── default: recalculate only nivel/quadrante from stored scores ─────────
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
          nivel_potencial:  { de: r.nivel_potencial,  para: novoPot },
          quadrante:        { de: r.quadrante,         para: novoQuadrante },
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
