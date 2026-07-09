const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}

  // Ensure tables exist
  await sql`
    CREATE TABLE IF NOT EXISTS curso_requisitos (
      id         SERIAL PRIMARY KEY,
      curso_id   INTEGER NOT NULL,
      cargo      TEXT,
      area       TEXT,
      obrigatorio BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (curso_id, cargo, area)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS curso_atribuicao (
      id             SERIAL PRIMARY KEY,
      colaborador_id INTEGER NOT NULL,
      curso_id       INTEGER NOT NULL,
      created_at     TIMESTAMP DEFAULT NOW(),
      UNIQUE (colaborador_id, curso_id)
    )
  `

  try {
    const auth = requireAuth(event)

    if (event.httpMethod === 'GET') {
      const cursoId = params.curso_id ? parseInt(params.curso_id) : null

      if (cursoId) {
        const rows = await sql`SELECT * FROM curso_requisitos WHERE curso_id = ${cursoId} ORDER BY cargo, area`
        return { statusCode: 200, headers, body: JSON.stringify(rows) }
      }

      // All requisitos with course info
      const rows = await sql`
        SELECT cr.*, c.titulo AS curso_titulo, c.obrigatorio AS curso_obrigatorio
        FROM curso_requisitos cr
        JOIN cursos c ON c.id = cr.curso_id
        ORDER BY c.titulo, cr.cargo, cr.area
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (!isAdminRole(auth.role)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
    }

    if (event.httpMethod === 'POST') {
      // Save requisitos for a course: { curso_id, requisitos: [{cargo, area, obrigatorio}] }
      const { curso_id, requisitos } = JSON.parse(event.body || '{}')
      if (!curso_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'curso_id obrigatório' }) }

      await sql`DELETE FROM curso_requisitos WHERE curso_id = ${curso_id}`
      for (const r of (requisitos ?? [])) {
        await sql`
          INSERT INTO curso_requisitos (curso_id, cargo, area, obrigatorio)
          VALUES (${curso_id}, ${r.cargo ?? null}, ${r.area ?? null}, ${r.obrigatorio ?? true})
          ON CONFLICT (curso_id, cargo, area) DO UPDATE SET obrigatorio = EXCLUDED.obrigatorio
        `
      }

      // Auto-inscreve colaboradores cujo cargo+área batem com os novos requisitos
      let autoInscritos = 0
      for (const r of (requisitos ?? [])) {
        const colaboradores = await sql`
          SELECT id FROM colaboradores
          WHERE (${r.cargo ?? null} IS NULL OR cargo = ${r.cargo ?? null})
            AND (${r.area  ?? null} IS NULL OR area  = ${r.area  ?? null})
        `
        for (const { id: colaborador_id } of colaboradores) {
          await sql`
            INSERT INTO curso_atribuicao (colaborador_id, curso_id)
            VALUES (${colaborador_id}, ${curso_id})
            ON CONFLICT DO NOTHING
          `
          autoInscritos++
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, auto_inscritos: autoInscritos }) }
    }

    // POST ?auto_assign=1: auto-assign courses to a colaborador based on their cargo/area
    if (event.httpMethod === 'PUT') {
      const { colaborador_id, cargo, area } = JSON.parse(event.body || '{}')
      if (!colaborador_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'colaborador_id obrigatório' }) }

      // Find courses required for this cargo or area
      const cursosRequeridos = await sql`
        SELECT DISTINCT curso_id FROM curso_requisitos
        WHERE (cargo IS NULL OR cargo = ${cargo ?? ''})
           OR (area IS NULL OR area = ${area ?? ''})
      `

      let autoAssigned = 0
      for (const { curso_id } of cursosRequeridos) {
        const inserted = await sql`
          INSERT INTO curso_atribuicao (colaborador_id, curso_id)
          VALUES (${colaborador_id}, ${curso_id})
          ON CONFLICT DO NOTHING
        `
        if (inserted.count > 0) autoAssigned++
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, auto_assigned: autoAssigned }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('curso-requisitos error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
