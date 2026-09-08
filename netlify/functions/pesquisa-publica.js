const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')
const { makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}

  try {
    // Migrations
    await sql`ALTER TABLE pesquisas ADD COLUMN IF NOT EXISTS link_publico UUID`
    await sql`ALTER TABLE pesquisas ADD COLUMN IF NOT EXISTS pede_local_trabalho BOOLEAN DEFAULT false`
    await sql`ALTER TABLE pesquisas ADD COLUMN IF NOT EXISTS locais_trabalho JSONB DEFAULT '[]'`
    await sql`ALTER TABLE pesquisa_respostas ADD COLUMN IF NOT EXISTS token_anonimo TEXT`
    await sql`ALTER TABLE pesquisa_respostas ADD COLUMN IF NOT EXISTS ip_hash TEXT`
    await sql`ALTER TABLE pesquisa_respostas ADD COLUMN IF NOT EXISTS local_de_trabalho TEXT`
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS pr_token_anon_uniq ON pesquisa_respostas(pesquisa_id, token_anonimo) WHERE token_anonimo IS NOT NULL`
    } catch (_) {}

    if (event.httpMethod === 'GET') {
      const token = params.token
      if (!token) return { statusCode: 400, headers, body: JSON.stringify({ error: 'token obrigatório' }) }

      const rows = await sql`
        SELECT id, nome, objetivo, tipo, situacao, status, anonima, perguntas, pede_local_trabalho, locais_trabalho
        FROM pesquisas
        WHERE link_publico = ${token}::uuid AND anonima = true AND ativo = true
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Pesquisa não encontrada' }) }

      const p = rows[0]
      if (p.situacao !== 'LIBERADA' || p.status !== 'ATIVA') {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Esta pesquisa não está disponível no momento.' }) }
      }

      return { statusCode: 200, headers, body: JSON.stringify(p) }
    }

    if (event.httpMethod === 'POST') {
      const { token, respostas, local_de_trabalho } = JSON.parse(event.body || '{}')
      if (!token) return { statusCode: 400, headers, body: JSON.stringify({ error: 'token obrigatório' }) }
      if (!Array.isArray(respostas)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'respostas inválido' }) }
      if (respostas.length > 200) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Número de respostas excede o limite' }) }
      const localStr = typeof local_de_trabalho === 'string' ? local_de_trabalho.slice(0, 200) : null

      const rows = await sql`
        SELECT id, pede_local_trabalho FROM pesquisas
        WHERE link_publico = ${token}::uuid AND anonima = true AND ativo = true AND situacao = 'LIBERADA' AND status = 'ATIVA'
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Pesquisa não disponível' }) }
      if (rows[0].pede_local_trabalho && !localStr) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Selecione seu local de trabalho' }) }
      }

      const pesquisaId = rows[0].id

      const serverToken = crypto.randomBytes(32).toString('hex')
      await sql`
        INSERT INTO pesquisa_respostas (pesquisa_id, respostas, anonima, token_anonimo, local_de_trabalho)
        VALUES (${pesquisaId}, ${JSON.stringify(respostas)}, true, ${serverToken}, ${localStr})
      `

      return { statusCode: 201, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    console.error('pesquisa-publica error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
