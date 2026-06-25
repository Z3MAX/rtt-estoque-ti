import { Users, Search, X } from 'lucide-react'
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
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.colaboradores.list().then(all => {
      const data = all as Colaborador[]
      const minha = user?.area ? data.filter(c => c.area === user.area) : data
      setColabs(minha)
    }).finally(() => setLoading(false))
  }, [user?.area])

  const filtered = colabs.filter(c => !search || c.nome.toLowerCase().includes(search.toLowerCase()) || (c.cargo ?? '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Minha Equipe</h1>
        <p className="text-sm text-slate-400 mt-0.5">Colaboradores da área {user?.area ?? 'da empresa'}</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Buscar colaborador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col items-center gap-3 text-center hover:shadow-md transition-all">
              <div className={`w-12 h-12 rounded-full ${avatarColor(c.nome)} text-white flex items-center justify-center text-lg font-bold`}>
                {c.nome[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">{c.nome}</p>
                {c.cargo && <p className="text-xs text-slate-400 mt-0.5">{c.cargo}</p>}
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
