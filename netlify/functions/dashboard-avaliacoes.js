const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders, errorResponse } = require('./_auth')

const QUADRANTE_LABELS = {
  E3: 'Talento Top / Estrela', E2: 'Potencial Forte', E1: 'Enigma',
  M3: 'Forte Desempenho',    M2: 'Mantenedor / Eficaz', M1: 'Questionável',
  B3: 'Dedicado / Especialista', B2: 'Bom Profissional', B1: 'Risco / Subpadrão',
}

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'GET, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    const authPayload = requireAuth(event)
    const isGestor   = authPayload.role === 'Gestor'
    const gestorName = authPayload.name || null

    // Para gestores: "avaliadas" = pendente + concluido (eles já fizeram a parte deles)
    // Para admins:   "concluidas" = somente concluido (calibradas pelo RH)
    const statusFiltro = isGestor ? ['pendente', 'concluido'] : ['concluido']

    const [totalColabs] = await sql`
      SELECT COUNT(*)::int AS n FROM colaboradores
      WHERE ativo = true
        AND (${!isGestor} OR LOWER(TRIM(gestor_nome)) = LOWER(TRIM(${gestorName})))
    `
    const [totalAvals] = await sql`
      SELECT COUNT(*)::int AS n FROM ciclos_avaliacao ca
      LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
      WHERE (${!isGestor} OR LOWER(TRIM(c.gestor_nome)) = LOWER(TRIM(${gestorName})))
    `
    const [totalConc] = await sql`
      SELECT COUNT(*)::int AS n FROM ciclos_avaliacao ca
      LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
      WHERE ca.status = ANY(${statusFiltro})
        AND (${!isGestor} OR LOWER(TRIM(c.gestor_nome)) = LOWER(TRIM(${gestorName})))
    `
    const [collabAvals] = await sql`
      SELECT COUNT(DISTINCT ca.colaborador_id)::int AS n FROM ciclos_avaliacao ca
      LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
      WHERE ca.status = ANY(${statusFiltro})
        AND (${!isGestor} OR LOWER(TRIM(c.gestor_nome)) = LOWER(TRIM(${gestorName})))
    `
    // Avaliados pelo gestor = pendente + concluido (independente de ser admin ou gestor)
    const [collabAvalsGestor] = await sql`
      SELECT COUNT(DISTINCT ca.colaborador_id)::int AS n FROM ciclos_avaliacao ca
      LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
      WHERE ca.status IN ('pendente', 'concluido')
        AND (${!isGestor} OR LOWER(TRIM(c.gestor_nome)) = LOWER(TRIM(${gestorName})))
    `
    // Aguardando calibração do RH
    const [pendenteCalibracao] = await sql`
      SELECT COUNT(DISTINCT ca.colaborador_id)::int AS n FROM ciclos_avaliacao ca
      LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
      WHERE ca.status = 'pendente'
        AND (${!isGestor} OR LOWER(TRIM(c.gestor_nome)) = LOWER(TRIM(${gestorName})))
    `

    const quadrantesRaw = await sql`
      SELECT ca.quadrante, COUNT(*)::int AS count
      FROM ciclos_avaliacao ca
      LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
      WHERE ca.status = ANY(${statusFiltro}) AND ca.quadrante IS NOT NULL
        AND (${!isGestor} OR LOWER(TRIM(c.gestor_nome)) = LOWER(TRIM(${gestorName})))
      GROUP BY ca.quadrante
      ORDER BY count DESC
    `
    const distribuicao_quadrantes = quadrantesRaw.map(r => ({
      quadrante: r.quadrante,
      count: r.count,
      label: QUADRANTE_LABELS[r.quadrante] || r.quadrante,
    }))

    const recentes = await sql`
      SELECT ca.*, c.nome AS colaborador_nome
      FROM ciclos_avaliacao ca
      LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
      WHERE (${!isGestor} OR LOWER(TRIM(c.gestor_nome)) = LOWER(TRIM(${gestorName})))
      ORDER BY ca.created_at DESC
      LIMIT 5
    `

    const porPeriodo = await sql`
      SELECT ca.periodo_inicial AS periodo, COUNT(*)::int AS count
      FROM ciclos_avaliacao ca
      LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
      WHERE ca.status = ANY(${statusFiltro})
        AND (${!isGestor} OR LOWER(TRIM(c.gestor_nome)) = LOWER(TRIM(${gestorName})))
      GROUP BY ca.periodo_inicial
      ORDER BY ca.periodo_inicial
    `

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        total_colaboradores:        totalColabs.n,
        total_avaliacoes:           totalAvals.n,
        avaliacoes_concluidas:      totalConc.n,
        colaboradores_avaliados:    collabAvals.n,
        colaboradores_avaliados_gestor: collabAvalsGestor.n,
        pendente_calibracao:        pendenteCalibracao.n,
        distribuicao_quadrantes,
        avaliacoes_recentes: recentes,
        avaliacoes_por_periodo: porPeriodo,
      }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
