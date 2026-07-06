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
      CREATE TABLE IF NOT EXISTS curso_avaliacoes (
        id         SERIAL PRIMARY KEY,
        curso_id   INTEGER NOT NULL,
        user_id    INTEGER NOT NULL,
        nota       SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(curso_id, user_id)
      )
    `

    const auth = requireAuth(event)

    if (event.httpMethod === 'GET') {
      const cursoId = params.curso_id ? parseInt(params.curso_id) : null
      if (!cursoId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'curso_id obrigatório' }) }

      const [stats] = await sql`
        SELECT
          ROUND(AVG(nota)::numeric, 1) AS media,
          COUNT(*) AS total
        FROM curso_avaliacoes
        WHERE curso_id = ${cursoId}
      `
      const minha = await sql`
        SELECT nota FROM curso_avaliacoes WHERE curso_id = ${cursoId} AND user_id = ${auth.userId}
      `
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          media:  stats.media  ? parseFloat(stats.media) : null,
          total:  parseInt(stats.total),
          minha_nota: minha[0]?.nota ?? null,
        }),
      }
    }

    if (event.httpMethod === 'POST') {
      const { curso_id, nota } = JSON.parse(event.body || '{}')
      if (!curso_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'curso_id obrigatório' }) }
      if (!nota || nota < 1 || nota > 5) return { statusCode: 400, headers, body: JSON.stringify({ error: 'nota deve ser 1–5' }) }

      await sql`
        INSERT INTO curso_avaliacoes (curso_id, user_id, nota)
        VALUES (${curso_id}, ${auth.userId}, ${nota})
        ON CONFLICT (curso_id, user_id) DO UPDATE SET nota = ${nota}, updated_at = NOW()
      `

      const [stats] = await sql`
        SELECT ROUND(AVG(nota)::numeric, 1) AS media, COUNT(*) AS total
        FROM curso_avaliacoes WHERE curso_id = ${curso_id}
      `
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          media: parseFloat(stats.media),
          total: parseInt(stats.total),
          minha_nota: nota,
        }),
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('curso-avaliacoes error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
