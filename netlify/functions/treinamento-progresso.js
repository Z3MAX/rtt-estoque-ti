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
    // Add unique index if the table existed before without the constraint
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS treinamento_progresso_uniq ON treinamento_progresso (user_id, curso_id, modulo_id)`
  } catch (e) {
    console.error('treinamento-progresso setup error:', e)
  }

  try {
    const auth = requireAuth(event)
    const userId = auth.userId

    if (event.httpMethod === 'GET') {
      const rows = await sql`
        SELECT curso_id, modulo_id, concluido, COALESCE(segundos_assistidos, 0) AS segundos_assistidos
        FROM treinamento_progresso
        WHERE user_id = ${userId}
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const { curso_id, modulo_id, concluido, segundos_assistidos } = JSON.parse(event.body || '{}')
      if (!curso_id || !modulo_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'curso_id e modulo_id obrigatórios' }) }

      if (concluido !== undefined) {
        // Mark as complete/incomplete
        await sql`
          INSERT INTO treinamento_progresso (user_id, curso_id, modulo_id, concluido, segundos_assistidos)
          VALUES (${userId}, ${curso_id}, ${modulo_id}, ${concluido}, 0)
          ON CONFLICT (user_id, curso_id, modulo_id) DO UPDATE SET
            concluido  = ${concluido},
            updated_at = NOW()
        `
      } else if (segundos_assistidos !== undefined) {
        // Save watch progress only (never decrease)
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
