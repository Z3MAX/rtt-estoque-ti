import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Filter, Pencil, Trash2, Monitor, RefreshCw, FileSpreadsheet, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { api } from '../../lib/api'
import type { Equipment, Category, Location, EquipmentStatus } from '../../lib/types'
import { StatusBadge, statusConfig } from '../ui/Badge'
import EquipmentModal from '../modals/EquipmentModal'
import ConfirmDialog from '../ui/ConfirmDialog'
import ImportModal from '../modals/ImportModal'

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

    // Column widths
    ws['!cols'] = [
      { wch: 32 }, { wch: 16 }, { wch: 20 }, { wch: 18 },
      { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 20 },
      { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 30 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Equipamentos')

    const filename = `equipamentos_rtt_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipamentos</h1>
          <p className="text-slate-500 text-sm mt-0.5">{items.length} {items.length === 1 ? 'item' : 'itens'}</p>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="card p-4 bg-red-50 border-red-100">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 bg-slate-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-48" />
                  <div className="h-3 bg-slate-100 rounded w-32" />
                </div>
                <div className="h-5 bg-slate-200 rounded-full w-20" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Monitor size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum equipamento encontrado</p>
            <p className="text-slate-400 text-sm mt-1">Tente ajustar os filtros ou cadastre um novo equipamento</p>
            <button className="btn-primary mt-4" onClick={openCreate}>
              <Plus size={15} /> Cadastrar equipamento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipamento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Serial / Patrimônio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Responsável</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Local</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (eq.category_color ?? '#6366f1') + '18' }}
                        >
                          <Monitor size={15} style={{ color: eq.category_color ?? '#6366f1' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{eq.name}</p>
                          <p className="text-xs text-slate-400 truncate">{[eq.brand, eq.model].filter(Boolean).join(' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {eq.category_name ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: (eq.category_color ?? '#6366f1') + '18', color: eq.category_color ?? '#6366f1' }}
                        >
                          {eq.category_name}
                        </span>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <p className="text-xs text-slate-600">{eq.serial_number || '—'}</p>
                      {eq.asset_tag && <p className="text-xs text-slate-400">#{eq.asset_tag}</p>}
                    </td>
                    <td className="px-4 py-3.5 hidden xl:table-cell">
                      <p className="text-sm text-slate-600 truncate max-w-[140px]">{eq.assigned_to || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden xl:table-cell">
                      <p className="text-sm text-slate-600 truncate max-w-[120px]">{eq.location_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={eq.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(eq)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleting(eq)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  )
}
