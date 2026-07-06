const { neon } = require('@neondatabase/serverless')
const { requireAuth, makeHeaders } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

  try {
    requireAuth(event)

    // Dias para considerar como "próximos" (janela de 30 dias, exceto hoje = -1 para inclusão)
    const diasAFrente = 30

    // Aniversários de nascimento nos próximos diasAFrente dias (usando EXTRACT para ignorar o ano)
    const aniversariosNasc = await sql`
      SELECT
        id, nome, cargo, area, photo_url,
        data_nascimento,
        -- Próxima ocorrência do aniversário neste ou próximo ano
        CASE
          WHEN (
            MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                      EXTRACT(MONTH FROM data_nascimento)::int,
                      EXTRACT(DAY FROM data_nascimento)::int)
          ) >= CURRENT_DATE
          THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                         EXTRACT(MONTH FROM data_nascimento)::int,
                         EXTRACT(DAY FROM data_nascimento)::int)
          ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
                         EXTRACT(MONTH FROM data_nascimento)::int,
                         EXTRACT(DAY FROM data_nascimento)::int)
        END AS proxima_data
      FROM colaboradores
      WHERE data_nascimento IS NOT NULL AND ativo = true
      HAVING
        CASE
          WHEN (
            MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                      EXTRACT(MONTH FROM data_nascimento)::int,
                      EXTRACT(DAY FROM data_nascimento)::int)
          ) >= CURRENT_DATE
          THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                         EXTRACT(MONTH FROM data_nascimento)::int,
                         EXTRACT(DAY FROM data_nascimento)::int)
          ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
                         EXTRACT(MONTH FROM data_nascimento)::int,
                         EXTRACT(DAY FROM data_nascimento)::int)
        END <= CURRENT_DATE + ${diasAFrente}
      ORDER BY proxima_data
    `

    // Aniversários de empresa nos próximos diasAFrente dias
    const aniversariosEmpresa = await sql`
      SELECT
        id, nome, cargo, area, photo_url,
        data_admissao,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_admissao))::int AS anos_empresa,
        CASE
          WHEN (
            MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                      EXTRACT(MONTH FROM data_admissao)::int,
                      EXTRACT(DAY FROM data_admissao)::int)
          ) >= CURRENT_DATE
          THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                         EXTRACT(MONTH FROM data_admissao)::int,
                         EXTRACT(DAY FROM data_admissao)::int)
          ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
                         EXTRACT(MONTH FROM data_admissao)::int,
                         EXTRACT(DAY FROM data_admissao)::int)
        END AS proxima_data
      FROM colaboradores
      WHERE data_admissao IS NOT NULL AND ativo = true
        AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_admissao)) >= 1
      HAVING
        CASE
          WHEN (
            MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                      EXTRACT(MONTH FROM data_admissao)::int,
                      EXTRACT(DAY FROM data_admissao)::int)
          ) >= CURRENT_DATE
          THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                         EXTRACT(MONTH FROM data_admissao)::int,
                         EXTRACT(DAY FROM data_admissao)::int)
          ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
                         EXTRACT(MONTH FROM data_admissao)::int,
                         EXTRACT(DAY FROM data_admissao)::int)
        END <= CURRENT_DATE + ${diasAFrente}
      ORDER BY proxima_data
    `

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        nascimento: aniversariosNasc,
        empresa:    aniversariosEmpresa,
      }),
    }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('aniversariantes error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
