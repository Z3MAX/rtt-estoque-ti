import { Users, Search, X, Mail } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import type { Colaborador } from '../../../lib/types'
import { useAuth } from '../../../lib/auth'
import { RefreshCw } from 'lucide-react'

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-pink-500', 'bg-amber-500', 'bg-teal-500', 'bg-rose-500',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export default function EquipePage() {
  const { user } = useAuth()
  const [colabs, setColabs] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterCargo, setFilterCargo] = useState('')

  function fetchColabs() {
    setLoading(true)
    setError(false)
    api.colaboradores.list()
      .then(all => setColabs(all as Colaborador[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchColabs()
  }, [])

  const areas = [...new Set(colabs.map(c => c.area).filter(Boolean))] as string[]
  const cargos = [...new Set(colabs.map(c => c.cargo).filter(Boolean))] as string[]

  const filtered = colabs.filter(c => {
    const matchSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) || (c.cargo ?? '').toLowerCase().includes(search.toLowerCase())
    const matchArea = !filterArea || c.area === filterArea
    const matchCargo = !filterCargo || c.cargo === filterCargo
    return matchSearch && matchArea && matchCargo
  })

  const selectCls = 'py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Minha Equipe</h1>
        <p className="text-sm text-slate-400 mt-0.5">Colaboradores{user?.area ? ` da área ${user.area}` : ''}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {/* Busca textual */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Buscar colaborador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}
        </div>

        {/* Filtro por área */}
        {areas.length > 0 && (
          <select className={selectCls} value={filterArea} onChange={e => setFilterArea(e.target.value)}>
            <option value="">Todas as áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {/* Filtro por cargo */}
        {cargos.length > 0 && (
          <select className={selectCls} value={filterCargo} onChange={e => setFilterCargo(e.target.value)}>
            <option value="">Todos os cargos</option>
            {cargos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
          <Users size={32} className="opacity-40" />
          <p className="text-sm">Erro ao carregar colaboradores. Tente novamente.</p>
          <button
            onClick={fetchColabs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col items-center gap-3 text-center hover:shadow-md transition-all">
              <div className={`w-12 h-12 rounded-full ${avatarColor(c.nome)} text-white flex items-center justify-center text-lg font-bold`}>
                {c.nome[0]?.toUpperCase()}
              </div>
              <div className="w-full">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">{c.nome}</p>
                {c.cargo && <p className="text-xs text-slate-400 mt-0.5">{c.cargo}</p>}
                {c.area && <p className="text-[11px] text-slate-300 dark:text-slate-500 mt-0.5">{c.area}</p>}
                {c.email && (
                  <div className="mt-2 flex flex-col items-center gap-1">
                    <p className="flex items-center gap-1 text-[10px] text-slate-400 max-w-full">
                      <Mail size={10} className="shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </p>
                    <a
                      href={`mailto:${c.email}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      <Mail size={10} /> Enviar e-mail
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <Users size={32} className="opacity-40" />
              <p className="text-sm">Nenhum colaborador encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
