import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Search, X, RefreshCw, UserX, ChevronDown, ChevronRight, PlayCircle, Users, Building2, CheckCircle2, CalendarRange } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth, isAdmin } from '../../lib/auth'
import type { Colaborador } from '../../lib/types'

const NIVEL_LABELS: Record<string, string> = {
  junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior',
  especialista: 'Especialista', coordenador: 'Coordenador',
  gerente: 'Gerente', diretor: 'Diretor',
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

interface PendingColaborador extends Colaborador {
  total_avaliacoes: number
}

export default function RealizarAvaliacaoPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userIsAdmin = isAdmin(user?.role)

  const [cicloAtivo, setCicloAtivo] = useState<{ periodo_inicial: string } | null | undefined>(undefined)
  const [pendentes, setPendentes] = useState<PendingColaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedGestores, setExpandedGestores] = useState<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const [cicloResult, data] = await Promise.all([
        api.ciclos.getAtivo().catch(() => null),
        (api as any).avaliacoesPendentes.list() as Promise<PendingColaborador[]>,
      ])
      // Admin recebe array, gestor recebe objeto ou null — normaliza para objeto | null
      const ciclo: { periodo_inicial: string; status?: string } | null = Array.isArray(cicloResult)
        ? ((cicloResult as { periodo_inicial: string; status: string }[]).find(c => c.status === 'aberto') ?? null)
        : (cicloResult as { periodo_inicial: string; status?: string } | null)
      setCicloAtivo(ciclo)
      setPendentes(ciclo ? data : [])
      // Para gestor: expande tudo automaticamente
      if (!userIsAdmin) {
        const nomes = new Set(data.map((c: PendingColaborador) => c.gestor_nome || 'Sem gestor'))
        setExpandedGestores(nomes as Set<string>)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggleGestor = (nome: string) => {
    setExpandedGestores(prev => {
      const n = new Set(prev)
      n.has(nome) ? n.delete(nome) : n.add(nome)
      return n
    })
  }

  const filtered = pendentes.filter(c =>
    !search ||
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.cargo ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.area ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.gestor_nome ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Agrupa por área > gestor (admin) ou só por gestor (gestor)
  const grouped = new Map<string, { area: string; gestores: Map<string, PendingColaborador[]> }>()

  for (const c of filtered) {
    const area = c.area || 'Sem área'
    const gestor = c.gestor_nome || 'Sem gestor'
    if (!grouped.has(area)) grouped.set(area, { area, gestores: new Map() })
    const areaGroup = grouped.get(area)!
    if (!areaGroup.gestores.has(gestor)) areaGroup.gestores.set(gestor, [])
    areaGroup.gestores.get(gestor)!.push(c)
  }

  const areas = [...grouped.values()].sort((a, b) => a.area.localeCompare(b.area))
  const totalPendentes = filtered.length
  const totalGestores  = new Set(filtered.map(c => c.gestor_nome)).size
  const totalAreas     = new Set(filtered.map(c => c.area)).size

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 gap-2 p-6">
        <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando avaliações pendentes...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Realizar Avaliação</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {userIsAdmin
              ? 'Colaboradores aguardando avaliação de desempenho'
              : `Colaboradores do seu time aguardando avaliação`}
          </p>
        </div>
        <button onClick={load} className="btn-secondary gap-2 self-start">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Stats */}
      {totalPendentes > 0 && (
        <div className={`grid gap-4 ${userIsAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
              <ClipboardCheck size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalPendentes}</p>
              <p className="text-xs text-slate-500">Pendentes</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
              <Users size={18} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalGestores}</p>
              <p className="text-xs text-slate-500">Gestor(es)</p>
            </div>
          </div>
          {userIsAdmin && (
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalAreas}</p>
                <p className="text-xs text-slate-500">Área(s)</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9 max-w-sm"
          placeholder="Buscar por nome, cargo, área ou gestor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Empty state — sem ciclo aberto */}
      {cicloAtivo === null && (
        <div className="card flex flex-col items-center justify-center h-56 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <CalendarRange size={26} className="text-amber-500" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Nenhum ciclo de avaliação aberto</p>
            <p className="text-sm text-slate-400 mt-1">
              {userIsAdmin
                ? 'Abra um ciclo na aba "Ciclo de Avaliação" para liberar as avaliações.'
                : 'O RH ainda não abriu um ciclo de avaliação. Aguarde para realizar avaliações.'}
            </p>
          </div>
        </div>
      )}

      {/* Empty state — ciclo aberto mas tudo avaliado */}
      {cicloAtivo !== null && totalPendentes === 0 && (
        <div className="flex flex-col items-center justify-center h-56 text-slate-400 gap-3">
          <CheckCircle2 size={40} className="text-emerald-400 opacity-70" />
          <p className="text-base font-medium text-slate-600 dark:text-slate-300">
            {search ? 'Nenhum resultado encontrado' : 'Todos os colaboradores já foram avaliados!'}
          </p>
          {!search && <p className="text-sm text-slate-400">Não há avaliações pendentes no momento.</p>}
        </div>
      )}

      {/* Lista por área > gestor */}
      {cicloAtivo && areas.map(({ area, gestores }) => (
        <div key={area} className="space-y-4">
          {/* Cabeçalho da área — só mostra para admin */}
          {userIsAdmin && (
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-slate-400" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{area}</h2>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">
                {[...gestores.values()].reduce((s, arr) => s + arr.length, 0)} pendente(s)
              </span>
            </div>
          )}

          {/* Grupos por gestor */}
          {[...gestores.entries()].map(([gestor, colabs]) => {
            const isOpen = expandedGestores.has(gestor)
            return (
              <div key={gestor} className="card overflow-hidden">
                {/* Header do gestor */}
                <button
                  onClick={() => toggleGestor(gestor)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(gestor)}`}>
                    {gestor[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{gestor}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {colabs.length} colaborador(es) pendente(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
                      {colabs.length}
                    </span>
                    {isOpen
                      ? <ChevronDown size={15} className="text-slate-400" />
                      : <ChevronRight size={15} className="text-slate-400" />}
                  </div>
                </button>

                {/* Cards dos colaboradores */}
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {colabs.map(c => (
                        <div key={c.id} className="flex flex-col gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-sm transition-all bg-white dark:bg-slate-800">
                          {/* Colaborador info */}
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(c.nome)}`}>
                              {c.nome[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2">{c.nome}</p>
                              {c.cargo && <p className="text-xs text-slate-400 mt-0.5 truncate">{c.cargo}</p>}
                              {c.nivel && <p className="text-[10px] text-slate-300 dark:text-slate-600">{NIVEL_LABELS[c.nivel] ?? c.nivel}</p>}
                            </div>
                          </div>

                          {/* Badge sem avaliação */}
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            Aguardando avaliação
                          </div>

                          {/* Botão avaliar */}
                          <button
                            onClick={() => navigate(`/avaliacoes/nova/${c.id}`)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-colors"
                          >
                            <PlayCircle size={13} /> Avaliar agora
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
