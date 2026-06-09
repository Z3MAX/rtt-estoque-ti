import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, RefreshCw, Building2, Users, ChevronRight, UserCircle } from 'lucide-react'
import { api } from '../../lib/api'

interface Gestor {
  nome: string
  total: number
  avaliados: number
}

interface Departamento {
  area: string
  total: number
  avaliados: number
  gestores: Gestor[]
  quadrantes: Record<string, number>
}

const QUADRANTE_COLORS: Record<string, string> = {
  E3: 'bg-emerald-500', E2: 'bg-green-500', E1: 'bg-blue-500',
  M3: 'bg-cyan-500',    M2: 'bg-slate-400', M1: 'bg-amber-500',
  B3: 'bg-indigo-500',  B2: 'bg-orange-500',B1: 'bg-red-500',
}

const QUADRANTE_LABELS: Record<string, string> = {
  E3: 'Talento Top', E2: 'Potencial Forte', E1: 'Potencial',
  M3: 'Forte Desemp.', M2: 'Bom Profissional', M1: 'Padrão',
  B3: 'Alta Curva', B2: 'Em Desenvolvimento', B1: 'Atenção',
}

export default function DepartamentosPage() {
  const navigate = useNavigate()
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const load = async () => {
    setLoading(true)
    try {
      const data = await (api as any).departamentos.list() as Departamento[]
      setDepartamentos(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = departamentos.filter(d =>
    !search ||
    d.area.toLowerCase().includes(search.toLowerCase()) ||
    d.gestores.some(g => g.nome.toLowerCase().includes(search.toLowerCase()))
  )

  const totalColabs = departamentos.reduce((s, d) => s + d.total, 0)
  const totalAvaliados = departamentos.reduce((s, d) => s + d.avaliados, 0)
  const totalGestores = new Set(
    departamentos.flatMap(d => d.gestores.map(g => g.nome.toLowerCase()))
  ).size

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Departamentos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {departamentos.length} área(s) · {totalGestores} gestor(es) · {totalColabs} colaborador(es)
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Departamentos', value: departamentos.length, icon: Building2, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
          { label: 'Gestores',      value: totalGestores,        icon: UserCircle, color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: 'Avaliados',     value: `${totalAvaliados} / ${totalColabs}`, icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9 max-w-sm"
          placeholder="Buscar por área ou gestor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" /> <span className="text-sm">Carregando...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
          <Building2 size={32} className="opacity-40" />
          <p className="text-sm">{search ? 'Nenhum resultado' : 'Nenhum departamento encontrado'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(dept => {
const pct = dept.total > 0 ? Math.round((dept.avaliados / dept.total) * 100) : 0
            const quadrantesAtivos = Object.entries(dept.quadrantes).filter(([, v]) => v > 0)

            return (
              <button
                key={dept.area}
                onClick={() => navigate(`/departamentos/${encodeURIComponent(dept.area)}`)}
                className="card w-full flex items-center gap-4 p-4 text-left hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-primary-600 dark:text-primary-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {dept.area}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-slate-400">{dept.total} colaborador(es)</span>
                    <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-400">{dept.gestores.length} gestor(es)</span>
                    {dept.avaliados > 0 && (
                      <>
                        <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">{pct}% avaliados</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Mini badges quadrantes */}
                {quadrantesAtivos.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1">
                    {quadrantesAtivos.slice(0, 5).map(([q, count]) => (
                      <div key={q} title={`${QUADRANTE_LABELS[q]}: ${count}`}
                        className={`h-5 rounded text-white text-[10px] font-bold flex items-center justify-center px-1.5 ${QUADRANTE_COLORS[q]}`}
                        style={{ minWidth: 24 }}>
                        {q}
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress bar */}
                <div className="hidden sm:block w-24 shrink-0">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Avaliados</span><span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-primary-400 transition-colors" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
