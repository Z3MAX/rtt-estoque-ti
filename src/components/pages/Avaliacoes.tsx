import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, RefreshCw, ClipboardList, ChevronRight, Filter } from 'lucide-react'
import { api } from '../../lib/api'
import type { CicloAvaliacao } from '../../lib/types'

const QUADRANTE_COLORS: Record<string, string> = {
  E3: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  E2: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  E1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  M3: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  M2: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  M1: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  B3: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  B2: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  B1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const QUADRANTE_LABELS: Record<string, string> = {
  E3: 'Talento Top / Estrela', E2: 'Potencial Forte',   E1: 'Enigma',
  M3: 'Forte Desempenho',      M2: 'Mantenedor / Eficaz', M1: 'Questionável',
  B3: 'Dedicado / Especialista', B2: 'Bom Profissional', B1: 'Risco / Subpadrão',
}

const TIPO_LABELS: Record<string, string> = {
  lideranca:    'Pela liderança',
  autoavaliacao:'Autoavaliação',
  par:          'Por par',
  rh:           'RH',
}

const PERIODOS: Record<string, string> = {
  '1Sem_2024': '1º Sem / 2024', '2Sem_2024': '2º Sem / 2024',
  '1Sem_2025': '1º Sem / 2025', '2Sem_2025': '2º Sem / 2025',
  '1Sem_2026': '1º Sem / 2026', '2Sem_2026': '2º Sem / 2026',
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AvaliacoesPage() {
  const navigate = useNavigate()
  const [avaliacoes, setAvaliacoes] = useState<CicloAvaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterQuadrante, setFilterQuadrante] = useState('')
  const [filterPeriodo, setFilterPeriodo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.avaliacoes.list() as CicloAvaliacao[]
      setAvaliacoes(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = avaliacoes.filter(a => {
    const s = search.toLowerCase()
    const matchSearch = !s ||
      (a.colaborador_nome ?? '').toLowerCase().includes(s) ||
      (a.avaliador_nome ?? '').toLowerCase().includes(s) ||
      (a.quadrante ?? '').toLowerCase().includes(s)
    const matchQ = !filterQuadrante || a.quadrante === filterQuadrante
    const matchP = !filterPeriodo || a.periodo_inicial === filterPeriodo || a.periodo_final === filterPeriodo
    return matchSearch && matchQ && matchP
  })

  const periodos = [...new Set(avaliacoes.flatMap(a => [a.periodo_inicial, a.periodo_final].filter(Boolean)))]
    .sort().reverse() as string[]
  const quadrantes = [...new Set(avaliacoes.map(a => a.quadrante).filter(Boolean))] as string[]
  const hasFilters = !!filterQuadrante || !!filterPeriodo

  // Stats
  const totalE = filtered.filter(a => a.quadrante?.startsWith('E')).length
  const totalM = filtered.filter(a => a.quadrante?.startsWith('M')).length
  const totalB = filtered.filter(a => a.quadrante?.startsWith('B')).length

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Avaliações</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {filtered.length} avaliação(ões) concluída(s)
          </p>
        </div>
        <button onClick={load} className="btn-secondary gap-2 self-start">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Stats strip */}
      {avaliacoes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Alto Potencial / Desempenho', value: totalE, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', bar: 'bg-emerald-500' },
            { label: 'Médio',                        value: totalM, color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20',   bar: 'bg-amber-400' },
            { label: 'Baixo',                        value: totalB, color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20',       bar: 'bg-red-500' },
          ].map(({ label, value, color, bg, bar }) => (
            <div key={label} className={`card p-4 ${bg}`}>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              <div className="mt-2 h-1 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden">
                <div className={`h-full ${bar} rounded-full`} style={{ width: `${filtered.length ? (value / filtered.length) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Buscar por colaborador ou avaliador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`btn-secondary gap-2 ${hasFilters ? 'border-primary-300 text-primary-600 dark:border-primary-700 dark:text-primary-400' : ''}`}
        >
          <Filter size={14} /> Filtros {hasFilters && `(${[filterQuadrante, filterPeriodo].filter(Boolean).length})`}
        </button>
        {hasFilters && (
          <button onClick={() => { setFilterQuadrante(''); setFilterPeriodo('') }} className="text-xs text-slate-400 hover:text-slate-600">
            Limpar
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card p-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-40">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Quadrante</label>
            <select className="input text-sm w-full" value={filterQuadrante} onChange={e => setFilterQuadrante(e.target.value)}>
              <option value="">Todos</option>
              {quadrantes.sort().map(q => (
                <option key={q} value={q}>{q} — {QUADRANTE_LABELS[q]}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Período</label>
            <select className="input text-sm w-full" value={filterPeriodo} onChange={e => setFilterPeriodo(e.target.value)}>
              <option value="">Todos</option>
              {periodos.map(p => (
                <option key={p} value={p}>{PERIODOS[p] || p}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <ClipboardList size={32} className="opacity-40" />
            <p className="text-sm">{search || hasFilters ? 'Nenhum resultado' : 'Nenhuma avaliação encontrada'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {['Colaborador', 'Quadrante', 'Desempenho', 'Potencial', 'Período', 'Tipo', 'Avaliador', 'Data', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map(a => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/avaliacoes/${a.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    {/* Colaborador */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                          <span className="text-primary-600 dark:text-primary-400 text-xs font-bold">
                            {(a.colaborador_nome ?? '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {a.colaborador_nome ?? '—'}
                        </span>
                      </div>
                    </td>

                    {/* Quadrante */}
                    <td className="px-4 py-3">
                      {a.quadrante ? (
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${QUADRANTE_COLORS[a.quadrante] ?? ''}`}>
                            {a.quadrante}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">{QUADRANTE_LABELS[a.quadrante]}</p>
                        </div>
                      ) : '—'}
                    </td>

                    {/* Desempenho */}
                    <td className="px-4 py-3">
                      {a.score_desempenho != null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary-600">{Number(a.score_desempenho).toFixed(1)}</span>
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(Number(a.score_desempenho) / 5) * 100}%` }} />
                          </div>
                        </div>
                      ) : '—'}
                    </td>

                    {/* Potencial */}
                    <td className="px-4 py-3">
                      {a.score_potencial != null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{Number(a.score_potencial).toFixed(1)}</span>
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-500 rounded-full" style={{ width: `${(Number(a.score_potencial) / 5) * 100}%` }} />
                          </div>
                        </div>
                      ) : '—'}
                    </td>

                    {/* Período */}
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {PERIODOS[a.periodo_inicial] || a.periodo_inicial || '—'}
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {TIPO_LABELS[a.tipo] || a.tipo}
                      </span>
                    </td>

                    {/* Avaliador */}
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {a.avaliador_nome || '—'}
                    </td>

                    {/* Data */}
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(a.created_at)}
                    </td>

                    <td className="px-4 py-3">
                      <ChevronRight size={15} className="text-slate-300 dark:text-slate-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
