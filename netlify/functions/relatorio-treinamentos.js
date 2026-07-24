const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)
  const params = event.queryStringParameters || {}

  try {
    const auth = requireAuth(event)
    if (!isAdminRole(auth.role)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }

    const cursoId   = params.curso_id   ? parseInt(params.curso_id)   : null
    const instrutor = params.instrutor  ? params.instrutor             : null
    const tipo      = params.tipo       || 'colaboradores'

    if (tipo === 'instrutores') {
      // Resumo por instrutor
      const resumo = await sql`
        SELECT
          c.instrutor,
          MIN(ci.user_id)                             AS user_id,
          COUNT(DISTINCT c.id)                        AS total_cursos,
          SUM(COALESCE(ca_count.total, 0))            AS total_alunos,
          ROUND(AVG(COALESCE(prog.pct_medio, 0)), 1)  AS pct_conclusao_medio,
          COUNT(DISTINCT c.id) FILTER (WHERE c.obrigatorio) AS cursos_obrigatorios
        FROM cursos c
        LEFT JOIN curso_instrutores ci ON ci.curso_id = c.id
        LEFT JOIN (
          SELECT curso_id, COUNT(DISTINCT colaborador_id) AS total
          FROM curso_atribuicao GROUP BY curso_id
        ) ca_count ON ca_count.curso_id = c.id
        LEFT JOIN (
          SELECT
            tp.curso_id,
            ROUND(
              100.0 * COUNT(*) FILTER (WHERE tp.concluido) / NULLIF(COUNT(*), 0), 1
            ) AS pct_medio
          FROM treinamento_progresso tp
          GROUP BY tp.curso_id
        ) prog ON prog.curso_id = c.id
        WHERE c.ativo = true
          AND c.instrutor IS NOT NULL AND c.instrutor <> ''
        GROUP BY c.instrutor
        ORDER BY total_alunos DESC, c.instrutor
      `

      // Detalhe por curso usando CTE para evitar subqueries correlacionadas
      const detalheRaw = await sql`
        WITH modulo_status AS (
          SELECT
            ca.colaborador_id,
            ca.curso_id,
            jsonb_array_length(c.modulos)                              AS total_modulos,
            COUNT(tp.modulo_id) FILTER (WHERE tp.concluido = true)     AS concluidos_count
          FROM curso_atribuicao ca
          JOIN cursos c ON c.id = ca.curso_id
          LEFT JOIN users u ON u.colaborador_id = ca.colaborador_id
          LEFT JOIN treinamento_progresso tp
            ON tp.user_id = u.id AND tp.curso_id = ca.curso_id
          GROUP BY ca.colaborador_id, ca.curso_id, jsonb_array_length(c.modulos)
        ),
        curso_stats AS (
          SELECT
            curso_id,
            COUNT(*)                                                                            AS total_alunos,
            COUNT(*) FILTER (WHERE total_modulos > 0 AND concluidos_count >= total_modulos)     AS concluidos,
            COUNT(*) FILTER (WHERE concluidos_count > 0 AND concluidos_count < total_modulos)   AS em_andamento,
            ROUND(100.0 * SUM(concluidos_count) / NULLIF(SUM(total_modulos), 0), 1)            AS pct_conclusao
          FROM modulo_status
          GROUP BY curso_id
        )
        SELECT
          c.id          AS curso_id,
          c.titulo,
          c.versao,
          c.instrutor,
          c.categoria,
          c.obrigatorio,
          COALESCE(s.total_alunos, 0)::int   AS total_alunos,
          COALESCE(s.concluidos, 0)::int     AS concluidos,
          COALESCE(s.em_andamento, 0)::int   AS em_andamento,
          GREATEST(0, COALESCE(s.total_alunos,0) - COALESCE(s.concluidos,0) - COALESCE(s.em_andamento,0))::int AS nao_iniciados,
          ROUND(COALESCE(s.pct_conclusao, 0), 1) AS pct_conclusao
        FROM cursos c
        LEFT JOIN curso_stats s ON s.curso_id = c.id
        WHERE c.ativo = true AND c.instrutor IS NOT NULL AND c.instrutor <> ''
        ORDER BY c.instrutor, c.titulo
      `

      // Filtro de instrutor aplicado em JS para evitar template literal aninhado
      const detalhe = instrutor
        ? detalheRaw.filter(r => r.instrutor && r.instrutor.toLowerCase().includes(instrutor.toLowerCase()))
        : detalheRaw

      return { statusCode: 200, headers, body: JSON.stringify({ tipo: 'instrutores', resumo, detalhe }) }
    }

    // Default: relatório colaborador × curso
    const rows = await sql`
      SELECT
        col.id              AS colaborador_id,
        col.nome            AS colaborador,
        col.cargo,
        col.area,
        c.id                AS curso_id,
        c.titulo            AS curso,
        c.categoria,
        c.instrutor,
        c.obrigatorio,
        jsonb_array_length(c.modulos)                                   AS total_modulos,
        COUNT(tp.modulo_id) FILTER (WHERE tp.concluido = true)::int     AS modulos_concluidos,
        ROUND(
          100.0 * COUNT(tp.modulo_id) FILTER (WHERE tp.concluido = true)
          / NULLIF(jsonb_array_length(c.modulos), 0), 1
        )                                                               AS pct_conclusao,
        CASE
          WHEN jsonb_array_length(c.modulos) = 0 THEN 'Sem módulos'
          WHEN COUNT(tp.modulo_id) FILTER (WHERE tp.concluido = true) >= jsonb_array_length(c.modulos) THEN 'Concluído'
          WHEN COUNT(tp.modulo_id) FILTER (WHERE tp.concluido = true) > 0 THEN 'Em andamento'
          ELSE 'Não iniciado'
        END                                                             AS status,
        BOOL_OR(tp.validado)                                            AS validado,
        MAX(tp.data_validacao)                                          AS data_validacao,
        MAX(tp.validado_por)                                            AS validado_por,
        MIN(tp.updated_at) FILTER (WHERE tp.concluido = true)          AS data_primeiro_modulo,
        MAX(tp.updated_at) FILTER (WHERE tp.concluido = true)          AS data_conclusao
      FROM curso_atribuicao ca
      JOIN colaboradores col ON col.id = ca.colaborador_id
      JOIN cursos c ON c.id = ca.curso_id
      LEFT JOIN users u ON u.colaborador_id = ca.colaborador_id
      LEFT JOIN treinamento_progresso tp ON tp.user_id = u.id AND tp.curso_id = ca.curso_id
      WHERE col.ativo = true
      GROUP BY col.id, col.nome, col.cargo, col.area, c.id, c.titulo, c.categoria, c.instrutor, c.obrigatorio, c.modulos
      ORDER BY col.nome, c.titulo
    `

    // Filtros opcionais aplicados em JS
    const filtered = rows.filter(r => {
      if (cursoId && r.curso_id !== cursoId) return false
      if (instrutor && !(r.instrutor || '').toLowerCase().includes(instrutor.toLowerCase())) return false
      return true
    })

    return { statusCode: 200, headers, body: JSON.stringify({ tipo: 'colaboradores', rows: filtered }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('relatorio-treinamentos error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
