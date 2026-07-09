/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AuditEntry, Colaborador, CicloAvaliacao, DashboardAvaliacoes } from './types'

const BASE  = '/.netlify/functions'
const MOCK  = import.meta.env.VITE_MOCK === 'true'

// ─── mock data ───────────────────────────────────────────────────────────────

let _colabs: Colaborador[] = [
  { id: 1, nome: 'Ana Silva',      cargo: 'Analista de RH',      nivel: 'pleno',       area: 'Recursos Humanos', email: 'ana.silva@rtt.com',      gestor_nome: 'Carlos Mendes',  ativo: true, created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z', total_avaliacoes: 2, ultimo_quadrante: 'M3', ultima_avaliacao: '2025-06-15T00:00:00Z' },
  { id: 2, nome: 'Bruno Costa',    cargo: 'Analista Comercial',  nivel: 'junior',      area: 'Comercial',        email: 'bruno.costa@rtt.com',    gestor_nome: 'Maria Santos',   ativo: true, created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z', total_avaliacoes: 1, ultimo_quadrante: 'B2', ultima_avaliacao: '2025-06-10T00:00:00Z' },
  { id: 3, nome: 'Carlos Mendes',  cargo: 'Gerente de RH',       nivel: 'gerente',     area: 'Recursos Humanos', email: 'carlos.mendes@rtt.com',  gestor_nome: 'Diretoria',      ativo: true, created_at: '2023-08-10T00:00:00Z', updated_at: '2023-08-10T00:00:00Z', total_avaliacoes: 3, ultimo_quadrante: 'E3', ultima_avaliacao: '2025-06-01T00:00:00Z' },
  { id: 4, nome: 'Daniela Rocha',  cargo: 'Coordenadora Fiscal', nivel: 'coordenador', area: 'Financeiro',       email: 'daniela.rocha@rtt.com',  gestor_nome: 'Felipe Martins', ativo: true, created_at: '2024-03-20T00:00:00Z', updated_at: '2024-03-20T00:00:00Z', total_avaliacoes: 1, ultimo_quadrante: 'E2', ultima_avaliacao: '2025-05-28T00:00:00Z' },
  { id: 5, nome: 'Eduardo Pires',  cargo: 'Assistente Comercial',nivel: 'junior',      area: 'Comercial',        email: 'eduardo.pires@rtt.com',  gestor_nome: 'Maria Santos',   ativo: true, created_at: '2024-04-05T00:00:00Z', updated_at: '2024-04-05T00:00:00Z', total_avaliacoes: 0, ultimo_quadrante: undefined, ultima_avaliacao: undefined },
]

let _avaliacoes: CicloAvaliacao[] = [
  { id: 1, colaborador_id: 1, colaborador_nome: 'Ana Silva',     avaliador_nome: 'Carlos Mendes', tipo: 'lideranca',    periodo_inicial: '1Sem_2025', periodo_final: '2Sem_2025', nivel_cargo: 'pleno',       score_desempenho: 3.8, score_potencial: 3.6, nivel_desempenho: 'Alto',  nivel_potencial: 'Médio', quadrante: 'M3', status: 'concluido', created_at: '2025-06-15T00:00:00Z', updated_at: '2025-06-15T00:00:00Z' },
  { id: 2, colaborador_id: 2, colaborador_nome: 'Bruno Costa',   avaliador_nome: 'Maria Santos',  tipo: 'lideranca',    periodo_inicial: '1Sem_2025', periodo_final: '2Sem_2025', nivel_cargo: 'junior',      score_desempenho: 2.2, score_potencial: 2.8, nivel_desempenho: 'Baixo', nivel_potencial: 'Médio', quadrante: 'B2', status: 'concluido', created_at: '2025-06-10T00:00:00Z', updated_at: '2025-06-10T00:00:00Z' },
  { id: 3, colaborador_id: 3, colaborador_nome: 'Carlos Mendes', avaliador_nome: 'Diretoria',     tipo: 'lideranca',    periodo_inicial: '1Sem_2025', periodo_final: '2Sem_2025', nivel_cargo: 'gerente',     score_desempenho: 4.2, score_potencial: 4.0, nivel_desempenho: 'Alto',  nivel_potencial: 'Alto',  quadrante: 'E3', status: 'concluido', created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z' },
  { id: 4, colaborador_id: 4, colaborador_nome: 'Daniela Rocha', avaliador_nome: 'Felipe Martins',tipo: 'lideranca',    periodo_inicial: '1Sem_2025', periodo_final: '2Sem_2025', nivel_cargo: 'coordenador', score_desempenho: 3.2, score_potencial: 3.8, nivel_desempenho: 'Médio', nivel_potencial: 'Alto',  quadrante: 'E2', status: 'concluido', created_at: '2025-05-28T00:00:00Z', updated_at: '2025-05-28T00:00:00Z' },
]

let _nextId = 10

const mockDashboard: DashboardAvaliacoes = {
  total_colaboradores: 5,
  total_avaliacoes: 4,
  avaliacoes_concluidas: 4,
  colaboradores_avaliados: 4,
  distribuicao_quadrantes: [
    { quadrante: 'E3', count: 1, label: 'Talento Top / Estrela' },
    { quadrante: 'E2', count: 1, label: 'Potencial Forte' },
    { quadrante: 'M3', count: 1, label: 'Forte Desempenho' },
    { quadrante: 'B2', count: 1, label: 'Bom Profissional' },
  ],
  avaliacoes_recentes: _avaliacoes.slice(0, 5),
  avaliacoes_por_periodo: [{ periodo: '1Sem_2025', count: 4 }],
}

// ─── http helper ─────────────────────────────────────────────────────────────

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('osiris_token')
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('osiris_user')
      localStorage.removeItem('osiris_token')
      window.location.href = '/'
    }
    throw new Error(data.error || 'Erro na requisição')
  }
  return data
}

function delay(ms = 350) { return new Promise((r) => setTimeout(r, ms)) }

// ─── api ─────────────────────────────────────────────────────────────────────

export const api = {
  setup: async () => {
    if (MOCK) { await delay(500); return { success: true } }
    return request(`${BASE}/setup`, { method: 'POST' })
  },

  dashboard: async () => {
    if (MOCK) { await delay(400); return { ...mockDashboard, avaliacoes_recentes: [..._avaliacoes.slice(0, 5)] } }
    return request<DashboardAvaliacoes>(`${BASE}/dashboard-avaliacoes`)
  },

  colaboradores: {
    list: async (search?: string) => {
      if (MOCK) {
        await delay(300)
        const s = (search || '').toLowerCase()
        return s
          ? _colabs.filter(c => c.ativo && (c.nome.toLowerCase().includes(s) || (c.cargo ?? '').toLowerCase().includes(s) || (c.area ?? '').toLowerCase().includes(s)))
          : _colabs.filter(c => c.ativo)
      }
      const qs = search ? `?search=${encodeURIComponent(search)}` : ''
      return request<Colaborador[]>(`${BASE}/colaboradores${qs}`)
    },
    get: async (id: number) => {
      if (MOCK) { await delay(200); return _colabs.find(c => c.id === id) }
      return request<Colaborador>(`${BASE}/colaboradores?id=${id}`)
    },
    create: async (data: Partial<Colaborador>) => {
      if (MOCK) {
        await delay(400)
        const c: Colaborador = { id: _nextId++, nome: data.nome ?? '', cargo: data.cargo, nivel: data.nivel, area: data.area, email: data.email, gestor_nome: data.gestor_nome, ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), total_avaliacoes: 0 }
        _colabs = [c, ..._colabs]
        return c
      }
      return request<Colaborador>(`${BASE}/colaboradores`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: Partial<Colaborador>) => {
      if (MOCK) {
        await delay(400)
        _colabs = _colabs.map(c => c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c)
        return _colabs.find(c => c.id === id)
      }
      return request<Colaborador>(`${BASE}/colaboradores?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    deactivate: async (id: number) => {
      if (MOCK) { await delay(300); _colabs = _colabs.map(c => c.id === id ? { ...c, ativo: false } : c); return { success: true } }
      return request(`${BASE}/colaboradores?id=${id}`, { method: 'DELETE' })
    },
    deleteBulk: async (ids: number[]) => {
      if (MOCK) { await delay(400); _colabs = _colabs.map(c => ids.includes(c.id) ? { ...c, ativo: false } : c); return { success: true, deleted: ids.length } }
      return request(`${BASE}/colaboradores`, { method: 'DELETE', body: JSON.stringify({ ids }) })
    },
    importBulk: async (colaboradores: Partial<Colaborador>[]) => {
      if (MOCK) {
        await delay(600)
        let inserted = 0
        for (const d of colaboradores) {
          if (!d.nome) continue
          const c: Colaborador = { id: _nextId++, nome: d.nome, cargo: d.cargo, nivel: d.nivel, area: d.area, email: d.email, gestor_nome: d.gestor_nome, ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), total_avaliacoes: 0 }
          _colabs = [..._colabs, c]
          inserted++
        }
        return { success: true, inserted }
      }
      const CHUNK = 500
      let totalInserted = 0
      let totalUpdated = 0
      for (let i = 0; i < colaboradores.length; i += CHUNK) {
        const chunk = colaboradores.slice(i, i + CHUNK)
        const result = await request<{ inserted: number; updated: number }>(`${BASE}/colaboradores`, {
          method: 'POST',
          body: JSON.stringify({ bulk: true, colaboradores: chunk }),
        })
        totalInserted += result.inserted ?? 0
        totalUpdated  += result.updated  ?? 0
      }
      return { success: true, inserted: totalInserted, updated: totalUpdated }
    },
  },

  avaliacoes: {
    list: async (colaboradorId?: number) => {
      if (MOCK) {
        await delay(300)
        return colaboradorId ? _avaliacoes.filter(a => a.colaborador_id === colaboradorId) : _avaliacoes
      }
      const qs = colaboradorId ? `?colaborador_id=${colaboradorId}` : ''
      return request<CicloAvaliacao[]>(`${BASE}/avaliacoes${qs}`)
    },
    get: async (id: number) => {
      if (MOCK) { await delay(200); return _avaliacoes.find(a => a.id === id) }
      return request<CicloAvaliacao>(`${BASE}/avaliacoes?id=${id}`)
    },
    create: async (data: Partial<CicloAvaliacao>) => {
      if (MOCK) {
        await delay(400)
        const a: CicloAvaliacao = { id: _nextId++, colaborador_id: data.colaborador_id!, colaborador_nome: data.colaborador_nome, avaliador_nome: data.avaliador_nome, tipo: data.tipo ?? 'lideranca', periodo_inicial: data.periodo_inicial ?? '', periodo_final: data.periodo_final ?? '', nivel_cargo: data.nivel_cargo, score_desempenho: data.score_desempenho, score_potencial: data.score_potencial, nivel_desempenho: data.nivel_desempenho, nivel_potencial: data.nivel_potencial, quadrante: data.quadrante, respostas: data.respostas, status: 'concluido', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        _avaliacoes = [a, ..._avaliacoes]
        _colabs = _colabs.map(c => c.id === a.colaborador_id ? { ...c, total_avaliacoes: (c.total_avaliacoes ?? 0) + 1, ultimo_quadrante: a.quadrante, ultima_avaliacao: a.created_at } : c)
        return a
      }
      return request<CicloAvaliacao>(`${BASE}/avaliacoes`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: Partial<CicloAvaliacao>) => {
      if (MOCK) { await delay(400); _avaliacoes = _avaliacoes.map(a => a.id === id ? { ...a, ...data } : a); return _avaliacoes.find(a => a.id === id) }
      return request<CicloAvaliacao>(`${BASE}/avaliacoes?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    delete: async (id: number) => {
      if (MOCK) { await delay(300); _avaliacoes = _avaliacoes.filter(a => a.id !== id); return { success: true } }
      return request(`${BASE}/avaliacoes?id=${id}`, { method: 'DELETE' })
    },
  },

  users: {
    list: async () => {
      if (MOCK) {
        await delay(200)
        return [
          { id: 1, name: 'Alexandre Amorim', email: 'alexandre.amorim@rtt.com.br', role: 'Administrador de RH', active: true, created_at: new Date().toISOString() },
          { id: 2, name: 'Administrador',    email: 'admin@rtt.com.br',            role: 'Administrador de RH', active: true, created_at: new Date().toISOString() },
          { id: 3, name: 'Equipe RH',        email: 'rh@rtt.com.br',               role: 'Analista de RH',      active: true, created_at: new Date().toISOString() },
        ]
      }
      return request(`${BASE}/users`)
    },
    create: async (data: any) => {
      if (MOCK) { await delay(400); return { id: _nextId++, ...data, active: true, created_at: new Date().toISOString() } }
      return request(`${BASE}/users`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: any) => {
      if (MOCK) { await delay(400); return { id, ...data } }
      return request(`${BASE}/users?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    deactivate: async (id: number) => {
      if (MOCK) { await delay(300); return { success: true } }
      return request(`${BASE}/users?id=${id}`, { method: 'DELETE' })
    },
    delete: async (id: number) => {
      if (MOCK) { await delay(400); return { success: true } }
      return request(`${BASE}/users?id=${id}&permanent=true`, { method: 'DELETE' })
    },
    resendInvite: async (userId: number) => {
      if (MOCK) { await delay(600); return { success: true } }
      return request(`${BASE}/resend-invite`, { method: 'POST', body: JSON.stringify({ userId }) })
    },
  },

  departamentos: {
    list: async () => {
      if (MOCK) { await delay(300); return [] }
      return request(`${BASE}/departamentos`)
    },
  },

  ciclos: {
    list: async () => {
      if (MOCK) { await delay(300); return [] }
      return request(`${BASE}/ciclos`)
    },
    getAtivo: async () => {
      if (MOCK) { await delay(200); return null }
      return request(`${BASE}/ciclos`)
    },
    create: async (data: { periodo_inicial: string; periodo_final?: string; prazo?: string }) => {
      if (MOCK) { await delay(400); return { id: 1, ...data, status: 'aberto', created_at: new Date().toISOString() } }
      return request(`${BASE}/ciclos`, { method: 'POST', body: JSON.stringify(data) })
    },
    encerrar: async (id: number) => {
      if (MOCK) { await delay(400); return { success: true } }
      return request(`${BASE}/ciclos?id=${id}`, { method: 'PUT', body: JSON.stringify({ status: 'encerrado' }) })
    },
    deletar: async (id: number) => {
      if (MOCK) { await delay(400); return { success: true } }
      return request(`${BASE}/ciclos?id=${id}`, { method: 'DELETE' })
    },
  },

  avaliacoesPendentes: {
    list: async () => {
      if (MOCK) { await delay(300); return [] }
      return request(`${BASE}/avaliacoes-pendentes`)
    },
  },

  setupGestores: async () => {
    if (MOCK) { await delay(800); return { success: true, created: 0, skipped: 0, usuarios: [] } }
    return request(`${BASE}/setup-gestores`, { method: 'POST' })
  },

  pdi: {
    list: async () => {
      if (MOCK) { await delay(300); return [] }
      return request<any[]>(`${BASE}/pdi`)
    },
    create: async (data: { titulo: string; competencia?: string; prazo?: string; status?: string; pct?: number }) => {
      if (MOCK) { await delay(300); return { id: _nextId++, ...data, status: data.status ?? 'pendente', pct: data.pct ?? 0, created_at: new Date().toISOString() } }
      return request(`${BASE}/pdi`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: Partial<{ titulo: string; competencia: string; prazo: string; status: string; pct: number }>) => {
      if (MOCK) { await delay(300); return { id, ...data } }
      return request(`${BASE}/pdi?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    delete: async (id: number) => {
      if (MOCK) { await delay(300); return { success: true } }
      return request(`${BASE}/pdi?id=${id}`, { method: 'DELETE' })
    },
  },

  comunicados: {
    list: async () => {
      if (MOCK) { await delay(300); return [] }
      return request<any[]>(`${BASE}/comunicados`)
    },
    create: async (data: { titulo: string; resumo?: string; conteudo?: string; categoria?: string; fixado?: boolean }) => {
      if (MOCK) { await delay(300); return { id: _nextId++, ...data, created_at: new Date().toISOString() } }
      return request(`${BASE}/comunicados`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: any) => {
      if (MOCK) { await delay(300); return { id, ...data } }
      return request(`${BASE}/comunicados?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    delete: async (id: number) => {
      if (MOCK) { await delay(300); return { success: true } }
      return request(`${BASE}/comunicados?id=${id}`, { method: 'DELETE' })
    },
  },

  moduloConfig: {
    list: async () => {
      if (MOCK) { await delay(150); return [] }
      return request<any[]>(`${BASE}/modulo-config`)
    },
    save: async (cursoId: number, moduloId: number, videoUrl: string | null) => {
      if (MOCK) { await delay(200); return { success: true } }
      return request(`${BASE}/modulo-config`, { method: 'PUT', body: JSON.stringify({ curso_id: cursoId, modulo_id: moduloId, video_url: videoUrl }) })
    },
  },

  treinamentoProgresso: {
    list: async () => {
      if (MOCK) { await delay(200); return [] }
      return request<any[]>(`${BASE}/treinamento-progresso`)
    },
    mark: async (cursoId: number, moduloId: number, concluido: boolean) => {
      if (MOCK) { await delay(200); return { success: true } }
      return request(`${BASE}/treinamento-progresso`, { method: 'POST', body: JSON.stringify({ curso_id: cursoId, modulo_id: moduloId, concluido }) })
    },
    saveSeconds: async (cursoId: number, moduloId: number, segundos: number) => {
      if (MOCK) { await delay(100); return { success: true } }
      return request(`${BASE}/treinamento-progresso`, { method: 'POST', body: JSON.stringify({ curso_id: cursoId, modulo_id: moduloId, segundos_assistidos: segundos }) })
    },
    validar: async (userId: number, cursoId: number) => {
      if (MOCK) { await delay(200); return { success: true } }
      return request(`${BASE}/treinamento-progresso`, { method: 'POST', body: JSON.stringify({ validar: true, user_id: userId, curso_id: cursoId }) })
    },
  },

  cursos: {
    list: async () => {
      if (MOCK) { await delay(300); return [] }
      return request<any[]>(`${BASE}/cursos`)
    },
    create: async (data: any) => {
      if (MOCK) { await delay(400); return { id: _nextId++, ...data } }
      return request(`${BASE}/cursos`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: any) => {
      if (MOCK) { await delay(400); return { id, ...data } }
      return request(`${BASE}/cursos?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    delete: async (id: number) => {
      if (MOCK) { await delay(300); return { success: true } }
      return request(`${BASE}/cursos?id=${id}`, { method: 'DELETE' })
    },
  },

  cursoAtribuicao: {
    getMy: async () => {
      if (MOCK) { await delay(200); return { colaborador_id: null, curso_ids: [], filtrado_por_requisitos: false } }
      return request<{ colaborador_id: number | null; curso_ids: number[]; filtrado_por_requisitos: boolean }>(`${BASE}/curso-atribuicao`)
    },
    getForColab: async (colaboradorId: number) => {
      if (MOCK) { await delay(200); return { colaborador_id: colaboradorId, curso_ids: [] } }
      return request<{ colaborador_id: number; curso_ids: number[] }>(`${BASE}/curso-atribuicao?colaborador_id=${colaboradorId}`)
    },
    getForCurso: async (cursoId: number) => {
      if (MOCK) { await delay(200); return { curso_id: cursoId, inscritos: [] } }
      return request<{ curso_id: number; inscritos: any[] }>(`${BASE}/curso-atribuicao?curso_id=${cursoId}`)
    },
    set: async (colaboradorId: number, cursoIds: number[]) => {
      if (MOCK) { await delay(400); return { success: true } }
      return request(`${BASE}/curso-atribuicao`, { method: 'PUT', body: JSON.stringify({ colaborador_id: colaboradorId, curso_ids: cursoIds }) })
    },
    setForCurso: async (cursoId: number, colaboradorIds: number[]) => {
      if (MOCK) { await delay(400); return { success: true } }
      return request(`${BASE}/curso-atribuicao`, { method: 'PUT', body: JSON.stringify({ curso_id: cursoId, colaborador_ids: colaboradorIds }) })
    },
  },

  sucessao: {
    get: async (colaboradorId: number) => {
      if (MOCK) { await delay(200); return null }
      return request(`${BASE}/sucessao?colaborador_id=${colaboradorId}`)
    },
    save: async (colaboradorId: number, data: any) => {
      if (MOCK) { await delay(400); return data }
      return request(`${BASE}/sucessao?colaborador_id=${colaboradorId}`, { method: 'POST', body: JSON.stringify(data) })
    },
    delete: async (colaboradorId: number) => {
      if (MOCK) { await delay(300); return { success: true } }
      return request(`${BASE}/sucessao?colaborador_id=${colaboradorId}`, { method: 'DELETE' })
    },
  },

  audit: {
    list: async (entityType?: string, entityId?: number, limit?: number) => {
      if (MOCK) { await delay(150); return [] }
      const qs = new URLSearchParams()
      if (entityType) qs.set('entity_type', entityType)
      if (entityId !== undefined) qs.set('entity_id', String(entityId))
      if (limit !== undefined) qs.set('limit', String(limit))
      const q = qs.toString()
      return request<AuditEntry[]>(`${BASE}/audit${q ? `?${q}` : ''}`)
    },
  },

  cursoAvaliacao: {
    get: async (cursoId: number) => {
      if (MOCK) { await delay(100); return null }
      return request<{ nota: number | null; comentario: string | null; media: number | null; total: number } | null>(`${BASE}/curso-avaliacao?curso_id=${cursoId}`)
    },
    save: async (cursoId: number, nota: number, comentario?: string) => {
      if (MOCK) { await delay(100); return { nota, comentario: comentario ?? null, media: nota, total: 1 } }
      return request<{ nota: number; comentario: string | null; media: number; total: number }>(`${BASE}/curso-avaliacao`, { method: 'POST', body: JSON.stringify({ curso_id: cursoId, nota, comentario: comentario || null }) })
    },
  },

  pesquisas: {
    list: async () => {
      if (MOCK) { await delay(300); return [] }
      return request<any[]>(`${BASE}/pesquisas`)
    },
    get: async (id: number) => {
      if (MOCK) { await delay(200); return null }
      return request<any>(`${BASE}/pesquisas?id=${id}`)
    },
    minhas: async () => {
      if (MOCK) { await delay(300); return [] }
      return request<any[]>(`${BASE}/pesquisas?minhas=1`)
    },
    create: async (data: any) => {
      if (MOCK) { await delay(400); return { id: _nextId++, ...data, created_at: new Date().toISOString() } }
      return request(`${BASE}/pesquisas`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: any) => {
      if (MOCK) { await delay(400); return { id, ...data } }
      return request(`${BASE}/pesquisas?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    delete: async (id: number) => {
      if (MOCK) { await delay(300); return { success: true } }
      return request(`${BASE}/pesquisas?id=${id}`, { method: 'DELETE' })
    },
  },

  pesquisaRespostas: {
    list: async (pesquisaId: number) => {
      if (MOCK) { await delay(300); return [] }
      return request<any[]>(`${BASE}/pesquisa-respostas?pesquisa_id=${pesquisaId}`)
    },
    jaRespondi: async () => {
      if (MOCK) { await delay(200); return [] as number[] }
      return request<number[]>(`${BASE}/pesquisa-respostas?ja_respondi=1`)
    },
    submit: async (pesquisaId: number, respostas: any[]) => {
      if (MOCK) { await delay(400); return { success: true } }
      return request(`${BASE}/pesquisa-respostas`, { method: 'POST', body: JSON.stringify({ pesquisa_id: pesquisaId, respostas }) })
    },
  },

  aniversariantes: {
    list: async () => {
      if (MOCK) { await delay(200); return { nascimento: [], empresa: [] } }
      return request<{ nascimento: any[]; empresa: any[] }>(`${BASE}/aniversariantes`)
    },
  },

  cursoRequisitos: {
    list: async (cursoId?: number) => {
      if (MOCK) { await delay(200); return [] }
      const qs = cursoId ? `?curso_id=${cursoId}` : ''
      return request<any[]>(`${BASE}/curso-requisitos${qs}`)
    },
    save: async (cursoId: number, requisitos: { cargo?: string; area?: string; obrigatorio: boolean }[]) => {
      if (MOCK) { await delay(300); return { success: true } }
      return request(`${BASE}/curso-requisitos`, { method: 'POST', body: JSON.stringify({ curso_id: cursoId, requisitos }) })
    },
    autoAssign: async (colaboradorId: number, cargo: string, area: string) => {
      if (MOCK) { await delay(200); return { success: true, auto_assigned: 0 } }
      return request<{ success: boolean; auto_assigned: number }>(`${BASE}/curso-requisitos`, { method: 'PUT', body: JSON.stringify({ colaborador_id: colaboradorId, cargo, area }) })
    },
  },

  relatorioTreinamentos: {
    colaboradores: async (params?: { curso_id?: number; instrutor?: string }) => {
      if (MOCK) { await delay(400); return { tipo: 'colaboradores', rows: [] } }
      const qs = new URLSearchParams({ tipo: 'colaboradores' })
      if (params?.curso_id)  qs.set('curso_id',  String(params.curso_id))
      if (params?.instrutor) qs.set('instrutor', params.instrutor)
      return request<{ tipo: string; rows: any[] }>(`${BASE}/relatorio-treinamentos?${qs}`)
    },
    instrutores: async (instrutor?: string) => {
      if (MOCK) { await delay(400); return { tipo: 'instrutores', resumo: [], detalhe: [] } }
      const qs = new URLSearchParams({ tipo: 'instrutores' })
      if (instrutor) qs.set('instrutor', instrutor)
      return request<{ tipo: string; resumo: any[]; detalhe: any[] }>(`${BASE}/relatorio-treinamentos?${qs}`)
    },
  },

  cursoAvaliacoes: {
    get: async (cursoId: number) => {
      if (MOCK) { await delay(200); return { media: null, total: 0, minha_nota: null } }
      return request<{ media: number | null; total: number; minha_nota: number | null }>(`${BASE}/curso-avaliacoes?curso_id=${cursoId}`)
    },
    submit: async (cursoId: number, nota: number) => {
      if (MOCK) { await delay(300); return { media: nota, total: 1, minha_nota: nota } }
      return request<{ media: number; total: number; minha_nota: number }>(`${BASE}/curso-avaliacoes`, { method: 'POST', body: JSON.stringify({ curso_id: cursoId, nota }) })
    },
  },

  humorFeedback: {
    save: async (humor: string, comentario?: string) => {
      return request(`${BASE}/humor-feedback`, { method: 'POST', body: JSON.stringify({ humor, comentario: comentario ?? null }) })
    },
    list: async (params?: { humor?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams()
      if (params?.humor) qs.set('humor', params.humor)
      if (params?.limit) qs.set('limit', String(params.limit))
      if (params?.offset) qs.set('offset', String(params.offset))
      return request<{ items: any[]; total: number }>(`${BASE}/humor-feedback${qs.toString() ? '?' + qs : ''}`)
    },
  },
}
