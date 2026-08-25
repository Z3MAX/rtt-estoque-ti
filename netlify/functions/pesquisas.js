const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')
const { sendPesquisaNotificationEmail } = require('./_email')

/** Notifica por e-mail os colaboradores em `idsParaNotificar` que há uma
 *  pesquisa aguardando resposta. Pesquisas anônimas nunca notificam
 *  individualmente (só respondem pelo link público). Retorna estatísticas
 *  de envio para feedback ao admin. */
async function notificarPublico(sql, pesquisa, idsParaNotificar) {
  if (pesquisa.anonima) return { total: 0, enviados: 0, falhas: 0 }
  const publico = idsParaNotificar ?? []
  if (publico.length === 0) return { total: 0, enviados: 0, falhas: 0 }

  const colabs = await sql`
    SELECT nome, email FROM colaboradores
    WHERE id = ANY(${publico}::int[]) AND ativo = true AND email IS NOT NULL AND email <> ''
  `
  if (colabs.length === 0) return { total: 0, enviados: 0, falhas: 0 }

  const url = `${process.env.SITE_URL || ''}/intranet/pesquisas/${pesquisa.id}/responder`
  let enviados = 0, falhas = 0
  // Envio sequencial — a caixa SMTP usada aceita só uma conexão por vez.
  for (const c of colabs) {
    const r = await sendPesquisaNotificationEmail({
      name: c.nome, email: c.email,
      pesquisaNome: pesquisa.nome,
      url,
    })
    if (r?.sent) enviados++
    else falhas++
  }
  return { total: colabs.length, enviados, falhas }
}

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
    await sql`ALTER TABLE pesquisas ADD COLUMN IF NOT EXISTS perguntas JSONB DEFAULT '[]'`
    await sql`ALTER TABLE pesquisas ADD COLUMN IF NOT EXISTS link_publico UUID`
    await sql`ALTER TABLE pesquisas ADD COLUMN IF NOT EXISTS pede_local_trabalho BOOLEAN DEFAULT false`
    await sql`ALTER TABLE pesquisas ADD COLUMN IF NOT EXISTS locais_trabalho JSONB DEFAULT '[]'`
    await sql`
      CREATE TABLE IF NOT EXISTS pesquisa_respostas (
        id             SERIAL PRIMARY KEY,
        pesquisa_id    INTEGER NOT NULL,
        colaborador_id INTEGER,
        user_id        INTEGER,
        respostas      JSONB NOT NULL DEFAULT '[]',
        anonima        BOOLEAN DEFAULT false,
        created_at     TIMESTAMP DEFAULT NOW()
      )
    `

    if (event.httpMethod === 'GET') {
      // Single survey by ID (used by responder page) — só pesquisas publicadas,
      // ativas, não-anônimas (essas só respondem pelo link público) e cujo
      // colaborador_ids inclua o usuário. Público vazio = ninguém vê.
      if (params.id) {
        const id = parseInt(params.id)
        const rows = await sql`
          SELECT id, nome, objetivo, tipo, situacao, status, anonima, ocultar_min,
                 data_inicio, data_fim, colaborador_ids, perguntas,
                 pede_local_trabalho, locais_trabalho, created_at
          FROM pesquisas
          WHERE id = ${id} AND ativo = true AND situacao = 'LIBERADA' AND status = 'ATIVA' AND anonima = false
        `
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrada ou não disponível para resposta' }) }

        const publico = rows[0].colaborador_ids ?? []
        const userRow = await sql`SELECT colaborador_id FROM users WHERE id = ${auth.userId} LIMIT 1`
        const colaboradorId = userRow[0]?.colaborador_id ?? null
        if (!publico.includes(colaboradorId)) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Esta pesquisa não está disponível para você' }) }
        }
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }

      // Surveys pending for current user (MinhaVisão) — exclui anônimas (só
      // respondem pelo link público). Público vazio = ninguém vê.
      if (params.minhas === '1') {
        const userRow = await sql`SELECT colaborador_id FROM users WHERE id = ${auth.userId} LIMIT 1`
        const colaboradorId = userRow[0]?.colaborador_id ?? null
        const rows = await sql`
          SELECT id, nome, objetivo, tipo, situacao, data_inicio, data_fim, colaborador_ids, created_at
          FROM pesquisas
          WHERE ativo = true AND situacao = 'LIBERADA' AND status = 'ATIVA' AND anonima = false
            AND colaborador_ids @> ${JSON.stringify(colaboradorId)}::jsonb
            AND id NOT IN (
              SELECT pesquisa_id FROM pesquisa_respostas WHERE user_id = ${auth.userId}
            )
          ORDER BY created_at DESC
        `
        return { statusCode: 200, headers, body: JSON.stringify(rows) }
      }

      // Admin list — restricted to admins
      if (!isAdminRole(auth.role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }
      const rows = await sql`
        SELECT p.*,
               COALESCE(rc.total, 0)::int AS total_respostas
        FROM pesquisas p
        LEFT JOIN (
          SELECT pesquisa_id, COUNT(*) AS total
          FROM pesquisa_respostas
          GROUP BY pesquisa_id
        ) rc ON rc.pesquisa_id = p.id
        WHERE p.ativo = true
        ORDER BY p.created_at DESC
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      if (!isAdminRole(auth.role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }

      // Disparo manual de notificação — reenvia para todo o público atual.
      if (params.action === 'notificar') {
        const id = parseInt(params.id)
        if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
        const rows = await sql`SELECT * FROM pesquisas WHERE id = ${id} AND ativo = true`
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrada' }) }
        const pesquisa = rows[0]
        if (pesquisa.anonima) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Pesquisas anônimas não notificam individualmente — distribua pelo link público' }) }
        }
        if (pesquisa.situacao !== 'LIBERADA' || pesquisa.status !== 'ATIVA') {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'A pesquisa precisa estar publicada e ativa' }) }
        }
        const idsParaNotificar = pesquisa.colaborador_ids ?? []
        if (idsParaNotificar.length === 0) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nenhum público selecionado' }) }
        }
        const stats = await notificarPublico(sql, pesquisa, idsParaNotificar)
        return { statusCode: 200, headers, body: JSON.stringify(stats) }
      }

      const body = JSON.parse(event.body || '{}')
      const { nome, objetivo, tipo, situacao, status, anonima, ocultar_min,
              data_inicio, data_fim, frequencia_pulso, perguntas_por_pulso,
              questionario, email_auto, dias_aviso, relatorio_permissao,
              relatorio_selecionados, notif_respondido, autenticacao_codigo,
              vinculos_desligamento, colaborador_ids, perguntas,
              pede_local_trabalho, locais_trabalho } = body
      if (!nome) return { statusCode: 400, headers, body: JSON.stringify({ error: 'nome obrigatório' }) }
      if (!tipo) return { statusCode: 400, headers, body: JSON.stringify({ error: 'tipo obrigatório' }) }
      const rows = await sql`
        INSERT INTO pesquisas (
          nome, objetivo, tipo, situacao, status, anonima, ocultar_min,
          data_inicio, data_fim, frequencia_pulso, perguntas_por_pulso,
          questionario, email_auto, dias_aviso, relatorio_permissao,
          relatorio_selecionados, notif_respondido, autenticacao_codigo,
          vinculos_desligamento, colaborador_ids, perguntas, created_by, link_publico,
          pede_local_trabalho, locais_trabalho
        ) VALUES (
          ${nome}, ${objetivo ?? null}, ${tipo}, ${situacao ?? 'RASCUNHO'}, ${status ?? 'ATIVA'},
          ${anonima ?? false}, ${ocultar_min ?? false},
          ${data_inicio ?? null}, ${data_fim ?? null},
          ${frequencia_pulso ?? null}, ${perguntas_por_pulso ?? null},
          ${questionario ?? null}, ${email_auto ?? false}, ${dias_aviso ?? null},
          ${relatorio_permissao ?? true}, ${relatorio_selecionados ?? false},
          ${notif_respondido ?? false}, ${autenticacao_codigo ?? true},
          ${JSON.stringify(vinculos_desligamento ?? [])}, ${JSON.stringify(colaborador_ids ?? [])},
          ${JSON.stringify(perguntas ?? [])}, ${auth.userId},
          CASE WHEN ${anonima ?? false} THEN gen_random_uuid() ELSE NULL END,
          ${pede_local_trabalho ?? false}, ${JSON.stringify(locais_trabalho ?? [])}
        )
        RETURNING *
      `
      if (rows[0].situacao === 'LIBERADA') {
        // Aguarda o envio (funções Netlify não garantem trabalho em segundo
        // plano após a resposta) mas nunca falha a publicação por causa de e-mail.
        try { await notificarPublico(sql, rows[0], rows[0].colaborador_ids ?? []) } catch (e) { console.error('[pesquisas] falha ao notificar público:', e.message) }
      }
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      const id = parseInt(params.id)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      const existing = await sql`SELECT created_by, situacao, colaborador_ids FROM pesquisas WHERE id = ${id} AND ativo = true`
      if (existing.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      if (!isAdminRole(auth.role) && existing[0].created_by !== auth.userId) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }
      const situacaoAntes = existing[0].situacao
      const idsAntes = existing[0].colaborador_ids ?? []
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
          perguntas              = COALESCE(${body.perguntas != null ? JSON.stringify(body.perguntas) : null}::jsonb, perguntas),
          link_publico           = CASE WHEN ${body.anonima ?? false} AND link_publico IS NULL THEN gen_random_uuid() ELSE link_publico END,
          pede_local_trabalho    = COALESCE(${body.pede_local_trabalho ?? null}, pede_local_trabalho),
          locais_trabalho        = COALESCE(${body.locais_trabalho != null ? JSON.stringify(body.locais_trabalho) : null}::jsonb, locais_trabalho),
          updated_at             = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      if (rows[0].situacao === 'LIBERADA') {
        const idsDepois = rows[0].colaborador_ids ?? []
        // Se já estava liberada, notifica só quem foi adicionado agora;
        // se está sendo liberada pela primeira vez, notifica todo o público atual.
        const idsParaNotificar = situacaoAntes === 'LIBERADA'
          ? idsDepois.filter(cid => !idsAntes.includes(cid))
          : idsDepois
        if (idsParaNotificar.length > 0) {
          try { await notificarPublico(sql, rows[0], idsParaNotificar) } catch (e) { console.error('[pesquisas] falha ao notificar público:', e.message) }
        }
      }
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
