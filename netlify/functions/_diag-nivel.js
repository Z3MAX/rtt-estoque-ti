const { neon } = require('@neondatabase/serverless')
const { requireAdmin, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'no db' }) }
  const sql = neon(process.env.DATABASE_URL)
  try {
    requireAdmin(event)
    const rows = await sql`
      SELECT nivel, COUNT(*) AS total
      FROM colaboradores
      WHERE nivel IS NOT NULL AND nivel <> ''
      GROUP BY nivel
      ORDER BY total DESC
    `
    return { statusCode: 200, headers, body: JSON.stringify(rows) }
  } catch (err) {
    return { statusCode: err.statusCode || 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
