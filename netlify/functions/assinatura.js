const { neon } = require('@neondatabase/serverless')
const { makeHeaders, errorResponse } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}

  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS assinatura TEXT`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS assinatura_token TEXT`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS assinatura_token_expires TIMESTAMP`

    // GET ?token=xxx — página de assinatura valida o token
    if (event.httpMethod === 'GET' && params.token) {
      const [user] = await sql`
        SELECT id, name
        FROM users
        WHERE assinatura_token = ${params.token}
          AND assinatura_token_expires > NOW()
          AND active = true
      `
      if (!user) return { statusCode: 404, headers, body: JSON.stringify({ valid: false, error: 'Link inválido ou expirado' }) }
      return { statusCode: 200, headers, body: JSON.stringify({ valid: true, nome: user.name }) }
    }

    // GET ?nome=xxx — certificado busca assinatura pelo nome do instrutor
    if (event.httpMethod === 'GET' && params.nome) {
      const [user] = await sql`
        SELECT assinatura FROM users WHERE name = ${params.nome} AND active = true LIMIT 1
      `
      return { statusCode: 200, headers, body: JSON.stringify({ assinatura: user?.assinatura ?? null }) }
    }

    // POST ?token=xxx — instrutor envia a assinatura desenhada
    if (event.httpMethod === 'POST' && params.token) {
      const body = JSON.parse(event.body || '{}')
      const assinatura = body.assinatura
      if (!assinatura || !assinatura.startsWith('data:image/')) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Assinatura inválida' }) }
      }
      if (assinatura.length > 700000) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Imagem muito grande' }) }
      }

      const [user] = await sql`
        SELECT id FROM users
        WHERE assinatura_token = ${params.token}
          AND assinatura_token_expires > NOW()
          AND active = true
      `
      if (!user) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Link inválido ou expirado' }) }

      await sql`
        UPDATE users
        SET assinatura = ${assinatura}, assinatura_token = NULL, assinatura_token_expires = NULL
        WHERE id = ${user.id}
      `
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Parâmetros inválidos' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
