const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}

  try {
    const auth = requireAuth(event)

    await sql`
      CREATE TABLE IF NOT EXISTS pesquisas (
        id                     SERIAL PRIMARY KEY,
        nome                   TEXT NOT NULL,
        objetivo               TEXT,
        tipo                   TEXT NOT NULL,
        situacao               TEXT DEFAULT 'RASCUNHO',
        status                 TEXT DEFAULT 'ATIVA',
        anonima                BOOLEAN DEFAULT false,
        ocultar_min            BOOLEAN DEFAULT false,
        data_inicio            TIMESTAMP,
        data_fim               TIMESTAMP,
        frequencia_pulso       TEXT,
        perguntas_por_pulso    INTEGER,
        questionario           TEXT,
        email_auto             BOOLEAN DEFAULT false,
        dias_aviso             INTEGER,
        relatorio_permissao    BOOLEAN DEFAULT true,
        relatorio_selecionados BOOLEAN DEFAULT false,
        notif_respondido       BOOLEAN DEFAULT false,
        autenticacao_codigo    BOOLEAN DEFAULT true,
        vinculos_desligamento  JSONB DEFAULT '[]',
        colaborador_ids        JSONB DEFAULT '[]',
        created_by             INTEGER,
        created_at             TIMESTAMP DEFAULT NOW(),
        updated_at             TIMESTAMP DEFAULT NOW(),
        ativo                  BOOLEAN DEFAULT true
      )
    `

    if (event.httpMethod === 'GET') {
      const rows = await sql`
        SELECT * FROM pesquisas
        WHERE ativo = true
        ORDER BY created_at DESC
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { nome, objetivo, tipo, situacao, status, anonima, ocultar_min,
              data_inicio, data_fim, frequencia_pulso, perguntas_por_pulso,
              questionario, email_auto, dias_aviso, relatorio_permissao,
              relatorio_selecionados, notif_respondido, autenticacao_codigo,
              vinculos_desligamento, colaborador_ids } = body
      if (!nome) return { statusCode: 400, headers, body: JSON.stringify({ error: 'nome obrigatório' }) }
      if (!tipo) return { statusCode: 400, headers, body: JSON.stringify({ error: 'tipo obrigatório' }) }
      const rows = await sql`
        INSERT INTO pesquisas (
          nome, objetivo, tipo, situacao, status, anonima, ocultar_min,
          data_inicio, data_fim, frequencia_pulso, perguntas_por_pulso,
          questionario, email_auto, dias_aviso, relatorio_permissao,
          relatorio_selecionados, notif_respondido, autenticacao_codigo,
          vinculos_desligamento, colaborador_ids, created_by
        ) VALUES (
          ${nome}, ${objetivo ?? null}, ${tipo}, ${situacao ?? 'RASCUNHO'}, ${status ?? 'ATIVA'},
          ${anonima ?? false}, ${ocultar_min ?? false},
          ${data_inicio ?? null}, ${data_fim ?? null},
          ${frequencia_pulso ?? null}, ${perguntas_por_pulso ?? null},
          ${questionario ?? null}, ${email_auto ?? false}, ${dias_aviso ?? null},
          ${relatorio_permissao ?? true}, ${relatorio_selecionados ?? false},
          ${notif_respondido ?? false}, ${autenticacao_codigo ?? true},
          ${JSON.stringify(vinculos_desligamento ?? [])}, ${JSON.stringify(colaborador_ids ?? [])},
          ${auth.userId}
        )
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      const id = parseInt(params.id)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      const existing = await sql`SELECT created_by FROM pesquisas WHERE id = ${id} AND ativo = true`
      if (existing.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      if (!isAdminRole(auth.role) && existing[0].created_by !== auth.userId) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }
      const body = JSON.parse(event.body || '{}')
      const rows = await sql`
        UPDATE pesquisas SET
          nome                   = COALESCE(${body.nome ?? null}, nome),
          objetivo               = COALESCE(${body.objetivo ?? null}, objetivo),
          tipo                   = COALESCE(${body.tipo ?? null}, tipo),
          situacao               = COALESCE(${body.situacao ?? null}, situacao),
          status                 = COALESCE(${body.status ?? null}, status),
          anonima                = COALESCE(${body.anonima ?? null}, anonima),
          ocultar_min            = COALESCE(${body.ocultar_min ?? null}, ocultar_min),
          data_inicio            = COALESCE(${body.data_inicio ?? null}, data_inicio),
          data_fim               = COALESCE(${body.data_fim ?? null}, data_fim),
          frequencia_pulso       = COALESCE(${body.frequencia_pulso ?? null}, frequencia_pulso),
          perguntas_por_pulso    = COALESCE(${body.perguntas_por_pulso ?? null}, perguntas_por_pulso),
          questionario           = COALESCE(${body.questionario ?? null}, questionario),
          email_auto             = COALESCE(${body.email_auto ?? null}, email_auto),
          dias_aviso             = COALESCE(${body.dias_aviso ?? null}, dias_aviso),
          relatorio_permissao    = COALESCE(${body.relatorio_permissao ?? null}, relatorio_permissao),
          relatorio_selecionados = COALESCE(${body.relatorio_selecionados ?? null}, relatorio_selecionados),
          notif_respondido       = COALESCE(${body.notif_respondido ?? null}, notif_respondido),
          autenticacao_codigo    = COALESCE(${body.autenticacao_codigo ?? null}, autenticacao_codigo),
          vinculos_desligamento  = COALESCE(${body.vinculos_desligamento != null ? JSON.stringify(body.vinculos_desligamento) : null}::jsonb, vinculos_desligamento),
          colaborador_ids        = COALESCE(${body.colaborador_ids != null ? JSON.stringify(body.colaborador_ids) : null}::jsonb, colaborador_ids),
          updated_at             = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      const id = parseInt(params.id)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      if (!isAdminRole(auth.role)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      await sql`UPDATE pesquisas SET ativo = false, updated_at = NOW() WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('pesquisas error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
