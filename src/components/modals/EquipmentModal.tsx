import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../lib/api'
import type { Equipment, Category, Location, EquipmentStatus } from '../../lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: Equipment | null
  categories: Category[]
  locations: Location[]
}

interface FormState {
  name: string
  category_id: string
  brand: string
  model: string
  serial_number: string
  asset_tag: string
  status: EquipmentStatus
  location_id: string
  assigned_to: string
  purchase_date: string
  purchase_price: string
  notes: string
}

const defaultForm: FormState = {
  name: '', category_id: '', brand: '', model: '',
  serial_number: '', asset_tag: '', status: 'disponivel',
  location_id: '', assigned_to: '', purchase_date: '',
  purchase_price: '', notes: '',
}

const STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: 'disponivel', label: 'Disponível' },
  { value: 'em_uso', label: 'Em Uso' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'inativo', label: 'Inativo' },
]

export default function EquipmentModal({ open, onClose, onSaved, editing, categories, locations }: Props) {
  const [form, setForm] = useState<FormState>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      if (editing) {
        setForm({
          name: editing.name ?? '',
          category_id: editing.category_id ? String(editing.category_id) : '',
          brand: editing.brand ?? '',
          model: editing.model ?? '',
          serial_number: editing.serial_number ?? '',
          asset_tag: editing.asset_tag ?? '',
          status: editing.status ?? 'disponivel',
          location_id: editing.location_id ? String(editing.location_id) : '',
          assigned_to: editing.assigned_to ?? '',
          purchase_date: editing.purchase_date ? editing.purchase_date.split('T')[0] : '',
          purchase_price: editing.purchase_price ? String(editing.purchase_price) : '',
          notes: editing.notes ?? '',
        })
      } else {
        setForm(defaultForm)
      }
    }
  }, [open, editing])

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    try {
      setSaving(true)
      setError('')
      const payload = {
        name: form.name.trim(),
        category_id: form.category_id ? Number(form.category_id) : null,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        serial_number: form.serial_number.trim() || null,
        asset_tag: form.asset_tag.trim() || null,
        status: form.status,
        location_id: form.location_id ? Number(form.location_id) : null,
        assigned_to: form.assigned_to.trim() || null,
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        notes: form.notes.trim() || null,
      }
      if (editing) await api.equipment.update(editing.id, payload)
      else await api.equipment.create(payload)
      onClose()
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Editar: ${editing.name}` : 'Novo equipamento'}
      size="lg"
    >
      <div className="space-y-5">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nome *</label>
            <input className="input" placeholder="Ex: Notebook Dell Latitude" value={form.name}
              onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="input appearance-none cursor-pointer" value={form.category_id}
              onChange={(e) => set('category_id', e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input appearance-none cursor-pointer" value={form.status}
              onChange={(e) => set('status', e.target.value as EquipmentStatus)}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Marca</label>
            <input className="input" placeholder="Ex: Dell, HP, Lenovo" value={form.brand}
              onChange={(e) => set('brand', e.target.value)} />
          </div>
          <div>
            <label className="label">Modelo</label>
            <input className="input" placeholder="Ex: Latitude 5520" value={form.model}
              onChange={(e) => set('model', e.target.value)} />
          </div>
          <div>
            <label className="label">Número de série</label>
            <input className="input" placeholder="S/N do equipamento" value={form.serial_number}
              onChange={(e) => set('serial_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Número de patrimônio</label>
            <input className="input" placeholder="Ex: PAT-00123" value={form.asset_tag}
              onChange={(e) => set('asset_tag', e.target.value)} />
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Local</label>
            <select className="input appearance-none cursor-pointer" value={form.location_id}
              onChange={(e) => set('location_id', e.target.value)}>
              <option value="">Sem local definido</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Responsável</label>
            <input className="input" placeholder="Nome do usuário/colaborador" value={form.assigned_to}
              onChange={(e) => set('assigned_to', e.target.value)} />
          </div>
          <div>
            <label className="label">Data de compra</label>
            <input className="input" type="date" value={form.purchase_date}
              onChange={(e) => set('purchase_date', e.target.value)} />
          </div>
          <div>
            <label className="label">Valor de compra (R$)</label>
            <input className="input" type="number" step="0.01" min="0" placeholder="0,00"
              value={form.purchase_price}
              onChange={(e) => set('purchase_price', e.target.value)} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Observações</label>
          <textarea className="input resize-none" rows={3} placeholder="Informações adicionais..."
            value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end pt-1 border-t border-slate-100">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
