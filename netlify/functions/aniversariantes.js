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

    const diasAFrente = 30

    // Usa offset de dia-do-ano para evitar MAKE_DATE com 29/fev em anos não-bissextos.
    // Ex: nascido 29/fev/1980 → data_este_ano = 1/mar/2025 em ano comum.
    const aniversariosNasc = await sql`
      WITH base AS (
        SELECT
          id, nome, cargo, area, photo_url, data_nascimento,
          (DATE_TRUNC('year', CURRENT_DATE)::date
            + (data_nascimento - DATE_TRUNC('year', data_nascimento)::date)) AS data_este_ano
        FROM colaboradores
        WHERE data_nascimento IS NOT NULL AND ativo = true
      )
      SELECT
        id, nome, cargo, area, photo_url, data_nascimento,
        CASE WHEN data_este_ano >= CURRENT_DATE
             THEN data_este_ano
             ELSE (data_este_ano + INTERVAL '1 year')::date
        END AS proxima_data
      FROM base
      WHERE
        CASE WHEN data_este_ano >= CURRENT_DATE
             THEN data_este_ano
             ELSE (data_este_ano + INTERVAL '1 year')::date
        END <= CURRENT_DATE + ${diasAFrente}
      ORDER BY proxima_data
    `

    const aniversariosEmpresa = await sql`
      WITH base AS (
        SELECT
          id, nome, cargo, area, photo_url, data_admissao,
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_admissao))::int AS anos_empresa,
          (DATE_TRUNC('year', CURRENT_DATE)::date
            + (data_admissao - DATE_TRUNC('year', data_admissao)::date)) AS data_este_ano
        FROM colaboradores
        WHERE data_admissao IS NOT NULL AND ativo = true
          AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_admissao)) >= 1
      )
      SELECT
        id, nome, cargo, area, photo_url, data_admissao, anos_empresa,
        CASE WHEN data_este_ano >= CURRENT_DATE
             THEN data_este_ano
             ELSE (data_este_ano + INTERVAL '1 year')::date
        END AS proxima_data
      FROM base
      WHERE
        CASE WHEN data_este_ano >= CURRENT_DATE
             THEN data_este_ano
             ELSE (data_este_ano + INTERVAL '1 year')::date
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
