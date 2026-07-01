const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { requireAdmin, makeHeaders, errorResponse } = require('./_auth')
const { hashPassword } = require('./_hash')
const { logAudit, getUserName } = require('./_audit')

function toEmail(name) {
  const parts = name.trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 1)
  const first = parts[0] || 'gestor'
  const last  = parts[parts.length - 1] || 'rtt'
  return `${first}.${last}@rematiptop.com.br`
}

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

  try {
    const authPayload = requireAdmin(event)

    // Busca todos os gestores únicos com a área e email mais frequentes
    const gestores = await sql`
      SELECT
        gestor_nome AS nome,
        MODE() WITHIN GROUP (ORDER BY area) AS area_principal,
        MODE() WITHIN GROUP (ORDER BY email) FILTER (WHERE email IS NOT NULL AND TRIM(email) <> '') AS email_real,
        COUNT(DISTINCT area)::int AS total_areas,
        COUNT(*)::int AS total_colabs
      FROM colaboradores
      WHERE ativo = true AND gestor_nome IS NOT NULL AND TRIM(gestor_nome) <> ''
      GROUP BY gestor_nome
      ORDER BY gestor_nome
    `

    // Usuários existentes indexados por nome (lowercase)
    const existingUsers = await sql`SELECT id, email, name FROM users`
    const existingByName  = new Map(existingUsers.map(u => [u.name.toLowerCase(), u]))
    const existingEmails  = new Set(existingUsers.map(u => u.email.toLowerCase()))

    const created      = []
    const emailUpdated = []
    const skipped      = []

    for (const g of gestores) {
      if (!g.email_real || !g.email_real.trim()) continue // sem email real, ignora

      const emailReal = g.email_real.trim().toLowerCase()
      const existing  = existingByName.get(g.nome.toLowerCase())

      if (existing) {
        // Gestor já existe — atualiza email se for diferente
        if (existing.email.toLowerCase() !== emailReal) {
          await sql`UPDATE users SET email = ${emailReal} WHERE id = ${existing.id}`
          emailUpdated.push({ nome: g.nome, email_anterior: existing.email, email_novo: emailReal })
        } else {
          skipped.push({ nome: g.nome, motivo: 'email já correto' })
        }
        continue
      }

      // Gestor novo — cria conta
      let email = emailReal
      let counter = 2
      while (existingEmails.has(email)) {
        const [local, domain] = emailReal.split('@')
        email = `${local}${counter}@${domain}`
        counter++
      }
      existingEmails.add(email)

      const tempPwd = crypto.randomBytes(12).toString('hex')
      const hash = await hashPassword(tempPwd)

      await sql`
        INSERT INTO users (name, email, role, area, password_hash, active, must_change_password)
        VALUES (
          ${g.nome},
          ${email},
          'Gestor',
          ${g.area_principal || null},
          ${hash},
          true,
          true
        )
      `
      created.push({ nome: g.nome, email, area: g.area_principal, total_colabs: g.total_colabs })
    }

    const actorName = await getUserName(sql, authPayload.userId)
    if (created.length > 0 || emailUpdated.length > 0) {
      await logAudit(sql, {
        entityType: 'user',
        entityId: 0,
        entityName: `Importação de gestores (${created.length} criados, ${emailUpdated.length} atualizados)`,
        action: 'bulk_import',
        changes: { created: created.map(c => c.nome), updated: emailUpdated.map(u => u.nome) },
        userId: authPayload.userId,
        userName: actorName,
      })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        created: created.length,
        updated: emailUpdated.length,
        skipped: skipped.length,
        usuarios: created,
        atualizados: emailUpdated,
      }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
