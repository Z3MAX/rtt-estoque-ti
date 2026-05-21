const { neon } = require('@neondatabase/serverless')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}
  const id = params.id ? parseInt(params.id) : null

  try {
    if (event.httpMethod === 'GET') {
      const rows = await sql`
        SELECT l.*, COUNT(e.id)::int as equipment_count
        FROM locations l
        LEFT JOIN equipment e ON e.location_id = l.id
        GROUP BY l.id
        ORDER BY l.name
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const { name, description } = JSON.parse(event.body || '{}')
      if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome é obrigatório' }) }

      const rows = await sql`
        INSERT INTO locations (name, description)
        VALUES (${name}, ${description || null})
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID obrigatório' }) }

      const { name, description } = JSON.parse(event.body || '{}')
      const existing = await sql`SELECT * FROM locations WHERE id = ${id}`
      if (existing.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) }

      const rows = await sql`
        UPDATE locations SET
          name = ${name || existing[0].name},
          description = ${description !== undefined ? description : existing[0].description}
        WHERE id = ${id}
        RETURNING *
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID obrigatório' }) }

      const count = await sql`SELECT COUNT(*) as c FROM equipment WHERE location_id = ${id}`
      if (parseInt(count[0].c) > 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Local possui equipamentos vinculados' }) }
      }

      await sql`DELETE FROM locations WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
