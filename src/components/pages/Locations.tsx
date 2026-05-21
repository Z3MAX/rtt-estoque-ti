import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, Monitor, ChevronRight, User } from 'lucide-react'
import { api } from '../../lib/api'
import type { Location, Equipment } from '../../lib/types'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'
import { StatusBadge } from '../ui/Badge'

interface FormState { name: string; description: string }
const defaultForm: FormState = { name: '', description: '' }

export default function LocationsPage() {
  const [items, setItems]               = useState<Location[]>([])
  const [loading, setLoading]           = useState(true)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editing, setEditing]           = useState<Location | null>(null)
  const [form, setForm]                 = useState<FormState>(defaultForm)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState<Location | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError]               = useState('')

  // detail drawer
  const [detailLoc, setDetailLoc]       = useState<Location | null>(null)
  const [detailEquip, setDetailEquip]   = useState<Equipment[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      setItems(await api.locations.list() as Location[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function openCreate() { setEditing(null); setForm(defaultForm); setError(''); setModalOpen(true) }
  function openEdit(loc: Location) {
    setEditing(loc)
    setForm({ name: loc.name, description: loc.description ?? '' })
    setError('')
    setModalOpen(true)
  }

  async function openDetail(loc: Location) {
    setDetailLoc(loc)
    setDetailLoading(true)
    setDetailEquip([])
    try {
      const result = await api.equipment.list({ location: loc.id }) as Equipment[]
      setDetailEquip(result)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    try {
      setSaving(true); setError('')
      if (editing) await api.locations.update(editing.id, form)
      else await api.locations.create(form)
      setModalOpen(false); load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      setDeleteLoading(true)
      await api.locations.delete(deleting.id)
      setDeleting(null); load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Locais</h1>
          <p className="text-slate-500 text-sm mt-0.5">{items.length} locais cadastrados</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Novo local</button>
      </div>

      {error && !modalOpen && (
        <div className="card p-4 bg-red-50 border-red-100">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-28" />
                  <div className="h-3 bg-slate-100 rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card py-20 text-center">
          <MapPin size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum local cadastrado</p>
          <button className="btn-primary mt-4" onClick={openCreate}><Plus size={15} /> Criar local</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((loc) => (
            <div
              key={loc.id}
              className="card p-5 group hover:shadow-md transition-all cursor-pointer hover:border-primary-200"
              onClick={() => openDetail(loc)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <MapPin size={18} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{loc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {loc.equipment_count ?? 0} equipamento{(loc.equipment_count ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(loc) }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleting(loc) }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                  <div className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 group-hover:text-primary-400 transition-colors">
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
              {loc.description && (
                <p className="text-xs text-slate-400 mt-3 line-clamp-2">{loc.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Detail modal ── */}
      <Modal
        open={!!detailLoc}
        onClose={() => setDetailLoc(null)}
        title={detailLoc?.name ?? ''}
        size="lg"
      >
        <div className="space-y-4">
          {detailLoc?.description && (
            <p className="text-sm text-slate-500">{detailLoc.description}</p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Equipamentos neste local
            </p>
            <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">
              {detailLoading ? '...' : detailEquip.length}
            </span>
          </div>

          {detailLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : detailEquip.length === 0 ? (
            <div className="py-10 text-center">
              <Monitor size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Nenhum equipamento neste local</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {detailEquip.map((eq) => (
                <div key={eq.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: eq.category_color ? eq.category_color + '20' : '#f1f5f9' }}>
                    <Monitor size={14} style={{ color: eq.category_color ?? '#94a3b8' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{eq.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {eq.category_name && (
                        <span className="text-xs text-slate-400">{eq.category_name}</span>
                      )}
                      {eq.assigned_to && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <User size={10} />
                          {eq.assigned_to}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={eq.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Form modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar local' : 'Novo local'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" placeholder="Ex: Sala de TI" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Descrição</label>
            <input className="input" placeholder="Descrição opcional" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Excluir local"
        message={`Tem certeza que deseja excluir "${deleting?.name}"? Os equipamentos vinculados perderão o local.`}
      />
    </div>
  )
}
