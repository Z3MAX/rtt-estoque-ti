const { neon } = require('@neondatabase/serverless')
const { hashPassword } = require('./_hash')
const { requireAuth, signToken, makeHeaders, errorResponse, makeSessionCookie } = require('./_auth')

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
    // Requer JWT válido — userId vem do token, não do body (CRIT-6)
    const payload = requireAuth(event)

    let newPassword
    try {
      newPassword = JSON.parse(event.body || '{}').newPassword
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
    }

    if (!newPassword) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nova senha é obrigatória' }) }
    }
    if (newPassword.length < 8) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'A senha deve ter no mínimo 8 caracteres' }) }
    }
    if (newPassword.length > 200) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Senha muito longa' }) }
    }

    const sql = neon(process.env.DATABASE_URL)
    const hash = await hashPassword(newPassword)

    // token_version + 1: encerra qualquer outra sessão aberta com a senha antiga/temporária
    const rows = await sql`
      UPDATE users
      SET password_hash        = ${hash},
          must_change_password = false,
          token_version        = token_version + 1,
          updated_at           = NOW()
      WHERE id = ${payload.userId} AND must_change_password = true AND active = true
      RETURNING id, name, email, role, roles, area, active, photo_url, token_version
    `

    if (rows.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Usuário não encontrado ou senha já definida.' }) }
    }

    // Sessão nova, já sem a marca de senha temporária (o token antigo ainda a carregaria
    // e seria barrado pela API)
    const u = rows[0]
    const token = signToken({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      roles: u.roles || [u.role],
      area: u.area || null,
      mustChangePassword: false,
      tokenVersion: u.token_version ?? 0,
    })

    return {
      statusCode: 200,
      headers: { ...headers, 'Set-Cookie': makeSessionCookie(token) },
      body: JSON.stringify({
        success: true,
        token,
        user: {
          id: u.id, name: u.name, email: u.email, role: u.role,
          roles: u.roles || [u.role], area: u.area || null,
          mustChangePassword: false, photo_url: u.photo_url || null,
        },
      }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
