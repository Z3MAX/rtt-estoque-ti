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
        SELECT c.*, COUNT(e.id)::int as equipment_count
        FROM categories c
        LEFT JOIN equipment e ON e.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const { name, description, color = '#6366f1', icon = 'Monitor' } = JSON.parse(event.body || '{}')
      if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome é obrigatório' }) }

      const rows = await sql`
        INSERT INTO categories (name, description, color, icon)
        VALUES (${name}, ${description || null}, ${color}, ${icon})
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID obrigatório' }) }

      const { name, description, color, icon } = JSON.parse(event.body || '{}')
      const existing = await sql`SELECT * FROM categories WHERE id = ${id}`
      if (existing.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) }

      const rows = await sql`
        UPDATE categories SET
          name = ${name || existing[0].name},
          description = ${description !== undefined ? description : existing[0].description},
          color = ${color || existing[0].color},
          icon = ${icon || existing[0].icon}
        WHERE id = ${id}
        RETURNING *
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID obrigatório' }) }

      const count = await sql`SELECT COUNT(*) as c FROM equipment WHERE category_id = ${id}`
      if (parseInt(count[0].c) > 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Categoria possui equipamentos vinculados' }) }
      }

      await sql`DELETE FROM categories WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
