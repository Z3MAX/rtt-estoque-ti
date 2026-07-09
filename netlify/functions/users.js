const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { hashPassword } = require('./_hash')
const { requireAuth, requireAdmin, isAdminRole, isMasterRole, makeHeaders, errorResponse } = require('./_auth')
const { sendInviteEmail } = require('./_email')
const { logAudit, computeDiff, getUserName } = require('./_audit')

const VALID_ROLES = ['Administrador de RH', 'Gestor', 'Administrador Master', 'Administrador de RH / Gestor', 'Beta Teste']

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

      // GET ?action=verificar_vinculos — diagnóstico de duplicatas e vínculos ativos
      if (event.queryStringParameters?.action === 'verificar_vinculos') {
        // Usuários com vínculo
        const vinculados = await sql`
          SELECT u.id AS user_id, u.name AS user_name, u.email, u.role,
                 u.colaborador_id, c.nome AS colab_nome, c.cargo, c.area
          FROM users u
          JOIN colaboradores c ON c.id = u.colaborador_id
          WHERE u.active = true AND u.colaborador_id IS NOT NULL
          ORDER BY u.name
        `
        // Colaboradores com nome duplicado (case-insensitive)
        const duplicatas = await sql`
          SELECT LOWER(TRIM(nome)) AS nome_norm, cargo, area, COUNT(*) AS qtd,
                 array_agg(id ORDER BY id) AS ids, array_agg(nome ORDER BY id) AS nomes
          FROM colaboradores
          WHERE ativo = true
          GROUP BY LOWER(TRIM(nome)), cargo, area
          HAVING COUNT(*) > 1
          ORDER BY nome_norm
        `
        return { statusCode: 200, headers, body: JSON.stringify({ vinculados, duplicatas }) }
      }

      // GET ?action=propor_vinculos — sugestões de user→colaborador por similaridade de nome
      if (event.queryStringParameters?.action === 'propor_vinculos') {
        const usuarios = await sql`
          SELECT id, name, email, role FROM users
          WHERE active = true AND (colaborador_id IS NULL)
          ORDER BY name
        `
        const colaboradores = await sql`
          SELECT id, nome, cargo, area FROM colaboradores
          WHERE ativo = true
          ORDER BY nome
        `

        // Normaliza nome para comparação: minúsculas, sem acentos, sem espaços duplos
        function norm(s) {
          return (s || '').toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/\s+/g, ' ').trim()
        }
        function tokens(s) { return norm(s).split(' ').filter(Boolean) }
        function score(a, b) {
          const ta = tokens(a), tb = tokens(b)
          if (norm(a) === norm(b)) return 1.0
          const matches = ta.filter(t => tb.includes(t)).length
          return matches / Math.max(ta.length, tb.length)
        }

        const propostas = []
        for (const u of usuarios) {
          let melhor = null, melhorScore = 0
          for (const c of colaboradores) {
            const s = score(u.name, c.nome)
            if (s > melhorScore) { melhorScore = s; melhor = c }
          }
          if (melhor && melhorScore >= 0.5) {
            propostas.push({
              user_id: u.id, user_name: u.name, user_email: u.email, user_role: u.role,
              colaborador_id: melhor.id, colaborador_nome: melhor.nome,
              colaborador_cargo: melhor.cargo, colaborador_area: melhor.area,
              score: Math.round(melhorScore * 100),
            })
          }
        }
        propostas.sort((a, b) => b.score - a.score)
        return { statusCode: 200, headers, body: JSON.stringify({ propostas }) }
      }

      if (id) {
        const rows = await sql`
          SELECT id, name, email, role, area, active, created_at, updated_at
          FROM users WHERE id = ${id}
        `
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }
      const rows = await sql`
        SELECT id, name, email, role, area, active, must_change_password, colaborador_id, created_at, updated_at
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
      if (role === 'Administrador Master' && !isMasterRole(adminPayload.role))
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Apenas um Administrador Master pode conceder este perfil' }) }

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

    // PUT ?action=limpar_duplicata — remove colaborador duplicado e migra inscrições para o ID correto
    if (event.httpMethod === 'PUT' && event.queryStringParameters?.action === 'limpar_duplicata') {
      requireAdmin(event)
      const { manter_id, remover_id } = JSON.parse(event.body || '{}')
      if (!manter_id || !remover_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'manter_id e remover_id são obrigatórios' }) }
      if (manter_id === remover_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'IDs devem ser diferentes' }) }

      // Migra inscrições de curso do duplicado para o original (ignorando conflitos)
      await sql`
        INSERT INTO curso_atribuicao (colaborador_id, curso_id, auto_inscrito)
        SELECT ${manter_id}, curso_id, auto_inscrito FROM curso_atribuicao WHERE colaborador_id = ${remover_id}
        ON CONFLICT (colaborador_id, curso_id) DO NOTHING
      `
      // Remove inscrições do duplicado
      await sql`DELETE FROM curso_atribuicao WHERE colaborador_id = ${remover_id}`
      // Desativa o colaborador duplicado (soft-delete)
      await sql`UPDATE colaboradores SET ativo = false WHERE id = ${remover_id}`

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, migrado: remover_id, mantido: manter_id }) }
    }

    // PUT — somente administrador
    if (event.httpMethod === 'PUT' && id) {
      const adminPayload = requireAdmin(event)

      try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS colaborador_id INTEGER`
      } catch (e) { /* coluna já existe */ }

      const { name, email, password, role, area, active, colaborador_id } = JSON.parse(event.body || '{}')

      if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail inválido' }) }
      if (role !== undefined && !VALID_ROLES.includes(role))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Papel inválido' }) }
      if (role === 'Administrador Master' && !isMasterRole(adminPayload.role))
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Apenas um Administrador Master pode conceder este perfil' }) }
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
      if (name !== undefined)            updates.name = name.trim()
      if (email !== undefined)           updates.email = email.toLowerCase()
      if (role !== undefined)            updates.role = role
      if (area !== undefined)            updates.area = area || null
      if (active !== undefined)          updates.active = active
      if (password)                      updates.password_hash = await hashPassword(password)
      if (colaborador_id !== undefined)  updates.colaborador_id = colaborador_id || null

      const rows = await sql`
        UPDATE users SET
          name            = COALESCE(${updates.name ?? null}, name),
          email           = COALESCE(${updates.email ?? null}, email),
          role            = COALESCE(${updates.role ?? null}, role),
          area            = CASE WHEN ${area !== undefined} THEN ${updates.area ?? null} ELSE area END,
          active          = COALESCE(${updates.active ?? null}, active),
          password_hash   = COALESCE(${updates.password_hash ?? null}, password_hash),
          colaborador_id  = CASE WHEN ${colaborador_id !== undefined} THEN ${updates.colaborador_id ?? null} ELSE colaborador_id END,
          updated_at      = NOW()
        WHERE id = ${id}
        RETURNING id, name, email, role, area, active, colaborador_id, created_at, updated_at
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
