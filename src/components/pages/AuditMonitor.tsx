import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Activity, RefreshCw, Search, User, Wifi, WifiOff, X,
  Hash, Tag, MapPin, TrendingUp, Calendar, Zap, UserCheck,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { AuditEntry } from '../../lib/types'

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; symbol: string }> = {
  created:     { label: 'Cadastrado',  symbol: '+', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20',  border: 'border-emerald-200 dark:border-emerald-800/50' },
  updated:     { label: 'Atualizado',  symbol: '~', color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-900/20',          border: 'border-blue-200 dark:border-blue-800/50' },
  deleted:     { label: 'Excluído',    symbol: '×', color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20',            border: 'border-red-200 dark:border-red-800/50' },
  deactivated: { label: 'Desativado',  symbol: '↓', color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20',        border: 'border-amber-200 dark:border-amber-800/50' },
  activated:   { label: 'Ativado',     symbol: '↑', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20',    border: 'border-emerald-200 dark:border-emerald-800/50' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora mesmo'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const days = Math.floor(h / 24)
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const POLL_INTERVAL = 10000

export default function AuditMonitor() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [paused, setPaused] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [newIds, setNewIds] = useState<Set<number>>(new Set())
  const [secsSince, setSecsSince] = useState(0)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [fieldFilter, setFieldFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')

  const knownIdsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    async function init() {
      try {
        const auditData = await api.audit.list('colaborador', undefined, 200) as AuditEntry[]
        setEntries(auditData)
        knownIdsRef.current = new Set(auditData.map((e) => e.id))
        setLastUpdate(new Date())
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const fetchNew = useCallback(async () => {
    try {
      const data = await api.audit.list('colaborador', undefined, 200) as AuditEntry[]
      const incoming = data.filter((e) => !knownIdsRef.current.has(e.id))
      if (incoming.length > 0) {
        const incomingIds = new Set(incoming.map((e) => e.id))
        setEntries(data)
        setNewIds((prev) => new Set([...prev, ...incomingIds]))
        knownIdsRef.current = new Set(data.map((e) => e.id))
        setTimeout(() => {
          setNewIds((prev) => {
            const next = new Set(prev)
            incomingIds.forEach((id) => next.delete(id))
            return next
          })
        }, 5000)
      }
      setLastUpdate(new Date())
      setSecsSince(0)
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (paused) return
    const interval = setInterval(fetchNew, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [paused, fetchNew])

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setSecsSince((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [paused])

  // ── KPIs ──
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const weekStart = Date.now() - 6 * 86_400_000
  const todayCount = entries.filter((e) => new Date(e.created_at).getTime() >= todayStart).length
  const weekCount = entries.filter((e) => new Date(e.created_at).getTime() >= weekStart).length

  const fieldCounts: Record<string, number> = {}
  const userCounts: Record<string, number> = {}
  for (const e of entries) {
    if (e.user_name) userCounts[e.user_name] = (userCounts[e.user_name] ?? 0) + 1
    for (const c of e.changes ?? []) {
      fieldCounts[c.label] = (fieldCounts[c.label] ?? 0) + 1
    }
  }
  const topField = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])[0]
  const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]

  // ── Options for filters ──
  const allFields = [...new Set(entries.flatMap((e) => e.changes?.map((c) => c.label) ?? []))]
  const allUsers = [...new Set(entries.map((e) => e.user_name).filter(Boolean))] as string[]

  // ── Filtered ──
  const filtered = entries.filter((e) => {
    if (search && !(e.entity_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (actionFilter && e.action !== actionFilter) return false
    if (userFilter && e.user_name !== userFilter) return false
    if (fieldFilter && !e.changes?.some((c) => c.label === fieldFilter)) return false
    return true
  })

  const hasFilters = !!(search || actionFilter || fieldFilter || userFilter)

  return (
    <div className="p-8 space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Monitor de Auditoria</h1>
            {!paused && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ao vivo
              </span>
            )}
          </div>
          {lastUpdate && (
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              {secsSince === 0 ? 'Atualizado agora mesmo' : `Atualizado há ${secsSince}s`}
              {!paused && ` · próxima em ${Math.max(0, 10 - secsSince)}s`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={fetchNew} disabled={loading}>
            <RefreshCw size={15} />
            Atualizar
          </button>
          <button
            className={`btn-secondary ${paused ? 'border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400' : ''}`}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <><WifiOff size={15} /> Pausado</> : <><Wifi size={15} /> Pausar</>}
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Hoje</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Zap size={15} className="text-blue-500 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{todayCount}</p>
          <p className="text-xs text-slate-400 mt-1">alterações registradas</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Esta semana</p>
            <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
              <Calendar size={15} className="text-primary-500 dark:text-primary-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{weekCount}</p>
          <p className="text-xs text-slate-400 mt-1">últimos 7 dias</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Campo + alterado</p>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <TrendingUp size={15} className="text-amber-500 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{topField?.[0] ?? '—'}</p>
          <p className="text-xs text-slate-400 mt-1">{topField ? `${topField[1]} alterações` : 'sem dados'}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Usuário + ativo</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <UserCheck size={15} className="text-emerald-500 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{topUser?.[0] ?? '—'}</p>
          <p className="text-xs text-slate-400 mt-1">{topUser ? `${topUser[1]} registros` : 'sem dados'}</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar equipamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input appearance-none cursor-pointer min-w-[150px]" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">Todas as ações</option>
          <option value="created">Cadastrado</option>
          <option value="updated">Atualizado</option>
          <option value="deleted">Excluído</option>
          <option value="activated">Ativado</option>
          <option value="deactivated">Desativado</option>
        </select>
        <select className="input appearance-none cursor-pointer min-w-[150px]" value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)}>
          <option value="">Todos os campos</option>
          {allFields.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="input appearance-none cursor-pointer min-w-[150px]" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
          <option value="">Todos os usuários</option>
          {allUsers.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        {hasFilters && (
          <button
            className="btn-secondary"
            onClick={() => { setSearch(''); setActionFilter(''); setFieldFilter(''); setUserFilter('') }}
          >
            <X size={14} /> Limpar
          </button>
        )}
      </div>

      {/* ── Feed ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
            {hasFilters && <span className="text-slate-400 font-normal"> · filtrado</span>}
          </p>
          {newIds.size > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {newIds.size} novo{newIds.size > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-start gap-4 animate-pulse">
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-52" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-80" />
                  <div className="flex gap-2 mt-1">
                    <div className="h-5 bg-slate-100 dark:bg-slate-700/50 rounded-full w-28" />
                    <div className="h-5 bg-slate-100 dark:bg-slate-700/50 rounded-full w-36" />
                  </div>
                </div>
                <div className="space-y-1.5 text-right">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20 ml-auto" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-14 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Activity size={32} className="text-slate-200 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Nenhum registro encontrado</p>
            {hasFilters && (
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Tente ajustar os filtros</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50 max-h-[620px] overflow-y-auto">
            {filtered.map((entry) => {
              const cfg = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.updated
              const isNew = newIds.has(entry.id)

              return (
                <div
                  key={entry.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-all duration-700 ${
                    isNew
                      ? 'bg-emerald-50/70 dark:bg-emerald-900/10 border-l-2 border-emerald-400 dark:border-emerald-600'
                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/30'
                  }`}
                >
                  {/* Action symbol */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold ${cfg.bg} ${cfg.color}`}>
                    {cfg.symbol}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    {/* Name + action badge + NEW pill */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {entry.entity_name ?? '—'}
                      </p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      {isNew && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                          NOVO
                        </span>
                      )}
                    </div>


                    {/* Changes chips */}
                    {entry.changes && entry.changes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {entry.changes.map((c, ci) => (
                          <span
                            key={ci}
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50"
                          >
                            <span className="font-semibold text-slate-500 dark:text-slate-400">{c.label}:</span>
                            {c.old_value && (
                              <>
                                <span className="line-through text-slate-400 dark:text-slate-500">{c.old_value}</span>
                                <span className="text-slate-300 dark:text-slate-600">→</span>
                              </>
                            )}
                            <span className="font-medium">{c.new_value ?? '(removido)'}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Meta: user + time */}
                  <div className="shrink-0 text-right space-y-1 min-w-[90px]">
                    {entry.user_name && (
                      <p className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <User size={11} />{entry.user_name}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 block">{timeAgo(entry.created_at)}</p>
                    <p className="text-xs text-slate-300 dark:text-slate-600 block">{formatDate(entry.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
