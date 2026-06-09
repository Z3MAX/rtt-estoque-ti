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
    const isGestor = authPayload.role === 'Gestor'
    const gestorArea = authPayload.area || null

    // Colaboradores por área + gestor com distribuição de quadrantes
    const rows = await sql`
      SELECT
        COALESCE(c.area, 'Sem área') AS area,
        COALESCE(c.gestor_nome, 'Sem gestor') AS gestor_nome,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN ca.id IS NOT NULL THEN 1 END)::int AS avaliados,
        COUNT(CASE WHEN ca.quadrante = 'E3' THEN 1 END)::int AS q_e3,
        COUNT(CASE WHEN ca.quadrante = 'E2' THEN 1 END)::int AS q_e2,
        COUNT(CASE WHEN ca.quadrante = 'E1' THEN 1 END)::int AS q_e1,
        COUNT(CASE WHEN ca.quadrante = 'M3' THEN 1 END)::int AS q_m3,
        COUNT(CASE WHEN ca.quadrante = 'M2' THEN 1 END)::int AS q_m2,
        COUNT(CASE WHEN ca.quadrante = 'M1' THEN 1 END)::int AS q_m1,
        COUNT(CASE WHEN ca.quadrante = 'B3' THEN 1 END)::int AS q_b3,
        COUNT(CASE WHEN ca.quadrante = 'B2' THEN 1 END)::int AS q_b2,
        COUNT(CASE WHEN ca.quadrante = 'B1' THEN 1 END)::int AS q_b1
      FROM colaboradores c
      LEFT JOIN LATERAL (
        SELECT id, quadrante FROM ciclos_avaliacao
        WHERE colaborador_id = c.id AND status = 'concluido'
        ORDER BY created_at DESC LIMIT 1
      ) ca ON true
      WHERE c.ativo = true
        AND (${!isGestor} OR c.area = ${gestorArea})
      GROUP BY c.area, c.gestor_nome
      ORDER BY c.area ASC NULLS LAST, c.gestor_nome ASC NULLS LAST
    `

    // Agrupa por área
    const areaMap = new Map()
    for (const row of rows) {
      if (!areaMap.has(row.area)) {
        areaMap.set(row.area, {
          area: row.area,
          total: 0,
          avaliados: 0,
          gestores: [],
          quadrantes: { E3:0, E2:0, E1:0, M3:0, M2:0, M1:0, B3:0, B2:0, B1:0 },
        })
      }
      const dept = areaMap.get(row.area)
      dept.total    += row.total
      dept.avaliados += row.avaliados
      dept.gestores.push({ nome: row.gestor_nome, total: row.total, avaliados: row.avaliados })
      dept.quadrantes.E3 += row.q_e3
      dept.quadrantes.E2 += row.q_e2
      dept.quadrantes.E1 += row.q_e1
      dept.quadrantes.M3 += row.q_m3
      dept.quadrantes.M2 += row.q_m2
      dept.quadrantes.M1 += row.q_m1
      dept.quadrantes.B3 += row.q_b3
      dept.quadrantes.B2 += row.q_b2
      dept.quadrantes.B1 += row.q_b1
    }

    return { statusCode: 200, headers, body: JSON.stringify([...areaMap.values()]) }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
