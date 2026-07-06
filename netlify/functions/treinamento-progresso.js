const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS treinamento_progresso (
        id                  SERIAL PRIMARY KEY,
        user_id             INTEGER NOT NULL,
        curso_id            INTEGER NOT NULL,
        modulo_id           INTEGER NOT NULL,
        concluido           BOOLEAN DEFAULT false,
        segundos_assistidos INTEGER DEFAULT 0,
        updated_at          TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, curso_id, modulo_id)
      )
    `
    await sql`ALTER TABLE treinamento_progresso ADD COLUMN IF NOT EXISTS segundos_assistidos INTEGER DEFAULT 0`
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS treinamento_progresso_uniq ON treinamento_progresso (user_id, curso_id, modulo_id)`
    await sql`ALTER TABLE treinamento_progresso ADD COLUMN IF NOT EXISTS validado BOOLEAN DEFAULT false`
    await sql`ALTER TABLE treinamento_progresso ADD COLUMN IF NOT EXISTS data_validacao DATE`
    await sql`ALTER TABLE treinamento_progresso ADD COLUMN IF NOT EXISTS validado_por TEXT`
  } catch (e) {
    console.error('treinamento-progresso setup error:', e)
  }

  try {
    const auth = requireAuth(event)
    const { isAdminRole } = require('./_auth')
    const isAdmin = isAdminRole(auth.role)
    const userId = auth.userId
    const params = event.queryStringParameters || {}

    if (event.httpMethod === 'GET') {
      // ?all=1  →  admin view: todos os usuários com dados do colaborador
      if (params.all === '1' && isAdmin) {
        const rows = await sql`
          SELECT
            tp.user_id,
            c.nome        AS colaborador_nome,
            c.cargo       AS colaborador_cargo,
            c.area        AS colaborador_area,
            c.id          AS colaborador_id,
            tp.curso_id,
            tp.modulo_id,
            tp.concluido,
            COALESCE(tp.segundos_assistidos, 0) AS segundos_assistidos,
            tp.validado,
            tp.data_validacao,
            tp.validado_por
          FROM treinamento_progresso tp
          LEFT JOIN colaboradores c ON c.id = (
            SELECT id FROM colaboradores WHERE LOWER(TRIM(nome)) = LOWER(TRIM(
              (SELECT name FROM users WHERE id = tp.user_id LIMIT 1)
            )) AND ativo = true LIMIT 1
          )
          ORDER BY tp.user_id, tp.curso_id, tp.modulo_id
        `
        return { statusCode: 200, headers, body: JSON.stringify(rows) }
      }

      const rows = await sql`
        SELECT curso_id, modulo_id, concluido, COALESCE(segundos_assistidos, 0) AS segundos_assistidos,
               validado, data_validacao
        FROM treinamento_progresso
        WHERE user_id = ${userId}
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { curso_id, modulo_id, concluido, segundos_assistidos } = body

      // Validação pelo RH: { validar: true, user_id (colaborador_id), curso_id }
      if (body.validar === true && isAdmin) {
        const colaboradorId = body.user_id  // frontend envia colaborador_id neste campo
        if (!colaboradorId || !curso_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_id e curso_id obrigatórios' }) }
        const userName = auth.name || 'RH'
        // Resolve o user_id real pelo colaborador_id
        const userRow = await sql`SELECT id FROM users WHERE colaborador_id = ${colaboradorId} LIMIT 1`
        if (userRow.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado para este colaborador' }) }
        const targetUserId = userRow[0].id
        await sql`
          UPDATE treinamento_progresso
          SET validado = true, data_validacao = CURRENT_DATE, validado_por = ${userName}, updated_at = NOW()
          WHERE user_id = ${targetUserId} AND curso_id = ${curso_id} AND concluido = true
        `
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
      }

      if (!curso_id || !modulo_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'curso_id e modulo_id obrigatórios' }) }

      if (concluido !== undefined) {
        await sql`
          INSERT INTO treinamento_progresso (user_id, curso_id, modulo_id, concluido, segundos_assistidos)
          VALUES (${userId}, ${curso_id}, ${modulo_id}, ${concluido}, 0)
          ON CONFLICT (user_id, curso_id, modulo_id) DO UPDATE SET
            concluido  = ${concluido},
            updated_at = NOW()
        `
      } else if (segundos_assistidos !== undefined) {
        await sql`
          INSERT INTO treinamento_progresso (user_id, curso_id, modulo_id, concluido, segundos_assistidos)
          VALUES (${userId}, ${curso_id}, ${modulo_id}, false, ${segundos_assistidos})
          ON CONFLICT (user_id, curso_id, modulo_id) DO UPDATE SET
            segundos_assistidos = GREATEST(treinamento_progresso.segundos_assistidos, ${segundos_assistidos}),
            updated_at          = NOW()
        `
      } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'concluido ou segundos_assistidos obrigatório' }) }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('treinamento-progresso error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
