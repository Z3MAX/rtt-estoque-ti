const { neon } = require('@neondatabase/serverless')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  let items
  try {
    items = JSON.parse(event.body || '[]')
    if (!Array.isArray(items)) throw new Error('Expected array')
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido — envie um array de equipamentos' }) }
  }

  if (items.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nenhum item para importar' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  const results = { created: 0, failed: 0, errors: [] }

  for (const item of items) {
    try {
      // Resolve category_id by name
      let categoryId = null
      if (item.category_name) {
        const cats = await sql`SELECT id FROM categories WHERE LOWER(name) = LOWER(${item.category_name}) LIMIT 1`
        if (cats.length > 0) categoryId = cats[0].id
      }

      // Resolve location_id by name
      let locationId = null
      if (item.location_name) {
        const locs = await sql`SELECT id FROM locations WHERE LOWER(name) = LOWER(${item.location_name}) LIMIT 1`
        if (locs.length > 0) {
          locationId = locs[0].id
        } else {
          // Auto-create location if it doesn't exist
          const newLoc = await sql`
            INSERT INTO locations (name, description) VALUES (${item.location_name}, 'Importado automaticamente')
            RETURNING id
          `
          locationId = newLoc[0].id
        }
      }

      await sql`
        INSERT INTO equipment (
          name, category_id, brand, model, serial_number, asset_tag,
          status, location_id, assigned_to, purchase_date, purchase_price, notes
        ) VALUES (
          ${item.name || 'Sem nome'},
          ${categoryId},
          ${item.brand || null},
          ${item.model || null},
          ${item.serial_number || null},
          ${item.asset_tag ? String(item.asset_tag) : null},
          ${item.status || 'disponivel'},
          ${locationId},
          ${item.assigned_to || null},
          ${item.purchase_date || null},
          ${item.purchase_price || null},
          ${item.notes || null}
        )
      `
      results.created++
    } catch (err) {
      results.failed++
      results.errors.push({ item: item.name, error: err.message })
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(results),
  }
}
