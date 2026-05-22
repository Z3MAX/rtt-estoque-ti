const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { hashPassword } = require('./_hash')
const { requireAuth, requireAdmin, makeHeaders, errorResponse } = require('./_auth')
const { sendInviteEmail } = require('./_email')

const VALID_ROLES = ['Administrador de TI', 'Técnico de TI']

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)
  const id = event.queryStringParameters?.id

  try {
    // GET — qualquer usuário autenticado pode listar
    if (event.httpMethod === 'GET') {
      requireAuth(event)
      if (id) {
        const rows = await sql`
          SELECT id, name, email, role, active, created_at, updated_at
          FROM users WHERE id = ${id}
        `
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }
      const rows = await sql`
        SELECT id, name, email, role, active, created_at, updated_at
        FROM users ORDER BY name ASC
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    // POST — somente administrador
    if (event.httpMethod === 'POST') {
      requireAdmin(event)
      const { name, email, role } = JSON.parse(event.body || '{}')

      if (!name || !name.trim())
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome é obrigatório' }) }
      if (!email || !email.trim())
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail é obrigatório' }) }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail inválido' }) }
      if (name.length > 200)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome muito longo (máx 200 caracteres)' }) }
      if (role && !VALID_ROLES.includes(role))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Papel inválido' }) }

      const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
      if (existing.length > 0)
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'E-mail já cadastrado' }) }

      // Senha temporária aleatória — usuário nunca verá, receberá link de convite
      const passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'))

      const rows = await sql`
        INSERT INTO users (name, email, password_hash, role, must_change_password)
        VALUES (${name.trim()}, ${email.toLowerCase()}, ${passwordHash}, ${role || 'Técnico de TI'}, true)
        RETURNING id, name, email, role, active, must_change_password, created_at, updated_at
      `

      // Envia link de convite por e-mail (sem senha em texto)
      let emailSent = false
      try {
        const siteUrl = process.env.SITE_URL
        if (siteUrl) {
          await sql`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
              id SERIAL PRIMARY KEY,
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              token VARCHAR(128) UNIQUE NOT NULL,
              expires_at TIMESTAMP NOT NULL,
              used BOOLEAN DEFAULT false,
              created_at TIMESTAMP DEFAULT NOW()
            )
          `
          await sql`UPDATE password_reset_tokens SET used = true WHERE user_id = ${rows[0].id} AND used = false`

          const inviteToken = crypto.randomBytes(40).toString('hex')
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          await sql`INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (${rows[0].id}, ${inviteToken}, ${expiresAt.toISOString()})`

          const result = await sendInviteEmail({
            name: rows[0].name,
            email: rows[0].email,
            inviteUrl: `${siteUrl}/reset-password?token=${inviteToken}`,
            role: rows[0].role,
          })
          emailSent = !result.skipped && !result.error
        }
      } catch (emailErr) {
        console.error('[users] erro ao enviar convite:', emailErr.message)
      }

      return { statusCode: 201, headers, body: JSON.stringify({ ...rows[0], emailSent }) }
    }

    // PUT — somente administrador
    if (event.httpMethod === 'PUT' && id) {
      requireAdmin(event)
      const { name, email, password, role, active } = JSON.parse(event.body || '{}')

      if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail inválido' }) }
      if (role !== undefined && !VALID_ROLES.includes(role))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Papel inválido' }) }
      if (password && password.length < 8)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'A senha deve ter no mínimo 8 caracteres' }) }

      if (email !== undefined) {
        const dup = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} AND id != ${id}`
        if (dup.length > 0)
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'E-mail já utilizado por outro usuário' }) }
      }

      const updates = {}
      if (name !== undefined)   updates.name = name.trim()
      if (email !== undefined)  updates.email = email.toLowerCase()
      if (role !== undefined)   updates.role = role
      if (active !== undefined) updates.active = active
      if (password)             updates.password_hash = await hashPassword(password)

      const rows = await sql`
        UPDATE users SET
          name          = COALESCE(${updates.name ?? null}, name),
          email         = COALESCE(${updates.email ?? null}, email),
          role          = COALESCE(${updates.role ?? null}, role),
          active        = COALESCE(${updates.active ?? null}, active),
          password_hash = COALESCE(${updates.password_hash ?? null}, password_hash),
          updated_at    = NOW()
        WHERE id = ${id}
        RETURNING id, name, email, role, active, created_at, updated_at
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    // DELETE — somente administrador
    if (event.httpMethod === 'DELETE' && id) {
      requireAdmin(event)
      const rows = await sql`UPDATE users SET active = false, updated_at = NOW() WHERE id = ${id} RETURNING id`
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Rota não encontrada' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
