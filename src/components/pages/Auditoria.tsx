import { useState, useEffect, useMemo } from 'react'
import {
  Shield, Search, Clock, User, FileText, Users,
  PlusCircle, Edit3, Trash2, UserMinus, RefreshCw,
  ChevronDown, ChevronRight, AlertCircle, Activity,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { AuditEntry } from '../../lib/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = {
  user:        'Usuário',
  colaborador: 'Colaborador',
  avaliacao:   'Avaliação',
  equipment:   'Equipamento',
  location:    'Local',
  category:    'Categoria',
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  user:        Users,
  colaborador: User,
  avaliacao:   FileText,
}

const ACTION_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  created:     { label: 'Criado',      icon: PlusCircle, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  updated:     { label: 'Atualizado',  icon: Edit3,      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  deleted:     { label: 'Excluído',    icon: Trash2,     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  deactivated: { label: 'Desativado',  icon: UserMinus,  cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  activated:   { label: 'Ativado',     icon: PlusCircle, cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'agora mesmo'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min atrás`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h atrás`
  return `${Math.floor(diff / 86_400_000)}d atrás`
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// ─── sub-components ──────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action] || { label: action, icon: Activity, cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' }
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.cls}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  )
}

function EntityBadge({ type }: { type: string }) {
  const Icon = ENTITY_ICONS[type] || Activity
  const label = ENTITY_LABELS[type] || type
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <Icon size={13} className="shrink-0" />
      {label}
    </span>
  )
}

function ChangeRow({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false)
  const hasChanges = entry.changes && entry.changes.length > 0

  return (
    <>
      <tr
        className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors ${
          hasChanges ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
        }`}
        onClick={() => hasChanges && setOpen(o => !o)}
      >
        {/* timestamp */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{fmtDate(entry.created_at)}</p>
              <p className="text-xs text-slate-400">{fmtTime(entry.created_at)}</p>
            </div>
          </div>
        </td>

        {/* ação */}
        <td className="px-4 py-3">
          <ActionBadge action={entry.action} />
        </td>

        {/* entidade */}
        <td className="px-4 py-3">
          <EntityBadge type={entry.entity_type} />
        </td>

        {/* nome da entidade */}
        <td className="px-4 py-3 max-w-[200px]">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{entry.entity_name || `#${entry.entity_id}`}</p>
        </td>

        {/* usuário responsável */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
              <User size={12} className="text-primary-600 dark:text-primary-400" />
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
              {entry.user_name || 'Sistema'}
            </p>
          </div>
        </td>

        {/* tempo relativo + expand */}
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-slate-400">{fmtRelative(entry.created_at)}</span>
            {hasChanges && (
              <span className="text-slate-400">
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* detalhe de mudanças */}
      {open && hasChanges && (
        <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700/50">
          <td colSpan={6} className="px-8 py-3">
            <div className="grid grid-cols-1 gap-1.5">
              {entry.changes!.map((c, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 min-w-[120px] shrink-0">{c.label || c.field}</span>
                  <span className="text-red-500 dark:text-red-400 line-through truncate max-w-[160px]">{c.old_value ?? '—'}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[160px]">{c.new_value ?? '—'}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

const ENTITY_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'user', label: 'Usuários' },
  { value: 'colaborador', label: 'Colaboradores' },
  { value: 'avaliacao', label: 'Avaliações' },
]

const ACTION_FILTER_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'created', label: 'Criados' },
  { value: 'updated', label: 'Atualizados' },
  { value: 'deleted', label: 'Excluídos' },
  { value: 'deactivated', label: 'Desativados' },
]

export default function AuditoriaPage() {
  const [entries, setEntries]         = useState<AuditEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.audit.list(entityFilter || undefined, undefined, 500)
      setEntries(data as AuditEntry[])
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar auditoria')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [entityFilter]) // eslint-disable-line

  const filtered = useMemo(() => {
    let list = entries
    if (actionFilter) list = list.filter(e => e.action === actionFilter)
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(e =>
        e.entity_name?.toLowerCase().includes(s) ||
        e.user_name?.toLowerCase().includes(s) ||
        ENTITY_LABELS[e.entity_type]?.toLowerCase().includes(s)
      )
    }
    if (dateFrom) list = list.filter(e => e.created_at >= dateFrom)
    if (dateTo)   list = list.filter(e => e.created_at <= dateTo + 'T23:59:59')
    return list
  }, [entries, actionFilter, search, dateFrom, dateTo])

  // ─── stats ───
  const today = todayIso()
  const todayEntries = entries.filter(e => e.created_at.startsWith(today))
  const usersToday   = new Set(todayEntries.map(e => e.user_id).filter(Boolean)).size
  const lastEntry    = entries[0]

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">

      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Shield size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Auditoria</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Histórico completo de ações do sistema</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Ações hoje</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{todayEntries.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Usuários ativos hoje</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{usersToday}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Última ação</p>
          {lastEntry ? (
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{lastEntry.user_name || 'Sistema'}</p>
              <p className="text-xs text-slate-400">{fmtRelative(lastEntry.created_at)}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
      </div>

      {/* filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome, usuário..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
            />
          </div>

          {/* date from */}
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
          />
          <span className="text-slate-400 text-sm">até</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
          />
        </div>

        {/* chip filters */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 self-center mr-1">Tipo:</span>
          {ENTITY_FILTER_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setEntityFilter(o.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                entityFilter === o.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {o.label}
            </button>
          ))}
          <span className="text-xs text-slate-400 self-center ml-3 mr-1">Ação:</span>
          {ACTION_FILTER_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setActionFilter(o.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                actionFilter === o.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* table header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
            {(search || actionFilter || dateFrom || dateTo) && (
              <span className="ml-1 text-slate-400 font-normal">filtrados</span>
            )}
          </p>
          {(search || actionFilter || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setActionFilter(''); setDateFrom(''); setDateTo('') }}
              className="text-xs text-primary-500 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-sm">Carregando registros...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertCircle size={28} />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={load} className="text-xs underline">Tentar novamente</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Shield size={28} className="opacity-30" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data / Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ação</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Realizado por</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tempo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <ChangeRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
