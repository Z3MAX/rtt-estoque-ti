const { neon } = require('@neondatabase/serverless')
const { getStore } = require('@netlify/blobs')
const crypto = require('crypto')
const { requireAuth, isAdminRole, makeHeaders, errorResponse } = require('./_auth')

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB — limite do corpo de request/response das Netlify Functions (~6MB)
const ALLOWED_EXT = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'odp', 'ods', 'odt']

async function runMigrations(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS treinamento_materiais (
      id               SERIAL PRIMARY KEY,
      treinamento_id   INTEGER NOT NULL,
      nome_arquivo     TEXT NOT NULL,
      tipo             TEXT NOT NULL,
      mime_type        TEXT,
      tamanho_bytes    INTEGER NOT NULL,
      blob_key         TEXT NOT NULL,
      enviado_por      INTEGER,
      enviado_por_nome TEXT,
      created_at       TIMESTAMP DEFAULT NOW()
    )
  `
}

function extensaoDe(nome) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(nome || '')
  return m ? m[1].toLowerCase() : ''
}

function sanitizarNome(nome) {
  return String(nome || 'arquivo').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 150)
}

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}

  try {
    const auth = requireAuth(event)
    await runMigrations(sql)
    const store = getStore('treinamento-materiais')

    if (event.httpMethod === 'GET') {
      // Download do arquivo — qualquer usuário autenticado
      if (params.download && params.id) {
        const id = parseInt(params.id) || 0
        if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id inválido' }) }
        const rows = await sql`SELECT * FROM treinamento_materiais WHERE id = ${id}`
        const material = rows[0]
        if (!material) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Material não encontrado' }) }

        const blob = await store.get(material.blob_key, { type: 'arrayBuffer' })
        if (!blob) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Arquivo não encontrado no armazenamento' }) }

        const nomeEscapado = encodeURIComponent(material.nome_arquivo)
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': material.mime_type || 'application/octet-stream',
            'Content-Disposition': `attachment; filename*=UTF-8''${nomeEscapado}`,
          },
          body: Buffer.from(blob).toString('base64'),
          isBase64Encoded: true,
        }
      }

      // Lista de materiais de um treinamento — qualquer usuário autenticado
      const treinamentoId = parseInt(params.treinamento_id) || 0
      if (!treinamentoId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'treinamento_id obrigatório' }) }
      const rows = await sql`
        SELECT id, nome_arquivo, tipo, tamanho_bytes, enviado_por_nome, created_at
        FROM treinamento_materiais
        WHERE treinamento_id = ${treinamentoId}
        ORDER BY created_at DESC
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      if (!isAdminRole(auth.role)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      const body = JSON.parse(event.body || '{}')
      const { treinamento_id, nome_arquivo, mime_type, data } = body

      const treinamentoId = parseInt(treinamento_id) || 0
      if (!treinamentoId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'treinamento_id obrigatório' }) }
      if (!nome_arquivo || !data) return { statusCode: 400, headers, body: JSON.stringify({ error: 'nome_arquivo e data obrigatórios' }) }

      const ext = extensaoDe(nome_arquivo)
      if (!ALLOWED_EXT.includes(ext)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Tipo de arquivo não permitido (.${ext || '?'}). Formatos aceitos: ${ALLOWED_EXT.join(', ')}` }) }
      }

      const base64 = String(data).includes(',') ? String(data).split(',').pop() : String(data)
      const buffer = Buffer.from(base64, 'base64')
      if (buffer.length === 0) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Arquivo vazio' }) }
      if (buffer.length > MAX_FILE_SIZE) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Arquivo muito grande (máx. ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)` }) }
      }

      const blobKey = `treinamento-${treinamentoId}/${crypto.randomUUID()}-${sanitizarNome(nome_arquivo)}`
      await store.set(blobKey, buffer)

      const rows = await sql`
        INSERT INTO treinamento_materiais (treinamento_id, nome_arquivo, tipo, mime_type, tamanho_bytes, blob_key, enviado_por, enviado_por_nome)
        VALUES (${treinamentoId}, ${nome_arquivo}, ${ext}, ${mime_type || null}, ${buffer.length}, ${blobKey}, ${auth.userId}, ${auth.name || null})
        RETURNING id, nome_arquivo, tipo, tamanho_bytes, enviado_por_nome, created_at
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      if (!isAdminRole(auth.role)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      const id = parseInt(params.id) || 0
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
      const rows = await sql`SELECT * FROM treinamento_materiais WHERE id = ${id}`
      const material = rows[0]
      if (!material) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Material não encontrado' }) }

      await store.delete(material.blob_key)
      await sql`DELETE FROM treinamento_materiais WHERE id = ${id}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
