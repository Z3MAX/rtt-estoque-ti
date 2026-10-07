const { neon } = require('@neondatabase/serverless')
const { requireAuth, signToken, makeHeaders, errorResponse, makeSessionCookie } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'GET, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  try {
    const payload = requireAuth(event)
    const sql = neon(process.env.DATABASE_URL)

    // Busca dados frescos do usuário (photo_url não fica no JWT por ser potencialmente grande)
    const rows = await sql`
      SELECT id, name, email, role, roles, area, active, must_change_password, photo_url, token_version
      FROM users WHERE id = ${payload.userId} AND active = true
    `

    if (rows.length === 0) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Usuário não encontrado ou desativado' }) }
    }

    const user = rows[0]

    // Valida token_version se presente no payload (R-010)
    if (typeof payload.tokenVersion === 'number' && user.token_version !== payload.tokenVersion) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Sessão inválida. Faça login novamente.' }) }
    }

    const freshToken = signToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roles: user.roles || [user.role],
      area: user.area ?? null,
      mustChangePassword: user.must_change_password ?? false,
      tokenVersion: user.token_version ?? 0,
    })

    return {
      statusCode: 200,
      headers: { ...headers, 'Set-Cookie': makeSessionCookie(freshToken) },
      body: JSON.stringify({
        token: freshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          roles: user.roles || [user.role],
          area: user.area ?? null,
          mustChangePassword: user.must_change_password ?? false,
          photo_url: user.photo_url || null,
        },
      }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
