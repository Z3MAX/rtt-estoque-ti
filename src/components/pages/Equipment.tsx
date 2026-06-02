import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Filter, Pencil, Trash2, Monitor, RefreshCw, FileSpreadsheet, Download, History, MapPin, Hash, Tag, User, ClipboardList } from 'lucide-react'
import * as XLSX from 'xlsx'
import { api } from '../../lib/api'
import type { Equipment, Category, Location, EquipmentStatus, AuditEntry } from '../../lib/types'
import { StatusBadge, statusConfig } from '../ui/Badge'
import EquipmentModal from '../modals/EquipmentModal'
import ConfirmDialog from '../ui/ConfirmDialog'
import ImportModal from '../modals/ImportModal'
import AuditPanel from '../ui/AuditPanel'

const statusOptions: { value: EquipmentStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'disponivel', label: 'Disponível' },
  { value: 'em_uso', label: 'Em Uso' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'inativo', label: 'Inativo' },
]

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)
  const [deleting, setDeleting] = useState<Equipment | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [auditEq, setAuditEq] = useState<Equipment | null>(null)
  const [exportingAudit, setExportingAudit] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [eq, cats, locs] = await Promise.all([
        api.equipment.list({
          search: search || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
        }) as Promise<Equipment[]>,
        api.categories.list() as Promise<Category[]>,
        api.locations.list() as Promise<Location[]>,
      ])
      setItems(eq)
      setCategories(cats)
      setLocations(locs)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, categoryFilter])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  async function handleDelete() {
    if (!deleting) return
    try {
      setDeleteLoading(true)
      await api.equipment.delete(deleting.id)
      setDeleting(null)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteLoading(false)
    }
  }

  async function exportAuditReport() {
    try {
      setExportingAudit(true)
      const entries = await api.audit.list('equipment', undefined, 2000) as AuditEntry[]

      const ACTION_LABELS: Record<string, string> = {
        created: 'Cadastrado', updated: 'Atualizado', deleted: 'Excluído',
        deactivated: 'Desativado', activated: 'Ativado',
      }

      const rows: Record<string, string>[] = []
      for (const entry of entries) {
        const acao = ACTION_LABELS[entry.action] ?? entry.action
        const data = new Date(entry.created_at).toLocaleString('pt-BR')
        if (entry.changes && entry.changes.length > 0) {
          for (const change of entry.changes) {
            rows.push({
              'Equipamento': entry.entity_name ?? '',
              'Ação': acao,
              'Campo': change.label,
              'Valor Anterior': change.old_value ?? '',
              'Novo Valor': change.new_value ?? '',
              'Usuário': entry.user_name ?? '',
              'Data/Hora': data,
            })
          }
        } else {
          rows.push({
            'Equipamento': entry.entity_name ?? '',
            'Ação': acao,
            'Campo': '',
            'Valor Anterior': '',
            'Novo Valor': '',
            'Usuário': entry.user_name ?? '',
            'Data/Hora': data,
          })
        }
      }

      if (rows.length === 0) { setError('Nenhum registro de auditoria encontrado.'); return }

      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 32 }, { wch: 14 }, { wch: 18 },
        { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 20 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Auditoria')
      XLSX.writeFile(wb, `auditoria_equipamentos_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setExportingAudit(false)
    }
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(eq: Equipment) { setEditing(eq); setModalOpen(true) }

  function exportToExcel() {
    const rows = items.map((eq) => ({
      'Nome':           eq.name,
      'Marca':          eq.brand        ?? '',
      'Modelo':         eq.model        ?? '',
      'Categoria':      eq.category_name ?? '',
      'Status':         statusConfig[eq.status]?.label ?? eq.status,
      'Local':          eq.location_name ?? '',
      'Responsável':    eq.assigned_to  ?? '',
      'Nº de Série':    eq.serial_number ?? '',
      'Patrimônio':     eq.asset_tag    ?? '',
      'Data de Compra': eq.purchase_date ? new Date(eq.purchase_date).toLocaleDateString('pt-BR') : '',
      'Valor (R$)':     eq.purchase_price ?? '',
      'Observações':    eq.notes        ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 32 }, { wch: 16 }, { wch: 20 }, { wch: 18 },
      { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 20 },
      { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 30 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Equipamentos')
    XLSX.writeFile(wb, `equipamentos_rtt_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Equipamentos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{items.length} {items.length === 1 ? 'item' : 'itens'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary"
            onClick={exportAuditReport}
            disabled={exportingAudit}
            title="Exportar histórico completo de alterações"
          >
            {exportingAudit
              ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              : <ClipboardList size={16} />
            }
            Relatório de Auditoria
          </button>
          <button
            className="btn-secondary"
            onClick={exportToExcel}
            disabled={items.length === 0}
            title="Exportar lista atual para Excel"
          >
            <Download size={16} />
            Exportar Excel
          </button>
          <button className="btn-secondary" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet size={16} />
            Importar Excel
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Novo equipamento
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome, marca, modelo, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            className="input pl-8 pr-8 appearance-none cursor-pointer min-w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | '')}
          >
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="relative">
          <select
            className="input pr-8 appearance-none cursor-pointer min-w-[160px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn-secondary" onClick={load} title="Atualizar">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-start gap-4 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-52" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-36" />
                  <div className="flex gap-2 mt-1">
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-20" />
                    <div className="h-5 bg-slate-100 dark:bg-slate-700/50 rounded-full w-24" />
                    <div className="h-5 bg-slate-100 dark:bg-slate-700/50 rounded-full w-28" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Monitor size={36} className="text-slate-200 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum equipamento encontrado</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Tente ajustar os filtros ou cadastre um novo equipamento</p>
            <button className="btn-primary mt-4" onClick={openCreate}>
              <Plus size={15} /> Cadastrar equipamento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {items.map((eq) => (
              <div key={eq.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors group">

                {/* Category icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: (eq.category_color ?? '#6366f1') + '18' }}
                >
                  <Monitor size={16} style={{ color: eq.category_color ?? '#6366f1' }} />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{eq.name}</p>
                    {eq.category_name && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: (eq.category_color ?? '#6366f1') + '18', color: eq.category_color ?? '#6366f1' }}
                      >
                        {eq.category_name}
                      </span>
                    )}
                  </div>

                  {(eq.brand || eq.model) && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {[eq.brand, eq.model].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  {/* Tags row */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {/* Status */}
                    <StatusBadge status={eq.status} />

                    {/* Local */}
                    {eq.location_name && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                        <MapPin size={10} className="shrink-0" />
                        {eq.location_name}
                      </span>
                    )}

                    {/* Nº de Série */}
                    {eq.serial_number && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                        <Hash size={10} className="shrink-0" />
                        {eq.serial_number}
                      </span>
                    )}

                    {/* Patrimônio */}
                    {eq.asset_tag && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800/50">
                        <Tag size={10} className="shrink-0" />
                        {eq.asset_tag}
                      </span>
                    )}

                    {/* Responsável */}
                    {eq.assigned_to && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium border border-primary-200 dark:border-primary-800/50">
                        <User size={10} className="shrink-0" />
                        {eq.assigned_to}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(eq)}
                    title="Editar"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setAuditEq(eq)}
                    title="Ver histórico"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <History size={14} />
                  </button>
                  <button
                    onClick={() => setDeleting(eq)}
                    title="Excluir"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EquipmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        editing={editing}
        categories={categories}
        locations={locations}
      />

      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImported={load}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Excluir equipamento"
        message={`Tem certeza que deseja excluir "${deleting?.name}"? Esta ação não pode ser desfeita.`}
      />

      {auditEq && (
        <AuditPanel
          open={!!auditEq}
          onClose={() => setAuditEq(null)}
          entityType="equipment"
          entityId={auditEq.id}
          entityName={auditEq.name}
        />
      )}
    </div>
  )
}
