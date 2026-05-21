const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(200) UNIQUE NOT NULL,
        password_hash VARCHAR(64) NOT NULL,
        role VARCHAR(50) DEFAULT 'Técnico de TI',
        active BOOLEAN DEFAULT true,
        must_change_password BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Add must_change_password column if upgrading from older schema
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false
    `

    const count = await sql`SELECT COUNT(*) as count FROM users`
    if (parseInt(count[0].count) === 0) {
      await sql`
        INSERT INTO users (name, email, password_hash, role, must_change_password) VALUES
        ('Alexandre Amorim', 'alexandre.amorim@rttshop.com.br', ${hashPassword('alexandre123')}, 'Administrador de TI', false),
        ('Administrador', 'admin@rtt.com', ${hashPassword('admin123')}, 'Administrador de TI', false),
        ('Equipe TI', 'ti@rtt.com', ${hashPassword('ti1234')}, 'Técnico de TI', false)
      `
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Tabela de usuários criada e populada com sucesso!' }),
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
