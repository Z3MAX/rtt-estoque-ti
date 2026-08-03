const Anthropic = require('@anthropic-ai/sdk')
const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

const ALLOWED_ROLES = ['Administrador Master', 'Administrador de RH', 'Administrador de TI', 'Administrador de RH / Gestor']

const SCHEMA = `
Você é um assistente de RH inteligente da empresa Rema Tip Top. Você tem acesso somente leitura ao banco de dados PostgreSQL de RH. Responda sempre em português brasileiro de forma clara e objetiva. Use tabelas markdown quando listar múltiplos registros.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABELAS DO BANCO DE DADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ATENÇÃO: a tabela de avaliações chama-se "ciclos_avaliacao", NÃO "avaliacoes"
-- ATENÇÃO: a tabela de PDI chama-se "pdi_iniciativas", NÃO "pdi"

TABLE colaboradores (
  id SERIAL PK,
  nome TEXT,
  cargo TEXT,
  nivel TEXT,        -- 'trainee','junior','pleno','senior','assistente','tecnico','vendedor',
                     -- 'supervisor','especialista','consultor','engenheiro',
                     -- 'coordenador','gerente','gerente_executivo','diretor'
  area TEXT,         -- nome do departamento, ex: 'T.I', 'Comercial', 'Financeiro', 'RH'
  email TEXT,
  gestor_nome TEXT,  -- nome livre do gestor (não é FK)
  ativo BOOLEAN,     -- true = ativo, false = desligado
  data_nascimento DATE,
  data_admissao DATE,
  photo_url TEXT,
  bio TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

TABLE users (
  id SERIAL PK,
  name TEXT,
  email TEXT UNIQUE,
  role TEXT,           -- ver roles abaixo
  colaborador_id INTEGER,  -- FK colaboradores.id (um user pode ser associado a um colaborador)
  active BOOLEAN,
  area TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
-- Roles possíveis: 'Administrador Master', 'Administrador de RH', 'Administrador de RH / Gestor',
--   'Administrador de TI', 'Gestor', 'Instrutor', 'Técnico de RH', 'Técnico de TI', 'Beta Teste'

-- Avaliações individuais de desempenho — Matriz 9-Box
-- NOME REAL DA TABELA: ciclos_avaliacao (nunca use o nome "avaliacoes")
TABLE ciclos_avaliacao (
  id SERIAL PK,
  colaborador_id INTEGER,   -- FK colaboradores.id
  colaborador_nome TEXT,    -- desnormalizado
  avaliador_id INTEGER,     -- FK users.id
  avaliador_nome TEXT,      -- desnormalizado
  tipo TEXT,                -- 'lideranca' (avaliado pelo gestor) | 'autoavaliacao'
  periodo_inicial TEXT,     -- ex: '1Sem_2025', '2Sem_2024' — liga ao ciclo aberto
  periodo_final TEXT,
  nivel_cargo TEXT,
  score_desempenho DECIMAL, -- 1.0 a 5.0
  score_potencial DECIMAL,  -- 1.0 a 5.0
  nivel_desempenho TEXT,    -- 'Baixo' (<2.7) | 'Médio' (2.7–3.9) | 'Alto' (≥4.0)
  nivel_potencial TEXT,     -- 'Baixo' | 'Médio' | 'Alto'
  quadrante TEXT,           -- Matriz 9-Box: 'E3','E2','E1','M3','M2','M1','B3','B2','B1'
                            -- E=Alto potencial, M=Médio, B=Baixo | 3=Alto desemp, 2=Médio, 1=Baixo
                            -- E3=Talento Top, M2=Mantenedor/Eficaz, B1=Risco/Subpadrão
  respostas JSONB,          -- mapa de competência → {nota, observacao}
  status TEXT,              -- 'pendente' (aguarda calibração RH) | 'concluido' (calibrado)
  ativo BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Ciclos de avaliação (controle de abertura/fechamento)
TABLE ciclos (
  id SERIAL PK,
  periodo_inicial TEXT,  -- ex: '1Sem_2025' — chave que liga a ciclos_avaliacao.periodo_inicial
  periodo_final TEXT,
  prazo DATE,
  status TEXT,           -- 'aberto' | 'encerrado'
  created_by INTEGER,    -- FK users.id
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Plano de Sucessão (1:1 com colaboradores)
TABLE sucessao_colaborador (
  id SERIAL PK,
  colaborador_id INTEGER UNIQUE,  -- FK colaboradores.id
  candidato BOOLEAN,              -- true = é candidato a sucessão
  probabilidade SMALLINT,         -- 0-100
  impacto SMALLINT,               -- nível de impacto da saída
  dificuldade SMALLINT,           -- dificuldade de reposição
  prontidao TEXT,                 -- ex: 'Imediato', '6 meses', '1 ano', '2 anos'
  acoes JSONB,                    -- array de ações planejadas
  obs_risco TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

TABLE cursos (
  id SERIAL PK,
  titulo TEXT,
  descricao TEXT,
  categoria TEXT,
  nivel TEXT,          -- 'Básico' | 'Intermediário' | 'Avançado'
  instrutor TEXT,
  obrigatorio BOOLEAN,
  status TEXT,         -- 'rascunho' | 'publicado' | 'inativo'
  modulos JSONB,       -- array de {id, titulo, duracao, tipo}
  ativo BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Atribuição de cursos a colaboradores
TABLE curso_atribuicao (
  id SERIAL PK,
  colaborador_id INTEGER,  -- FK colaboradores.id
  curso_id INTEGER,        -- FK cursos.id
  auto_inscrito BOOLEAN,   -- true se inscrito automaticamente por requisito de cargo/área
  created_at TIMESTAMP,
  UNIQUE (colaborador_id, curso_id)
);

-- Progresso dos usuários nos módulos dos cursos
-- ATENÇÃO: usa user_id (users.id), não colaborador_id
-- Para ligar a colaborador: JOIN users u ON u.id = treinamento_progresso.user_id → u.colaborador_id
TABLE treinamento_progresso (
  id SERIAL PK,
  user_id INTEGER,        -- FK users.id
  curso_id INTEGER,       -- FK cursos.id
  modulo_id INTEGER,      -- ID do módulo dentro do curso (ver cursos.modulos JSONB)
  concluido BOOLEAN,
  segundos_assistidos INTEGER,
  validado BOOLEAN,       -- validado pelo RH?
  data_validacao DATE,
  validado_por TEXT,      -- nome do RH que validou
  updated_at TIMESTAMP,
  UNIQUE (user_id, curso_id, modulo_id)
);

-- Avaliações de qualidade dos cursos pelos usuários (estrelas 1-5)
TABLE curso_avaliacoes (
  id SERIAL PK,
  curso_id INTEGER,   -- FK cursos.id
  user_id INTEGER,    -- FK users.id
  nota SMALLINT,      -- 1 a 5
  comentario TEXT,
  created_at TIMESTAMP,
  UNIQUE (curso_id, user_id)
);

TABLE pesquisas (
  id SERIAL PK,
  nome TEXT,
  objetivo TEXT,
  tipo TEXT,         -- 'pulso' | 'clima' | 'satisfacao' | outros
  situacao TEXT,     -- 'RASCUNHO' | 'LIBERADA' | 'ENCERRADA'
  anonima BOOLEAN,
  perguntas JSONB,   -- array de perguntas
  colaborador_ids JSONB,  -- IDs dos destinatários ([] = todos)
  data_inicio TIMESTAMP,
  data_fim TIMESTAMP,
  created_by INTEGER,
  ativo BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Cada resposta = uma submissão de pesquisa por colaborador/user
TABLE pesquisa_respostas (
  id SERIAL PK,
  pesquisa_id INTEGER,    -- FK pesquisas.id
  colaborador_id INTEGER, -- FK colaboradores.id (null se anônima)
  user_id INTEGER,        -- FK users.id (null se anônima)
  respostas JSONB,        -- array de respostas às perguntas
  anonima BOOLEAN,
  created_at TIMESTAMP
);

-- Humor/bem-estar diário dos colaboradores
TABLE humor_feedbacks (
  id SERIAL PK,
  user_id INTEGER,   -- FK users.id
  user_name TEXT,
  humor TEXT,        -- label do humor (ex: 'Ótimo', 'Bom', 'Regular', 'Ruim')
  comentario TEXT,
  created_at TIMESTAMP
);

TABLE comunicados (
  id SERIAL PK,
  titulo TEXT,
  resumo TEXT,
  conteudo TEXT,
  categoria TEXT,
  fixado BOOLEAN,
  publicado BOOLEAN,
  autor_nome TEXT,
  areas TEXT[],      -- null = todos os setores; ex: '{T.I,Comercial}'
  imagem TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- PDI — Plano de Desenvolvimento Individual
-- NOME REAL DA TABELA: pdi_iniciativas (nunca use "pdi")
TABLE pdi_iniciativas (
  id SERIAL PK,
  user_id INTEGER,    -- FK users.id
  titulo TEXT,
  competencia TEXT,
  prazo TEXT,
  status TEXT,        -- 'pendente' | 'em_andamento' | 'concluido'
  pct SMALLINT,       -- 0-100 (porcentagem de conclusão)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

TABLE treinamentos_presenciais (
  id SERIAL PK,
  titulo TEXT,
  descricao TEXT,
  instrutor TEXT,
  local TEXT,
  data_evento TIMESTAMP,
  status TEXT,   -- 'AGENDADO' | 'ABERTA' | 'ENCERRADA'
  token UUID,    -- token público para QR code
  codigo TEXT,   -- código do instrutor para validar presença
  created_by INTEGER,
  ativo BOOLEAN,
  created_at TIMESTAMP
);

TABLE presenca_registros (
  id SERIAL PK,
  treinamento_id INTEGER,  -- FK treinamentos_presenciais.id
  colaborador_id INTEGER,  -- FK colaboradores.id (null se externo)
  nome TEXT,
  cargo TEXT,
  area TEXT,
  created_at TIMESTAMP
);

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RELACIONAMENTOS CHAVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Notas de desempenho: ciclos_avaliacao.colaborador_id = colaboradores.id
-- Usuário ↔ colaborador: users.colaborador_id = colaboradores.id
-- Progresso de curso: treinamento_progresso.user_id → users.id → users.colaborador_id → colaboradores.id
-- Ciclo ativo: ciclos WHERE status = 'aberto'; liga a ciclos_avaliacao por periodo_inicial (string igual)
-- Sucessão: 1:1 com colaboradores via sucessao_colaborador.colaborador_id
-- Gestor: LOWER(TRIM(colaboradores.gestor_nome)) = LOWER(TRIM(users.name)) (comparação por nome)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PADRÕES DE CONSULTA OBRIGATÓRIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ❶ NOTA MAIS RECENTE por colaborador (use SEMPRE este padrão para scores):
WITH ultima_avaliacao AS (
  SELECT DISTINCT ON (colaborador_id)
    colaborador_id, score_desempenho, score_potencial,
    nivel_desempenho, nivel_potencial, quadrante, periodo_inicial
  FROM ciclos_avaliacao
  WHERE status = 'concluido'
  ORDER BY colaborador_id, created_at DESC
)
SELECT c.nome, c.cargo, c.area,
       ua.score_desempenho, ua.score_potencial, ua.quadrante
FROM colaboradores c
LEFT JOIN ultima_avaliacao ua ON ua.colaborador_id = c.id
WHERE c.ativo = true
ORDER BY ua.score_desempenho DESC NULLS LAST
LIMIT 50;

-- ❷ RANKING por área específica (adapte o filtro WHERE c.area ILIKE):
WITH ultima AS (
  SELECT DISTINCT ON (colaborador_id)
    colaborador_id, score_desempenho, score_potencial, quadrante
  FROM ciclos_avaliacao WHERE status = 'concluido'
  ORDER BY colaborador_id, created_at DESC
)
SELECT c.nome, c.cargo, u.score_desempenho, u.score_potencial, u.quadrante
FROM colaboradores c
INNER JOIN ultima u ON u.colaborador_id = c.id
WHERE c.ativo = true AND c.area ILIKE '%T.I%'
ORDER BY u.score_desempenho DESC;

-- ❸ PROGRESSO DE TREINAMENTO (ponte: colaborador → user → progresso):
SELECT col.nome, col.area, c.titulo,
       COUNT(DISTINCT tp.modulo_id) FILTER (WHERE tp.concluido) AS modulos_concluidos,
       jsonb_array_length(c.modulos) AS total_modulos
FROM curso_atribuicao ca
JOIN colaboradores col ON col.id = ca.colaborador_id
JOIN cursos c ON c.id = ca.curso_id AND c.ativo = true
LEFT JOIN users u ON u.colaborador_id = ca.colaborador_id AND u.active = true
LEFT JOIN treinamento_progresso tp ON tp.user_id = u.id AND tp.curso_id = ca.curso_id
GROUP BY col.nome, col.area, c.titulo, c.modulos
LIMIT 50;

-- ❹ PESQUISAS respondidas vs total enviadas:
SELECT p.nome, p.tipo, p.situacao,
       COUNT(pr.id) AS respostas_recebidas,
       jsonb_array_length(p.colaborador_ids) AS total_destinatarios
FROM pesquisas p
LEFT JOIN pesquisa_respostas pr ON pr.pesquisa_id = p.id
WHERE p.ativo = true
GROUP BY p.id, p.nome, p.tipo, p.situacao, p.colaborador_ids
ORDER BY p.created_at DESC
LIMIT 20;

-- ❺ DISTRIBUIÇÃO 9-BOX (quadrantes da última avaliação):
WITH ultima AS (
  SELECT DISTINCT ON (colaborador_id) colaborador_id, quadrante
  FROM ciclos_avaliacao WHERE status = 'concluido'
  ORDER BY colaborador_id, created_at DESC
)
SELECT quadrante,
       COUNT(*) AS quantidade,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentual
FROM ultima WHERE quadrante IS NOT NULL
GROUP BY quadrante ORDER BY quadrante;

-- ❻ PDI por status:
SELECT u.name AS colaborador, col.area,
       pi.titulo, pi.competencia, pi.status, pi.pct, pi.prazo
FROM pdi_iniciativas pi
JOIN users u ON u.id = pi.user_id
LEFT JOIN colaboradores col ON col.id = u.colaborador_id
ORDER BY pi.created_at DESC
LIMIT 50;

-- ❼ PRESENÇA EM TREINAMENTOS PRESENCIAIS:
SELECT tp.titulo, tp.data_evento, tp.status,
       COUNT(pr.id) AS total_presentes
FROM treinamentos_presenciais tp
LEFT JOIN presenca_registros pr ON pr.treinamento_id = tp.id
WHERE tp.ativo = true
GROUP BY tp.id, tp.titulo, tp.data_evento, tp.status
ORDER BY tp.data_evento DESC;

-- ❽ CICLO ATUAL ABERTO:
SELECT * FROM ciclos WHERE status = 'aberto' LIMIT 1;
-- Para avaliações do ciclo atual:
-- WHERE ca.periodo_inicial = (SELECT periodo_inicial FROM ciclos WHERE status = 'aberto' LIMIT 1)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS OBRIGATÓRIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Gere APENAS queries SELECT ou WITH...SELECT. NUNCA INSERT, UPDATE, DELETE, DROP, ALTER, CREATE.
2. Sempre adicione LIMIT (máximo 100 registros) exceto em COUNT/agregações.
3. Filtre ativo = true em colaboradores, cursos e treinamentos_presenciais.
4. Para scores/notas, use SEMPRE o padrão ❶ com DISTINCT ON para pegar a avaliação mais recente.
5. A tabela de avaliações se chama ciclos_avaliacao (NÃO "avaliacoes").
6. A tabela de PDI se chama pdi_iniciativas (NÃO "pdi").
7. Para buscar área, use ILIKE '%nome%' pois os nomes podem variar (ex: 'T.I', 'TI', 'Tecnologia').
8. Para progresso de curso, a ponte obrigatória é: colaboradores → curso_atribuicao → users (via users.colaborador_id) → treinamento_progresso.
9. Se não houver dados, informe claramente ao usuário ao invés de retornar resposta vazia.
10. Execute múltiplas queries se necessário para responder completamente a pergunta.
`

const TOOLS = [
  {
    name: 'executar_sql',
    description: 'Executa uma query SQL SELECT somente leitura no banco de dados de RH da Rema Tip Top.',
    input_schema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'Query SQL SELECT para executar. Apenas SELECT é permitido.',
        },
      },
      required: ['sql'],
    },
  },
]

function isSafeQuery(sql) {
  const upper = sql.trim().toUpperCase()
  if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) return false
  const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE']
  return !forbidden.some(kw => upper.includes(kw))
}

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }
  if (!process.env.ANTHROPIC_API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) }

  try {
    const auth = requireAuth(event)
    if (!ALLOWED_ROLES.includes(auth.role)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso restrito a administradores' }) }
    }

    const body = JSON.parse(event.body || '{}')
    const { messages } = body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'messages obrigatório' }) }
    }

    const sql = neon(process.env.DATABASE_URL)
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let currentMessages = [...messages]
    let finalText = ''
    const MAX_ITERATIONS = 5

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: SCHEMA,
        messages: currentMessages,
        tools: TOOLS,
      })

      // If Claude wants to stop and give a text answer
      if (response.stop_reason === 'end_turn') {
        finalText = response.content
          .filter(b => b.type === 'text')
          .map(b => b.text)
          .join('\n')
        break
      }

      // If Claude wants to use a tool
      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
        const toolResults = []

        for (const toolBlock of toolUseBlocks) {
          if (toolBlock.name === 'executar_sql') {
            const query = toolBlock.input.sql
            let result
            try {
              if (!isSafeQuery(query)) {
                result = { error: 'Query não permitida. Apenas SELECT é autorizado.' }
              } else {
                const rows = await sql(query)
                result = { rows: rows.slice(0, 100), total: rows.length }
              }
            } catch (err) {
              result = { error: `Erro na query: ${err.message}` }
            }
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: JSON.stringify(result),
            })
          }
        }

        // Add assistant response + tool results to messages
        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ]
        continue
      }

      // Unexpected stop reason
      finalText = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n')
      break
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response: finalText || 'Não consegui processar sua pergunta. Tente reformulá-la.' }),
    }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('ai-rh error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno ao processar a pergunta' }) }
  }
}
