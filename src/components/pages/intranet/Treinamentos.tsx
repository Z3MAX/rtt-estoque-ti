import { useState } from 'react'
import { Search, X, BookOpen, Clock, Star, CheckCircle2, Play, Filter, Award } from 'lucide-react'

const CATEGORIAS = ['Todos', 'Compliance', 'Liderança', 'Técnico', 'Soft Skills', 'Segurança']

const TREINAMENTOS = [
  { id: 1, titulo: 'LGPD e Proteção de Dados', categoria: 'Compliance',  duracao: '2h',    progresso: 60, obrigatorio: true,  nivel: 'Básico'    },
  { id: 2, titulo: 'Cultura de Segurança no Trabalho', categoria: 'Segurança', duracao: '3h', progresso: 30, obrigatorio: true,  nivel: 'Básico'    },
  { id: 3, titulo: 'Excelência no Atendimento', categoria: 'Soft Skills',  duracao: '1h30', progresso: 85, obrigatorio: false, nivel: 'Intermediário' },
  { id: 4, titulo: 'Liderança Situacional',     categoria: 'Liderança',   duracao: '4h',   progresso: 0,  obrigatorio: false, nivel: 'Avançado'   },
  { id: 5, titulo: 'Excel Avançado para Gestores', categoria: 'Técnico',  duracao: '5h',   progresso: 0,  obrigatorio: false, nivel: 'Avançado'   },
  { id: 6, titulo: 'Comunicação Não-Violenta',  categoria: 'Soft Skills', duracao: '2h',   progresso: 100,obrigatorio: false, nivel: 'Intermediário' },
  { id: 7, titulo: 'Normas de Segurança NR-12', categoria: 'Segurança',   duracao: '1h',   progresso: 100,obrigatorio: true,  nivel: 'Básico'    },
  { id: 8, titulo: 'Gestão de Tempo e Produtividade', categoria: 'Soft Skills', duracao: '2h30', progresso: 0, obrigatorio: false, nivel: 'Básico' },
]

const NIVEL_COLORS: Record<string, string> = {
  'Básico':         'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  'Intermediário':  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  'Avançado':       'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 16
  const circ = 2 * Math.PI * r
  const color = pct === 100 ? 'text-emerald-500' : pct > 0 ? 'text-primary-500' : 'text-slate-200 dark:text-slate-700'
  return (
    <svg className="w-10 h-10 -rotate-90 shrink-0" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-slate-100 dark:text-slate-700" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="3.5"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round" className={color} />
    </svg>
  )
}

export default function TreinamentosPage() {
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'em-andamento' | 'concluidos' | 'nao-iniciados'>('todos')

  const filtered = TREINAMENTOS.filter(t => {
    const matchSearch = !search || t.titulo.toLowerCase().includes(search.toLowerCase())
    const matchCat    = categoria === 'Todos' || t.categoria === categoria
    const matchStatus =
      filtroStatus === 'todos'          ? true :
      filtroStatus === 'concluidos'     ? t.progresso === 100 :
      filtroStatus === 'em-andamento'   ? t.progresso > 0 && t.progresso < 100 :
      filtroStatus === 'nao-iniciados'  ? t.progresso === 0 : true
    return matchSearch && matchCat && matchStatus
  })

  const concluidos   = TREINAMENTOS.filter(t => t.progresso === 100).length
  const emAndamento  = TREINAMENTOS.filter(t => t.progresso > 0 && t.progresso < 100).length
  const obrigatorios = TREINAMENTOS.filter(t => t.obrigatorio && t.progresso < 100).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Treinamentos</h1>
        <p className="text-sm text-slate-400 mt-0.5">Trilhas de desenvolvimento disponíveis para você</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',         value: TREINAMENTOS.length, color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-50 dark:bg-slate-800' },
          { label: 'Concluídos',    value: concluidos,           color: 'text-emerald-600',                  bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Em andamento',  value: emAndamento,          color: 'text-primary-600',                  bg: 'bg-primary-50 dark:bg-primary-900/20' },
          { label: 'Obrigatórios pendentes', value: obrigatorios, color: 'text-amber-600',                  bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl border border-slate-200 dark:border-slate-700 p-4`}>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Buscar treinamento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value as typeof filtroStatus)}
          className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="todos">Todos os status</option>
          <option value="nao-iniciados">Não iniciados</option>
          <option value="em-andamento">Em andamento</option>
          <option value="concluidos">Concluídos</option>
        </select>
      </div>

      {/* Categoria tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIAS.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoria(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              categoria === cat
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
          <BookOpen size={32} className="opacity-40" />
          <p className="text-sm">Nenhum treinamento encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-4 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all group"
            >
              {/* Top */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${NIVEL_COLORS[t.nivel]}`}>{t.nivel}</span>
                    {t.obrigatorio && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                        Obrigatório
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {t.titulo}
                  </h3>
                </div>
                <ProgressRing pct={t.progresso} />
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  {t.duracao}
                </div>
                <div className="flex items-center gap-1">
                  <Filter size={12} />
                  {t.categoria}
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400">Progresso</span>
                  <span className={`text-xs font-semibold ${t.progresso === 100 ? 'text-emerald-600' : 'text-primary-600'}`}>
                    {t.progresso}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${t.progresso === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
                    style={{ width: `${t.progresso}%` }}
                  />
                </div>
              </div>

              {/* CTA */}
              <button className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors ${
                t.progresso === 100
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}>
                {t.progresso === 100
                  ? <><CheckCircle2 size={15} /> Concluído</>
                  : t.progresso > 0
                    ? <><Play size={15} /> Continuar</>
                    : <><Play size={15} /> Iniciar</>
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
