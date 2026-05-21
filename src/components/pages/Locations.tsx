import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react'
import { api } from '../../lib/api'
import type { Location } from '../../lib/types'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'

interface FormState { name: string; description: string }
const defaultForm: FormState = { name: '', description: '' }

export default function LocationsPage() {
  const [items, setItems] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Location | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

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
            <div key={loc.id} className="card p-5 group hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <MapPin size={18} className="text-indigo-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{loc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {loc.equipment_count} equipamento{loc.equipment_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(loc)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleting(loc)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {loc.description && (
                <p className="text-xs text-slate-400 mt-3 line-clamp-2">{loc.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

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
