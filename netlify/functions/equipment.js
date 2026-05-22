const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders, errorResponse } = require('./_auth')

const VALID_STATUSES = ['disponivel', 'em_uso', 'manutencao', 'inativo']

exports.handler = async (event) => {
  const headers = makeHeaders(event)
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
    requireAuth(event)
    if (event.httpMethod === 'GET') {
      if (id) {
        const rows = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
                 l.name as location_name
          FROM equipment e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN locations l ON e.location_id = l.id
          WHERE e.id = ${id}
        `
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) }
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }

      const search = params.search || ''
      const status = params.status || ''
      const category = params.category ? parseInt(params.category) : null
      const location = params.location ? parseInt(params.location) : null

      // Location drill-down: simple filter by location_id, ignores other filters
      if (location) {
        const rows = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
                 l.name as location_name
          FROM equipment e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN locations l ON e.location_id = l.id
          WHERE e.location_id = ${location}
          ORDER BY e.name ASC
        `
        return { statusCode: 200, headers, body: JSON.stringify(rows) }
      }

      let rows
      if (search && status && category) {
        rows = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
                 l.name as location_name
          FROM equipment e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN locations l ON e.location_id = l.id
          WHERE (e.name ILIKE ${'%' + search + '%'} OR e.brand ILIKE ${'%' + search + '%'}
                 OR e.model ILIKE ${'%' + search + '%'} OR e.serial_number ILIKE ${'%' + search + '%'}
                 OR e.asset_tag ILIKE ${'%' + search + '%'} OR e.assigned_to ILIKE ${'%' + search + '%'})
            AND e.status = ${status}
            AND e.category_id = ${category}
          ORDER BY e.created_at DESC
        `
      } else if (search && status) {
        rows = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
                 l.name as location_name
          FROM equipment e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN locations l ON e.location_id = l.id
          WHERE (e.name ILIKE ${'%' + search + '%'} OR e.brand ILIKE ${'%' + search + '%'}
                 OR e.model ILIKE ${'%' + search + '%'} OR e.serial_number ILIKE ${'%' + search + '%'}
                 OR e.asset_tag ILIKE ${'%' + search + '%'} OR e.assigned_to ILIKE ${'%' + search + '%'})
            AND e.status = ${status}
          ORDER BY e.created_at DESC
        `
      } else if (search && category) {
        rows = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
                 l.name as location_name
          FROM equipment e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN locations l ON e.location_id = l.id
          WHERE (e.name ILIKE ${'%' + search + '%'} OR e.brand ILIKE ${'%' + search + '%'}
                 OR e.model ILIKE ${'%' + search + '%'} OR e.serial_number ILIKE ${'%' + search + '%'}
                 OR e.asset_tag ILIKE ${'%' + search + '%'} OR e.assigned_to ILIKE ${'%' + search + '%'})
            AND e.category_id = ${category}
          ORDER BY e.created_at DESC
        `
      } else if (status && category) {
        rows = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
                 l.name as location_name
          FROM equipment e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN locations l ON e.location_id = l.id
          WHERE e.status = ${status} AND e.category_id = ${category}
          ORDER BY e.created_at DESC
        `
      } else if (search) {
        rows = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
                 l.name as location_name
          FROM equipment e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN locations l ON e.location_id = l.id
          WHERE e.name ILIKE ${'%' + search + '%'} OR e.brand ILIKE ${'%' + search + '%'}
                 OR e.model ILIKE ${'%' + search + '%'} OR e.serial_number ILIKE ${'%' + search + '%'}
                 OR e.asset_tag ILIKE ${'%' + search + '%'} OR e.assigned_to ILIKE ${'%' + search + '%'}
          ORDER BY e.created_at DESC
        `
      } else if (status) {
        rows = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
                 l.name as location_name
          FROM equipment e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN locations l ON e.location_id = l.id
          WHERE e.status = ${status}
          ORDER BY e.created_at DESC
        `
      } else if (category) {
        rows = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
                 l.name as location_name
          FROM equipment e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN locations l ON e.location_id = l.id
          WHERE e.category_id = ${category}
          ORDER BY e.created_at DESC
        `
      } else {
        rows = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
                 l.name as location_name
          FROM equipment e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN locations l ON e.location_id = l.id
          ORDER BY e.created_at DESC
        `
      }

      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const {
        name, category_id, brand, model, serial_number, asset_tag,
        status = 'disponivel', location_id, assigned_to,
        purchase_date, purchase_price, notes,
      } = body

      if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome é obrigatório' }) }
      if (status && !VALID_STATUSES.includes(status)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Status inválido' }) }
      }

      const rows = await sql`
        INSERT INTO equipment (name, category_id, brand, model, serial_number, asset_tag,
          status, location_id, assigned_to, purchase_date, purchase_price, notes)
        VALUES (
          ${name},
          ${category_id || null},
          ${brand || null},
          ${model || null},
          ${serial_number || null},
          ${asset_tag || null},
          ${status},
          ${location_id || null},
          ${assigned_to || null},
          ${purchase_date || null},
          ${purchase_price || null},
          ${notes || null}
        )
        RETURNING *
      `

      await sql`
        INSERT INTO movements (equipment_id, type, description, performed_by)
        VALUES (${rows[0].id}, 'cadastro', ${'Equipamento cadastrado: ' + name}, 'sistema')
      `

      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID obrigatório' }) }

      const body = JSON.parse(event.body || '{}')
      const {
        name, category_id, brand, model, serial_number, asset_tag,
        status, location_id, assigned_to, purchase_date, purchase_price, notes,
      } = body

      const existing = await sql`SELECT * FROM equipment WHERE id = ${id}`
      if (existing.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) }

      const rows = await sql`
        UPDATE equipment SET
          name = ${name || existing[0].name},
          category_id = ${category_id !== undefined ? (category_id || null) : existing[0].category_id},
          brand = ${brand !== undefined ? (brand || null) : existing[0].brand},
          model = ${model !== undefined ? (model || null) : existing[0].model},
          serial_number = ${serial_number !== undefined ? (serial_number || null) : existing[0].serial_number},
          asset_tag = ${asset_tag !== undefined ? (asset_tag || null) : existing[0].asset_tag},
          status = ${status || existing[0].status},
          location_id = ${location_id !== undefined ? (location_id || null) : existing[0].location_id},
          assigned_to = ${assigned_to !== undefined ? (assigned_to || null) : existing[0].assigned_to},
          purchase_date = ${purchase_date !== undefined ? (purchase_date || null) : existing[0].purchase_date},
          purchase_price = ${purchase_price !== undefined ? (purchase_price || null) : existing[0].purchase_price},
          notes = ${notes !== undefined ? (notes || null) : existing[0].notes},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `

      if (status && status !== existing[0].status) {
        await sql`
          INSERT INTO movements (equipment_id, type, description, performed_by)
          VALUES (${id}, 'status', ${'Status alterado para: ' + status}, 'usuário')
        `
      }

      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID obrigatório' }) }

      const existing = await sql`SELECT * FROM equipment WHERE id = ${id}`
      if (existing.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) }

      await sql`DELETE FROM equipment WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
