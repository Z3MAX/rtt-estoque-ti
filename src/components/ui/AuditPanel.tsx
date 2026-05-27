import { useEffect, useState } from 'react'
import { X, Plus, Pencil, Trash2, ToggleLeft, Clock } from 'lucide-react'
import { api } from '../../lib/api'
import type { AuditEntry } from '../../lib/types'

interface AuditPanelProps {
  open: boolean
  onClose: () => void
  entityType: string
  entityId: number
  entityName: string
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  created:     { label: 'Cadastrado',    icon: <Plus size={13} />,      color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  updated:     { label: 'Atualizado',    icon: <Pencil size={13} />,    color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-100 dark:bg-primary-900/30' },
  deleted:     { label: 'Excluído',      icon: <Trash2 size={13} />,    color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-100 dark:bg-red-900/30' },
  deactivated: { label: 'Desativado',    icon: <ToggleLeft size={13} />,color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-100 dark:bg-amber-900/30' },
  activated:   { label: 'Ativado',       icon: <ToggleLeft size={13} />,color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
  return formatDate(iso)
}

export default function AuditPanel({ open, onClose, entityType, entityId, entityName }: AuditPanelProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.audit.list(entityType, entityId)
      .then((data) => setEntries(data as AuditEntry[]))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [open, entityType, entityId])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Clock size={15} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Histórico de alterações</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[240px]">{entityName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-6 w-6 text-primary-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Clock size={20} className="text-slate-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Nenhuma alteração registrada</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs">O histórico aparecerá aqui após a primeira edição</p>
            </div>
          ) : (
            <div className="p-5 space-y-1">
              {entries.map((entry, idx) => {
                const cfg = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.updated
                const isLast = idx === entries.length - 1
                return (
                  <div key={entry.id} className="relative flex gap-3">
                    {/* Timeline line */}
                    {!isLast && <div className="absolute left-4 top-8 bottom-0 w-px bg-slate-100 dark:bg-slate-700/60" />}

                    {/* Icon */}
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} ${cfg.color}`}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                          {entry.user_name && (
                            <span className="text-xs text-slate-500 dark:text-slate-400"> por {entry.user_name}</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{timeAgo(entry.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatDate(entry.created_at)}</p>

                      {/* Changes */}
                      {entry.changes && entry.changes.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {entry.changes.map((c, ci) => (
                            <div key={ci} className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 border border-slate-100 dark:border-slate-700">
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{c.label}</p>
                              <div className="flex items-center gap-2 text-xs">
                                {c.old_value !== null && (
                                  <>
                                    <span className="line-through text-slate-400 dark:text-slate-500">{c.old_value}</span>
                                    <span className="text-slate-300 dark:text-slate-600">→</span>
                                  </>
                                )}
                                <span className={`font-medium ${c.new_value !== null ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                                  {c.new_value ?? '(removido)'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
