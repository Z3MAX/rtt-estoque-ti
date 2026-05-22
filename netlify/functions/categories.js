const { neon } = require('@neondatabase/serverless')
const { requireAuth, requireAdmin, makeHeaders, errorResponse } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}
  const id = params.id ? parseInt(params.id) : null

  try {
    // GET — qualquer usuário autenticado
    if (event.httpMethod === 'GET') {
      requireAuth(event)
      const rows = await sql`
        SELECT c.*, COUNT(e.id)::int as equipment_count
        FROM categories c
        LEFT JOIN equipment e ON e.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    // Escrita — somente administrador
    if (event.httpMethod === 'POST') {
      requireAdmin(event)
      const { name, description, color = '#6366f1', icon = 'Monitor' } = JSON.parse(event.body || '{}')
      if (!name || !name.trim())
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome é obrigatório' }) }
      if (name.length > 100)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome muito longo (máx 100 caracteres)' }) }

      const rows = await sql`
        INSERT INTO categories (name, description, color, icon)
        VALUES (${name.trim()}, ${description || null}, ${color}, ${icon})
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      requireAdmin(event)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID obrigatório' }) }

      const { name, description, color, icon } = JSON.parse(event.body || '{}')
      const existing = await sql`SELECT * FROM categories WHERE id = ${id}`
      if (existing.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Categoria não encontrada' }) }

      const rows = await sql`
        UPDATE categories SET
          name        = ${name?.trim() || existing[0].name},
          description = ${description !== undefined ? description : existing[0].description},
          color       = ${color || existing[0].color},
          icon        = ${icon || existing[0].icon}
        WHERE id = ${id}
        RETURNING *
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      requireAdmin(event)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID obrigatório' }) }

      const count = await sql`SELECT COUNT(*) as c FROM equipment WHERE category_id = ${id}`
      if (parseInt(count[0].c) > 0)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Categoria possui equipamentos vinculados' }) }

      await sql`DELETE FROM categories WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
