const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders, errorResponse } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}
  const id = params.id ? parseInt(params.id) : null

  try {
    const authPayload = requireAuth(event)
    const isGestor = authPayload.role === 'Gestor'
    const gestorArea = authPayload.area || null

    if (event.httpMethod === 'GET') {
      if (id) {
        const rows = await sql`
          SELECT c.*,
            (SELECT COUNT(*) FROM ciclos_avaliacao ca
             WHERE ca.colaborador_id = c.id AND ca.status = 'concluido')::int AS total_avaliacoes,
            (SELECT ca2.quadrante FROM ciclos_avaliacao ca2
             WHERE ca2.colaborador_id = c.id AND ca2.status = 'concluido'
             ORDER BY ca2.created_at DESC LIMIT 1) AS ultimo_quadrante,
            (SELECT ca3.created_at FROM ciclos_avaliacao ca3
             WHERE ca3.colaborador_id = c.id AND ca3.status = 'concluido'
             ORDER BY ca3.created_at DESC LIMIT 1) AS ultima_avaliacao
          FROM colaboradores c
          WHERE c.id = ${id}
            AND (${!isGestor} OR c.area = ${gestorArea})
        `
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Colaborador não encontrado' }) }
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }

      const search = (params.search || '').toLowerCase()
      let rows
      if (search) {
        rows = await sql`
          SELECT c.*,
            (SELECT COUNT(*) FROM ciclos_avaliacao ca
             WHERE ca.colaborador_id = c.id AND ca.status = 'concluido')::int AS total_avaliacoes,
            (SELECT ca2.quadrante FROM ciclos_avaliacao ca2
             WHERE ca2.colaborador_id = c.id AND ca2.status = 'concluido'
             ORDER BY ca2.created_at DESC LIMIT 1) AS ultimo_quadrante,
            (SELECT ca3.created_at FROM ciclos_avaliacao ca3
             WHERE ca3.colaborador_id = c.id AND ca3.status = 'concluido'
             ORDER BY ca3.created_at DESC LIMIT 1) AS ultima_avaliacao
          FROM colaboradores c
          WHERE c.ativo = true
            AND (${!isGestor} OR c.area = ${gestorArea})
            AND (
              LOWER(c.nome)        LIKE ${'%' + search + '%'} OR
              LOWER(c.cargo)       LIKE ${'%' + search + '%'} OR
              LOWER(c.area)        LIKE ${'%' + search + '%'} OR
              LOWER(c.gestor_nome) LIKE ${'%' + search + '%'}
            )
          ORDER BY c.nome ASC
        `
      } else {
        rows = await sql`
          SELECT c.*,
            (SELECT COUNT(*) FROM ciclos_avaliacao ca
             WHERE ca.colaborador_id = c.id AND ca.status = 'concluido')::int AS total_avaliacoes,
            (SELECT ca2.quadrante FROM ciclos_avaliacao ca2
             WHERE ca2.colaborador_id = c.id AND ca2.status = 'concluido'
             ORDER BY ca2.created_at DESC LIMIT 1) AS ultimo_quadrante,
            (SELECT ca3.created_at FROM ciclos_avaliacao ca3
             WHERE ca3.colaborador_id = c.id AND ca3.status = 'concluido'
             ORDER BY ca3.created_at DESC LIMIT 1) AS ultima_avaliacao
          FROM colaboradores c
          WHERE c.ativo = true
            AND (${!isGestor} OR c.area = ${gestorArea})
          ORDER BY c.nome ASC
        `
      }
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')

      if (body.bulk && Array.isArray(body.colaboradores)) {
        const rawValid = body.colaboradores.filter(c => c.nome && c.nome.trim())
        if (rawValid.length === 0) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nenhum colaborador válido' }) }
        }
        // Deduplica pelo nome (case-insensitive), mantendo a última ocorrência
        const seen = new Map()
        for (const c of rawValid) seen.set(c.nome.trim().toLowerCase(), c)
        const valid = [...seen.values()]

        // Upsert em lotes de 200: atualiza se nome já existe, insere se não existe
        const BATCH = 200
        let inserted = 0
        let updated = 0
        for (let i = 0; i < valid.length; i += BATCH) {
          const chunk = valid.slice(i, i + BATCH)
          const nomes    = chunk.map(c => c.nome.trim())
          const cargos   = chunk.map(c => c.cargo      || null)
          const niveis   = chunk.map(c => c.nivel      || null)
          const areas    = chunk.map(c => c.area       || null)
          const emails   = chunk.map(c => c.email      || null)
          const gestores = chunk.map(c => c.gestor_nome || null)

          const result = await sql`
            WITH input AS (
              SELECT * FROM unnest(
                ${nomes}::text[],
                ${cargos}::text[],
                ${niveis}::text[],
                ${areas}::text[],
                ${emails}::text[],
                ${gestores}::text[]
              ) AS t(nome, cargo, nivel, area, email, gestor_nome)
            ),
            upd AS (
              UPDATE colaboradores c
              SET cargo       = i.cargo,
                  nivel       = i.nivel,
                  area        = i.area,
                  email       = i.email,
                  gestor_nome = i.gestor_nome,
                  ativo       = true,
                  updated_at  = NOW()
              FROM input i
              WHERE c.id = (
                SELECT id FROM colaboradores x
                WHERE LOWER(TRIM(x.nome)) = LOWER(TRIM(i.nome))
                ORDER BY x.id ASC
                LIMIT 1
              )
              RETURNING c.id
            ),
            dedup AS (
              UPDATE colaboradores SET ativo = false
              WHERE id IN (
                SELECT id FROM (
                  SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(nome)) ORDER BY id ASC) AS rn
                  FROM colaboradores
                ) sub WHERE rn > 1
              )
            ),
            ins AS (
              INSERT INTO colaboradores (nome, cargo, nivel, area, email, gestor_nome)
              SELECT i.nome, i.cargo, i.nivel, i.area, i.email, i.gestor_nome
              FROM input i
              WHERE NOT EXISTS (
                SELECT 1 FROM colaboradores c WHERE LOWER(TRIM(c.nome)) = LOWER(TRIM(i.nome))
              )
              RETURNING id
            )
            SELECT
              (SELECT COUNT(*) FROM ins)::int AS inserted,
              (SELECT COUNT(*) FROM upd)::int AS updated
          `
          inserted += result[0]?.inserted || 0
          updated  += result[0]?.updated  || 0
        }
        return { statusCode: 201, headers, body: JSON.stringify({ success: true, inserted, updated }) }
      }

      const { nome, cargo, nivel, area, email, gestor_nome } = body
      if (!nome || !nome.trim()) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome é obrigatório' }) }
      }
      const rows = await sql`
        INSERT INTO colaboradores (nome, cargo, nivel, area, email, gestor_nome)
        VALUES (${nome.trim()}, ${cargo || null}, ${nivel || null},
                ${area || null}, ${email || null}, ${gestor_nome || null})
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID necessário' }) }
      const body = JSON.parse(event.body || '{}')
      const { nome, cargo, nivel, area, email, gestor_nome } = body
      const rows = await sql`
        UPDATE colaboradores
        SET nome       = ${nome       ?? null},
            cargo      = ${cargo      ?? null},
            nivel      = ${nivel      ?? null},
            area       = ${area       ?? null},
            email      = ${email      ?? null},
            gestor_nome= ${gestor_nome ?? null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      // Exclusão em lote: body { ids: [1,2,3] }
      const deleteBody = event.body ? (() => { try { return JSON.parse(event.body) } catch { return {} } })() : {}
      if (Array.isArray(deleteBody.ids) && deleteBody.ids.length > 0) {
        const ids = deleteBody.ids.map(Number).filter(Boolean)
        if (ids.length === 0) return { statusCode: 400, headers, body: JSON.stringify({ error: 'IDs inválidos' }) }
        if (isGestor) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }
        await sql`UPDATE colaboradores SET ativo = false, updated_at = NOW() WHERE id = ANY(${ids}::int[])`
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, deleted: ids.length }) }
      }
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID necessário' }) }
      await sql`UPDATE colaboradores SET ativo = false, updated_at = NOW() WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
