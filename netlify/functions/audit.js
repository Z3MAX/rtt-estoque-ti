const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders, errorResponse } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'GET, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  try {
    requireAuth(event)
    const sql = neon(process.env.DATABASE_URL)
    const params = event.queryStringParameters || {}
    const entityType = params.entity_type || null
    const entityId = params.entity_id ? parseInt(params.entity_id) : null
    const limit = Math.min(parseInt(params.limit || '100'), 200)

    let rows
    if (entityType && entityId) {
      rows = await sql`SELECT * FROM audit_log WHERE entity_type = ${entityType} AND entity_id = ${entityId} ORDER BY created_at DESC LIMIT ${limit}`
    } else if (entityType) {
      rows = await sql`SELECT * FROM audit_log WHERE entity_type = ${entityType} ORDER BY created_at DESC LIMIT ${limit}`
    } else {
      rows = await sql`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ${limit}`
    }
    return { statusCode: 200, headers, body: JSON.stringify(rows) }
  } catch (err) {
    // If audit_log table doesn't exist yet, return empty array
    if (err.message?.includes('audit_log') || err.code === '42P01') {
      const headers2 = makeHeaders(event, 'GET, OPTIONS')
      return { statusCode: 200, headers: headers2, body: JSON.stringify([]) }
    }
    return errorResponse(headers, err)
  }
}
