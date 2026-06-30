const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { requireAdmin, makeHeaders, errorResponse } = require('./_auth')
const { hashPassword } = require('./_hash')

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
    requireAdmin(event)

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

    // Emails já existentes
    const existingUsers = await sql`SELECT email, name FROM users`
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()))
    const existingNames  = new Set(existingUsers.map(u => u.name.toLowerCase()))

    const created = []
    const skipped = []

    for (const g of gestores) {
      if (existingNames.has(g.nome.toLowerCase())) {
        skipped.push({ nome: g.nome, motivo: 'já existe' })
        continue
      }

      // Usa o email real importado da planilha; gera fallback apenas se não houver
      let email = g.email_real && g.email_real.trim() ? g.email_real.trim().toLowerCase() : toEmail(g.nome)
      let counter = 2
      while (existingEmails.has(email)) {
        const [local, domain] = (g.email_real && g.email_real.trim() ? g.email_real.trim().toLowerCase() : toEmail(g.nome)).split('@')
        email = `${local}${counter}@${domain}`
        counter++
      }
      existingEmails.add(email)

      // Senha temporária aleatória por usuário (nunca compartilhada entre gestores)
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
      created.push({ nome: g.nome, email, area: g.area_principal, total_colabs: g.total_colabs, senha_temporaria: tempPwd })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        created: created.length,
        skipped: skipped.length,
        usuarios: created,
        aviso: 'As senhas temporárias são exibidas apenas nesta resposta. Guarde-as antes de fechar.',
      }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
