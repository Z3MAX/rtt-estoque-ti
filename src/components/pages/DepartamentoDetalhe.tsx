import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, UserCircle, Users, ChevronRight, Building2, LayoutGrid, List, X } from 'lucide-react'
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

// Cores de fundo para cada célula da matriz 9-box
const CELL_STYLES: Record<string, { bg: string; border: string; badge: string; dot: string }> = {
  E3: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-500 text-white', dot: 'bg-emerald-500' },
  E2: { bg: 'bg-green-50 dark:bg-green-950/30',     border: 'border-green-200 dark:border-green-800',     badge: 'bg-green-500 text-white',   dot: 'bg-green-500'   },
  E1: { bg: 'bg-blue-50 dark:bg-blue-950/30',       border: 'border-blue-200 dark:border-blue-800',       badge: 'bg-blue-500 text-white',    dot: 'bg-blue-500'    },
  M3: { bg: 'bg-cyan-50 dark:bg-cyan-950/30',       border: 'border-cyan-200 dark:border-cyan-800',       badge: 'bg-cyan-500 text-white',    dot: 'bg-cyan-500'    },
  M2: { bg: 'bg-slate-50 dark:bg-slate-800/50',     border: 'border-slate-200 dark:border-slate-700',     badge: 'bg-slate-500 text-white',   dot: 'bg-slate-400'   },
  M1: { bg: 'bg-amber-50 dark:bg-amber-950/30',     border: 'border-amber-200 dark:border-amber-800',     badge: 'bg-amber-500 text-white',   dot: 'bg-amber-500'   },
  B3: { bg: 'bg-indigo-50 dark:bg-indigo-950/30',   border: 'border-indigo-200 dark:border-indigo-800',   badge: 'bg-indigo-500 text-white',  dot: 'bg-indigo-500'  },
  B2: { bg: 'bg-orange-50 dark:bg-orange-950/30',   border: 'border-orange-200 dark:border-orange-800',   badge: 'bg-orange-500 text-white',  dot: 'bg-orange-500'  },
  B1: { bg: 'bg-red-50 dark:bg-red-950/30',         border: 'border-red-200 dark:border-red-800',         badge: 'bg-red-500 text-white',     dot: 'bg-red-500'     },
}

const QUADRANTE_LABELS: Record<string, string> = {
  E3: 'Talento Tip Top',  E2: 'Forte Desempenho', E1: 'Enigma',
  M3: 'Forte Desempenho', M2: 'Mantenedor',        M1: 'Questionável',
  B3: 'Comprometido',     B2: 'Eficaz',            B1: 'Insuficiente',
}

// Eixos da matriz: linhas = Potencial (Y), colunas = Desempenho (X)
const MATRIX_ROWS = [
  { label: 'Alto',  codes: ['E1', 'E2', 'E3'] },
  { label: 'Médio', codes: ['M1', 'M2', 'M3'] },
  { label: 'Baixo', codes: ['B1', 'B2', 'B3'] },
]
const DESEMPENHO_LABELS = ['Abaixo do Esperado', 'Esperado', 'Acima do Esperado']

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

// ─── Componente da Matriz 9-Box ───────────────────────────────────────────────
function MatrizNineBox({
  colabs,
  areaName,
  onClose,
  onNavigate,
}: {
  colabs: Colaborador[]
  areaName: string
  onClose: () => void
  onNavigate: (id: number) => void
}) {
  // Agrupa colaboradores por quadrante
  const byQuadrante = new Map<string, Colaborador[]>()
  for (const c of colabs) {
    if (!c.ultimo_quadrante) continue
    if (!byQuadrante.has(c.ultimo_quadrante)) byQuadrante.set(c.ultimo_quadrante, [])
    byQuadrante.get(c.ultimo_quadrante)!.push(c)
  }
  const semAvaliacao = colabs.filter(c => !c.ultimo_quadrante)
  const totalAvaliados = colabs.length - semAvaliacao.length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-900 animate-fade-in overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
          <LayoutGrid size={16} className="text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            Matriz de Competências — {areaName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalAvaliados} de {colabs.length} colaborador(es) com avaliação
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 p-6 space-y-4 max-w-6xl mx-auto w-full">
        {/* Legenda dos eixos */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>← Potencial (Eixo Y)</span>
          <span>Desempenho (Eixo X) →</span>
        </div>

        {/* Cabeçalho das colunas (Desempenho) */}
        <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-3">
          <div />
          {DESEMPENHO_LABELS.map(label => (
            <div key={label} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-1">
              {label}
            </div>
          ))}
        </div>

        {/* Linhas da matriz */}
        {MATRIX_ROWS.map(row => (
          <div key={row.label} className="grid grid-cols-[140px_1fr_1fr_1fr] gap-3 items-stretch">
            {/* Rótulo da linha (Potencial) */}
            <div className="flex items-center justify-end pr-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-right leading-tight">
                {row.label}
              </span>
            </div>

            {/* 3 células da linha */}
            {row.codes.map(code => {
              const styles = CELL_STYLES[code]
              const profissionais = byQuadrante.get(code) ?? []
              return (
                <div
                  key={code}
                  className={`rounded-xl border-2 p-3 min-h-[120px] flex flex-col gap-2 ${styles.bg} ${styles.border}`}
                >
                  {/* Badge do quadrante */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${styles.badge}`}>{code}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {QUADRANTE_LABELS[code]}
                    </span>
                  </div>

                  {/* Chips dos colaboradores */}
                  {profissionais.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profissionais.map(c => (
                        <button
                          key={c.id}
                          onClick={() => onNavigate(c.id)}
                          title={`${c.nome}${c.cargo ? ` — ${c.cargo}` : ''}`}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-sm transition-all group max-w-[160px]"
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(c.nome)}`}>
                            {c.nome[0]?.toUpperCase()}
                          </div>
                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate leading-tight">
                            {c.nome.split(' ')[0]}
                            {c.nome.split(' ').length > 1 ? ` ${c.nome.split(' ').slice(-1)[0]}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-300 dark:text-slate-600 italic mt-auto">Nenhum</p>
                  )}

                  {/* Contador */}
                  {profissionais.length > 0 && (
                    <p className="text-[10px] text-slate-400 mt-auto">
                      {profissionais.length} profissional(is)
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Sem avaliação */}
        {semAvaliacao.length > 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
            <p className="text-xs font-semibold text-slate-400 mb-2">Sem avaliação ({semAvaliacao.length})</p>
            <div className="flex flex-wrap gap-2">
              {semAvaliacao.map(c => (
                <button
                  key={c.id}
                  onClick={() => onNavigate(c.id)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all group"
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(c.nome)}`}>
                    {c.nome[0]?.toUpperCase()}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-primary-500 truncate">
                    {c.nome.split(' ')[0]} {c.nome.split(' ').slice(-1)[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function DepartamentoDetalhe() {
  const { area } = useParams<{ area: string }>()
  const navigate = useNavigate()
  const areaName = decodeURIComponent(area ?? '')

  const [colabs, setColabs] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [showMatriz, setShowMatriz] = useState(false)

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
    <>
      {/* Modal da Matriz 9-Box */}
      {showMatriz && (
        <MatrizNineBox
          colabs={colabs}
          areaName={areaName}
          onClose={() => setShowMatriz(false)}
          onNavigate={(id) => { setShowMatriz(false); navigate(`/colaboradores/${id}`) }}
        />
      )}

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
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">{areaName}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {colabs.length} colaborador(es) · {gestores.length} gestor(es) · {pct}% avaliados
                </p>
              </div>
              {/* Botão da Matriz */}
              {!loading && colabs.length > 0 && (
                <button
                  onClick={() => setShowMatriz(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shrink-0 shadow-sm"
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Matriz 9-Box</span>
                </button>
              )}
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
    </>
  )
}
