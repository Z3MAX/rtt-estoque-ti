import { useEffect, useState, type FormEvent } from 'react'
import {
  CalendarRange, RefreshCw, Play, Square, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertCircle, Users,
} from 'lucide-react'
import { api } from '../../lib/api'

const PERIODOS: Record<string, string> = {
  '1Sem_2024': '1º Sem / 2024', '2Sem_2024': '2º Sem / 2024',
  '1Sem_2025': '1º Sem / 2025', '2Sem_2025': '2º Sem / 2025',
  '1Sem_2026': '1º Sem / 2026', '2Sem_2026': '2º Sem / 2026',
  '1Sem_2027': '1º Sem / 2027', '2Sem_2027': '2º Sem / 2027',
}

interface Gestor {
  id: number
  name: string
  area: string
  enviadas: number
  total_colabs: number
}

interface Ciclo {
  id: number
  periodo_inicial: string
  periodo_final?: string
  prazo?: string
  status: 'aberto' | 'encerrado'
  created_at: string
  total_avaliacoes: number
  pendentes_calibracao: number
  gestores: Gestor[]
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function NovoCicloModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [periodoInicial, setPeriodoInicial] = useState('')
  const [periodoFinal, setPeriodoFinal] = useState('')
  const [prazo, setPrazo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!periodoInicial) { setError('Selecione o período de referência'); return }
    if (!prazo) { setError('Defina um prazo para os gestores'); return }
    setLoading(true); setError('')
    try {
      await api.ciclos.create({ periodo_inicial: periodoInicial, periodo_final: periodoFinal || periodoInicial, prazo })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao abrir ciclo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Abrir novo ciclo</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Defina o período e o prazo para os gestores</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Período de referência</label>
            <select className="input" value={periodoInicial} onChange={e => { setPeriodoInicial(e.target.value); if (!periodoFinal) setPeriodoFinal(e.target.value) }} disabled={loading}>
              <option value="">Selecione...</option>
              {Object.entries(PERIODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Prazo para envio <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="input"
              value={prazo}
              onChange={e => setPrazo(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              disabled={loading}
            />
            <p className="text-xs text-slate-400 mt-1">Os gestores poderão enviar avaliações até esta data.</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary gap-2">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              Abrir ciclo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GestorRow({ g }: { g: Gestor }) {
  const pct = g.total_colabs > 0 ? Math.round((g.enviadas / g.total_colabs) * 100) : 0
  const completo = g.enviadas >= g.total_colabs && g.total_colabs > 0
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
      <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
        <span className="text-primary-600 dark:text-primary-400 text-xs font-bold">{g.name[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{g.name}</p>
        <p className="text-xs text-slate-400 truncate">{g.area || 'Sem área'}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{g.enviadas} / {g.total_colabs}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${completo ? 'bg-emerald-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
          </div>
          {completo
            ? <CheckCircle2 size={12} className="text-emerald-500" />
            : <Clock size={12} className="text-amber-400" />}
        </div>
      </div>
    </div>
  )
}

function CicloCard({ ciclo, onEncerrar }: { ciclo: Ciclo; onEncerrar: (id: number) => void }) {
  const [expanded, setExpanded] = useState(ciclo.status === 'aberto')
  const [encerrando, setEncerrando] = useState(false)
  const isAberto = ciclo.status === 'aberto'
  const gestoresCompletos = ciclo.gestores.filter(g => g.enviadas >= g.total_colabs && g.total_colabs > 0).length
  const totalGestores = ciclo.gestores.length

  async function handleEncerrar() {
    if (!confirm('Tem certeza que deseja encerrar este ciclo? Os gestores não poderão mais enviar avaliações.')) return
    setEncerrando(true)
    try { await api.ciclos.encerrar(ciclo.id); onEncerrar(ciclo.id) }
    catch { /* silencioso */ } finally { setEncerrando(false) }
  }

  return (
    <div className={`card overflow-hidden ${isAberto ? 'border-2 border-primary-300 dark:border-primary-700' : ''}`}>
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isAberto ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
          <CalendarRange size={18} className={isAberto ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {PERIODOS[ciclo.periodo_inicial] || ciclo.periodo_inicial}
            </h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isAberto ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              {isAberto ? 'Aberto' : 'Encerrado'}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
            <span>Prazo: {ciclo.prazo ? formatDate(ciclo.prazo) : '—'}</span>
            <span>Aberto em: {formatDate(ciclo.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAberto && (
            <button
              onClick={handleEncerrar}
              disabled={encerrando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              {encerrando ? <RefreshCw size={11} className="animate-spin" /> : <Square size={11} />}
              Encerrar
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0 border-t border-slate-100 dark:border-slate-700">
        {[
          { label: 'Avaliações enviadas', value: ciclo.total_avaliacoes, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Ag. calibração', value: ciclo.pendentes_calibracao, color: 'text-amber-600 dark:text-amber-400' },
          { label: `Gestores completos`, value: `${gestoresCompletos}/${totalGestores}`, color: 'text-emerald-600 dark:text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 text-center border-r border-slate-100 dark:border-slate-700 last:border-0">
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Gestores expandido */}
      {expanded && ciclo.gestores.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700">
          <div className="px-4 py-2.5 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50">
            <Users size={13} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gestores</p>
          </div>
          {ciclo.gestores.map(g => <GestorRow key={g.id} g={g} />)}
        </div>
      )}
      {expanded && ciclo.gestores.length === 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
          Nenhum gestor cadastrado no sistema.
        </div>
      )}
    </div>
  )
}

export default function CicloAvaliacaoPage() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api.ciclos.list() as Ciclo[]
      setCiclos(data)
    } catch { /* silencioso */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const cicloAberto = ciclos.find(c => c.status === 'aberto')

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ciclo de Avaliação</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {cicloAberto ? `Ciclo aberto: ${PERIODOS[cicloAberto.periodo_inicial] || cicloAberto.periodo_inicial}` : 'Nenhum ciclo aberto no momento'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary gap-2">
            <RefreshCw size={14} /> Atualizar
          </button>
          {!cicloAberto && (
            <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
              <Play size={14} /> Abrir novo ciclo
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : ciclos.length === 0 ? (
        <div className="card flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
          <CalendarRange size={36} className="opacity-40" />
          <p className="text-sm font-medium">Nenhum ciclo de avaliação criado ainda</p>
          <button onClick={() => setShowModal(true)} className="btn-primary gap-2 text-sm">
            <Play size={13} /> Abrir primeiro ciclo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {ciclos.map(c => (
            <CicloCard
              key={c.id}
              ciclo={c}
              onEncerrar={() => load()}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NovoCicloModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
