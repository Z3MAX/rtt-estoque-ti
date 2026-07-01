const MAX_PER_EMAIL = 10   // tentativas por email em 15 min
const MAX_PER_IP    = 30   // tentativas por IP em 15 min
const WINDOW_MS     = 15 * 60 * 1000

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id         SERIAL PRIMARY KEY,
      identifier VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts (identifier, created_at)`
}

function getWindowStart() {
  return new Date(Date.now() - WINDOW_MS).toISOString()
}

function getClientIp(event) {
  const headers = event.headers || {}
  return (
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['client-ip'] ||
    'unknown'
  )
}

async function checkRateLimit(sql, event, email) {
  const ip = getClientIp(event)
  const windowStart = getWindowStart()
  const emailKey = `email:${email.toLowerCase()}`
  const ipKey    = `ip:${ip}`

  const doCheck = async () => {
    const [emailRows, ipRows] = await Promise.all([
      sql`SELECT COUNT(*)::int AS cnt FROM login_attempts WHERE identifier = ${emailKey}   AND created_at > ${windowStart}`,
      sql`SELECT COUNT(*)::int AS cnt FROM login_attempts WHERE identifier = ${ipKey} AND created_at > ${windowStart}`,
    ])
    return {
      emailCount: emailRows[0]?.cnt ?? 0,
      ipCount:    ipRows[0]?.cnt ?? 0,
      emailKey,
      ipKey,
    }
  }

  try {
    const result = await doCheck()
    return result
  } catch (err) {
    if (err.message?.includes('login_attempts') || err.code === '42P01') {
      await ensureTable(sql)
      return await doCheck()
    }
    throw err
  }
}

async function recordAttempt(sql, event, email) {
  const ip = getClientIp(event)
  const emailKey = `email:${email.toLowerCase()}`
  const ipKey    = `ip:${ip}`
  const windowStart = getWindowStart()

  const doInsert = async () => {
    await Promise.all([
      sql`INSERT INTO login_attempts (identifier) VALUES (${emailKey})`,
      sql`INSERT INTO login_attempts (identifier) VALUES (${ipKey})`,
    ])
    // limpa registros expirados (probabilistic cleanup ~10% das vezes)
    if (Math.random() < 0.1) {
      sql`DELETE FROM login_attempts WHERE created_at < ${windowStart}`.catch(() => {})
    }
  }

  try {
    await doInsert()
  } catch (err) {
    if (err.message?.includes('login_attempts') || err.code === '42P01') {
      await ensureTable(sql)
      await doInsert()
    }
  }
}

async function clearAttempts(sql, email) {
  const emailKey = `email:${email.toLowerCase()}`
  try {
    await sql`DELETE FROM login_attempts WHERE identifier = ${emailKey}`
  } catch (_) {}
}

module.exports = { checkRateLimit, recordAttempt, clearAttempts, MAX_PER_EMAIL, MAX_PER_IP }
