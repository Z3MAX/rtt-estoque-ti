const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    const auth = requireAuth(event)

    // Garante que a coluna existe (migration lazy)
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT`

    if (event.httpMethod === 'GET') {
      const rows = await sql`SELECT photo_url FROM users WHERE id = ${auth.id} LIMIT 1`
      return { statusCode: 200, headers, body: JSON.stringify(rows[0] || {}) }
    }

    if (event.httpMethod === 'PUT') {
      const { photo_url } = JSON.parse(event.body || '{}')

      // Limita tamanho do base64 (~150KB após compressão client-side)
      if (photo_url && photo_url.length > 200_000) {
        return { statusCode: 413, headers, body: JSON.stringify({ error: 'Imagem muito grande' }) }
      }

      await sql`UPDATE users SET photo_url = ${photo_url ?? null}, updated_at = NOW() WHERE id = ${auth.id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('profile error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
