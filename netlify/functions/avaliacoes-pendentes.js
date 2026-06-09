const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders, errorResponse } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

  try {
    const authPayload = requireAuth(event)
    const isGestor   = authPayload.role === 'Gestor'
    const gestorArea = authPayload.area || null

    // Colaboradores que nunca foram avaliados (ou cuja última avaliação não é recente)
    const rows = await sql`
      SELECT
        c.id,
        c.nome,
        c.cargo,
        c.nivel,
        c.area,
        c.gestor_nome,
        (SELECT COUNT(*) FROM ciclos_avaliacao ca
         WHERE ca.colaborador_id = c.id AND ca.status = 'concluido')::int AS total_avaliacoes,
        (SELECT ca2.created_at FROM ciclos_avaliacao ca2
         WHERE ca2.colaborador_id = c.id AND ca2.status = 'concluido'
         ORDER BY ca2.created_at DESC LIMIT 1) AS ultima_avaliacao,
        (SELECT ca3.quadrante FROM ciclos_avaliacao ca3
         WHERE ca3.colaborador_id = c.id AND ca3.status = 'concluido'
         ORDER BY ca3.created_at DESC LIMIT 1) AS ultimo_quadrante
      FROM colaboradores c
      WHERE c.ativo = true
        AND (${!isGestor} OR c.area = ${gestorArea})
        AND NOT EXISTS (
          SELECT 1 FROM ciclos_avaliacao ca
          WHERE ca.colaborador_id = c.id AND ca.status = 'concluido'
        )
      ORDER BY c.area ASC, c.gestor_nome ASC, c.nome ASC
    `

    return { statusCode: 200, headers, body: JSON.stringify(rows) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
