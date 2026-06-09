import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, UserCircle, Users, ChevronRight, Building2 } from 'lucide-react'
import { api } from '../../lib/api'
import type { Colaborador } from '../../lib/types'
import { NIVEL_LABELS } from '../../lib/types'

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

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
]

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export default function DepartamentoDetalhe() {
  const { area } = useParams<{ area: string }>()
  const navigate = useNavigate()
  const areaName = decodeURIComponent(area ?? '')

  const [colabs, setColabs] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const all = await api.colaboradores.list() as Colaborador[]
        setColabs(all.filter(c => (c.area ?? 'Sem área') === areaName))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [areaName])

  // Agrupa por gestor
  const groups = new Map<string, Colaborador[]>()
  for (const c of colabs) {
    const g = c.gestor_nome || 'Sem gestor'
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(c)
  }
  const gestores = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  const totalAvaliados = colabs.filter(c => c.ultimo_quadrante).length
  const pct = colabs.length > 0 ? Math.round((totalAvaliados / colabs.length) * 100) : 0

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/departamentos')}
          className="mt-0.5 w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="cursor-pointer hover:text-primary-500" onClick={() => navigate('/departamentos')}>Departamentos</span>
            <ChevronRight size={12} />
            <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{areaName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">{areaName}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {colabs.length} colaborador(es) · {gestores.length} gestor(es) · {pct}% avaliados
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : colabs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
          <Users size={32} className="opacity-40" />
          <p className="text-sm">Nenhum colaborador neste departamento</p>
        </div>
      ) : (
        <div className="space-y-8">
          {gestores.map(([gestor, time]) => {
            const avaliados = time.filter(c => c.ultimo_quadrante).length
            const gPct = time.length > 0 ? Math.round((avaliados / time.length) * 100) : 0

            return (
              <div key={gestor}>
                {/* Gestor header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${avatarColor(gestor)}`}>
                    {gestor[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{gestor}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <UserCircle size={11} /> Gestor
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400">{time.length} colaborador(es)</span>
                      {avaliados > 0 && (
                        <>
                          <span className="text-slate-200 dark:text-slate-700">·</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${gPct}%` }} />
                            </div>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">{gPct}% avaliados</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid de colaboradores */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pl-4 border-l-2 border-slate-100 dark:border-slate-700 ml-5">
                  {time.map(c => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/colaboradores/${c.id}`)}
                      className="card p-3 text-left hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all group"
                    >
                      {/* Avatar + quadrante */}
                      <div className="flex items-start justify-between mb-2">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(c.nome)}`}>
                          {c.nome[0]?.toUpperCase()}
                        </div>
                        {c.ultimo_quadrante ? (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${QUADRANTE_COLORS[c.ultimo_quadrante] ?? ''}`}>
                            {c.ultimo_quadrante}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300 dark:text-slate-600 italic">—</span>
                        )}
                      </div>

                      {/* Nome */}
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {c.nome}
                      </p>

                      {/* Cargo */}
                      {c.cargo && (
                        <p className="text-[11px] text-slate-400 mt-1 truncate">{c.cargo}</p>
                      )}

                      {/* Nível */}
                      {c.nivel && (
                        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">{NIVEL_LABELS[c.nivel]}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
