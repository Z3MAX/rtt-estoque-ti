const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { hashPassword } = require('./_hash')
const { makeHeaders, errorResponse } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  // Protege o endpoint com segredo
  const setupSecret = process.env.SETUP_SECRET
  if (!setupSecret) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Endpoint de setup não disponível' }) }
  }
  const providedSecret = (event.headers && (event.headers['x-setup-secret'] || event.headers['X-Setup-Secret'])) || ''
  if (providedSecret !== setupSecret) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    // Cria tabela com password_hash VARCHAR(255) para suportar bcrypt
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(200) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'Técnico de TI',
        active BOOLEAN DEFAULT true,
        must_change_password BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Migrações de schema
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false`
    // Alarga a coluna para suportar hashes bcrypt (60 chars) — idempotente
    await sql`ALTER TABLE users ALTER COLUMN password_hash TYPE VARCHAR(255)`

    const count = await sql`SELECT COUNT(*) as count FROM users`
    if (parseInt(count[0].count) === 0) {
      // Gera senhas aleatórias únicas — NUNCA usa credenciais hardcoded
      const pw1 = crypto.randomBytes(8).toString('hex') // 16 chars hex
      const pw2 = crypto.randomBytes(8).toString('hex')
      const pw3 = crypto.randomBytes(8).toString('hex')

      const [hash1, hash2, hash3] = await Promise.all([
        hashPassword(pw1),
        hashPassword(pw2),
        hashPassword(pw3),
      ])

      await sql`
        INSERT INTO users (name, email, password_hash, role, must_change_password) VALUES
        ('Alexandre Amorim', 'alexandre.amorim@rttshop.com.br', ${hash1}, 'Administrador de TI', true),
        ('Administrador',    'admin@rtt.com',                   ${hash2}, 'Administrador de TI', true),
        ('Equipe TI',        'ti@rtt.com',                      ${hash3}, 'Técnico de TI',       true)
      `

      // Senhas NÃO são retornadas na resposta — use "Esqueci minha senha" para definir a senha inicial
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Usuários criados com senhas aleatórias. Use o fluxo "Esqueci minha senha" em cada conta para definir a senha inicial.',
          users: ['alexandre.amorim@rttshop.com.br', 'admin@rtt.com', 'ti@rtt.com'],
        }),
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Tabela de usuários já existente. Nenhuma alteração nos usuários.' }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
