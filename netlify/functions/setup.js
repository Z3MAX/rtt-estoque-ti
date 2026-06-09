const { neon } = require('@neondatabase/serverless')
const { makeHeaders, errorResponse } = require('./_auth')
const { hashPassword } = require('./_hash')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

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
    // Users table (sistema)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id                  SERIAL PRIMARY KEY,
        email               VARCHAR(200) UNIQUE NOT NULL,
        name                VARCHAR(200) NOT NULL,
        role                VARCHAR(100) NOT NULL DEFAULT 'Técnico de RH',
        password_hash       VARCHAR(200),
        active              BOOLEAN DEFAULT true,
        must_change_password BOOLEAN DEFAULT false,
        reset_token         VARCHAR(200),
        reset_token_expires TIMESTAMP,
        created_at          TIMESTAMP DEFAULT NOW()
      )
    `

    // Colaboradores (funcionários avaliados)
    await sql`
      CREATE TABLE IF NOT EXISTS colaboradores (
        id          SERIAL PRIMARY KEY,
        nome        VARCHAR(200) NOT NULL,
        cargo       VARCHAR(200),
        nivel       VARCHAR(50),
        area        VARCHAR(200),
        email       VARCHAR(200),
        gestor_nome VARCHAR(200),
        ativo       BOOLEAN DEFAULT true,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      )
    `

    // Ciclos de avaliação 9-Box
    await sql`
      CREATE TABLE IF NOT EXISTS ciclos_avaliacao (
        id                 SERIAL PRIMARY KEY,
        colaborador_id     INTEGER REFERENCES colaboradores(id) ON DELETE CASCADE,
        colaborador_nome   VARCHAR(200),
        avaliador_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
        avaliador_nome     VARCHAR(200),
        tipo               VARCHAR(50) DEFAULT 'lideranca',
        periodo_inicial    VARCHAR(20),
        periodo_final      VARCHAR(20),
        nivel_cargo        VARCHAR(50),
        score_desempenho   DECIMAL(4,2),
        score_potencial    DECIMAL(4,2),
        nivel_desempenho   VARCHAR(10),
        nivel_potencial    VARCHAR(10),
        quadrante          VARCHAR(5),
        respostas          JSONB,
        status             VARCHAR(20) DEFAULT 'concluido',
        created_at         TIMESTAMP DEFAULT NOW(),
        updated_at         TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS ciclos_colaborador_idx ON ciclos_avaliacao(colaborador_id)`
    await sql`CREATE INDEX IF NOT EXISTS ciclos_created_idx ON ciclos_avaliacao(created_at DESC)`

    // Audit log
    await sql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id          SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id   INTEGER NOT NULL,
        entity_name VARCHAR(200),
        action      VARCHAR(50) NOT NULL,
        changes     JSONB,
        user_id     INTEGER,
        user_name   VARCHAR(200),
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(entity_type, entity_id)`
    await sql`CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC)`

    // Migrations
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS area VARCHAR(200)`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`

    // Seed admin user if none exists
    const existingUsers = await sql`SELECT COUNT(*) AS count FROM users`
    if (parseInt(existingUsers[0].count) === 0) {
      const hash = await hashPassword('Admin@RTT2025')
      await sql`
        INSERT INTO users (email, name, role, password_hash, must_change_password)
        VALUES ('admin@rtt.com.br', 'Administrador', 'Administrador de RH', ${hash}, true)
      `
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Banco de dados configurado com sucesso!' }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
