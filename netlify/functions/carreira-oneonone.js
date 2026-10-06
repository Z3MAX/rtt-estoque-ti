const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders, errorResponse } = require('./_auth')

function isGestorRole(role) {
  return role === 'Gestor' || role === 'Administrador de RH / Gestor'
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS carreira_oneonone (
      id               SERIAL PRIMARY KEY,
      gestor_nome      TEXT NOT NULL,
      colaborador_nome TEXT NOT NULL,
      data_reuniao     DATE NOT NULL,
      pauta            TEXT,
      observacoes      TEXT,
      proximos_passos  TEXT,
      criado_por       INT,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `
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

    await ensureTable(sql)

    // ── GET ──────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      if (!isAdmin && !isGestor) {
        // Colaborador não tem acesso a one-on-ones
        return { statusCode: 200, headers, body: JSON.stringify([]) }
      }

      let rows
      if (isAdmin) {
        rows = await sql`SELECT * FROM carreira_oneonone ORDER BY data_reuniao DESC`
      } else {
        rows = await sql`
          SELECT * FROM carreira_oneonone
          WHERE LOWER(TRIM(gestor_nome)) = LOWER(TRIM(${auth.name}))
          ORDER BY data_reuniao DESC
        `
      }
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      if (!isAdmin && !isGestor) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      const { colaborador_nome, data_reuniao, pauta, observacoes, proximos_passos } = JSON.parse(event.body || '{}')
      if (!colaborador_nome) return { statusCode: 400, headers, body: JSON.stringify({ error: 'colaborador_nome obrigatório' }) }
      if (!data_reuniao)     return { statusCode: 400, headers, body: JSON.stringify({ error: 'data_reuniao obrigatória' }) }

      const rows = await sql`
        INSERT INTO carreira_oneonone (gestor_nome, colaborador_nome, data_reuniao, pauta, observacoes, proximos_passos, criado_por)
        VALUES (${auth.name}, ${colaborador_nome}, ${data_reuniao},
                ${pauta || null}, ${observacoes || null}, ${proximos_passos || null}, ${auth.userId})
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    // ── PUT ──────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'PUT') {
      if (!isAdmin && !isGestor) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }

      const check = await sql`SELECT gestor_nome FROM carreira_oneonone WHERE id = ${id}`
      if (!check.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      if (isGestor && check[0].gestor_nome?.toLowerCase().trim() !== auth.name?.toLowerCase().trim()) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão para editar este registro' }) }
      }

      const { colaborador_nome, data_reuniao, pauta, observacoes, proximos_passos } = JSON.parse(event.body || '{}')
      const rows = await sql`
        UPDATE carreira_oneonone SET
          colaborador_nome = COALESCE(${colaborador_nome || null}, colaborador_nome),
          data_reuniao     = COALESCE(${data_reuniao || null}::date, data_reuniao),
          pauta            = COALESCE(${pauta || null}, pauta),
          observacoes      = COALESCE(${observacoes || null}, observacoes),
          proximos_passos  = COALESCE(${proximos_passos || null}, proximos_passos),
          updated_at       = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'DELETE') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      const check = await sql`SELECT gestor_nome, criado_por FROM carreira_oneonone WHERE id = ${id}`
      if (!check.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      if (!isAdmin && check[0].criado_por !== auth.userId) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }
      await sql`DELETE FROM carreira_oneonone WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
