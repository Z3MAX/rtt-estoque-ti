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
    const isGestor   = authPayload.role === 'Gestor'
    const gestorName = authPayload.name || null

    if (event.httpMethod === 'GET') {
      if (id) {
        const rows = await sql`
          SELECT ca.* FROM ciclos_avaliacao ca
          LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
          WHERE ca.id = ${id}
            AND (${!isGestor} OR LOWER(TRIM(c.gestor_nome)) = LOWER(TRIM(${gestorName})))
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
            AND (${!isGestor} OR LOWER(TRIM(c.gestor_nome)) = LOWER(TRIM(${gestorName})))
          ORDER BY ca.created_at DESC
        `
      } else {
        rows = await sql`
          SELECT ca.*, c.nome AS colaborador_nome FROM ciclos_avaliacao ca
          LEFT JOIN colaboradores c ON ca.colaborador_id = c.id
          WHERE (${!isGestor} OR LOWER(TRIM(c.gestor_nome)) = LOWER(TRIM(${gestorName})))
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

      // Verifica se há ciclo aberto (obrigatório para todos)
      const activeCycle = await sql`SELECT id, periodo_inicial FROM ciclos WHERE status = 'aberto' LIMIT 1`.catch(() => [])
      if (activeCycle.length === 0) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Nenhum ciclo de avaliação está aberto no momento. Aguarde o RH abrir um novo ciclo.' }) }
      }

      // Bloqueia duplicata: mesmo colaborador no mesmo ciclo
      const duplicate = await sql`
        SELECT id FROM ciclos_avaliacao
        WHERE colaborador_id = ${colaborador_id}
          AND periodo_inicial = ${activeCycle[0].periodo_inicial}
        LIMIT 1
      `
      if (duplicate.length > 0) {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'Já existe uma avaliação para este colaborador neste ciclo.' }) }
      }

      // Gestor só pode avaliar colaboradores onde ele é o gestor_nome
      if (isGestor && gestorName) {
        const check = await sql`SELECT gestor_nome FROM colaboradores WHERE id = ${colaborador_id}`
        const nomeColabGestor = (check[0]?.gestor_nome || '').trim().toLowerCase()
        if (check.length === 0 || nomeColabGestor !== gestorName.trim().toLowerCase()) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado: você não é o gestor responsável por este colaborador' }) }
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
          'pendente'
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
        quadrante, respostas, status, calibrar,
      } = body

      // Calibração: Admin RH conclui avaliação enviada por Gestor
      if (calibrar) {
        const current = await sql`SELECT status, colaborador_nome, colaborador_id FROM ciclos_avaliacao WHERE id = ${id}`
        if (current.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
        if (current[0].status !== 'pendente')
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Avaliação não está aguardando calibração' }) }
        const rows = await sql`
          UPDATE ciclos_avaliacao
          SET status     = 'concluido',
              updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `
        const userName = await getUserName(sql, authPayload.userId)
        await logAudit(sql, {
          entityType: 'avaliacao',
          entityId: rows[0].id,
          entityName: rows[0].colaborador_nome || `Colaborador #${rows[0].colaborador_id}`,
          action: 'calibrated',
          changes: null,
          userId: authPayload.userId,
          userName,
        })
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }

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
      if (!isAdminRole(authPayload.role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }
      }
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
