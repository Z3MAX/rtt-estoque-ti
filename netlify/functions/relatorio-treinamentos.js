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
    const tipo      = params.tipo       || 'colaboradores' // 'colaboradores' | 'instrutores'

    if (tipo === 'instrutores') {
      // Relatório por instrutor: cursos ministrados, alunos, % conclusão média
      const rows = await sql`
        SELECT
          c.instrutor,
          COUNT(DISTINCT c.id)                        AS total_cursos,
          SUM(COALESCE(ca_count.total, 0))            AS total_alunos,
          ROUND(AVG(COALESCE(prog.pct_medio, 0)), 1)  AS pct_conclusao_medio,
          COUNT(DISTINCT c.id) FILTER (WHERE c.obrigatorio) AS cursos_obrigatorios
        FROM cursos c
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
          ${instrutor ? sql`AND c.instrutor ILIKE ${'%' + instrutor + '%'}` : sql``}
        GROUP BY c.instrutor
        ORDER BY total_alunos DESC, c.instrutor
      `

      // Per-instrutor course detail
      const detalhe = await sql`
        SELECT
          c.id AS curso_id,
          c.titulo,
          c.instrutor,
          c.categoria,
          c.obrigatorio,
          COALESCE(ca_count.total, 0)::int AS total_alunos,
          COALESCE(prog.concluidos, 0)::int AS concluidos,
          COALESCE(prog.em_andamento, 0)::int AS em_andamento,
          COALESCE(prog.nao_iniciados, 0)::int AS nao_iniciados,
          ROUND(COALESCE(prog.pct_medio, 0), 1) AS pct_conclusao
        FROM cursos c
        LEFT JOIN (
          SELECT curso_id, COUNT(DISTINCT colaborador_id) AS total
          FROM curso_atribuicao GROUP BY curso_id
        ) ca_count ON ca_count.curso_id = c.id
        LEFT JOIN (
          SELECT
            ca.curso_id,
            COUNT(DISTINCT ca.colaborador_id) FILTER (
              WHERE (
                SELECT COUNT(*) FROM treinamento_progresso tp2
                JOIN users u2 ON u2.colaborador_id = ca.colaborador_id
                WHERE tp2.user_id = u2.id AND tp2.curso_id = ca.curso_id AND tp2.concluido = true
              ) >= jsonb_array_length((SELECT modulos FROM cursos WHERE id = ca.curso_id))
              AND jsonb_array_length((SELECT modulos FROM cursos WHERE id = ca.curso_id)) > 0
            ) AS concluidos,
            COUNT(DISTINCT ca.colaborador_id) FILTER (
              WHERE (
                SELECT COUNT(*) FROM treinamento_progresso tp2
                JOIN users u2 ON u2.colaborador_id = ca.colaborador_id
                WHERE tp2.user_id = u2.id AND tp2.curso_id = ca.curso_id AND tp2.concluido = true
              ) > 0 AND (
                SELECT COUNT(*) FROM treinamento_progresso tp2
                JOIN users u2 ON u2.colaborador_id = ca.colaborador_id
                WHERE tp2.user_id = u2.id AND tp2.curso_id = ca.curso_id AND tp2.concluido = true
              ) < jsonb_array_length((SELECT modulos FROM cursos WHERE id = ca.curso_id))
            ) AS em_andamento,
            ROUND(
              100.0 * COUNT(DISTINCT tp.modulo_id) FILTER (WHERE tp.concluido = true)
              / NULLIF(COUNT(DISTINCT tp.modulo_id), 0), 1
            ) AS pct_medio
          FROM curso_atribuicao ca
          LEFT JOIN users u ON u.colaborador_id = ca.colaborador_id
          LEFT JOIN treinamento_progresso tp ON tp.user_id = u.id AND tp.curso_id = ca.curso_id
          GROUP BY ca.curso_id
        ) prog ON prog.curso_id = c.id
        WHERE c.ativo = true AND c.instrutor IS NOT NULL AND c.instrutor <> ''
          ${instrutor ? sql`AND c.instrutor ILIKE ${'%' + instrutor + '%'}` : sql``}
        ORDER BY c.instrutor, c.titulo
      `

      // Calculate nao_iniciados from total - concluidos - em_andamento
      const detalheFixed = detalhe.map(r => ({
        ...r,
        nao_iniciados: Math.max(0, r.total_alunos - r.concluidos - r.em_andamento),
      }))

      return { statusCode: 200, headers, body: JSON.stringify({ tipo: 'instrutores', resumo: rows, detalhe: detalheFixed }) }
    }

    // Default: relatório por colaborador x curso
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
        MIN(tp.updated_at) FILTER (WHERE tp.concluido = true)          AS data_inicio,
        MAX(tp.updated_at) FILTER (WHERE tp.concluido = true)          AS data_conclusao
      FROM curso_atribuicao ca
      JOIN colaboradores col ON col.id = ca.colaborador_id
      JOIN cursos c ON c.id = ca.curso_id
      LEFT JOIN users u ON u.colaborador_id = ca.colaborador_id
      LEFT JOIN treinamento_progresso tp ON tp.user_id = u.id AND tp.curso_id = ca.curso_id
      WHERE col.ativo = true
        ${cursoId   ? sql`AND c.id = ${cursoId}`                         : sql``}
        ${instrutor ? sql`AND c.instrutor ILIKE ${'%' + instrutor + '%'}` : sql``}
      GROUP BY col.id, col.nome, col.cargo, col.area, c.id, c.titulo, c.categoria, c.instrutor, c.obrigatorio, c.modulos
      ORDER BY col.nome, c.titulo
    `

    return { statusCode: 200, headers, body: JSON.stringify({ tipo: 'colaboradores', rows }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('relatorio-treinamentos error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
