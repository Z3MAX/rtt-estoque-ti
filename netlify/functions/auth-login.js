const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { hashPassword, comparePassword } = require('./_hash')
const { signToken, makeHeaders, errorResponse } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  let email, password
  try {
    const body = JSON.parse(event.body || '{}')
    email = body.email
    password = body.password
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  if (!email || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail e senha obrigatórios' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    // Busca por e-mail (sem conferir senha no SQL para evitar timing attacks)
    const rows = await sql`
      SELECT id, name, email, role, area, active, must_change_password, password_hash
      FROM users
      WHERE email = ${email.toLowerCase()}
    `

    // Delay fixo para prevenir enumeração de usuários via timing
    await new Promise((r) => setTimeout(r, 400))

    if (rows.length === 0) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'E-mail ou senha incorretos' }) }
    }

    const user = rows[0]

    // Verifica se a conta ainda tem hash legado SHA-256 (sem salt) — invalidada por segurança
    const isBcrypt = user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2a$')
    const isInvalidated = user.password_hash === 'INVALIDATED'
    let valid = false

    if (isInvalidated) {
      // Hash legado foi invalidado — força redefinição de senha
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Sua senha expirou. Use "Esqueci minha senha" para criar uma nova.' }) }
    } else if (isBcrypt) {
      valid = await comparePassword(password, user.password_hash)
    } else {
      // Hash SHA-256 legado ainda presente — invalida imediatamente e rejeita o login
      await sql`UPDATE users SET password_hash = 'INVALIDATED', must_change_password = true, updated_at = NOW() WHERE id = ${user.id}`
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Sua senha expirou por motivo de segurança. Use "Esqueci minha senha" para criar uma nova.' }) }
    }

    if (!valid) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'E-mail ou senha incorretos' }) }
    }

    if (!user.active) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Usuário desativado. Contate o administrador.' }) }
    }

    const tokenPayload = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      area: user.area || null,
      mustChangePassword: user.must_change_password ?? false,
    }

    const token = signToken(tokenPayload)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          area: user.area || null,
          mustChangePassword: user.must_change_password ?? false,
        },
      }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
