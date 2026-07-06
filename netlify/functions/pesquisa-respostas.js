const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}

  try {
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
    await sql`CREATE INDEX IF NOT EXISTS pr_pesquisa_idx ON pesquisa_respostas(pesquisa_id)`
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS pr_user_pesquisa_uniq ON pesquisa_respostas(pesquisa_id, user_id) WHERE user_id IS NOT NULL`
    } catch (_) {}
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS colaborador_id INTEGER`
    } catch (_) {}

    const auth = requireAuth(event)
    const isAdmin = isAdminRole(auth.role)

    if (event.httpMethod === 'GET') {
      if (params.ja_respondi === '1') {
        const rows = await sql`
          SELECT DISTINCT pesquisa_id FROM pesquisa_respostas WHERE user_id = ${auth.userId}
        `
        return { statusCode: 200, headers, body: JSON.stringify(rows.map(r => r.pesquisa_id)) }
      }

      const pesquisaId = params.pesquisa_id ? parseInt(params.pesquisa_id) : null
      if (!pesquisaId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'pesquisa_id obrigatório' }) }
      if (!isAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }

      const rows = await sql`
        SELECT pr.id, pr.pesquisa_id, pr.respostas, pr.anonima, pr.created_at,
               CASE WHEN pr.anonima THEN NULL ELSE c.nome END AS colaborador_nome,
               CASE WHEN pr.anonima THEN NULL ELSE c.cargo END AS colaborador_cargo
        FROM pesquisa_respostas pr
        LEFT JOIN colaboradores c ON c.id = pr.colaborador_id
        WHERE pr.pesquisa_id = ${pesquisaId}
        ORDER BY pr.created_at DESC
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { pesquisa_id, respostas } = body

      if (!pesquisa_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'pesquisa_id obrigatório' }) }
      if (!Array.isArray(respostas)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'respostas deve ser um array' }) }

      const existing = await sql`
        SELECT id FROM pesquisa_respostas WHERE pesquisa_id = ${pesquisa_id} AND user_id = ${auth.userId}
      `
      if (existing.length > 0) return { statusCode: 409, headers, body: JSON.stringify({ error: 'Você já respondeu esta pesquisa' }) }

      const survey = await sql`SELECT anonima FROM pesquisas WHERE id = ${pesquisa_id} AND ativo = true`
      if (survey.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Pesquisa não encontrada' }) }

      const userRow = await sql`SELECT colaborador_id FROM users WHERE id = ${auth.userId} LIMIT 1`
      const colaboradorId = userRow[0]?.colaborador_id ?? null
      const isAnonima = survey[0].anonima

      const rows = await sql`
        INSERT INTO pesquisa_respostas (pesquisa_id, colaborador_id, user_id, respostas, anonima)
        VALUES (${pesquisa_id}, ${isAnonima ? null : colaboradorId}, ${auth.userId}, ${JSON.stringify(respostas)}, ${isAnonima})
        RETURNING id, created_at
      `
      return { statusCode: 201, headers, body: JSON.stringify({ success: true, id: rows[0].id }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('pesquisa-respostas error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
