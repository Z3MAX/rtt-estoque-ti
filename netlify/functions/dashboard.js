const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders, errorResponse } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'GET, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  try {
    requireAuth(event)
    const sql = neon(process.env.DATABASE_URL)

    const [totals, byStatus, byCategory, recent, recentMovements] = await Promise.all([
      sql`SELECT COUNT(*)::int as total FROM equipment`,

      sql`
        SELECT status, COUNT(*)::int as count
        FROM equipment
        GROUP BY status
        ORDER BY count DESC
      `,

      sql`
        SELECT c.name, c.color, c.icon, COUNT(e.id)::int as count
        FROM categories c
        LEFT JOIN equipment e ON e.category_id = c.id
        GROUP BY c.id, c.name, c.color, c.icon
        HAVING COUNT(e.id) > 0
        ORDER BY count DESC
        LIMIT 6
      `,

      sql`
        SELECT e.id, e.name, e.brand, e.model, e.status, e.created_at,
               c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM equipment e
        LEFT JOIN categories c ON e.category_id = c.id
        ORDER BY e.created_at DESC
        LIMIT 5
      `,

      sql`
        SELECT m.*, e.name as equipment_name
        FROM movements m
        LEFT JOIN equipment e ON m.equipment_id = e.id
        ORDER BY m.created_at DESC
        LIMIT 8
      `,
    ])

    const statusMap = {}
    byStatus.forEach((row) => { statusMap[row.status] = row.count })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        total: totals[0].total,
        disponivel: statusMap['disponivel'] || 0,
        em_uso: statusMap['em_uso'] || 0,
        manutencao: statusMap['manutencao'] || 0,
        inativo: statusMap['inativo'] || 0,
        byCategory,
        recent,
        recentMovements,
      }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
