const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { hashPassword } = require('./_hash')
const { requireAuth, requireAdmin, isAdminRole, isMasterRole, makeHeaders, errorResponse } = require('./_auth')
const { sendInviteEmail } = require('./_email')
const { logAudit, computeDiff, getUserName } = require('./_audit')

const VALID_ROLES = ['Administrador de RH', 'Gestor', 'Administrador Master', 'Administrador de RH / Gestor']

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)
  const id = event.queryStringParameters?.id

  try {
    // GET — somente administrador pode listar usuários
    if (event.httpMethod === 'GET') {
      requireAdmin(event)
      if (id) {
        const rows = await sql`
          SELECT id, name, email, role, area, active, created_at, updated_at
          FROM users WHERE id = ${id}
        `
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }
      const rows = await sql`
        SELECT id, name, email, role, area, active, must_change_password, created_at, updated_at
        FROM users ORDER BY name ASC
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    // POST — somente administrador
    if (event.httpMethod === 'POST') {
      const adminPayload = requireAdmin(event)
      const { name, email, role, area } = JSON.parse(event.body || '{}')

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
      if (role === 'Administrador Master' && !isMasterRole(adminPayload.role)) {
        const existingMasters = await sql`SELECT id FROM users WHERE role = 'Administrador Master' LIMIT 1`
        if (existingMasters.length > 0)
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Apenas um Administrador Master pode conceder este perfil' }) }
      }

      const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
      if (existing.length > 0)
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'E-mail já cadastrado' }) }

      // Senha temporária aleatória — usuário nunca verá, receberá link de convite
      const passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'))

      const rows = await sql`
        INSERT INTO users (name, email, password_hash, role, area, must_change_password)
        VALUES (${name.trim()}, ${email.toLowerCase()}, ${passwordHash}, ${role || 'Gestor'}, ${area || null}, true)
        RETURNING id, name, email, role, area, active, must_change_password, created_at, updated_at
      `

      // Envia link de convite por e-mail (sem senha em texto)
      let emailSent = false
      let emailError = null

      try {
        const siteUrl = process.env.SITE_URL || process.env.URL
        if (!siteUrl) {
          emailError = 'URL do site não configurada (SITE_URL)'
          console.warn('[users] convite não enviado: SITE_URL/URL ausente')
        } else if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
          emailError = 'Credenciais de e-mail não configuradas (SMTP_USER / SMTP_PASS)'
          console.warn('[users] convite não enviado: credenciais de e-mail ausentes')
        } else {
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
          const inviteTokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex')
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          await sql`INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (${rows[0].id}, ${inviteTokenHash}, ${expiresAt.toISOString()})`

          const result = await sendInviteEmail({
            name: rows[0].name,
            email: rows[0].email,
            inviteUrl: `${siteUrl}/reset-password?token=${inviteToken}`,
            role: rows[0].role,
          })
          emailSent = !result.skipped && !result.error
          if (!emailSent) emailError = result.error || 'Falha desconhecida ao enviar'
        }
      } catch (emailErr) {
        emailError = emailErr.message
        console.error('[users] erro ao enviar convite:', emailErr.message)
      }

      const auditUser = await getUserName(sql, adminPayload.userId)
      await logAudit(sql, { entityType: 'user', entityId: rows[0].id, entityName: rows[0].name, action: 'created', changes: null, userId: adminPayload.userId, userName: auditUser })

      return { statusCode: 201, headers, body: JSON.stringify({ ...rows[0], emailSent, emailError }) }
    }

    // PUT — somente administrador
    if (event.httpMethod === 'PUT' && id) {
      const adminPayload = requireAdmin(event)
      const { name, email, password, role, area, active } = JSON.parse(event.body || '{}')

      if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail inválido' }) }
      if (role !== undefined && !VALID_ROLES.includes(role))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Papel inválido' }) }
      if (role === 'Administrador Master' && !isMasterRole(adminPayload.role)) {
        const existingMasters = await sql`SELECT id FROM users WHERE role = 'Administrador Master' LIMIT 1`
        if (existingMasters.length > 0)
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Apenas um Administrador Master pode conceder este perfil' }) }
      }
      if (password && password.length < 8)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'A senha deve ter no mínimo 8 caracteres' }) }

      if (email !== undefined) {
        const dup = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} AND id != ${id}`
        if (dup.length > 0)
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'E-mail já utilizado por outro usuário' }) }
      }

      const existingBefore = await sql`SELECT id, name, email, role, active FROM users WHERE id = ${id}`
      if (existingBefore.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }

      const updates = {}
      if (name !== undefined)   updates.name = name.trim()
      if (email !== undefined)  updates.email = email.toLowerCase()
      if (role !== undefined)   updates.role = role
      if (area !== undefined)   updates.area = area || null
      if (active !== undefined) updates.active = active
      if (password)             updates.password_hash = await hashPassword(password)

      const rows = await sql`
        UPDATE users SET
          name          = COALESCE(${updates.name ?? null}, name),
          email         = COALESCE(${updates.email ?? null}, email),
          role          = COALESCE(${updates.role ?? null}, role),
          area          = CASE WHEN ${area !== undefined} THEN ${updates.area ?? null} ELSE area END,
          active        = COALESCE(${updates.active ?? null}, active),
          password_hash = COALESCE(${updates.password_hash ?? null}, password_hash),
          updated_at    = NOW()
        WHERE id = ${id}
        RETURNING id, name, email, role, area, active, created_at, updated_at
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }

      const changes = computeDiff(existingBefore[0], rows[0], ['name', 'email', 'role', 'active'])
      if (changes.length > 0) {
        const auditUser = await getUserName(sql, adminPayload.userId)
        await logAudit(sql, { entityType: 'user', entityId: Number(id), entityName: rows[0].name, action: 'updated', changes, userId: adminPayload.userId, userName: auditUser })
      }

      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    // DELETE — somente administrador
    if (event.httpMethod === 'DELETE' && id) {
      const adminPayload = requireAdmin(event)

      const permanent = event.queryStringParameters?.permanent === 'true'

      if (permanent) {
        // Impede que o próprio administrador se exclua permanentemente
        if (String(adminPayload.userId) === String(id)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Você não pode excluir sua própria conta' }) }
        }

        const targetUser = await sql`SELECT name FROM users WHERE id = ${id}`
        if (targetUser.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }
        const targetName = targetUser[0].name

        const rows = await sql`DELETE FROM users WHERE id = ${id} RETURNING id`
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }

        const auditUser = await getUserName(sql, adminPayload.userId)
        await logAudit(sql, { entityType: 'user', entityId: Number(id), entityName: targetName, action: 'deleted', changes: null, userId: adminPayload.userId, userName: auditUser })

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
      }

      // Soft-delete (desativar) — impede auto-desativação
      if (String(adminPayload.userId) === String(id)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Você não pode desativar sua própria conta' }) }
      }
      const rows = await sql`UPDATE users SET active = false, updated_at = NOW() WHERE id = ${id} RETURNING id`
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }

      const auditUser = await getUserName(sql, adminPayload.userId)
      const targetUser = await sql`SELECT name FROM users WHERE id = ${id}`
      await logAudit(sql, { entityType: 'user', entityId: Number(id), entityName: targetUser[0]?.name, action: 'deactivated', changes: null, userId: adminPayload.userId, userName: auditUser })

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Rota não encontrada' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
