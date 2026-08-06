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
      SELECT c.cargo, c.nivel, COUNT(*) AS total
      FROM colaboradores c
      JOIN users u ON LOWER(c.email) = LOWER(u.email)
      WHERE u.role IN ('Gestor', 'Administrador de RH / Gestor')
        AND c.cargo IS NOT NULL AND c.cargo <> ''
      GROUP BY c.cargo, c.nivel
      ORDER BY total DESC
    `
    return { statusCode: 200, headers, body: JSON.stringify(rows) }
  } catch (err) {
    return { statusCode: err.statusCode || 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
