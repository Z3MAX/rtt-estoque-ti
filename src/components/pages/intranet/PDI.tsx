import { useEffect, useState } from 'react'
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, Plus, X, RefreshCw, Trash2, Edit2 } from 'lucide-react'
import { api } from '../../../lib/api'

interface Iniciativa {
  id: number
  titulo: string
  competencia?: string
  prazo?: string
  status: 'pendente' | 'em-andamento' | 'atrasado' | 'concluido'
  pct: number
  created_at: string
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  pendente:     { label: 'Pendente',     cls: 'bg-slate-100 dark:bg-slate-700 text-slate-500' },
  'em-andamento':{ label: 'Em andamento', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  atrasado:     { label: 'Atrasado',     cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
  concluido:    { label: 'Concluído',    cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
}

const EMPTY: Omit<Iniciativa, 'id' | 'created_at'> = {
  titulo: '', competencia: '', prazo: '', status: 'pendente', pct: 0,
}

function Modal({ init, onSave, onClose }: {
  init?: Iniciativa | null
  onSave: (data: typeof EMPTY) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<typeof EMPTY>(init ? {
    titulo: init.titulo, competencia: init.competencia ?? '', prazo: init.prazo ?? '',
    status: init.status, pct: init.pct,
  } : { ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <form className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{init ? 'Editar iniciativa' : 'Nova iniciativa'}</h2>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Título *</label>
            <input className={inputCls} placeholder="Ex: Concluir curso de Excel Avançado" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Competência</label>
            <input className={inputCls} placeholder="Ex: Análise de Dados" value={form.competencia} onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Prazo</label>
              <input type="date" className={inputCls} value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Status</label>
              <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Iniciativa['status'] }))}>
                <option value="pendente">Pendente</option>
                <option value="em-andamento">Em andamento</option>
                <option value="atrasado">Atrasado</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Progresso: {form.pct}%</label>
            <input type="range" min={0} max={100} step={5} className="w-full accent-primary-500" value={form.pct} onChange={e => setForm(f => ({ ...f, pct: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60 transition-colors">
            {saving ? <><RefreshCw size={13} className="animate-spin" />Salvando...</> : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function PDIPage() {
  const [items, setItems] = useState<Iniciativa[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'new' | Iniciativa | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    api.pdi.list().then(data => setItems((data as Iniciativa[]) || [])).finally(() => setLoading(false))
  }, [])

  async function handleSave(form: typeof EMPTY) {
    if (modal === 'new') {
      const created = await api.pdi.create(form) as Iniciativa
      setItems(prev => [created, ...prev])
    } else if (modal && typeof modal === 'object') {
      const updated = await api.pdi.update(modal.id, form) as Iniciativa
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    }
    setModal(null)
  }

  async function handleDelete(id: number) {
    setDeleting(id)
    await api.pdi.delete(id)
    setItems(prev => prev.filter(i => i.id !== id))
    setDeleting(null)
  }

  const concluidos  = items.filter(i => i.status === 'concluido').length
  const atrasados   = items.filter(i => i.status === 'atrasado').length
  const pendentes   = items.filter(i => i.status !== 'concluido').length
  const pctGeral    = items.length === 0 ? 0 : Math.round(items.reduce((a, i) => a + i.pct, 0) / items.length)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Meu PDI</h1>
          <p className="text-sm text-slate-400 mt-0.5">Plano de Desenvolvimento Individual</p>
        </div>
        <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
          <Plus size={15} /> Nova iniciativa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pendentes',    value: pendentes,  color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Atrasadas',   value: atrasados,  color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Concluídas',  value: concluidos, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Progresso geral', value: `${pctGeral}%`, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center`}>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
          <TrendingUp size={32} className="opacity-40" />
          <p className="text-sm">Nenhuma iniciativa ainda.</p>
          <button onClick={() => setModal('new')} className="text-sm text-primary-600 hover:underline">Adicionar primeira iniciativa</button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.pendente
            const prazoFormatado = item.prazo ? new Date(item.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : null
            return (
              <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex gap-4 hover:shadow-sm transition-all">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  item.status === 'concluido'     ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                  item.status === 'atrasado'      ? 'bg-red-100 dark:bg-red-900/30'         :
                  item.status === 'em-andamento'  ? 'bg-blue-100 dark:bg-blue-900/30'       :
                  'bg-slate-100 dark:bg-slate-700'
                }`}>
                  {item.status === 'concluido'    ? <CheckCircle2 size={16} className="text-emerald-600" /> :
                   item.status === 'atrasado'     ? <AlertTriangle size={16} className="text-red-500" />   :
                   item.status === 'em-andamento' ? <TrendingUp size={16} className="text-blue-600" />     :
                   <Clock size={16} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    {item.competencia && <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{item.competencia}</span>}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.titulo}</p>
                  {prazoFormatado && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                      <Clock size={11} /> Prazo: {prazoFormatado}
                    </div>
                  )}
                  {item.pct > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.status === 'concluido' ? 'bg-emerald-500' : 'bg-primary-500'}`} style={{ width: `${item.pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 w-8 text-right">{item.pct}%</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setModal(item)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-primary-500 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors disabled:opacity-40">
                    {deleting === item.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal
          init={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
