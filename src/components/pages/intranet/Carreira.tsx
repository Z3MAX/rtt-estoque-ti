import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TrendingUp, MessageSquare, Users2, Plus, Pencil, Trash2,
  ChevronDown, ChevronUp, Calendar, CheckCircle2, Clock, AlertCircle,
  X, Save, Loader2,
} from 'lucide-react'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'

// ─── COLABORADOR AUTOCOMPLETE ──────────────────────────────────────────────

function ColaboradorPicker({ value, onChange, placeholder }: {
  value: string; onChange: (nome: string) => void; placeholder?: string
}) {
  const [colabs, setColabs] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  async function load() {
    if (loaded) return
    try {
      const list = await api.colaboradores.list({ ativo: true })
      setColabs(list.map((c: any) => c.nome as string).sort())
      setLoaded(true)
    } catch {}
  }

  const suggestions = query.trim().length >= 1
    ? colabs.filter(n => n.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <input
        value={query}
        onFocus={() => { load(); setOpen(true) }}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        placeholder={placeholder ?? 'Nome do colaborador'}
        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg z-50 overflow-hidden max-h-52 overflow-y-auto">
          {suggestions.map(nome => (
            <button
              key={nome}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(nome); setQuery(nome); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              {nome}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type Tab = 'pdi' | 'feedbacks' | 'oneonone'

function isAdminRole(role?: string) {
  return ['Administrador de RH', 'Administrador Master', 'Administrador de RH / Gestor'].includes(role ?? '')
}
function isGestorRole(role?: string) {
  return role === 'Gestor' || role === 'Administrador de RH / Gestor'
}
function canWrite(role?: string) {
  return isAdminRole(role) || isGestorRole(role)
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── PDI TAB ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ativo:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  concluido:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelado:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pendente:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

const ACAO_STATUS_ICON: Record<string, JSX.Element> = {
  pendente:   <Clock size={13} className="text-yellow-500" />,
  em_andamento: <AlertCircle size={13} className="text-blue-500" />,
  concluido:  <CheckCircle2 size={13} className="text-green-500" />,
}

function PDIForm({ initial, onSave, onCancel, saving }: {
  initial?: any; onSave: (d: any) => void; onCancel: () => void; saving: boolean
}) {
  const [form, setForm] = useState({
    colaborador_nome: initial?.colaborador_nome ?? '',
    titulo: initial?.titulo ?? 'PDI',
    objetivo: initial?.objetivo ?? '',
    periodo_inicio: initial?.periodo_inicio?.slice(0, 10) ?? '',
    periodo_fim: initial?.periodo_fim?.slice(0, 10) ?? '',
    status: initial?.status ?? 'ativo',
    observacoes: initial?.observacoes ?? '',
    acoes: (initial?.acoes ?? []).map((a: any) => ({ ...a })),
  })

  function setField(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function addAcao() {
    setForm(f => ({
      ...f,
      acoes: [...f.acoes, { competencia: '', descricao: '', prazo: '', status: 'pendente', progresso: 0 }],
    }))
  }
  function removeAcao(i: number) {
    setForm(f => ({ ...f, acoes: f.acoes.filter((_: any, idx: number) => idx !== i) }))
  }
  function setAcaoField(i: number, k: string, v: string | number) {
    setForm(f => {
      const acoes = [...f.acoes]
      acoes[i] = { ...acoes[i], [k]: v }
      return { ...f, acoes }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Colaborador *</label>
          <ColaboradorPicker value={form.colaborador_nome} onChange={v => setField('colaborador_nome', v)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Título</label>
          <input value={form.titulo} onChange={e => setField('titulo', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Objetivo</label>
          <textarea value={form.objetivo} onChange={e => setField('objetivo', e.target.value)} rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Período início</label>
          <input type="date" value={form.periodo_inicio} onChange={e => setField('periodo_inicio', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Período fim</label>
          <input type="date" value={form.periodo_fim} onChange={e => setField('periodo_fim', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        {initial && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
            <select value={form.status} onChange={e => setField('status', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400">
              <option value="ativo">Ativo</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        )}
        <div className={initial ? '' : 'sm:col-span-2'}>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Observações</label>
          <textarea value={form.observacoes} onChange={e => setField('observacoes', e.target.value)} rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
        </div>
      </div>

      {/* Ações */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ações de Desenvolvimento</h4>
          <button type="button" onClick={addAcao}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
            <Plus size={13} /> Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {form.acoes.map((a: any, i: number) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <input value={a.competencia} onChange={e => setAcaoField(i, 'competencia', e.target.value)}
                placeholder="Competência" className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400" />
              <input value={a.descricao} onChange={e => setAcaoField(i, 'descricao', e.target.value)}
                placeholder="Descrição *" className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400" />
              <div className="flex gap-2">
                <input type="date" value={a.prazo?.slice(0, 10) ?? ''} onChange={e => setAcaoField(i, 'prazo', e.target.value)}
                  className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400" />
                <select value={a.status} onChange={e => setAcaoField(i, 'status', e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400">
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                </select>
                <button type="button" onClick={() => removeAcao(i)} className="text-red-400 hover:text-red-600">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
          {form.acoes.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">Nenhuma ação adicionada</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave(form)} disabled={saving || !form.colaborador_nome}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

function PDICard({ pdi, canEdit, onEdit, onDelete }: { pdi: any; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const statusCls = STATUS_COLORS[pdi.status] ?? 'bg-slate-100 text-slate-600'

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{pdi.colaborador_nome}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>{pdi.status}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{pdi.titulo}</p>
          {pdi.periodo_inicio && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Calendar size={11} /> {formatDate(pdi.periodo_inicio)} → {formatDate(pdi.periodo_fim)}
            </p>
          )}
          {pdi.gestor_nome && (
            <p className="text-xs text-slate-400 mt-0.5">Gestor: {pdi.gestor_nome}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && (
            <>
              <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                <Trash2 size={13} />
              </button>
            </>
          )}
          <button onClick={() => setExpanded(v => !v)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3">
          {pdi.objetivo && <p className="text-sm text-slate-600 dark:text-slate-300">{pdi.objetivo}</p>}
          {pdi.observacoes && <p className="text-xs text-slate-500 dark:text-slate-400 italic">{pdi.observacoes}</p>}
          {pdi.acoes?.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ações</h5>
              <div className="space-y-2">
                {pdi.acoes.map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <span className="mt-0.5">{ACAO_STATUS_ICON[a.status] ?? <Clock size={13} />}</span>
                    <div className="flex-1 min-w-0">
                      {a.competencia && <span className="text-xs font-medium text-primary-600 dark:text-primary-400">{a.competencia} · </span>}
                      <span className="text-xs text-slate-700 dark:text-slate-300">{a.descricao}</span>
                      {a.prazo && <span className="text-xs text-slate-400 ml-2">prazo: {formatDate(a.prazo)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PDITab() {
  const { user } = useAuth()
  const [pdis, setPdis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const writer = canWrite(user?.role)

  const load = useCallback(async () => {
    setLoading(true)
    try { setPdis(await api.carreiraPdi.list()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(data: any) {
    setSaving(true)
    try {
      if (editing) { await api.carreiraPdi.update(editing.id, data) }
      else { await api.carreiraPdi.create(data) }
      setEditing(null); setShowForm(false)
      await load()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir este PDI?')) return
    await api.carreiraPdi.delete(id)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {pdis.length} PDI{pdis.length !== 1 ? 's' : ''} encontrado{pdis.length !== 1 ? 's' : ''}
        </p>
        {writer && !showForm && (
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors">
            <Plus size={13} /> Novo PDI
          </button>
        )}
      </div>

      {(showForm && !editing) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Novo PDI</h3>
          <PDIForm onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : pdis.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Nenhum PDI cadastrado</div>
      ) : (
        <div className="space-y-3">
          {pdis.map(pdi => editing?.id === pdi.id ? (
            <div key={pdi.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-primary-200 dark:border-primary-700 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Editar PDI</h3>
              <PDIForm initial={pdi} onSave={handleSave} onCancel={() => setEditing(null)} saving={saving} />
            </div>
          ) : (
            <PDICard key={pdi.id} pdi={pdi} canEdit={writer}
              onEdit={() => { setEditing(pdi); setShowForm(false) }}
              onDelete={() => handleDelete(pdi.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── FEEDBACKS TAB ─────────────────────────────────────────────────────────

const TIPO_COLORS: Record<string, string> = {
  geral:       'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  positivo:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  construtivo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  peer:        'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
}

function FeedbackForm({ onSave, onCancel, saving }: { onSave: (d: any) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({ para_nome: '', tipo: 'geral', conteudo: '', pontos_fortes: '', areas_melhoria: '', data_feedback: '' })
  function f(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Para *</label>
          <ColaboradorPicker value={form.para_nome} onChange={v => f('para_nome', v)} placeholder="Buscar colaborador..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tipo</label>
          <select value={form.tipo} onChange={e => f('tipo', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400">
            <option value="geral">Geral</option>
            <option value="positivo">Positivo</option>
            <option value="construtivo">Construtivo</option>
            <option value="peer">Peer (colega)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Data</label>
          <input type="date" value={form.data_feedback} onChange={e => f('data_feedback', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Conteúdo *</label>
          <textarea value={form.conteudo} onChange={e => f('conteudo', e.target.value)} rows={3}
            placeholder="Descreva o feedback..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Pontos fortes</label>
          <textarea value={form.pontos_fortes} onChange={e => f('pontos_fortes', e.target.value)} rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Áreas de melhoria</label>
          <textarea value={form.areas_melhoria} onChange={e => f('areas_melhoria', e.target.value)} rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} disabled={saving || !form.para_nome || !form.conteudo}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

function FeedbacksTab() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.carreiraFeedbacks.list()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(data: any) {
    setSaving(true)
    try { await api.carreiraFeedbacks.create(data); setShowForm(false); await load() }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir este feedback?')) return
    await api.carreiraFeedbacks.delete(id)
    await load()
  }

  const isAdmin = isAdminRole(user?.role)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{items.length} feedback{items.length !== 1 ? 's' : ''}</p>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors">
            <Plus size={13} /> Novo Feedback
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Novo Feedback</h3>
          <FeedbackForm onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Nenhum feedback registrado</div>
      ) : (
        <div className="space-y-3">
          {items.map(fb => {
            const tipoCls = TIPO_COLORS[fb.tipo] ?? TIPO_COLORS.geral
            const isOwn = fb.de_nome?.toLowerCase().trim() === user?.name?.toLowerCase().trim()
            return (
              <div key={fb.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{fb.de_nome}</span>
                      <span className="text-xs text-slate-400">→</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{fb.para_nome}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoCls}`}>{fb.tipo}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{fb.conteudo}</p>
                    {fb.pontos_fortes && <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ {fb.pontos_fortes}</p>}
                    {fb.areas_melhoria && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">△ {fb.areas_melhoria}</p>}
                    <p className="text-xs text-slate-400 mt-1">{formatDate(fb.data_feedback || fb.created_at)}</p>
                  </div>
                  {(isAdmin || isOwn) && (
                    <button onClick={() => handleDelete(fb.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── ONE-ON-ONE TAB ────────────────────────────────────────────────────────

function OneononeForm({ initial, onSave, onCancel, saving }: {
  initial?: any; onSave: (d: any) => void; onCancel: () => void; saving: boolean
}) {
  const [form, setForm] = useState({
    colaborador_nome: initial?.colaborador_nome ?? '',
    data_reuniao: initial?.data_reuniao?.slice(0, 10) ?? '',
    pauta: initial?.pauta ?? '',
    observacoes: initial?.observacoes ?? '',
    proximos_passos: initial?.proximos_passos ?? '',
  })
  function f(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Colaborador *</label>
          <ColaboradorPicker value={form.colaborador_nome} onChange={v => f('colaborador_nome', v)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Data da Reunião *</label>
          <input type="date" value={form.data_reuniao} onChange={e => f('data_reuniao', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Pauta</label>
          <textarea value={form.pauta} onChange={e => f('pauta', e.target.value)} rows={2}
            placeholder="Temas a discutir..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Observações / Ata</label>
          <textarea value={form.observacoes} onChange={e => f('observacoes', e.target.value)} rows={3}
            placeholder="Pontos discutidos..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Próximos Passos</label>
          <textarea value={form.proximos_passos} onChange={e => f('proximos_passos', e.target.value)} rows={2}
            placeholder="Ações acordadas..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} disabled={saving || !form.colaborador_nome || !form.data_reuniao}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

function OneononeTab() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const writer = canWrite(user?.role)
  const isAdmin = isAdminRole(user?.role)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.carreiraOneonone.list()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(data: any) {
    setSaving(true)
    try {
      if (editing) { await api.carreiraOneonone.update(editing.id, data) }
      else { await api.carreiraOneonone.create(data) }
      setEditing(null); setShowForm(false); await load()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir este registro?')) return
    await api.carreiraOneonone.delete(id)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{items.length} reunião{items.length !== 1 ? 'ões' : ''}</p>
        {writer && !showForm && !editing && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors">
            <Plus size={13} /> Nova Reunião
          </button>
        )}
      </div>

      {showForm && !editing && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Nova Reunião 1:1</h3>
          <OneononeForm onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Nenhuma reunião 1:1 registrada</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => editing?.id === item.id ? (
            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-primary-200 dark:border-primary-700 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Editar Reunião 1:1</h3>
              <OneononeForm initial={item} onSave={handleSave} onCancel={() => setEditing(null)} saving={saving} />
            </div>
          ) : (
            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Calendar size={13} className="text-primary-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatDate(item.data_reuniao)}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">· {item.gestor_nome} → {item.colaborador_nome}</span>
                  </div>
                  {item.pauta && (
                    <div className="mt-1.5">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pauta: </span>
                      <span className="text-xs text-slate-700 dark:text-slate-300">{item.pauta}</span>
                    </div>
                  )}
                  {item.observacoes && (
                    <div className="mt-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Ata: </span>
                      <span className="text-xs text-slate-700 dark:text-slate-300">{item.observacoes}</span>
                    </div>
                  )}
                  {item.proximos_passos && (
                    <div className="mt-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Próximos passos: </span>
                      <span className="text-xs text-slate-700 dark:text-slate-300">{item.proximos_passos}</span>
                    </div>
                  )}
                </div>
                {writer && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditing(item); setShowForm(false) }}
                      className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    {(isAdmin || item.gestor_nome?.toLowerCase().trim() === user?.name?.toLowerCase().trim()) && (
                      <button onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: typeof TrendingUp }[] = [
  { key: 'pdi',       label: 'PDI',          icon: TrendingUp   },
  { key: 'feedbacks', label: 'Feedbacks',     icon: MessageSquare },
  { key: 'oneonone',  label: 'Reuniões 1:1', icon: Users2        },
]

export default function CarreiraPage() {
  const [tab, setTab] = useState<Tab>('pdi')
  const Active = TABS.find(t => t.key === tab)!

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Carreira</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">PDI, feedbacks e acompanhamento individual</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              tab === key
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'pdi'       && <PDITab />}
      {tab === 'feedbacks' && <FeedbacksTab />}
      {tab === 'oneonone'  && <OneononeTab />}
    </div>
  )
}
