const Anthropic = require('@anthropic-ai/sdk')
const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

const ALLOWED_ROLES = ['Administrador Master', 'Administrador de RH', 'Administrador de TI', 'Administrador de RH / Gestor']

const SCHEMA = `
Você é um assistente de RH inteligente da empresa Rema Tip Top. Você tem acesso ao banco de dados de RH da empresa e pode consultar informações sobre colaboradores, avaliações, treinamentos, pesquisas e muito mais. Sempre responda em português brasileiro de forma clara e amigável.

SCHEMA DO BANCO DE DADOS:

-- Colaboradores da empresa
CREATE TABLE colaboradores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT,
  nivel TEXT,  -- 'junior', 'pleno', 'senior', 'coordenador', 'gerente', 'diretor'
  area TEXT,   -- departamento/área
  email TEXT,
  gestor_nome TEXT,
  ativo BOOLEAN DEFAULT true,
  data_nascimento DATE,
  data_admissao DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ciclos de avaliação de desempenho
CREATE TABLE ciclos_avaliacao (
  id SERIAL PRIMARY KEY,
  periodo_inicial TEXT NOT NULL,  -- ex: '1Sem_2025'
  periodo_final TEXT,
  status TEXT DEFAULT 'aberto',  -- 'aberto', 'encerrado'
  prazo TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Avaliações individuais de colaboradores (Matriz 9-Box)
CREATE TABLE avaliacoes (
  id SERIAL PRIMARY KEY,
  colaborador_id INTEGER REFERENCES colaboradores(id),
  colaborador_nome TEXT,
  avaliador_nome TEXT,
  ciclo_id INTEGER REFERENCES ciclos_avaliacao(id),
  tipo TEXT DEFAULT 'lideranca',  -- 'lideranca', 'individual'
  periodo_inicial TEXT,
  periodo_final TEXT,
  nivel_cargo TEXT,
  score_desempenho NUMERIC(3,1),  -- 1.0 a 5.0
  score_potencial NUMERIC(3,1),   -- 1.0 a 5.0
  nivel_desempenho TEXT,          -- 'Baixo', 'Médio', 'Alto'
  nivel_potencial TEXT,           -- 'Baixo', 'Médio', 'Alto'
  quadrante TEXT,                 -- ex: 'E3', 'M2', 'B1'
  status TEXT DEFAULT 'concluido',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true
);

-- Cursos de treinamento online
CREATE TABLE cursos (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  carga_horaria INTEGER,  -- em minutos
  versao TEXT,
  status TEXT DEFAULT 'rascunho',  -- 'rascunho', 'publicado'
  obrigatorio BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true
);

-- Atribuição de cursos a colaboradores
CREATE TABLE curso_atribuicao (
  id SERIAL PRIMARY KEY,
  colaborador_id INTEGER REFERENCES colaboradores(id),
  curso_id INTEGER REFERENCES cursos(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Progresso dos colaboradores nos cursos
CREATE TABLE treinamento_progresso (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  curso_id INTEGER REFERENCES cursos(id),
  modulo_id INTEGER,
  concluido BOOLEAN DEFAULT false,
  segundos_assistidos INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usuários do sistema (associados a colaboradores)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT,  -- 'Administrador Master', 'Administrador de RH', 'Gestor', 'Colaborador', etc.
  colaborador_id INTEGER REFERENCES colaboradores(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pesquisas e enquetes
CREATE TABLE pesquisas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  objetivo TEXT,
  tipo TEXT,         -- 'pulso', 'clima', 'satisfacao', etc.
  situacao TEXT,     -- 'RASCUNHO', 'LIBERADA', 'ENCERRADA'
  anonima BOOLEAN DEFAULT false,
  data_inicio TIMESTAMP,
  data_fim TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true
);

-- Respostas de pesquisas
CREATE TABLE pesquisa_respostas (
  id SERIAL PRIMARY KEY,
  pesquisa_id INTEGER REFERENCES pesquisas(id),
  colaborador_id INTEGER,
  user_id INTEGER,
  anonima BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Treinamentos presenciais
CREATE TABLE treinamentos_presenciais (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  instrutor TEXT,
  local TEXT,
  data_evento TIMESTAMP,
  status TEXT DEFAULT 'AGENDADO',  -- 'AGENDADO', 'ABERTA', 'ENCERRADA'
  created_at TIMESTAMP DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true
);

-- Registros de presença em treinamentos presenciais
CREATE TABLE presenca_registros (
  id SERIAL PRIMARY KEY,
  treinamento_id INTEGER REFERENCES treinamentos_presenciais(id),
  colaborador_id INTEGER,
  nome TEXT NOT NULL,
  cargo TEXT,
  area TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PDI (Plano de Desenvolvimento Individual)
CREATE TABLE pdi (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  titulo TEXT NOT NULL,
  competencia TEXT,
  prazo DATE,
  status TEXT DEFAULT 'pendente',  -- 'pendente', 'em_andamento', 'concluido'
  pct INTEGER DEFAULT 0,  -- porcentagem de conclusão
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comunicados internos
CREATE TABLE comunicados (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  resumo TEXT,
  categoria TEXT,
  fixado BOOLEAN DEFAULT false,
  areas TEXT[],  -- áreas que recebem o comunicado (null = todos)
  created_at TIMESTAMP DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true
);

REGRAS IMPORTANTES:
1. Gere APENAS queries SELECT — nunca INSERT, UPDATE, DELETE, DROP, ALTER, etc.
2. Sempre use LIMIT quando a lista pode ser longa (máximo 50 registros por default)
3. Filtre por ativo = true em colaboradores e cursos quando relevante
4. Para datas, use funções PostgreSQL nativas
5. Ao formatar a resposta, seja claro, use listas quando apropriado e destaque números importantes
6. Se não encontrar dados, explique que pode não haver registros para aquele critério
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
