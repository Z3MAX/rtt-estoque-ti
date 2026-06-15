const { neon } = require('@neondatabase/serverless')
const { requireAuth, requireAdmin, isAdminRole, makeHeaders, errorResponse } = require('./_auth')
const { logAudit, getUserName } = require('./_audit')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}
  const id = params.id ? parseInt(params.id) : null

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS ciclos (
        id              SERIAL PRIMARY KEY,
        periodo_inicial VARCHAR(20) NOT NULL,
        periodo_final   VARCHAR(20),
        prazo           DATE,
        status          VARCHAR(20) DEFAULT 'aberto',
        created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at      TIMESTAMP DEFAULT NOW(),
        updated_at      TIMESTAMP DEFAULT NOW()
      )
    `

    const authPayload = requireAuth(event)
    const userIsAdmin = isAdminRole(authPayload.role)

    // GET — admin recebe lista completa com stats; gestor recebe só o ciclo ativo
    if (event.httpMethod === 'GET') {
      if (!userIsAdmin) {
        const rows = await sql`
          SELECT id, periodo_inicial, periodo_final, prazo, status
          FROM ciclos WHERE status = 'aberto'
          ORDER BY created_at DESC LIMIT 1
        `
        return { statusCode: 200, headers, body: JSON.stringify(rows[0] || null) }
      }

      const ciclos = await sql`SELECT * FROM ciclos ORDER BY created_at DESC`
      const result = []
      for (const ciclo of ciclos) {
        const [totalRows, pendentesRows, gestoresRows] = await Promise.all([
          sql`SELECT COUNT(*)::int AS total FROM ciclos_avaliacao WHERE periodo_inicial = ${ciclo.periodo_inicial}`,
          sql`SELECT COUNT(*)::int AS total FROM ciclos_avaliacao WHERE periodo_inicial = ${ciclo.periodo_inicial} AND status = 'pendente'`,
          sql`
            SELECT
              u.id, u.name, u.area,
              COUNT(ca.id)::int AS enviadas,
              (SELECT COUNT(*)::int FROM colaboradores c WHERE c.area = u.area AND c.ativo = true) AS total_colabs
            FROM users u
            LEFT JOIN ciclos_avaliacao ca
              ON ca.avaliador_id = u.id AND ca.periodo_inicial = ${ciclo.periodo_inicial}
            WHERE u.role = 'Gestor' AND u.active = true
            GROUP BY u.id, u.name, u.area
            ORDER BY u.name ASC
          `,
        ])
        result.push({
          ...ciclo,
          total_avaliacoes:      totalRows[0]?.total || 0,
          pendentes_calibracao:  pendentesRows[0]?.total || 0,
          gestores:              gestoresRows,
        })
      }
      return { statusCode: 200, headers, body: JSON.stringify(result) }
    }

    // POST — abrir novo ciclo (admin only)
    if (event.httpMethod === 'POST') {
      requireAdmin(event)
      const { periodo_inicial, periodo_final, prazo } = JSON.parse(event.body || '{}')
      if (!periodo_inicial) return { statusCode: 400, headers, body: JSON.stringify({ error: 'periodo_inicial é obrigatório' }) }

      const existing = await sql`SELECT id FROM ciclos WHERE status = 'aberto' LIMIT 1`
      if (existing.length > 0)
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'Já existe um ciclo aberto. Encerre-o antes de abrir um novo.' }) }

      const rows = await sql`
        INSERT INTO ciclos (periodo_inicial, periodo_final, prazo, created_by)
        VALUES (${periodo_inicial}, ${periodo_final || null}, ${prazo || null}, ${authPayload.userId})
        RETURNING *
      `
      const userName = await getUserName(sql, authPayload.userId)
      await logAudit(sql, { entityType: 'ciclo', entityId: rows[0].id, entityName: `Ciclo ${periodo_inicial}`, action: 'created', changes: null, userId: authPayload.userId, userName })
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    // PUT — encerrar ciclo (admin only)
    if (event.httpMethod === 'PUT') {
      requireAdmin(event)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID necessário' }) }
      const { status } = JSON.parse(event.body || '{}')
      if (status !== 'encerrado') return { statusCode: 400, headers, body: JSON.stringify({ error: 'Status inválido' }) }

      const rows = await sql`
        UPDATE ciclos SET status = ${status}, updated_at = NOW() WHERE id = ${id} RETURNING *
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ciclo não encontrado' }) }
      const userName = await getUserName(sql, authPayload.userId)
      await logAudit(sql, { entityType: 'ciclo', entityId: rows[0].id, entityName: `Ciclo ${rows[0].periodo_inicial}`, action: 'deactivated', changes: null, userId: authPayload.userId, userName })
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
