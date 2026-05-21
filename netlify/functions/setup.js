const { neon } = require('@neondatabase/serverless')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
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

    // Seed default categories if empty
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

    // Seed default locations if empty
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
