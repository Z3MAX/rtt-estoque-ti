const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders, errorResponse } = require('./_auth')

function isGestorRole(role) {
  return role === 'Gestor' || role === 'Administrador de RH / Gestor'
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS carreira_feedbacks (
      id            SERIAL PRIMARY KEY,
      de_nome       TEXT NOT NULL,
      de_role       TEXT,
      para_nome     TEXT NOT NULL,
      tipo          TEXT DEFAULT 'geral',
      conteudo      TEXT NOT NULL,
      pontos_fortes TEXT,
      areas_melhoria TEXT,
      data_feedback DATE DEFAULT CURRENT_DATE,
      is_peer       BOOLEAN DEFAULT FALSE,
      criado_por    INT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'GET, POST, DELETE, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}
  const id = params.id ? parseInt(params.id) : null

  try {
    const auth = requireAuth(event)
    const isAdmin  = isAdminRole(auth.role)
    const isGestor = isGestorRole(auth.role)

    await ensureTable(sql)

    // ── GET ──────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      let rows
      if (isAdmin) {
        rows = await sql`SELECT * FROM carreira_feedbacks ORDER BY created_at DESC`
      } else if (isGestor) {
        // Gestor <-> colaborador: gestor vê os que enviou ou recebeu de/para sua equipe
        rows = await sql`
          SELECT * FROM carreira_feedbacks
          WHERE LOWER(TRIM(de_nome)) = LOWER(TRIM(${auth.name}))
             OR LOWER(TRIM(para_nome)) = LOWER(TRIM(${auth.name}))
          ORDER BY created_at DESC
        `
      } else {
        // Colaborador: vê feedbacks onde é remetente ou destinatário
        rows = await sql`
          SELECT * FROM carreira_feedbacks
          WHERE LOWER(TRIM(de_nome)) = LOWER(TRIM(${auth.name}))
             OR LOWER(TRIM(para_nome)) = LOWER(TRIM(${auth.name}))
          ORDER BY created_at DESC
        `
      }
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      const { para_nome, tipo, conteudo, pontos_fortes, areas_melhoria, data_feedback, is_peer } = JSON.parse(event.body || '{}')
      if (!para_nome) return { statusCode: 400, headers, body: JSON.stringify({ error: 'para_nome obrigatório' }) }
      if (!conteudo)  return { statusCode: 400, headers, body: JSON.stringify({ error: 'conteudo obrigatório' }) }

      const rows = await sql`
        INSERT INTO carreira_feedbacks (de_nome, de_role, para_nome, tipo, conteudo, pontos_fortes, areas_melhoria, data_feedback, is_peer, criado_por)
        VALUES (${auth.name}, ${auth.role}, ${para_nome}, ${tipo || 'geral'}, ${conteudo},
                ${pontos_fortes || null}, ${areas_melhoria || null},
                ${data_feedback || null}, ${!!is_peer}, ${auth.userId})
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'DELETE') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      const check = await sql`SELECT criado_por FROM carreira_feedbacks WHERE id = ${id}`
      if (!check.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      if (!isAdmin && check[0].criado_por !== auth.userId) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }
      await sql`DELETE FROM carreira_feedbacks WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
