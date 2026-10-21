const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { hashPassword } = require('./_hash')
const { requireAuth, requireAdmin, isAdminRole, isMasterRole, makeHeaders, errorResponse } = require('./_auth')
const { sendInviteEmail } = require('./_email')
const { logAudit, computeDiff, getUserName } = require('./_audit')
const { normalizeCpf, isValidCpf } = require('./_cpf')
const { normalizePhone } = require('./_phone')

const VALID_ROLES = ['Administrador de RH', 'Administrador de TI', 'Gestor', 'Administrador Master', 'Administrador de RH / Gestor', 'Beta Teste', 'Instrutor', 'Colaborador']

/** Garante colunas/índices usados pelo login por CPF (idempotente). */
async function ensureUserColumns(sql) {
  await sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf VARCHAR(11)`
  // Telefone (E.164) para o MFA por SMS/WhatsApp de quem entra só com CPF — envio ainda não habilitado
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS colaborador_id INTEGER`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_cpf_key ON users (cpf) WHERE cpf IS NOT NULL`
}

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

      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[]`
      await ensureUserColumns(sql)

      if (id) {
        const rows = await sql`
          SELECT id, name, email, role, roles, area, active, created_at, updated_at
          FROM users WHERE id = ${id}
        `
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avaliacoes_confidenciais BOOLEAN DEFAULT false`
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ver_confidencial BOOLEAN DEFAULT false`
      const rows = await sql`
        SELECT id, name, email, cpf, phone, role, roles, area, active, must_change_password, colaborador_id,
               avaliacoes_confidenciais, ver_confidencial, created_at, updated_at,
               (assinatura IS NOT NULL) AS has_assinatura
        FROM users ORDER BY name ASC
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    // POST — somente administrador
    if (event.httpMethod === 'POST') {
      const adminPayload = requireAdmin(event)
      const { name, email: rawEmail, cpf: rawCpf, phone: rawPhone, password, role, roles, area, colaborador_id } = JSON.parse(event.body || '{}')
      const email = rawEmail && String(rawEmail).trim() ? String(rawEmail).trim() : null
      const cpf = rawCpf && normalizeCpf(rawCpf) ? normalizeCpf(rawCpf) : null
      const phoneInformado = !!(rawPhone && String(rawPhone).trim())
      const phone = phoneInformado ? normalizePhone(rawPhone) : null

      if (!name || !name.trim())
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome é obrigatório' }) }
      if (!email && !cpf)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Informe o e-mail ou o CPF do usuário' }) }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail inválido' }) }
      if (cpf && !isValidCpf(cpf))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'CPF inválido' }) }
      if (phoneInformado && !phone)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Telefone inválido. Informe DDD + número (ex.: (11) 91234-5678)' }) }
      // Quem entra só com CPF não tem e-mail para o MFA: o telefone é obrigatório (MFA por SMS/WhatsApp)
      if (!email && !phone)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Informe o telefone do usuário (necessário para quem entra só com CPF)' }) }
      // Sem e-mail não há convite: o RH define a senha temporária (troca obrigatória no 1º acesso)
      if (!email) {
        if (!password || password.length < 8)
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Defina uma senha temporária de no mínimo 8 caracteres' }) }
        if (password.length > 200)
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Senha muito longa' }) }
      }
      if (name.length > 200)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome muito longo (máx 200 caracteres)' }) }
      if (role && !VALID_ROLES.includes(role))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Papel inválido' }) }
      if (roles !== undefined && (!Array.isArray(roles) || roles.some(r => !VALID_ROLES.includes(r))))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Um ou mais perfis inválidos' }) }
      if ((role === 'Administrador Master' || (roles && roles.includes('Administrador Master'))) && !isMasterRole(adminPayload.role))
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Apenas um Administrador Master pode conceder este perfil' }) }

      await ensureUserColumns(sql)

      if (email) {
        const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
        if (existing.length > 0)
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'E-mail já cadastrado' }) }
      }
      if (cpf) {
        const existingCpf = await sql`SELECT id FROM users WHERE cpf = ${cpf}`
        if (existingCpf.length > 0)
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'CPF já cadastrado' }) }
      }

      // Com e-mail: senha aleatória que ninguém vê — o usuário define a própria pelo link de convite.
      // Só com CPF: senha temporária informada pelo RH.
      const passwordHash = await hashPassword(email ? crypto.randomBytes(32).toString('hex') : password)

      const rolesArr = roles || [role || 'Gestor']
      const rows = await sql`
        INSERT INTO users (name, email, cpf, phone, password_hash, role, roles, area, colaborador_id, must_change_password)
        VALUES (${name.trim()}, ${email ? email.toLowerCase() : null}, ${cpf}, ${phone}, ${passwordHash}, ${role || 'Gestor'}, ${rolesArr}, ${area || null}, ${colaborador_id || null}, true)
        RETURNING id, name, email, cpf, phone, role, roles, area, active, must_change_password, colaborador_id, created_at, updated_at
      `

      // Envia link de convite por e-mail (sem senha em texto). Usuário só com CPF não recebe convite.
      let emailSent = false
      let emailError = null

      try {
        const siteUrl = process.env.SITE_URL || process.env.URL
        if (!email) {
          emailSent = true // nada a enviar: login por CPF + senha temporária
        } else if (!siteUrl) {
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
    // PUT — somente administrador
    if (event.httpMethod === 'PUT' && id) {
      const adminPayload = requireAdmin(event)

      await ensureUserColumns(sql)

      const { name, email: rawEmail, cpf: rawCpf, phone: rawPhone, password, role, roles, area, active, colaborador_id, avaliacoes_confidenciais, ver_confidencial } = JSON.parse(event.body || '{}')
      // E-mail/CPF vazios = "sem alteração" (não é possível limpar o identificador por aqui)
      const email = rawEmail && String(rawEmail).trim() ? String(rawEmail).trim() : undefined
      const cpf = rawCpf && normalizeCpf(rawCpf) ? normalizeCpf(rawCpf) : undefined
      const phoneInformado = !!(rawPhone && String(rawPhone).trim())
      const phone = phoneInformado ? normalizePhone(rawPhone) : undefined

      if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail inválido' }) }
      if (cpf !== undefined && !isValidCpf(cpf))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'CPF inválido' }) }
      if (phoneInformado && !phone)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Telefone inválido. Informe DDD + número (ex.: (11) 91234-5678)' }) }
      if (role !== undefined && !VALID_ROLES.includes(role))
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Papel inválido' }) }
      if (roles !== undefined) {
        if (!Array.isArray(roles) || roles.some(r => !VALID_ROLES.includes(r)))
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Um ou mais perfis inválidos' }) }
      }
      if ((role === 'Administrador Master' || (roles && roles.includes('Administrador Master'))) && !isMasterRole(adminPayload.role))
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Apenas um Administrador Master pode conceder este perfil' }) }
      if (password && password.length < 8)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'A senha deve ter no mínimo 8 caracteres' }) }

      if (email !== undefined) {
        const dup = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} AND id != ${id}`
        if (dup.length > 0)
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'E-mail já utilizado por outro usuário' }) }
      }

      if (cpf !== undefined) {
        const dupCpf = await sql`SELECT id FROM users WHERE cpf = ${cpf} AND id != ${id}`
        if (dupCpf.length > 0)
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'CPF já utilizado por outro usuário' }) }
      }

      const existingBefore = await sql`SELECT id, name, email, role, active FROM users WHERE id = ${id}`
      if (existingBefore.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) }

      // Usuário sem e-mail (login só por CPF): senha redefinida pelo RH é temporária e deve ser trocada no próximo acesso
      const forceChange = !!password && !existingBefore[0].email && email === undefined

      const updates = {}
      if (name !== undefined)            updates.name = name.trim()
      if (email !== undefined)           updates.email = email.toLowerCase()
      if (cpf !== undefined)             updates.cpf = cpf
      if (phone !== undefined)           updates.phone = phone
      if (role !== undefined)            updates.role = role
      if (roles !== undefined)           updates.roles = roles
      if (area !== undefined)            updates.area = area || null
      if (active !== undefined)          updates.active = active
      if (password)                      updates.password_hash = await hashPassword(password)
      if (colaborador_id !== undefined)              updates.colaborador_id = colaborador_id || null
      if (avaliacoes_confidenciais !== undefined)    updates.avaliacoes_confidenciais = !!avaliacoes_confidenciais
      if (ver_confidencial !== undefined)            updates.ver_confidencial = !!ver_confidencial

      const rolesVal = roles !== undefined ? roles : null

      const rows = await sql`
        UPDATE users SET
          name                      = COALESCE(${updates.name ?? null}, name),
          email                     = COALESCE(${updates.email ?? null}, email),
          cpf                       = COALESCE(${updates.cpf ?? null}, cpf),
          phone                     = COALESCE(${updates.phone ?? null}, phone),
          must_change_password      = CASE WHEN ${forceChange} THEN true ELSE must_change_password END,
          role                    = COALESCE(${updates.role ?? null}, role),
          roles                     = CASE WHEN ${roles !== undefined} THEN ${rolesVal} ELSE roles END,
          area                      = CASE WHEN ${area !== undefined} THEN ${updates.area ?? null} ELSE area END,
          active                    = COALESCE(${updates.active ?? null}, active),
          password_hash             = COALESCE(${updates.password_hash ?? null}, password_hash),
          colaborador_id            = CASE WHEN ${colaborador_id !== undefined} THEN ${updates.colaborador_id ?? null} ELSE colaborador_id END,
          avaliacoes_confidenciais  = CASE WHEN ${avaliacoes_confidenciais !== undefined} THEN ${updates.avaliacoes_confidenciais ?? false} ELSE avaliacoes_confidenciais END,
          ver_confidencial          = CASE WHEN ${ver_confidencial !== undefined} THEN ${updates.ver_confidencial ?? false} ELSE ver_confidencial END,
          updated_at                = NOW()
        WHERE id = ${id}
        RETURNING id, name, email, cpf, phone, role, roles, area, active, colaborador_id, avaliacoes_confidenciais, ver_confidencial, created_at, updated_at
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
