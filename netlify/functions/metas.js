const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders, errorResponse } = require('./_auth')

function isGestorRole(role) {
  return role === 'Gestor' || role === 'Administrador de RH / Gestor'
}

// Categoria -> elegibilidade total (coletiva + individual)
const ELEGIBILIDADE = {
  '1.5_limitado':    { coletiva: 1, individual: 0.5 },
  '1.5_ilimitado':   { coletiva: 1, individual: 0.5 },
  '2_limitado':      { coletiva: 1, individual: 1.0 },
  '2_ilimitado':     { coletiva: 1, individual: 1.0 },
}

async function ensureTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS metas (
      id SERIAL PRIMARY KEY,
      colaborador_id INT,
      colaborador_nome TEXT,
      gestor_nome TEXT,
      cargo TEXT,
      data_admissao TEXT,
      data_ultima_promocao TEXT,
      categoria TEXT DEFAULT '1.5_limitado',
      ano INT DEFAULT 2026,
      status TEXT DEFAULT 'rascunho',
      criado_por INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS metas_itens (
      id SERIAL PRIMARY KEY,
      meta_id INT REFERENCES metas(id) ON DELETE CASCADE,
      tipo TEXT DEFAULT 'individual',
      descricao TEXT,
      metrica_s1 TEXT,
      metrica_s2 TEXT,
      peso NUMERIC DEFAULT 0,
      pct_s1 NUMERIC,
      pct_s2 NUMERIC,
      ordem INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'GET, POST, PUT, DELETE, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}
  const id = params.id ? parseInt(params.id) : null

  try {
    const auth = requireAuth(event)
    const isAdmin   = isAdminRole(auth.role)
    const isGestor  = isGestorRole(auth.role)
    const isCollab  = !isAdmin && !isGestor

    await ensureTables(sql)

    if (event.httpMethod === 'GET') {
      if (id) {
        const rows = await sql`
          SELECT m.*,
            COALESCE(json_agg(
              json_build_object(
                'id', mi.id, 'tipo', mi.tipo, 'descricao', mi.descricao,
                'metrica_s1', mi.metrica_s1, 'metrica_s2', mi.metrica_s2,
                'peso', mi.peso, 'pct_s1', mi.pct_s1, 'pct_s2', mi.pct_s2,
                'ordem', mi.ordem
              ) ORDER BY mi.tipo DESC, mi.ordem
            ) FILTER (WHERE mi.id IS NOT NULL), '[]') AS itens
          FROM metas m
          LEFT JOIN metas_itens mi ON mi.meta_id = m.id
          WHERE m.id = ${id}
          GROUP BY m.id
        `
        if (!rows.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
        const meta = rows[0]
        // Collaborators can only see their own meta
        if (isCollab && meta.criado_por !== auth.userId && meta.colaborador_nome !== auth.name) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }
        }
        return { statusCode: 200, headers, body: JSON.stringify(meta) }
      }

      // List
      let rows
      if (isAdmin) {
        rows = await sql`
          SELECT m.*,
            COALESCE(json_agg(
              json_build_object('id', mi.id, 'tipo', mi.tipo, 'descricao', mi.descricao,
                'metrica_s1', mi.metrica_s1, 'metrica_s2', mi.metrica_s2,
                'peso', mi.peso, 'pct_s1', mi.pct_s1, 'pct_s2', mi.pct_s2, 'ordem', mi.ordem
              ) ORDER BY mi.tipo DESC, mi.ordem
            ) FILTER (WHERE mi.id IS NOT NULL), '[]') AS itens
          FROM metas m
          LEFT JOIN metas_itens mi ON mi.meta_id = m.id
          GROUP BY m.id
          ORDER BY m.updated_at DESC
        `
      } else if (isGestor) {
        rows = await sql`
          SELECT m.*,
            COALESCE(json_agg(
              json_build_object('id', mi.id, 'tipo', mi.tipo, 'descricao', mi.descricao,
                'metrica_s1', mi.metrica_s1, 'metrica_s2', mi.metrica_s2,
                'peso', mi.peso, 'pct_s1', mi.pct_s1, 'pct_s2', mi.pct_s2, 'ordem', mi.ordem
              ) ORDER BY mi.tipo DESC, mi.ordem
            ) FILTER (WHERE mi.id IS NOT NULL), '[]') AS itens
          FROM metas m
          LEFT JOIN metas_itens mi ON mi.meta_id = m.id
          WHERE LOWER(TRIM(m.gestor_nome)) = LOWER(TRIM(${auth.name}))
             OR m.criado_por = ${auth.userId}
          GROUP BY m.id
          ORDER BY m.updated_at DESC
        `
      } else {
        // Collaborator: only their own
        rows = await sql`
          SELECT m.*,
            COALESCE(json_agg(
              json_build_object('id', mi.id, 'tipo', mi.tipo, 'descricao', mi.descricao,
                'metrica_s1', mi.metrica_s1, 'metrica_s2', mi.metrica_s2,
                'peso', mi.peso, 'pct_s1', mi.pct_s1, 'pct_s2', mi.pct_s2, 'ordem', mi.ordem
              ) ORDER BY mi.tipo DESC, mi.ordem
            ) FILTER (WHERE mi.id IS NOT NULL), '[]') AS itens
          FROM metas m
          LEFT JOIN metas_itens mi ON mi.meta_id = m.id
          WHERE m.criado_por = ${auth.userId}
          GROUP BY m.id
          ORDER BY m.updated_at DESC
        `
      }
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const {
        colaborador_id, colaborador_nome, gestor_nome, cargo,
        data_admissao, data_ultima_promocao, categoria, ano, itens,
      } = body

      const catKey = categoria || '1.5_limitado'

      const [meta] = await sql`
        INSERT INTO metas (
          colaborador_id, colaborador_nome, gestor_nome, cargo,
          data_admissao, data_ultima_promocao, categoria, ano,
          status, criado_por
        ) VALUES (
          ${colaborador_id || null}, ${colaborador_nome || auth.name},
          ${gestor_nome || null}, ${cargo || null},
          ${data_admissao || null}, ${data_ultima_promocao || null},
          ${catKey}, ${ano || 2026},
          'rascunho', ${auth.userId}
        )
        RETURNING *
      `

      if (Array.isArray(itens) && itens.length > 0) {
        for (const item of itens) {
          await sql`
            INSERT INTO metas_itens (meta_id, tipo, descricao, metrica_s1, metrica_s2, peso, pct_s1, pct_s2, ordem)
            VALUES (
              ${meta.id}, ${item.tipo || 'individual'}, ${item.descricao || null},
              ${item.metrica_s1 || null}, ${item.metrica_s2 || null},
              ${item.peso || 0}, ${item.pct_s1 ?? null}, ${item.pct_s2 ?? null},
              ${item.ordem || 0}
            )
          `
        }
      } else {
        // Create default structure
        const eleg = ELEGIBILIDADE[catKey] || { coletiva: 1, individual: 0.5 }
        await sql`
          INSERT INTO metas_itens (meta_id, tipo, descricao, metrica_s1, metrica_s2, peso, ordem)
          VALUES (
            ${meta.id}, 'coletiva',
            'Faturamento Líquido do Grupo Rema Tip Top Brasil (no Lucanet) em K-BRL',
            'Atingir a meta de faturamento coletiva do 1º semestre',
            'Atingir a meta de faturamento coletiva do ano',
            ${eleg.coletiva}, 0
          )
        `
        // 3 individual slots by default
        const pesoPorMeta = parseFloat((eleg.individual / 3).toFixed(6))
        for (let i = 0; i < 3; i++) {
          await sql`
            INSERT INTO metas_itens (meta_id, tipo, descricao, metrica_s1, metrica_s2, peso, ordem)
            VALUES (${meta.id}, 'individual', null, null, null, ${pesoPorMeta}, ${i + 1})
          `
        }
      }

      return { statusCode: 201, headers, body: JSON.stringify(meta) }
    }

    if (event.httpMethod === 'PUT') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID necessário' }) }

      const body = JSON.parse(event.body || '{}')

      // Collaborators can only update their own rascunho metas
      if (isCollab) {
        const [existing] = await sql`SELECT criado_por, status FROM metas WHERE id = ${id}`
        if (!existing) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
        if (existing.criado_por !== auth.userId) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }
        if (existing.status === 'aprovado') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Meta aprovada não pode ser editada' }) }
        if (body.status && !['rascunho', 'enviado'].includes(body.status)) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Colaboradores só podem enviar metas, não aprovar' }) }
        }
      }

      const {
        colaborador_id, colaborador_nome, gestor_nome, cargo,
        data_admissao, data_ultima_promocao, categoria, ano, status, itens,
      } = body

      const [meta] = await sql`
        UPDATE metas SET
          colaborador_id        = COALESCE(${colaborador_id ?? null}, colaborador_id),
          colaborador_nome      = COALESCE(${colaborador_nome ?? null}, colaborador_nome),
          gestor_nome           = COALESCE(${gestor_nome ?? null}, gestor_nome),
          cargo                 = COALESCE(${cargo ?? null}, cargo),
          data_admissao         = COALESCE(${data_admissao ?? null}, data_admissao),
          data_ultima_promocao  = COALESCE(${data_ultima_promocao ?? null}, data_ultima_promocao),
          categoria             = COALESCE(${categoria ?? null}, categoria),
          ano                   = COALESCE(${ano ?? null}, ano),
          status                = COALESCE(${status ?? null}, status),
          updated_at            = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      if (!meta) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }

      // Update itens if provided
      if (Array.isArray(itens)) {
        for (const item of itens) {
          if (item.id) {
            await sql`
              UPDATE metas_itens SET
                descricao  = COALESCE(${item.descricao ?? null}, descricao),
                metrica_s1 = COALESCE(${item.metrica_s1 ?? null}, metrica_s1),
                metrica_s2 = COALESCE(${item.metrica_s2 ?? null}, metrica_s2),
                peso       = COALESCE(${item.peso ?? null}, peso),
                pct_s1     = ${item.pct_s1 !== undefined ? item.pct_s1 : null},
                pct_s2     = ${item.pct_s2 !== undefined ? item.pct_s2 : null},
                ordem      = COALESCE(${item.ordem ?? null}, ordem)
              WHERE id = ${item.id} AND meta_id = ${id}
            `
          } else {
            await sql`
              INSERT INTO metas_itens (meta_id, tipo, descricao, metrica_s1, metrica_s2, peso, pct_s1, pct_s2, ordem)
              VALUES (
                ${id}, ${item.tipo || 'individual'}, ${item.descricao || null},
                ${item.metrica_s1 || null}, ${item.metrica_s2 || null},
                ${item.peso || 0}, ${item.pct_s1 ?? null}, ${item.pct_s2 ?? null},
                ${item.ordem || 0}
              )
            `
          }
        }
      }

      // Re-fetch with itens
      const [full] = await sql`
        SELECT m.*,
          COALESCE(json_agg(
            json_build_object('id', mi.id, 'tipo', mi.tipo, 'descricao', mi.descricao,
              'metrica_s1', mi.metrica_s1, 'metrica_s2', mi.metrica_s2,
              'peso', mi.peso, 'pct_s1', mi.pct_s1, 'pct_s2', mi.pct_s2, 'ordem', mi.ordem
            ) ORDER BY mi.tipo DESC, mi.ordem
          ) FILTER (WHERE mi.id IS NOT NULL), '[]') AS itens
        FROM metas m
        LEFT JOIN metas_itens mi ON mi.meta_id = m.id
        WHERE m.id = ${id}
        GROUP BY m.id
      `
      return { statusCode: 200, headers, body: JSON.stringify(full) }
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID necessário' }) }
      if (!isAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }
      await sql`DELETE FROM metas WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
