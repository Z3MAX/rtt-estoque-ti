const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders } = require('./_auth')

function isAdminRole(role) {
  return ['Administrador de RH', 'Administrador de TI', 'Administrador Master', 'Administrador de RH / Gestor'].includes(role)
}

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}

  try {
    const auth = requireAuth(event)

    if (event.httpMethod === 'GET') {
      const rows = await sql`
        SELECT * FROM comunicados
        WHERE publicado = true
        ORDER BY fixado DESC, created_at DESC
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (!isAdminRole(auth.role)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
    }

    if (event.httpMethod === 'POST') {
      const { titulo, resumo, conteudo, categoria, fixado } = JSON.parse(event.body || '{}')
      if (!titulo) return { statusCode: 400, headers, body: JSON.stringify({ error: 'titulo obrigatório' }) }
      const rows = await sql`
        INSERT INTO comunicados (titulo, resumo, conteudo, categoria, fixado, autor_id, autor_nome)
        VALUES (${titulo}, ${resumo ?? null}, ${conteudo ?? null}, ${categoria ?? 'Geral'}, ${fixado ?? false}, ${auth.userId}, ${auth.name})
        RETURNING *
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      const id = parseInt(params.id)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      const body = JSON.parse(event.body || '{}')
      const rows = await sql`
        UPDATE comunicados SET
          titulo     = COALESCE(${body.titulo ?? null}, titulo),
          resumo     = COALESCE(${body.resumo ?? null}, resumo),
          conteudo   = COALESCE(${body.conteudo ?? null}, conteudo),
          categoria  = COALESCE(${body.categoria ?? null}, categoria),
          fixado     = COALESCE(${body.fixado ?? null}, fixado),
          publicado  = COALESCE(${body.publicado ?? null}, publicado),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      const id = parseInt(params.id)
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      await sql`DELETE FROM comunicados WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('comunicados error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
