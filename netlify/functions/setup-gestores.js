const { neon } = require('@neondatabase/serverless')
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

    // Busca todos os gestores únicos com a área que mais aparece para cada um
    const gestores = await sql`
      SELECT
        gestor_nome AS nome,
        MODE() WITHIN GROUP (ORDER BY area) AS area_principal,
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

    const defaultPwd = await hashPassword('Gestor@2025')
    const created = []
    const skipped = []

    for (const g of gestores) {
      if (existingNames.has(g.nome.toLowerCase())) {
        skipped.push({ nome: g.nome, motivo: 'já existe' })
        continue
      }

      // Gera email único
      let email = toEmail(g.nome)
      let counter = 2
      while (existingEmails.has(email)) {
        const base = toEmail(g.nome).replace('@', `${counter}@`)
        email = base
        counter++
      }
      existingEmails.add(email)

      await sql`
        INSERT INTO users (name, email, role, area, password_hash, active, must_change_password)
        VALUES (
          ${g.nome},
          ${email},
          'Gestor',
          ${g.area_principal || null},
          ${defaultPwd},
          true,
          true
        )
      `
      created.push({ nome: g.nome, email, area: g.area_principal, total_colabs: g.total_colabs })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        created: created.length,
        skipped: skipped.length,
        usuarios: created,
      }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
