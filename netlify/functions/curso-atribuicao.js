const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

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
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS colaborador_id INTEGER`
  } catch (e) {
    console.error('curso-atribuicao users setup error:', e)
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS treinamento_progresso (
        id                  SERIAL PRIMARY KEY,
        user_id             INTEGER NOT NULL,
        curso_id            INTEGER NOT NULL,
        modulo_id           INTEGER NOT NULL,
        concluido           BOOLEAN DEFAULT false,
        segundos_assistidos INTEGER DEFAULT 0,
        updated_at          TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, curso_id, modulo_id)
      )
    `
    await sql`ALTER TABLE treinamento_progresso ADD COLUMN IF NOT EXISTS validado BOOLEAN DEFAULT false`
    await sql`ALTER TABLE treinamento_progresso ADD COLUMN IF NOT EXISTS data_validacao DATE`
    await sql`ALTER TABLE treinamento_progresso ADD COLUMN IF NOT EXISTS validado_por TEXT`
  } catch (e) {
    console.error('curso-atribuicao setup error:', e)
  }

  try {
    const auth = requireAuth(event)
    const params = event.queryStringParameters || {}

    if (event.httpMethod === 'GET') {
      const cursoId = params.curso_id ? parseInt(params.curso_id) : null

      // ── Course-centric GET: who has access to course X + their progress ──
      if (cursoId) {
        if (!isAdminRole(auth.role)) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
        }
        const rows = await sql`
          SELECT
            ca.colaborador_id,
            col.nome,
            col.cargo,
            col.area,
            jsonb_array_length(cu.modulos) AS total_modulos,
            COALESCE(COUNT(tp.modulo_id) FILTER (WHERE tp.concluido = true), 0) AS modulos_concluidos,
            COALESCE(BOOL_OR(tp.validado), false)     AS validado,
            MAX(tp.data_validacao)                    AS data_validacao,
            MAX(tp.validado_por)                      AS validado_por
          FROM curso_atribuicao ca
          JOIN colaboradores col ON col.id = ca.colaborador_id
          JOIN cursos cu ON cu.id = ca.curso_id
          LEFT JOIN users u ON u.colaborador_id = ca.colaborador_id
          LEFT JOIN treinamento_progresso tp
            ON tp.user_id = u.id AND tp.curso_id = ca.curso_id
          WHERE ca.curso_id = ${cursoId}
          GROUP BY ca.colaborador_id, col.nome, col.cargo, col.area, jsonb_array_length(cu.modulos)
          ORDER BY col.nome
        `
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            curso_id: cursoId,
            inscritos: rows.map(r => ({
              ...r,
              modulos_concluidos: parseInt(r.modulos_concluidos),
              total_modulos: parseInt(r.total_modulos),
            })),
          }),
        }
      }

      // ── Collaborator-centric GET: which courses are assigned to current user ──
      let colaboradorId = params.colaborador_id ? parseInt(params.colaborador_id) : null

      if (colaboradorId && !isAdminRole(auth.role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }

      if (!colaboradorId) {
        const rows = await sql`SELECT colaborador_id FROM users WHERE id = ${auth.userId}`
        colaboradorId = rows[0]?.colaborador_id ?? null
      }

      if (!colaboradorId) {
        // Verifica se há requisitos no sistema — se sim, filtra estrito (mostra nada)
        let temReqs = false
        try {
          await sql`CREATE TABLE IF NOT EXISTS curso_requisitos (
            id SERIAL PRIMARY KEY, curso_id INTEGER NOT NULL,
            cargo TEXT, area TEXT, obrigatorio BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(), UNIQUE (curso_id, cargo, area)
          )`
          const total = await sql`SELECT COUNT(*) AS n FROM curso_requisitos`
          temReqs = parseInt(total[0]?.n ?? '0') > 0
        } catch (e) { /* ignora */ }
        return { statusCode: 200, headers, body: JSON.stringify({ colaborador_id: null, curso_ids: [], filtrado_por_requisitos: temReqs }) }
      }

      // Cursos atribuídos explicitamente
      const atribuidos = await sql`SELECT curso_id FROM curso_atribuicao WHERE colaborador_id = ${colaboradorId}`
      const atribuidosIds = new Set(atribuidos.map(r => r.curso_id))

      // Cursos pelo cargo/área do colaborador via curso_requisitos
      const colab = await sql`SELECT cargo, area FROM colaboradores WHERE id = ${colaboradorId} LIMIT 1`
      const cargo = colab[0]?.cargo || null
      const area  = colab[0]?.area  || null

      let requisitosIds = new Set()
      let temRequisitos = false
      if (cargo || area) {
        try {
          await sql`CREATE TABLE IF NOT EXISTS curso_requisitos (
            id SERIAL PRIMARY KEY, curso_id INTEGER NOT NULL,
            cargo TEXT, area TEXT, obrigatorio BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(), UNIQUE (curso_id, cargo, area)
          )`
          const reqs = await sql`
            SELECT DISTINCT curso_id FROM curso_requisitos
            WHERE (cargo IS NOT NULL AND cargo = ${cargo ?? ''})
               OR (area  IS NOT NULL AND area  = ${area  ?? ''})
          `
          reqs.forEach(r => requisitosIds.add(r.curso_id))
          // Verifica se existem requisitos configurados no sistema
          const total = await sql`SELECT COUNT(*) AS n FROM curso_requisitos`
          temRequisitos = parseInt(total[0]?.n ?? '0') > 0
        } catch (e) {
          console.error('curso_requisitos lookup error:', e)
        }
      }

      // União: atribuídos explicitamente + matching por cargo/área
      const todos = [...new Set([...atribuidosIds, ...requisitosIds])]

      // Se o sistema tem requisitos configurados → filtrar estrito
      // Se não tem requisitos nenhum ainda → retorna vazio sinalizando ao frontend que deve mostrar tudo
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          colaborador_id: colaboradorId,
          curso_ids: todos,
          filtrado_por_requisitos: temRequisitos,
        }),
      }
    }

    if (event.httpMethod === 'PUT') {
      if (!isAdminRole(auth.role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }

      const body = JSON.parse(event.body || '{}')

      // ── Course-centric PUT: set which colaboradors have access to a course ──
      if (body.curso_id !== undefined) {
        const { curso_id, colaborador_ids } = body
        await sql`DELETE FROM curso_atribuicao WHERE curso_id = ${curso_id}`
        for (const colId of (colaborador_ids ?? [])) {
          await sql`
            INSERT INTO curso_atribuicao (colaborador_id, curso_id)
            VALUES (${colId}, ${curso_id})
            ON CONFLICT DO NOTHING
          `
        }
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
      }

      // ── Collaborator-centric PUT: set which courses a colaborador can access ──
      const { colaborador_id, curso_ids } = body
      if (!colaborador_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'colaborador_id ou curso_id obrigatório' }) }

      await sql`DELETE FROM curso_atribuicao WHERE colaborador_id = ${colaborador_id}`
      for (const cursoId of (curso_ids ?? [])) {
        await sql`
          INSERT INTO curso_atribuicao (colaborador_id, curso_id)
          VALUES (${colaborador_id}, ${cursoId})
          ON CONFLICT DO NOTHING
        `
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('curso-atribuicao error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
