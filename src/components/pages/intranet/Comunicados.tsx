import { useEffect, useState } from 'react'
import { Megaphone, Pin, Clock, Plus, X, RefreshCw, Trash2, Edit2, Search, Users } from 'lucide-react'
import { api } from '../../../lib/api'
import { useAuth, isAdmin } from '../../../lib/auth'

interface Comunicado {
  id: number
  titulo: string
  resumo?: string
  conteudo?: string
  categoria: string
  areas?: string[]
  fixado: boolean
  publicado: boolean
  autor_nome: string
  created_at: string
}

const CAT_COLORS: Record<string, string> = {
  RH:        'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
  TI:        'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  Facilities:'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  Geral:     'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
}

const EMPTY = { titulo: '', resumo: '', conteudo: '', categoria: 'Geral', fixado: false, areas: [] as string[] }

function Modal({ init, onSave, onClose }: {
  init?: Comunicado | null
  onSave: (data: typeof EMPTY) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState(init ? {
    titulo: init.titulo, resumo: init.resumo ?? '', conteudo: init.conteudo ?? '',
    categoria: init.categoria, fixado: init.fixado, areas: init.areas ?? [],
  } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [availableAreas, setAvailableAreas] = useState<string[]>([])

  useEffect(() => {
    api.comunicados.areas().then(setAvailableAreas).catch(() => {})
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  function toggleArea(area: string) {
    setForm(f => ({
      ...f,
      areas: f.areas.includes(area) ? f.areas.filter(a => a !== area) : [...f.areas, area],
    }))
  }

  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <form className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{init ? 'Editar comunicado' : 'Novo comunicado'}</h2>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Título *</label>
            <input className={inputCls} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Categoria</label>
              <select className={inputCls} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {['Geral', 'RH', 'TI', 'Facilities'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-primary-500" checked={form.fixado} onChange={e => setForm(f => ({ ...f, fixado: e.target.checked }))} />
                <span className="text-sm text-slate-600 dark:text-slate-300">Fixar no topo</span>
              </label>
            </div>
          </div>

          {availableAreas.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Users size={11} /> Destinatários
                </label>
                {form.areas.length > 0 && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, areas: [] }))} className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    Limpar seleção
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mb-2">
                {form.areas.length === 0 ? 'Nenhuma área selecionada — será enviado para todas as áreas.' : `${form.areas.length} área(s) selecionada(s).`}
              </p>
              <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-xl divide-y divide-slate-100 dark:divide-slate-700">
                {availableAreas.map(area => (
                  <label key={area} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded accent-primary-500 shrink-0"
                      checked={form.areas.includes(area)}
                      onChange={() => toggleArea(area)}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{area}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Resumo</label>
            <textarea className={inputCls} rows={2} value={form.resumo} onChange={e => setForm(f => ({ ...f, resumo: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Conteúdo completo</label>
            <textarea className={inputCls} rows={4} value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60 transition-colors">
            {saving ? <><RefreshCw size={13} className="animate-spin" />Salvando...</> : 'Publicar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function ComunicadosPage() {
  const { user } = useAuth()
  const canAdmin = isAdmin(user?.role)
  const [items, setItems] = useState<Comunicado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [modal, setModal] = useState<'new' | Comunicado | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  function fetchComunicados() {
    setLoading(true)
    setError(false)
    api.comunicados.list()
      .then(data => setItems((data as Comunicado[]) || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchComunicados()
  }, [])

  async function handleSave(form: typeof EMPTY) {
    try {
      if (modal === 'new') {
        const created = await api.comunicados.create(form) as Comunicado
        setItems(prev => {
          const next = [created, ...prev]
          return next.sort((a, b) => Number(b.fixado) - Number(a.fixado))
        })
      } else if (modal && typeof modal === 'object') {
        const updated = await api.comunicados.update(modal.id, form) as Comunicado
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
      }
      setModal(null)
    } catch {
      alert('Erro ao salvar comunicado. Tente novamente.')
    }
  }

  async function handleDelete(id: number) {
    setDeleting(id)
    try {
      await api.comunicados.delete(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch {
      alert('Erro ao excluir comunicado. Tente novamente.')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = items.filter(c =>
    !search || c.titulo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Comunicados</h1>
          <p className="text-sm text-slate-400 mt-0.5">Informações e avisos da empresa</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Buscar por título..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={14} />
              </button>
            )}
          </div>
          {canAdmin && (
            <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
              <Plus size={15} /> Novo comunicado
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
          <Megaphone size={32} className="opacity-40" />
          <p className="text-sm">Erro ao carregar comunicados. Tente novamente.</p>
          <button
            onClick={fetchComunicados}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
          <Megaphone size={32} className="opacity-40" />
          <p className="text-sm">{search ? 'Nenhum comunicado encontrado para esta busca.' : 'Nenhum comunicado publicado ainda.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const catCls = CAT_COLORS[c.categoria] ?? CAT_COLORS.Geral
            const data = new Date(c.created_at).toLocaleDateString('pt-BR')
            const open = expanded === c.id
            const hasAreas = c.areas && c.areas.length > 0
            return (
              <div key={c.id} className={`bg-white dark:bg-slate-800 rounded-2xl border ${c.fixado ? 'border-primary-200 dark:border-primary-800' : 'border-slate-200 dark:border-slate-700'} overflow-hidden hover:shadow-md transition-all`}>
                <button className="w-full p-5 flex gap-4 text-left" onClick={() => setExpanded(open ? null : c.id)}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.fixado ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    {c.fixado ? <Pin size={15} className="text-primary-600" /> : <Megaphone size={15} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catCls}`}>{c.categoria}</span>
                      {c.fixado && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">Fixado</span>}
                      {hasAreas && c.areas!.map(a => (
                        <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                          {a}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{c.titulo}</p>
                    {c.resumo && !open && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.resumo}</p>}
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                      <Clock size={11} /> {data} · {c.autor_nome}
                    </div>
                  </div>
                  {canAdmin && (
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setModal(c)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-primary-500 transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors disabled:opacity-40">
                        {deleting === c.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  )}
                </button>
                {open && (c.resumo || c.conteudo) && (
                  <div className="px-5 pb-5 pt-0 ml-[3.25rem] text-sm text-slate-600 dark:text-slate-300 space-y-2 border-t border-slate-100 dark:border-slate-700">
                    {c.resumo && <p className="pt-4 font-medium">{c.resumo}</p>}
                    {c.conteudo && <p className="text-slate-500 dark:text-slate-400 whitespace-pre-line">{c.conteudo}</p>}
                  </div>
                )}
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
