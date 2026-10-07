const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { verifyMfaPendingToken, makeHeaders, errorResponse } = require('./_auth')
const { sendMfaCodeEmail } = require('./_email')
const { checkRateLimit, recordAttempt } = require('./_rate_limit')

const MFA_SEND_MAX = 3

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  let mfaToken
  try {
    const body = JSON.parse(event.body || '{}')
    mfaToken = body.mfaToken
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  if (!mfaToken) return { statusCode: 400, headers, body: JSON.stringify({ error: 'mfaToken obrigatório' }) }

  try {
    const payload = verifyMfaPendingToken(mfaToken)
    const sql = neon(process.env.DATABASE_URL)

    // Rate limiting: máx 3 reenvios por email em 15 min (previne assédio por e-mail e esgotamento de cota SMTP)
    const mfaKey = `mfa_send:${payload.email}`
    const rl = await checkRateLimit(sql, event, mfaKey)
    if (rl.emailCount >= MFA_SEND_MAX) {
      return { statusCode: 429, headers, body: JSON.stringify({ error: 'Muitas solicitações de código. Aguarde alguns minutos antes de solicitar novamente.' }) }
    }
    await recordAttempt(sql, event, mfaKey)

    await sql`
      CREATE TABLE IF NOT EXISTS mfa_codes (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    // Remove códigos anteriores deste usuário
    await sql`DELETE FROM mfa_codes WHERE user_id = ${payload.userId}`

    // Gera código de 6 dígitos
    const code = String(crypto.randomInt(100000, 999999))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await sql`
      INSERT INTO mfa_codes (user_id, code, expires_at)
      VALUES (${payload.userId}, ${code}, ${expiresAt})
    `

    await sendMfaCodeEmail({ name: payload.name, email: payload.email, code })

    return { statusCode: 200, headers, body: JSON.stringify({ sent: true }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
