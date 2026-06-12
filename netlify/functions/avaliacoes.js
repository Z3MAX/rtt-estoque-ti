const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders, errorResponse } = require('./_auth')
const { logAudit, getUserName } = require('./_audit')

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
    const isGestor = authPayload.role === 'Gestor'
    const gestorArea = authPayload.area || null

    if (event.httpMethod === 'GET') {
      if (id) {
        const rows = await sql`
          SELECT ca.* FROM ciclos_avaliacao ca
          LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
          WHERE ca.id = ${id}
            AND (${!isGestor} OR c.area = ${gestorArea})
        `
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }

      const colaboradorId = params.colaborador_id ? parseInt(params.colaborador_id) : null
      let rows
      if (colaboradorId) {
        rows = await sql`
          SELECT ca.*, c.nome AS colaborador_nome FROM ciclos_avaliacao ca
          LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
          WHERE ca.colaborador_id = ${colaboradorId}
            AND (${!isGestor} OR c.area = ${gestorArea})
          ORDER BY ca.created_at DESC
        `
      } else {
        rows = await sql`
          SELECT ca.*, c.nome AS colaborador_nome FROM ciclos_avaliacao ca
          LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
          WHERE (${!isGestor} OR c.area = ${gestorArea})
          ORDER BY ca.created_at DESC
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

      // Gestor só pode avaliar colaboradores do seu departamento
      if (isGestor && gestorArea) {
        const check = await sql`SELECT area FROM colaboradores WHERE id = ${colaborador_id}`
        if (check.length === 0 || check[0].area !== gestorArea) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado: colaborador não pertence ao seu departamento' }) }
        }
      }

      const rows = await sql`
        INSERT INTO ciclos_avaliacao (
          colaborador_id, colaborador_nome, avaliador_id, avaliador_nome,
          tipo, periodo_inicial, periodo_final, nivel_cargo,
          score_desempenho, score_potencial, nivel_desempenho, nivel_potencial,
          quadrante, respostas, status
        ) VALUES (
          ${colaborador_id}, ${colaborador_nome || null},
          ${authPayload.userId || null}, ${authPayload.name || null},
          ${tipo || 'lideranca'}, ${periodo_inicial || null}, ${periodo_final || null},
          ${nivel_cargo || null}, ${score_desempenho ?? null}, ${score_potencial ?? null},
          ${nivel_desempenho || null}, ${nivel_potencial || null},
          ${quadrante || null}, ${respostas ? JSON.stringify(respostas) : null},
          ${status || 'concluido'}
        )
        RETURNING *
      `
      const userName = await getUserName(sql, authPayload.userId)
      await logAudit(sql, {
        entityType: 'avaliacao',
        entityId: rows[0].id,
        entityName: rows[0].colaborador_nome || `Colaborador #${rows[0].colaborador_id}`,
        action: 'created',
        changes: null,
        userId: authPayload.userId,
        userName,
      })
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID necessário' }) }
      // Somente Administrador de RH pode editar avaliações existentes
      if (!isAdminRole(authPayload.role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }
      }
      const body = JSON.parse(event.body || '{}')
      const {
        avaliador_nome, tipo, periodo_inicial, periodo_final, nivel_cargo,
        score_desempenho, score_potencial, nivel_desempenho, nivel_potencial,
        quadrante, respostas, status,
      } = body
      const rows = await sql`
        UPDATE ciclos_avaliacao
        SET avaliador_nome    = COALESCE(${avaliador_nome ?? null}, avaliador_nome),
            tipo              = COALESCE(${tipo ?? null}, tipo),
            periodo_inicial   = COALESCE(${periodo_inicial ?? null}, periodo_inicial),
            periodo_final     = COALESCE(${periodo_final ?? null}, periodo_final),
            nivel_cargo       = COALESCE(${nivel_cargo ?? null}, nivel_cargo),
            score_desempenho  = COALESCE(${score_desempenho ?? null}, score_desempenho),
            score_potencial   = COALESCE(${score_potencial ?? null}, score_potencial),
            nivel_desempenho  = COALESCE(${nivel_desempenho ?? null}, nivel_desempenho),
            nivel_potencial   = COALESCE(${nivel_potencial ?? null}, nivel_potencial),
            quadrante         = COALESCE(${quadrante ?? null}, quadrante),
            respostas         = COALESCE(${respostas ? JSON.stringify(respostas) : null}::jsonb, respostas),
            status            = COALESCE(${status ?? null}, status),
            updated_at        = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      const userName = await getUserName(sql, authPayload.userId)
      await logAudit(sql, {
        entityType: 'avaliacao',
        entityId: rows[0].id,
        entityName: rows[0].colaborador_nome || `Colaborador #${rows[0].colaborador_id}`,
        action: 'updated',
        changes: null,
        userId: authPayload.userId,
        userName,
      })
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID necessário' }) }
      const existing = await sql`SELECT colaborador_nome, colaborador_id FROM ciclos_avaliacao WHERE id = ${id}`
      await sql`DELETE FROM ciclos_avaliacao WHERE id = ${id}`
      const userName = await getUserName(sql, authPayload.userId)
      await logAudit(sql, {
        entityType: 'avaliacao',
        entityId: id,
        entityName: existing[0]?.colaborador_nome || `Avaliação #${id}`,
        action: 'deleted',
        changes: null,
        userId: authPayload.userId,
        userName,
      })
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
