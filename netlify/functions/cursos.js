const { neon } = require('@neondatabase/serverless')
const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

const DEFAULT_CURSOS = [
  {
    id: 1, titulo: 'LGPD e Proteção de Dados',
    descricao: 'Entenda os princípios da Lei Geral de Proteção de Dados e como aplicá-los no dia a dia da empresa, garantindo conformidade e segurança.',
    categoria: 'Compliance', duracao: '2h', nivel: 'Básico', obrigatorio: true,
    instrutor: 'Ana Beatriz Costa', avaliacao: 4.7, total_alunos: 142,
    capa_from: 'from-rose-500', capa_to: 'to-red-600', icone: '🔒', trilha_id: 1, ordem: 1,
    modulos: [
      { id: 11, titulo: 'Introdução à LGPD', duracao: '18min', tipo: 'video' },
      { id: 12, titulo: 'Princípios e bases legais', duracao: '22min', tipo: 'video' },
      { id: 13, titulo: 'Direitos dos titulares', duracao: '15min', tipo: 'video' },
      { id: 14, titulo: 'Material de apoio', duracao: '—', tipo: 'pdf' },
      { id: 15, titulo: 'Avaliação final', duracao: '20min', tipo: 'quiz' },
    ],
  },
  {
    id: 2, titulo: 'Cultura de Segurança no Trabalho',
    descricao: 'Aprenda sobre prevenção de acidentes, uso de EPIs e procedimentos de emergência para manter um ambiente de trabalho seguro.',
    categoria: 'Segurança', duracao: '3h', nivel: 'Básico', obrigatorio: true,
    instrutor: 'Carlos Eduardo Lima', avaliacao: 4.5, total_alunos: 138,
    capa_from: 'from-amber-500', capa_to: 'to-orange-600', icone: '⛑️', trilha_id: 1, ordem: 2,
    modulos: [
      { id: 21, titulo: 'Introdução à segurança', duracao: '20min', tipo: 'video' },
      { id: 22, titulo: 'EPIs obrigatórios', duracao: '25min', tipo: 'video' },
      { id: 23, titulo: 'Procedimentos de emergência', duracao: '30min', tipo: 'video' },
      { id: 24, titulo: 'Quiz de fixação', duracao: '15min', tipo: 'quiz' },
    ],
  },
  {
    id: 3, titulo: 'Excelência no Atendimento',
    descricao: 'Técnicas e práticas para oferecer um atendimento de qualidade, fidelizar clientes e resolver conflitos com empatia.',
    categoria: 'Soft Skills', duracao: '1h30', nivel: 'Intermediário', obrigatorio: false,
    instrutor: 'Mariana Oliveira', avaliacao: 4.9, total_alunos: 87,
    capa_from: 'from-emerald-500', capa_to: 'to-teal-600', icone: '🤝', trilha_id: 2, ordem: 3,
    modulos: [
      { id: 31, titulo: 'Fundamentos do atendimento', duracao: '20min', tipo: 'video' },
      { id: 32, titulo: 'Comunicação assertiva', duracao: '25min', tipo: 'video' },
      { id: 33, titulo: 'Gestão de conflitos', duracao: '20min', tipo: 'video' },
      { id: 34, titulo: 'Avaliação final', duracao: '15min', tipo: 'quiz' },
    ],
  },
  {
    id: 4, titulo: 'Liderança Situacional',
    descricao: 'Desenvolva sua capacidade de adaptar seu estilo de liderança conforme a maturidade e necessidade de cada colaborador.',
    categoria: 'Liderança', duracao: '4h', nivel: 'Avançado', obrigatorio: false,
    instrutor: 'Ricardo Alves', avaliacao: 4.8, total_alunos: 43,
    capa_from: 'from-violet-500', capa_to: 'to-purple-600', icone: '🏆', trilha_id: 2, ordem: 4,
    modulos: [
      { id: 41, titulo: 'O modelo situacional', duracao: '30min', tipo: 'video' },
      { id: 42, titulo: 'Estilos de liderança', duracao: '35min', tipo: 'video' },
      { id: 43, titulo: 'Diagnóstico de equipe', duracao: '25min', tipo: 'video' },
      { id: 44, titulo: 'Exercício prático', duracao: '—', tipo: 'pdf' },
      { id: 45, titulo: 'Avaliação final', duracao: '20min', tipo: 'quiz' },
    ],
  },
  {
    id: 5, titulo: 'Excel Avançado para Gestores',
    descricao: 'Domine tabelas dinâmicas, fórmulas avançadas, dashboards e automações com VBA para tomar decisões baseadas em dados.',
    categoria: 'Técnico', duracao: '5h', nivel: 'Avançado', obrigatorio: false,
    instrutor: 'Felipe Andrade', avaliacao: 4.6, total_alunos: 55,
    capa_from: 'from-sky-500', capa_to: 'to-blue-600', icone: '📊', trilha_id: 3, ordem: 5,
    modulos: [
      { id: 51, titulo: 'Revisão de fundamentos', duracao: '25min', tipo: 'video' },
      { id: 52, titulo: 'Fórmulas avançadas', duracao: '40min', tipo: 'video' },
      { id: 53, titulo: 'Tabelas dinâmicas', duracao: '35min', tipo: 'video' },
      { id: 54, titulo: 'Dashboards interativos', duracao: '45min', tipo: 'video' },
      { id: 55, titulo: 'Introdução ao VBA', duracao: '30min', tipo: 'video' },
    ],
  },
  {
    id: 6, titulo: 'Comunicação Não-Violenta',
    descricao: 'Aprenda a CNV para melhorar seus relacionamentos profissionais e pessoais com empatia, escuta ativa e observação sem julgamento.',
    categoria: 'Soft Skills', duracao: '2h', nivel: 'Intermediário', obrigatorio: false,
    instrutor: 'Juliana Ferreira', avaliacao: 4.9, total_alunos: 94,
    capa_from: 'from-pink-500', capa_to: 'to-rose-600', icone: '💬', trilha_id: null, ordem: 6,
    modulos: [
      { id: 61, titulo: 'O que é CNV', duracao: '20min', tipo: 'video' },
      { id: 62, titulo: 'Os 4 componentes', duracao: '25min', tipo: 'video' },
      { id: 63, titulo: 'Escuta empática', duracao: '20min', tipo: 'video' },
      { id: 64, titulo: 'Exercícios práticos', duracao: '15min', tipo: 'pdf' },
      { id: 65, titulo: 'Avaliação final', duracao: '20min', tipo: 'quiz' },
    ],
  },
  {
    id: 7, titulo: 'Normas de Segurança NR-12',
    descricao: 'Conheça os requisitos da NR-12 sobre segurança em máquinas e equipamentos, obrigatória para todas as áreas operacionais.',
    categoria: 'Segurança', duracao: '1h', nivel: 'Básico', obrigatorio: true,
    instrutor: 'Roberto Souza', avaliacao: 4.3, total_alunos: 131,
    capa_from: 'from-orange-500', capa_to: 'to-red-500', icone: '⚙️', trilha_id: 1, ordem: 7,
    modulos: [
      { id: 71, titulo: 'Introdução à NR-12', duracao: '15min', tipo: 'video' },
      { id: 72, titulo: 'Requisitos de segurança', duracao: '20min', tipo: 'video' },
      { id: 73, titulo: 'Avaliação', duracao: '10min', tipo: 'quiz' },
    ],
  },
  {
    id: 8, titulo: 'Gestão de Tempo e Produtividade',
    descricao: 'Técnicas como GTD, Pomodoro, matriz de Eisenhower e planejamento semanal para maximizar seu rendimento e reduzir o estresse.',
    categoria: 'Soft Skills', duracao: '2h30', nivel: 'Básico', obrigatorio: false,
    instrutor: 'Camila Nunes', avaliacao: 4.7, total_alunos: 109,
    capa_from: 'from-indigo-500', capa_to: 'to-blue-600', icone: '⏱️', trilha_id: 3, ordem: 8,
    modulos: [
      { id: 81, titulo: 'Diagnóstico de tempo', duracao: '20min', tipo: 'video' },
      { id: 82, titulo: 'Método GTD', duracao: '25min', tipo: 'video' },
      { id: 83, titulo: 'Técnica Pomodoro', duracao: '15min', tipo: 'video' },
      { id: 84, titulo: 'Planejamento semanal', duracao: '20min', tipo: 'video' },
      { id: 85, titulo: 'Avaliação', duracao: '15min', tipo: 'quiz' },
    ],
  },
]

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  const sql = neon(process.env.DATABASE_URL)

  await sql`
    CREATE TABLE IF NOT EXISTS cursos (
      id           SERIAL PRIMARY KEY,
      titulo       TEXT NOT NULL,
      descricao    TEXT,
      categoria    TEXT DEFAULT 'Geral',
      duracao      TEXT DEFAULT '',
      nivel        TEXT DEFAULT 'Básico',
      obrigatorio  BOOLEAN DEFAULT false,
      instrutor    TEXT DEFAULT '',
      avaliacao    NUMERIC(3,1) DEFAULT 5.0,
      total_alunos INTEGER DEFAULT 0,
      capa_from    TEXT DEFAULT 'from-slate-500',
      capa_to      TEXT DEFAULT 'to-slate-600',
      capa_url     TEXT,
      icone        TEXT DEFAULT '📚',
      trilha_id    INTEGER,
      modulos      JSONB DEFAULT '[]',
      ativo        BOOLEAN DEFAULT true,
      ordem        INTEGER DEFAULT 0,
      created_at   TIMESTAMP DEFAULT NOW(),
      updated_at   TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS curso_atribuicao (
      id             SERIAL PRIMARY KEY,
      curso_id       INTEGER NOT NULL,
      colaborador_id INTEGER NOT NULL,
      atribuido_em   TIMESTAMP DEFAULT NOW(),
      UNIQUE(curso_id, colaborador_id)
    )
  `
  await sql`ALTER TABLE cursos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'publicado'`
  await sql`ALTER TABLE cursos ADD COLUMN IF NOT EXISTS capa_url TEXT`
  await sql`
    CREATE TABLE IF NOT EXISTS curso_instrutores (
      id         SERIAL PRIMARY KEY,
      curso_id   INTEGER NOT NULL,
      user_id    INTEGER NOT NULL,
      nome       TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (curso_id, user_id)
    )
  `

  try {
    const auth = requireAuth(event)
    const params = event.queryStringParameters || {}
    const cursoId = params.id ? parseInt(params.id) : null
    const isInstrutor = auth.role === 'Instrutor'

    if (event.httpMethod === 'GET') {
      // Cursos onde o usuário logado é instrutor (inclui rascunhos)
      if (params.action === 'instrutor') {
        const rows = await sql`
          SELECT c.*,
            COALESCE(
              json_agg(json_build_object('user_id', ci.user_id, 'nome', ci.nome)
                ORDER BY ci.created_at) FILTER (WHERE ci.user_id IS NOT NULL),
              '[]'
            ) AS instrutores
          FROM cursos c
          JOIN curso_instrutores ci_me ON ci_me.curso_id = c.id AND ci_me.user_id = ${auth.userId}
          LEFT JOIN curso_instrutores ci ON ci.curso_id = c.id
          WHERE c.ativo = true
          GROUP BY c.id
          ORDER BY c.updated_at DESC
        `
        return { statusCode: 200, headers, body: JSON.stringify(rows) }
      }

      // Lista de instrutores de um curso
      if (params.action === 'instrutores') {
        const cId = parseInt(params.curso_id || '0')
        if (!cId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'curso_id obrigatório' }) }
        const rows = await sql`SELECT user_id, nome, created_at FROM curso_instrutores WHERE curso_id = ${cId} ORDER BY created_at`
        return { statusCode: 200, headers, body: JSON.stringify(rows) }
      }

      // Lista pública de cursos (só publicados)
      const [{ count }] = await sql`SELECT COUNT(*) AS count FROM cursos WHERE ativo = true`
      if (parseInt(count) === 0) {
        for (const c of DEFAULT_CURSOS) {
          await sql`
            INSERT INTO cursos (id, titulo, descricao, categoria, duracao, nivel, obrigatorio, instrutor, avaliacao, total_alunos, capa_from, capa_to, icone, trilha_id, modulos, ordem)
            VALUES (${c.id}, ${c.titulo}, ${c.descricao}, ${c.categoria}, ${c.duracao}, ${c.nivel}, ${c.obrigatorio}, ${c.instrutor}, ${c.avaliacao}, ${c.total_alunos}, ${c.capa_from}, ${c.capa_to}, ${c.icone}, ${c.trilha_id ?? null}, ${JSON.stringify(c.modulos)}, ${c.ordem})
            ON CONFLICT (id) DO NOTHING
          `
        }
        await sql`SELECT setval(pg_get_serial_sequence('cursos','id'), 100)`
      }
      const rows = await sql`
        SELECT c.*,
               COALESCE(ca.total_alunos, 0)::int AS total_alunos
        FROM cursos c
        LEFT JOIN (
          SELECT curso_id, COUNT(DISTINCT colaborador_id) AS total_alunos
          FROM curso_atribuicao
          GROUP BY curso_id
        ) ca ON ca.curso_id = c.id
        WHERE c.ativo = true AND (c.status = 'publicado' OR c.status IS NULL)
        ORDER BY c.ordem, c.id
      `
      return { statusCode: 200, headers, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      // Adicionar co-instrutor
      if (params.action === 'add_instrutor') {
        const { curso_id, user_id, nome } = JSON.parse(event.body || '{}')
        if (!curso_id || !user_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'curso_id e user_id obrigatórios' }) }
        // Deve ser admin ou instrutor do curso
        if (!isAdminRole(auth.role)) {
          const check = await sql`SELECT id FROM curso_instrutores WHERE curso_id = ${curso_id} AND user_id = ${auth.userId}`
          if (check.length === 0) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
        }
        await sql`INSERT INTO curso_instrutores (curso_id, user_id, nome) VALUES (${curso_id}, ${user_id}, ${nome}) ON CONFLICT DO NOTHING`
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
      }

      if (!isAdminRole(auth.role) && !isInstrutor) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }

      const { titulo, descricao, categoria, duracao, nivel, obrigatorio, instrutor, avaliacao, total_alunos, capa_from, capa_to, capa_url, icone, trilha_id, modulos, ordem } = JSON.parse(event.body || '{}')
      if (!titulo) return { statusCode: 400, headers, body: JSON.stringify({ error: 'titulo obrigatório' }) }

      // Área do Instrutor sempre cria como rascunho (força via body)
      const status = body.status === 'rascunho' ? 'rascunho' : (isAdminRole(auth.role) ? 'publicado' : 'rascunho')
      const instrutorNome = isInstrutor ? auth.name : (instrutor ?? '')

      const rows = await sql`
        INSERT INTO cursos (titulo, descricao, categoria, duracao, nivel, obrigatorio, instrutor, avaliacao, total_alunos, capa_from, capa_to, capa_url, icone, trilha_id, modulos, ordem, status)
        VALUES (${titulo}, ${descricao ?? null}, ${categoria ?? 'Geral'}, ${duracao ?? ''}, ${nivel ?? 'Básico'}, ${obrigatorio ?? false}, ${instrutorNome}, ${avaliacao ?? 5.0}, ${total_alunos ?? 0}, ${capa_from ?? 'from-slate-500'}, ${capa_to ?? 'to-slate-600'}, ${capa_url ?? null}, ${icone ?? '📚'}, ${trilha_id ?? null}, ${JSON.stringify(modulos ?? [])}, ${ordem ?? 0}, ${status})
        RETURNING *
      `
      // Adiciona o criador como instrutor do curso
      await sql`
        INSERT INTO curso_instrutores (curso_id, user_id, nome)
        VALUES (${rows[0].id}, ${auth.userId}, ${auth.name})
        ON CONFLICT DO NOTHING
      `
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'PUT') {
      // Publicar rascunho (admin ou instrutor do curso)
      if (params.action === 'publicar') {
        if (!isAdminRole(auth.role)) {
          const check = await sql`SELECT id FROM curso_instrutores WHERE curso_id = ${cursoId} AND user_id = ${auth.userId}`
          if (check.length === 0) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
        }
        if (!cursoId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }
        const rows = await sql`UPDATE cursos SET status = 'publicado', updated_at = NOW() WHERE id = ${cursoId} AND ativo = true RETURNING *`
        if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Curso não encontrado' }) }
        return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
      }

      if (!cursoId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }

      // Verifica permissão: admin ou instrutor do curso
      if (!isAdminRole(auth.role)) {
        const check = await sql`SELECT id FROM curso_instrutores WHERE curso_id = ${cursoId} AND user_id = ${auth.userId}`
        if (check.length === 0) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
      }

      const { titulo, descricao, categoria, duracao, nivel, obrigatorio, instrutor, avaliacao, capa_from, capa_to, capa_url, icone, trilha_id, modulos, ordem } = JSON.parse(event.body || '{}')
      const rows = await sql`
        UPDATE cursos SET
          titulo      = ${titulo},
          descricao   = ${descricao ?? null},
          categoria   = ${categoria},
          duracao     = ${duracao ?? ''},
          nivel       = ${nivel},
          obrigatorio = ${obrigatorio ?? false},
          instrutor   = ${instrutor ?? ''},
          avaliacao   = ${avaliacao ?? 5.0},
          capa_from   = ${capa_from},
          capa_to     = ${capa_to},
          capa_url    = ${capa_url ?? null},
          icone       = ${icone ?? '📚'},
          trilha_id   = ${trilha_id ?? null},
          modulos     = ${JSON.stringify(modulos ?? [])}::jsonb,
          ordem       = ${ordem ?? 0},
          updated_at  = NOW()
        WHERE id = ${cursoId} AND ativo = true
        RETURNING *
      `
      if (rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Curso não encontrado' }) }
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) }
    }

    if (event.httpMethod === 'DELETE') {
      // Remover co-instrutor
      if (params.action === 'rem_instrutor') {
        const { curso_id, user_id } = JSON.parse(event.body || '{}')
        if (!isAdminRole(auth.role)) {
          const check = await sql`SELECT id FROM curso_instrutores WHERE curso_id = ${curso_id} AND user_id = ${auth.userId}`
          if (check.length === 0) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
        }
        await sql`DELETE FROM curso_instrutores WHERE curso_id = ${curso_id} AND user_id = ${user_id}`
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
      }

      if (!cursoId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) }

      // Admin deleta qualquer; instrutor só deleta rascunho próprio
      if (!isAdminRole(auth.role)) {
        const check = await sql`SELECT id FROM curso_instrutores WHERE curso_id = ${cursoId} AND user_id = ${auth.userId}`
        if (check.length === 0) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão' }) }
        const curso = await sql`SELECT status FROM cursos WHERE id = ${cursoId}`
        if (curso[0]?.status === 'publicado') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Não é possível excluir um curso publicado' }) }
      }

      await sql`UPDATE cursos SET ativo = false, updated_at = NOW() WHERE id = ${cursoId}`
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('cursos error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
