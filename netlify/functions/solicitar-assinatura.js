const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { requireAuth, isAdminRole, makeHeaders, errorResponse } = require('./_auth')
const { sendSignatureRequestEmail } = require('./_email')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS assinatura TEXT`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS assinatura_token TEXT`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS assinatura_token_expires TIMESTAMP`

    const auth = requireAuth(event)
    if (!isAdminRole(auth.role)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
    }

    const userId = event.queryStringParameters?.id
    if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }

    const [user] = await sql`
      SELECT id, name, email, roles FROM users WHERE id = ${userId} AND active = true
    `
    if (!user) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }

    if (!(user.roles ?? []).includes('Instrutor')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Usuário não é instrutor' }) }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    await sql`
      UPDATE users
      SET assinatura_token = ${token}, assinatura_token_expires = ${expires}
      WHERE id = ${userId}
    `

    const siteUrl = process.env.SITE_URL || process.env.URL || ''
    const signUrl = `${siteUrl}/assinar/${token}`

    const result = await sendSignatureRequestEmail({ name: user.name, email: user.email, signUrl })

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, emailResult: result }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
