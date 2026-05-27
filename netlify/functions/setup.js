const { neon } = require('@neondatabase/serverless')
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

  // Protege o endpoint de setup com segredo — configure SETUP_SECRET no Netlify
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
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#6366f1',
        icon VARCHAR(50) DEFAULT 'Monitor',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS equipment (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        brand VARCHAR(100),
        model VARCHAR(100),
        serial_number VARCHAR(100),
        asset_tag VARCHAR(100),
        status VARCHAR(50) DEFAULT 'disponivel',
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        assigned_to VARCHAR(200),
        purchase_date DATE,
        purchase_price DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS movements (
        id SERIAL PRIMARY KEY,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        performed_by VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        entity_name VARCHAR(200),
        action VARCHAR(50) NOT NULL,
        changes JSONB,
        user_id INTEGER,
        user_name VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(entity_type, entity_id)`
    await sql`CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC)`

    // Seed categorias padrão
    const cats = await sql`SELECT COUNT(*) as count FROM categories`
    if (parseInt(cats[0].count) === 0) {
      await sql`
        INSERT INTO categories (name, description, color, icon) VALUES
        ('Computadores', 'Desktops, workstations e servidores', '#6366f1', 'Monitor'),
        ('Notebooks', 'Laptops e ultrabooks', '#8b5cf6', 'Laptop'),
        ('Monitores', 'Monitores e displays', '#06b6d4', 'Tv'),
        ('Impressoras', 'Impressoras e scanners', '#f59e0b', 'Printer'),
        ('Redes', 'Switches, roteadores e access points', '#10b981', 'Wifi'),
        ('Periféricos', 'Teclados, mouses e headsets', '#ef4444', 'Mouse'),
        ('Servidores', 'Servidores e storages', '#f97316', 'Server'),
        ('Telefonia', 'Telefones IP e ramais', '#84cc16', 'Phone')
      `
    }

    // Seed locais padrão
    const locs = await sql`SELECT COUNT(*) as count FROM locations`
    if (parseInt(locs[0].count) === 0) {
      await sql`
        INSERT INTO locations (name, description) VALUES
        ('Almoxarifado', 'Estoque principal de TI'),
        ('TI', 'Sala da equipe de TI'),
        ('Administrativo', 'Setor administrativo'),
        ('Financeiro', 'Setor financeiro'),
        ('Diretoria', 'Salas da diretoria'),
        ('Recepção', 'Recepção e entrada'),
        ('RH', 'Recursos Humanos'),
        ('Comercial', 'Setor comercial')
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
