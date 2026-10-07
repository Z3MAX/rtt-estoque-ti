const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { verifyMfaPendingToken, signToken, makeHeaders, errorResponse, makeSessionCookie } = require('./_auth')
const { checkRateLimit, recordAttempt, clearAttempts } = require('./_rate_limit')

const MFA_MAX_ATTEMPTS = 5

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  let mfaToken, code, rememberDevice
  try {
    const body = JSON.parse(event.body || '{}')
    mfaToken = body.mfaToken
    code = body.code
    rememberDevice = Boolean(body.rememberDevice)
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  if (!mfaToken || !code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'mfaToken e code obrigatórios' }) }

  try {
    const payload = verifyMfaPendingToken(mfaToken)
    const sql = neon(process.env.DATABASE_URL)

    // Rate limiting: máx 5 tentativas erradas por email em 15 min (previne força bruta do OTP)
    const mfaKey = `mfa_verify:${payload.email}`
    const rl = await checkRateLimit(sql, event, mfaKey)
    if (rl.emailCount >= MFA_MAX_ATTEMPTS) {
      return { statusCode: 429, headers, body: JSON.stringify({ error: 'Muitas tentativas incorretas. Aguarde alguns minutos e solicite um novo código.' }) }
    }

    // Verifica código válido, não usado e não expirado
    const codeRows = await sql`
      SELECT id FROM mfa_codes
      WHERE user_id = ${payload.userId}
        AND code = ${String(code).trim()}
        AND expires_at > NOW()
        AND used = FALSE
    `

    if (codeRows.length === 0) {
      await recordAttempt(sql, event, mfaKey)
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Código inválido ou expirado' }) }
    }

    // Código correto — limpa contador de tentativas MFA
    await clearAttempts(sql, mfaKey)

    // Marca como usado (one-time use)
    await sql`UPDATE mfa_codes SET used = TRUE WHERE id = ${codeRows[0].id}`

    // Busca dados atualizados do usuário
    const users = await sql`
      SELECT id, name, email, role, roles, area, active, must_change_password, photo_url, token_version
      FROM users WHERE id = ${payload.userId}
    `

    if (users.length === 0 || !users[0].active) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Usuário não encontrado ou desativado' }) }
    }

    const user = users[0]

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

    const token = signToken(tokenPayload)

    let deviceToken = null
    if (rememberDevice) {
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
      deviceToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const ua = (event.headers['user-agent'] || '').slice(0, 512)
      await sql`
        INSERT INTO trusted_devices (user_id, device_token, expires_at, user_agent)
        VALUES (${user.id}, ${deviceToken}, ${expiresAt}, ${ua})
      `
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Set-Cookie': makeSessionCookie(token) },
      body: JSON.stringify({
        token,
        deviceToken,
        user: {
          id: user.id, name: user.name, email: user.email, role: user.role,
          roles: user.roles || [user.role], area: user.area || null,
          mustChangePassword: user.must_change_password ?? false, photo_url: user.photo_url || null,
        },
      }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
