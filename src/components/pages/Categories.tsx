import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Tag, Monitor } from 'lucide-react'
import { api } from '../../lib/api'
import type { Category } from '../../lib/types'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'

const ICON_OPTIONS = ['Monitor', 'Laptop', 'Tv', 'Printer', 'Wifi', 'Mouse', 'Server', 'Phone']
const COLOR_OPTIONS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#f97316', '#84cc16', '#ec4899', '#64748b']

interface FormState { name: string; description: string; color: string; icon: string }
const defaultForm: FormState = { name: '', description: '', color: '#6366f1', icon: 'Monitor' }

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      setItems(await api.categories.list() as Category[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function openCreate() { setEditing(null); setForm(defaultForm); setError(''); setModalOpen(true) }
  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description ?? '', color: cat.color, icon: cat.icon })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    try {
      setSaving(true); setError('')
      if (editing) await api.categories.update(editing.id, form)
      else await api.categories.create(form)
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
      await api.categories.delete(deleting.id)
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Categorias</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{items.length} categorias cadastradas</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Nova categoria
        </button>
      </div>

      {error && !modalOpen && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card py-20 text-center">
          <Tag size={36} className="text-slate-200 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhuma categoria cadastrada</p>
          <button className="btn-primary mt-4" onClick={openCreate}><Plus size={15} /> Criar categoria</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((cat) => (
            <div key={cat.id} className="card p-5 group hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                    <Monitor size={18} style={{ color: cat.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{cat.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {cat.equipment_count} equipamento{cat.equipment_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(cat)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleting(cat)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {cat.description && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 line-clamp-2">{cat.description}</p>
              )}
              <div className="mt-3 h-1 rounded-full" style={{ backgroundColor: cat.color + '30' }}>
                <div className="h-full rounded-full" style={{ backgroundColor: cat.color, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar categoria' : 'Nova categoria'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" placeholder="Ex: Notebooks" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Descrição</label>
            <input className="input" placeholder="Descrição opcional" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-slate-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 dark:text-red-400 text-xs">{error}</p>}
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
        title="Excluir categoria"
        message={`Tem certeza que deseja excluir "${deleting?.name}"? Os equipamentos vinculados perderão a categoria.`}
      />
    </div>
  )
}
