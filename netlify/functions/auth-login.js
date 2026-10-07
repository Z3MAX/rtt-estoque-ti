const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { hashPassword, comparePassword } = require('./_hash')
const { signToken, signMfaPendingToken, makeHeaders, errorResponse, makeSessionCookie } = require('./_auth')
const { checkRateLimit, recordAttempt, clearAttempts, MAX_PER_EMAIL, MAX_PER_IP } = require('./_rate_limit')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  let email, password, deviceToken
  try {
    const body = JSON.parse(event.body || '{}')
    email = body.email
    password = body.password
    deviceToken = body.deviceToken || null
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  if (!email || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail e senha obrigatórios' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    // Rate limiting: bloqueia após muitas tentativas
    const rl = await checkRateLimit(sql, event, email)
    if (rl.emailCount >= MAX_PER_EMAIL || rl.ipCount >= MAX_PER_IP) {
      await new Promise(r => setTimeout(r, 400))
      return { statusCode: 429, headers, body: JSON.stringify({ error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }) }
    }

    // Busca por e-mail (sem conferir senha no SQL para evitar timing attacks)
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0`

    const rows = await sql`
      SELECT id, name, email, role, roles, area, active, must_change_password, password_hash, photo_url, token_version
      FROM users
      WHERE email = ${email.toLowerCase()}
    `

    // Delay fixo para prevenir enumeração de usuários via timing
    await new Promise((r) => setTimeout(r, 400))

    if (rows.length === 0) {
      await recordAttempt(sql, event, email)
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
      await recordAttempt(sql, event, email)
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
      roles: user.roles || [user.role],
      area: user.area || null,
      mustChangePassword: user.must_change_password ?? false,
      tokenVersion: user.token_version ?? 0,
    }

    await clearAttempts(sql, email)

    // Check if device is already trusted (skip MFA)
    if (deviceToken) {
      await sql`
        CREATE TABLE IF NOT EXISTS trusted_devices (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          device_token VARCHAR(64) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          user_agent VARCHAR(512),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
      const trusted = await sql`
        SELECT id FROM trusted_devices
        WHERE user_id = ${user.id} AND device_token = ${deviceToken} AND expires_at > NOW()
      `
      if (trusted.length > 0) {
        const token = signToken(tokenPayload)
        return {
          statusCode: 200,
          headers: { ...headers, 'Set-Cookie': makeSessionCookie(token) },
          body: JSON.stringify({
            token,
            user: {
              id: user.id, name: user.name, email: user.email, role: user.role,
              roles: user.roles || [user.role], area: user.area || null,
              mustChangePassword: user.must_change_password ?? false, photo_url: user.photo_url || null,
            },
          }),
        }
      }
    }

    // MFA required — issue short-lived pending token
    const mfaToken = signMfaPendingToken(tokenPayload)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'mfa_required', mfaToken }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
