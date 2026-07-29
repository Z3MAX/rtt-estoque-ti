const { neon } = require('@neondatabase/serverless')
const { makeHeaders } = require('./_auth')

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
    await runMigrations(sql)

    // Search colaboradores by name
    if (event.httpMethod === 'GET' && params.action === 'buscar') {
      const q = (params.q || '').trim()
      if (q.length < 2) return { statusCode: 200, headers, body: JSON.stringify([]) }
      const pattern = `%${q}%`
      const rows = await sql`
        SELECT id, nome, cargo, area FROM colaboradores
        WHERE ativo = true AND nome ILIKE ${pattern}
        ORDER BY nome LIMIT 10
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    // Load event by public token
    if (event.httpMethod === 'GET' && params.token) {
      const rows = await sql`
        SELECT id, titulo, descricao, instrutor, local, data_evento, status,
               (codigo IS NOT NULL AND codigo <> '') AS tem_codigo
        FROM treinamentos_presenciais
        WHERE token = ${params.token} AND ativo = true
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Evento não encontrado' }) }
      const ev = rows[0]
      if (ev.status === 'ENCERRADA') {
        return { statusCode: 410, headers, body: JSON.stringify({ error: 'Lista de presença encerrada', titulo: ev.titulo }) }
      }
      if (ev.status !== 'ABERTA') {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'Lista ainda não foi aberta pelo instrutor', titulo: ev.titulo }) }
      }
      return { statusCode: 200, headers, body: JSON.stringify(ev) }
    }

    // Register attendance
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { token, colaborador_id, nome, cargo, area, codigo: codigoInformado } = body
      if (!token || !nome) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dados incompletos' }) }

      const rows = await sql`
        SELECT id, status, codigo FROM treinamentos_presenciais WHERE token = ${token} AND ativo = true
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Evento não encontrado' }) }
      const ev = rows[0]
      if (ev.status !== 'ABERTA') return { statusCode: 409, headers, body: JSON.stringify({ error: 'Lista não está aberta' }) }

      if (ev.codigo && codigoInformado !== ev.codigo) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Código do instrutor inválido' }) }
      }

      if (colaborador_id) {
        const existing = await sql`
          SELECT id FROM presenca_registros WHERE treinamento_id = ${ev.id} AND colaborador_id = ${colaborador_id}
        `
        if (existing.length > 0) {
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'Você já registrou sua presença neste treinamento' }) }
        }
      }

      await sql`
        INSERT INTO presenca_registros (treinamento_id, colaborador_id, nome, cargo, area)
        VALUES (${ev.id}, ${colaborador_id ?? null}, ${nome}, ${cargo ?? null}, ${area ?? null})
      `
      return { statusCode: 201, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.code === '23505') {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Você já registrou sua presença neste treinamento' }) }
    }
    console.error('presenca-publica error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
