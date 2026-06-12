const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders, errorResponse } = require('./_auth')
const { sendLocationReport } = require('./_email')
const { getUserName } = require('./_audit')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  if (!process.env.DATABASE_URL)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL não configurado' }) }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Credenciais de e-mail não configuradas (SMTP_USER / SMTP_PASS)' }) }

  try {
    const authPayload = requireAuth(event)
    const sql = neon(process.env.DATABASE_URL)

    const { locationId, toEmail } = JSON.parse(event.body || '{}')
    if (!locationId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'locationId obrigatório' }) }
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail))
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail de destino inválido' }) }

    // Busca o local
    const locs = await sql`SELECT * FROM locations WHERE id = ${locationId}`
    if (locs.length === 0)
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Local não encontrado' }) }

    // Busca equipamentos do local com joins
    const equipment = await sql`
      SELECT e.name, e.serial_number, e.asset_tag, e.status, e.assigned_to,
             c.name as category_name
      FROM equipment e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.location_id = ${locationId}
      ORDER BY e.name ASC
    `

    // Nome de quem está enviando
    const senderName = await getUserName(sql, authPayload.userId)

    const result = await sendLocationReport({
      locationName: locs[0].name,
      managerEmail: toEmail,
      equipment,
      senderName,
    })

    if (result.skipped)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Credenciais de e-mail não configuradas' }) }
    if (result.error)
      return { statusCode: 500, headers, body: JSON.stringify({ error: `Falha ao enviar: ${result.error}` }) }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, email: toEmail, total: equipment.length }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
