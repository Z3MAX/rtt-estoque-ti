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
  await sql`
    CREATE TABLE IF NOT EXISTS treinamento_convidados (
      id               SERIAL PRIMARY KEY,
      treinamento_id   INTEGER NOT NULL,
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

    // Search participants by name — token required to prevent unauthenticated directory enumeration
    if (event.httpMethod === 'GET' && params.action === 'buscar') {
      const q = (params.q || '').trim()
      if (q.length < 2) return { statusCode: 200, headers, body: JSON.stringify([]) }
      if (!params.token) return { statusCode: 200, headers, body: JSON.stringify([]) }
      const pattern = `%${q}%`

      // Validate the event exists and is active
      const evRows = await sql`
        SELECT id, status FROM treinamentos_presenciais WHERE token = ${params.token} AND ativo = true
      `
      if (evRows.length === 0 || evRows[0].status === 'ENCERRADA') {
        return { statusCode: 200, headers, body: JSON.stringify([]) }
      }
      const evId = evRows[0].id

      // Search convidados for this event first
      const convidados = await sql`
        SELECT id, nome, cargo, area FROM treinamento_convidados
        WHERE treinamento_id = ${evId} AND nome ILIKE ${pattern}
        ORDER BY nome LIMIT 10
      `
      if (convidados.length > 0) {
        return { statusCode: 200, headers, body: JSON.stringify(convidados.map(r => ({ ...r, from_lista: true }))) }
      }

      // Fall back to colaboradores
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
        SELECT t.id, t.titulo, t.descricao, t.instrutor, t.local, t.data_evento, t.status,
               (t.codigo IS NOT NULL AND t.codigo <> '') AS tem_codigo,
               (SELECT COUNT(*) FROM treinamento_convidados WHERE treinamento_id = t.id) > 0 AS tem_lista
        FROM treinamentos_presenciais t
        WHERE t.token = ${params.token} AND t.ativo = true
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
        // Validate the colaborador_id is a real active colaborador
        const validColab = await sql`SELECT id FROM colaboradores WHERE id = ${colaborador_id} AND ativo = true`
        if (validColab.length === 0) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Colaborador inválido' }) }
        }
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
