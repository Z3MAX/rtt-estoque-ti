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
    // Garante coluna manager_email (migrações transparentes para instâncias existentes)
    await sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS manager_email VARCHAR(200)`

    // GET — qualquer usuário autenticado
    if (event.httpMethod === 'GET') {
      requireAuth(event)
      const rows = await sql`
        SELECT l.*, COUNT(e.id)::int as equipment_count
        FROM locations l
        LEFT JOIN equipment e ON e.location_id = l.id
        GROUP BY l.id
        ORDER BY l.name
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    // Escrita — somente administrador
    if (event.httpMethod === 'POST') {
      requireAdmin(event)
      const { name, description, manager_email } = JSON.parse(event.body || '{}')
      if (!name || !name.trim())
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome é obrigatório' }) }
      if (name.length > 100)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome muito longo (máx 100 caracteres)' }) }
      if (manager_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manager_email))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail do gestor inválido' }) }

      const rows = await sql`
        INSERT INTO locations (name, description, manager_email)
        VALUES (${name.trim()}, ${description || null}, ${manager_email?.toLowerCase() || null})
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      requireAdmin(event)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID obrigatório' }) }

      const { name, description, manager_email } = JSON.parse(event.body || '{}')
      if (manager_email !== undefined && manager_email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manager_email))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail do gestor inválido' }) }

      const existing = await sql`SELECT * FROM locations WHERE id = ${id}`
      if (existing.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Local não encontrado' }) }

      const rows = await sql`
        UPDATE locations SET
          name          = ${name?.trim() || existing[0].name},
          description   = ${description !== undefined ? description : existing[0].description},
          manager_email = ${manager_email !== undefined ? (manager_email?.toLowerCase() || null) : existing[0].manager_email}
        WHERE id = ${id}
        RETURNING *
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      requireAdmin(event)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID obrigatório' }) }

      const count = await sql`SELECT COUNT(*) as c FROM equipment WHERE location_id = ${id}`
      if (parseInt(count[0].c) > 0)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Local possui equipamentos vinculados' }) }

      await sql`DELETE FROM locations WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
