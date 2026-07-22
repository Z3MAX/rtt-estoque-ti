const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

let migrationDone = false

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}

  if (!migrationDone) {
    await Promise.all([
      sql`
        CREATE TABLE IF NOT EXISTS curso_requisitos (
          id          SERIAL PRIMARY KEY,
          curso_id    INTEGER NOT NULL,
          cargo       TEXT,
          area        TEXT,
          obrigatorio BOOLEAN DEFAULT true,
          created_at  TIMESTAMP DEFAULT NOW(),
          UNIQUE (curso_id, cargo, area)
        )
      `,
      sql`
        CREATE TABLE IF NOT EXISTS curso_atribuicao (
          id             SERIAL PRIMARY KEY,
          colaborador_id INTEGER NOT NULL,
          curso_id       INTEGER NOT NULL,
          auto_inscrito  BOOLEAN DEFAULT false,
          created_at     TIMESTAMP DEFAULT NOW(),
          UNIQUE (colaborador_id, curso_id)
        )
      `,
    ])
    try { await sql`ALTER TABLE curso_atribuicao ADD COLUMN IF NOT EXISTS auto_inscrito BOOLEAN DEFAULT false` } catch (e) {}
    migrationDone = true
  }

  try {
    const auth = requireAuth(event)

    if (event.httpMethod === 'GET') {
      const cursoId = params.curso_id ? parseInt(params.curso_id) : null

      if (cursoId) {
        const rows = await sql`SELECT * FROM curso_requisitos WHERE curso_id = ${cursoId} ORDER BY cargo, area`
        return { statusCode: 200, headers, body: JSON.stringify(rows) }
      }

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
      const { curso_id, requisitos } = JSON.parse(event.body || '{}')
      if (!curso_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'curso_id obrigatório' }) }

      const novosRequisitos = requisitos ?? []

      // 1. Remove todas as inscrições automáticas — serão recriadas abaixo
      //    Inscrições manuais (auto_inscrito = false) são preservadas
      await sql`DELETE FROM curso_atribuicao WHERE curso_id = ${curso_id} AND auto_inscrito = true`

      // 2. Substitui os requisitos
      await sql`DELETE FROM curso_requisitos WHERE curso_id = ${curso_id}`
      for (const r of novosRequisitos) {
        await sql`
          INSERT INTO curso_requisitos (curso_id, cargo, area, obrigatorio)
          VALUES (${curso_id}, ${r.cargo ?? null}, ${r.area ?? null}, ${r.obrigatorio ?? true})
          ON CONFLICT (curso_id, cargo, area) DO UPDATE SET obrigatorio = EXCLUDED.obrigatorio
        `
      }

      // 3. Auto-inscreve via bulk INSERT...SELECT (uma query por requisito, sem loop por colaborador)
      let inscritos = 0
      for (const r of novosRequisitos) {
        const cargo = r.cargo || null
        const area  = r.area  || null
        const rows = await sql`
          INSERT INTO curso_atribuicao (colaborador_id, curso_id, auto_inscrito)
          SELECT id, ${curso_id}, true
          FROM colaboradores
          WHERE ativo = true
            AND (${cargo}::text IS NULL OR cargo = ${cargo})
            AND (${area}::text IS NULL OR area = ${area})
          ON CONFLICT (colaborador_id, curso_id) DO NOTHING
          RETURNING colaborador_id
        `
        inscritos += rows.length
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, auto_inscritos: inscritos }) }
    }

    if (event.httpMethod === 'PUT') {
      const { colaborador_id, cargo, area } = JSON.parse(event.body || '{}')
      if (!colaborador_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'colaborador_id obrigatório' }) }

      const cursosRequeridos = await sql`
        SELECT DISTINCT curso_id FROM curso_requisitos
        WHERE (cargo IS NULL OR cargo = ${cargo ?? ''})
          AND (area  IS NULL OR area  = ${area  ?? ''})
      `

      let autoAssigned = 0
      for (const { curso_id } of cursosRequeridos) {
        await sql`
          INSERT INTO curso_atribuicao (colaborador_id, curso_id, auto_inscrito)
          VALUES (${colaborador_id}, ${curso_id}, true)
          ON CONFLICT (colaborador_id, curso_id) DO NOTHING
        `
        autoAssigned++
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
