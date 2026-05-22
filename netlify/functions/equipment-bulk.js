const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders, errorResponse } = require('./_auth')

const VALID_STATUSES = ['disponivel', 'em_uso', 'manutencao', 'inativo']
const MAX_ITEMS = 500

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  try {
    requireAuth(event)

    let items
    try {
      items = JSON.parse(event.body || '[]')
      if (!Array.isArray(items)) throw new Error('Expected array')
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido — envie um array de equipamentos' }) }
    }

    if (items.length === 0)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nenhum item para importar' }) }
    if (items.length > MAX_ITEMS)
      return { statusCode: 400, headers, body: JSON.stringify({ error: `Máximo de ${MAX_ITEMS} itens por importação` }) }

    const sql = neon(process.env.DATABASE_URL)
    const results = { created: 0, failed: 0, errors: [] }

    // Pré-carrega locais para deduplicar auto-criações
    const locationCache = {}

    for (const item of items) {
      try {
        // Resolve category_id por nome
        let categoryId = null
        if (item.category_name) {
          const cats = await sql`SELECT id FROM categories WHERE LOWER(name) = LOWER(${item.category_name}) LIMIT 1`
          if (cats.length > 0) categoryId = cats[0].id
        }

        // Resolve location_id por nome, com cache para evitar duplicatas em lote
        let locationId = null
        if (item.location_name) {
          const locKey = item.location_name.toLowerCase()
          if (locationCache[locKey]) {
            locationId = locationCache[locKey]
          } else {
            const locs = await sql`SELECT id FROM locations WHERE LOWER(name) = LOWER(${item.location_name}) LIMIT 1`
            if (locs.length > 0) {
              locationId = locs[0].id
            } else if (item.location_name.length <= 100) {
              // Auto-cria local se não existir
              const newLoc = await sql`
                INSERT INTO locations (name, description) VALUES (${item.location_name}, 'Importado automaticamente')
                RETURNING id
              `
              locationId = newLoc[0].id
            }
            locationCache[locKey] = locationId
          }
        }

        // Valida e normaliza status
        const status = VALID_STATUSES.includes(item.status) ? item.status : 'disponivel'

        await sql`
          INSERT INTO equipment (
            name, category_id, brand, model, serial_number, asset_tag,
            status, location_id, assigned_to, purchase_date, purchase_price, notes
          ) VALUES (
            ${(item.name || 'Sem nome').substring(0, 200)},
            ${categoryId},
            ${item.brand ? String(item.brand).substring(0, 100) : null},
            ${item.model ? String(item.model).substring(0, 100) : null},
            ${item.serial_number ? String(item.serial_number).substring(0, 100) : null},
            ${item.asset_tag ? String(item.asset_tag).substring(0, 100) : null},
            ${status},
            ${locationId},
            ${item.assigned_to ? String(item.assigned_to).substring(0, 200) : null},
            ${item.purchase_date || null},
            ${item.purchase_price || null},
            ${item.notes ? String(item.notes).substring(0, 1000) : null}
          )
        `
        results.created++
      } catch (err) {
        results.failed++
        results.errors.push({ item: item.name, error: 'Erro ao importar item' })
        console.error('[bulk] erro no item:', item.name, err.message)
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify(results) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
