const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

async function runMigrations(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS treinamentos_presenciais (
      id          SERIAL PRIMARY KEY,
      titulo      TEXT NOT NULL,
      descricao   TEXT,
      instrutor   TEXT,
      local       TEXT,
      data_evento TIMESTAMP,
      status      TEXT DEFAULT 'AGENDADO',
      token       UUID DEFAULT gen_random_uuid(),
      codigo      TEXT,
      created_by  INTEGER,
      created_at  TIMESTAMP DEFAULT NOW(),
      ativo       BOOLEAN DEFAULT true
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS presenca_registros (
      id               SERIAL PRIMARY KEY,
      treinamento_id   INTEGER NOT NULL,
      colaborador_id   INTEGER,
      nome             TEXT NOT NULL,
      cargo            TEXT,
      area             TEXT,
      created_at       TIMESTAMP DEFAULT NOW()
    )
  `
  try {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS presenca_colab_uq ON presenca_registros(treinamento_id, colaborador_id) WHERE colaborador_id IS NOT NULL`
  } catch (_) {}
}

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}

  try {
    const auth = requireAuth(event)
    await runMigrations(sql)

    if (event.httpMethod === 'GET') {
      // Attendance list for a specific event
      if (params.id && params.action === 'presenca') {
        const id = parseInt(params.id)
        const rows = await sql`
          SELECT id, colaborador_id, nome, cargo, area, created_at
          FROM presenca_registros WHERE treinamento_id = ${id}
          ORDER BY created_at ASC
        `
        return { statusCode: 200, headers, body: JSON.stringify(rows) }
      }

      // List all events with attendance count
      const rows = await sql`
        SELECT t.*,
               t.token::text AS token,
               COALESCE(p.total, 0)::int AS total_presencas
        FROM treinamentos_presenciais t
        LEFT JOIN (
          SELECT treinamento_id, COUNT(*) AS total FROM presenca_registros GROUP BY treinamento_id
        ) p ON p.treinamento_id = t.id
        WHERE t.ativo = true
        ORDER BY t.created_at DESC
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      if (!isAdminRole(auth.role)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      const body = JSON.parse(event.body || '{}')
      const { titulo, descricao, instrutor, local, data_evento, codigo } = body
      if (!titulo) return { statusCode: 400, headers, body: JSON.stringify({ error: 'titulo obrigatório' }) }
      const rows = await sql`
        INSERT INTO treinamentos_presenciais (titulo, descricao, instrutor, local, data_evento, codigo, created_by)
        VALUES (
          ${titulo}, ${descricao ?? null}, ${instrutor ?? null}, ${local ?? null},
          ${data_evento ?? null}, ${codigo ?? null}, ${auth.userId}
        )
        RETURNING *, token::text AS token
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      const id = parseInt(params.id)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      if (!isAdminRole(auth.role)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      const body = JSON.parse(event.body || '{}')
      const rows = await sql`
        UPDATE treinamentos_presenciais SET
          titulo      = COALESCE(${body.titulo ?? null}, titulo),
          descricao   = COALESCE(${body.descricao ?? null}, descricao),
          instrutor   = COALESCE(${body.instrutor ?? null}, instrutor),
          local       = COALESCE(${body.local ?? null}, local),
          data_evento = CASE WHEN ${body.data_evento !== undefined} THEN ${body.data_evento ?? null}::timestamp ELSE data_evento END,
          status      = COALESCE(${body.status ?? null}, status),
          codigo      = CASE WHEN ${body.codigo !== undefined} THEN ${body.codigo ?? null} ELSE codigo END
        WHERE id = ${id} AND ativo = true
        RETURNING *, token::text AS token
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      const id = parseInt(params.id)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      if (!isAdminRole(auth.role)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      await sql`UPDATE treinamentos_presenciais SET ativo = false WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('treinamentos-presenciais error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
