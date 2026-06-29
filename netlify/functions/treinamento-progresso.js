const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

  // Add segundos_assistidos column if it doesn't exist yet
  await sql`ALTER TABLE treinamento_progresso ADD COLUMN IF NOT EXISTS segundos_assistidos INTEGER DEFAULT 0`

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

      const novoConcluido = concluido ?? null
      const novosSeg = segundos_assistidos ?? null

      await sql`
        INSERT INTO treinamento_progresso (user_id, curso_id, modulo_id, concluido, segundos_assistidos)
        VALUES (
          ${userId}, ${curso_id}, ${modulo_id},
          ${novoConcluido ?? false},
          ${novosSeg ?? 0}
        )
        ON CONFLICT (user_id, curso_id, modulo_id) DO UPDATE SET
          concluido           = CASE WHEN ${novoConcluido} IS NOT NULL THEN ${novoConcluido} ELSE treinamento_progresso.concluido END,
          segundos_assistidos = CASE WHEN ${novosSeg} IS NOT NULL
                                     THEN GREATEST(treinamento_progresso.segundos_assistidos, ${novosSeg})
                                     ELSE treinamento_progresso.segundos_assistidos END,
          updated_at          = NOW()
      `
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('treinamento-progresso error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
