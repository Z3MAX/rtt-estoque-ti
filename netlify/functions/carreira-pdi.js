const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders, errorResponse } = require('./_auth')

function isGestorRole(role) {
  return role === 'Gestor' || role === 'Administrador de RH / Gestor'
}

async function ensureTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS carreira_pdi (
      id           SERIAL PRIMARY KEY,
      colaborador_nome TEXT NOT NULL,
      gestor_nome  TEXT,
      titulo       TEXT NOT NULL DEFAULT 'PDI',
      objetivo     TEXT,
      periodo_inicio DATE,
      periodo_fim    DATE,
      status       TEXT DEFAULT 'ativo',
      observacoes  TEXT,
      criado_por   INT,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS carreira_pdi_acoes (
      id          SERIAL PRIMARY KEY,
      pdi_id      INT NOT NULL REFERENCES carreira_pdi(id) ON DELETE CASCADE,
      competencia TEXT,
      descricao   TEXT NOT NULL DEFAULT '',
      prazo       DATE,
      status      TEXT DEFAULT 'pendente',
      progresso   INT DEFAULT 0,
      ordem       INT DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

async function fetchPDIs(sql, where) {
  // where: 'all' | { gestorNome } | { colaboradorNome }
  let rows
  if (where === 'all') {
    rows = await sql`
      SELECT p.*, COALESCE(json_agg(
        json_build_object('id',a.id,'competencia',a.competencia,'descricao',a.descricao,
          'prazo',a.prazo,'status',a.status,'progresso',a.progresso,'ordem',a.ordem)
        ORDER BY a.ordem
      ) FILTER (WHERE a.id IS NOT NULL), '[]') AS acoes
      FROM carreira_pdi p LEFT JOIN carreira_pdi_acoes a ON a.pdi_id = p.id
      GROUP BY p.id ORDER BY p.updated_at DESC
    `
  } else if (where.gestorNome) {
    rows = await sql`
      SELECT p.*, COALESCE(json_agg(
        json_build_object('id',a.id,'competencia',a.competencia,'descricao',a.descricao,
          'prazo',a.prazo,'status',a.status,'progresso',a.progresso,'ordem',a.ordem)
        ORDER BY a.ordem
      ) FILTER (WHERE a.id IS NOT NULL), '[]') AS acoes
      FROM carreira_pdi p LEFT JOIN carreira_pdi_acoes a ON a.pdi_id = p.id
      WHERE LOWER(TRIM(p.gestor_nome)) = LOWER(TRIM(${where.gestorNome}))
      GROUP BY p.id ORDER BY p.updated_at DESC
    `
  } else {
    rows = await sql`
      SELECT p.*, COALESCE(json_agg(
        json_build_object('id',a.id,'competencia',a.competencia,'descricao',a.descricao,
          'prazo',a.prazo,'status',a.status,'progresso',a.progresso,'ordem',a.ordem)
        ORDER BY a.ordem
      ) FILTER (WHERE a.id IS NOT NULL), '[]') AS acoes
      FROM carreira_pdi p LEFT JOIN carreira_pdi_acoes a ON a.pdi_id = p.id
      WHERE LOWER(TRIM(p.colaborador_nome)) = LOWER(TRIM(${where.colaboradorNome}))
      GROUP BY p.id ORDER BY p.updated_at DESC
    `
  }
  return rows
}

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'GET, POST, PUT, DELETE, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}
  const id = params.id ? parseInt(params.id) : null

  try {
    const auth = requireAuth(event)
    const isAdmin  = isAdminRole(auth.role)
    const isGestor = isGestorRole(auth.role)
    const isCollab = !isAdmin && !isGestor

    await ensureTables(sql)

    // ── GET ──────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      if (id) {
        const rows = await fetchPDIs(sql, 'all')
        const pdi = rows.find(r => r.id === id)
        if (!pdi) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
        if (isCollab && pdi.colaborador_nome.toLowerCase().trim() !== (auth.name || '').toLowerCase().trim()) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }
        }
        return { statusCode: 200, headers, body: JSON.stringify(pdi) }
      }

      let rows
      if (isAdmin) {
        rows = await fetchPDIs(sql, 'all')
      } else if (isGestor) {
        rows = await fetchPDIs(sql, { gestorNome: auth.name })
      } else {
        rows = await fetchPDIs(sql, { colaboradorNome: auth.name })
      }
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      if (!isAdmin && !isGestor) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      const { colaborador_nome, titulo, objetivo, periodo_inicio, periodo_fim, observacoes, acoes } = JSON.parse(event.body || '{}')
      if (!colaborador_nome) return { statusCode: 400, headers, body: JSON.stringify({ error: 'colaborador_nome obrigatório' }) }

      const pdiRows = await sql`
        INSERT INTO carreira_pdi (colaborador_nome, gestor_nome, titulo, objetivo, periodo_inicio, periodo_fim, observacoes, criado_por)
        VALUES (${colaborador_nome}, ${auth.name}, ${titulo || 'PDI'}, ${objetivo || null},
                ${periodo_inicio || null}, ${periodo_fim || null}, ${observacoes || null}, ${auth.userId})
        RETURNING *
      `
      const pdi = pdiRows[0]

      if (Array.isArray(acoes) && acoes.length > 0) {
        for (let i = 0; i < acoes.length; i++) {
          const a = acoes[i]
          await sql`
            INSERT INTO carreira_pdi_acoes (pdi_id, competencia, descricao, prazo, status, progresso, ordem)
            VALUES (${pdi.id}, ${a.competencia || null}, ${a.descricao || ''}, ${a.prazo || null},
                    ${a.status || 'pendente'}, ${a.progresso || 0}, ${i})
          `
        }
      }

      const full = await fetchPDIs(sql, 'all')
      return { statusCode: 201, headers, body: JSON.stringify(full.find(r => r.id === pdi.id) || pdi) }
    }

    // ── PUT ──────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'PUT') {
      if (!isAdmin && !isGestor) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }

      const { titulo, objetivo, periodo_inicio, periodo_fim, status, observacoes, acoes } = JSON.parse(event.body || '{}')

      const check = await sql`SELECT id, gestor_nome FROM carreira_pdi WHERE id = ${id}`
      if (!check.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      if (isGestor && check[0].gestor_nome?.toLowerCase().trim() !== auth.name?.toLowerCase().trim()) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão para editar este PDI' }) }
      }

      await sql`
        UPDATE carreira_pdi SET
          titulo         = COALESCE(${titulo || null}, titulo),
          objetivo       = COALESCE(${objetivo || null}, objetivo),
          periodo_inicio = COALESCE(${periodo_inicio || null}, periodo_inicio),
          periodo_fim    = COALESCE(${periodo_fim || null}, periodo_fim),
          status         = COALESCE(${status || null}, status),
          observacoes    = COALESCE(${observacoes || null}, observacoes),
          updated_at     = NOW()
        WHERE id = ${id}
      `

      if (Array.isArray(acoes)) {
        await sql`DELETE FROM carreira_pdi_acoes WHERE pdi_id = ${id}`
        for (let i = 0; i < acoes.length; i++) {
          const a = acoes[i]
          await sql`
            INSERT INTO carreira_pdi_acoes (pdi_id, competencia, descricao, prazo, status, progresso, ordem)
            VALUES (${id}, ${a.competencia || null}, ${a.descricao || ''}, ${a.prazo || null},
                    ${a.status || 'pendente'}, ${a.progresso || 0}, ${i})
          `
        }
      }

      const full = await fetchPDIs(sql, 'all')
      return { statusCode: 200, headers, body: JSON.stringify(full.find(r => r.id === id)) }
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'DELETE') {
      if (!isAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      await sql`DELETE FROM carreira_pdi WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
