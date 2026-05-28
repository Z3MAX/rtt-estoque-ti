import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, Monitor, ChevronRight, User, Mail, Send, CheckCircle2, AlertTriangle, Hash, Tag } from 'lucide-react'
import { api } from '../../lib/api'
import type { Location, Equipment } from '../../lib/types'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'
import { StatusBadge } from '../ui/Badge'

interface FormState { name: string; description: string; manager_email: string }
const defaultForm: FormState = { name: '', description: '', manager_email: '' }

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

  // Detail drawer
  const [detailLoc, setDetailLoc]         = useState<Location | null>(null)
  const [detailEquip, setDetailEquip]     = useState<Equipment[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Send report
  const [sendModal, setSendModal]     = useState<Location | null>(null)
  const [sendEmail, setSendEmail]     = useState('')
  const [sending, setSending]         = useState(false)
  const [sendError, setSendError]     = useState('')
  const [toast, setToast]             = useState<{ ok: boolean; msg: string } | null>(null)

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
    setForm({ name: loc.name, description: loc.description ?? '', manager_email: loc.manager_email ?? '' })
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

  function openSendModal(loc: Location) {
    setSendModal(loc)
    setSendEmail(loc.manager_email ?? '')
    setSendError('')
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    if (form.manager_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.manager_email)) {
      setError('E-mail do gestor inválido'); return
    }
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

  async function handleSendReport() {
    if (!sendModal) return
    if (!sendEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendEmail)) {
      setSendError('Informe um e-mail válido'); return
    }
    try {
      setSending(true); setSendError('')
      const res = await api.locations.sendReport(sendModal.id, sendEmail) as { total: number }
      setSendModal(null)
      setToast({ ok: true, msg: `Relatório com ${res.total} equipamento(s) enviado para ${sendEmail}` })
      setTimeout(() => setToast(null), 6000)
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : 'Erro ao enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Locais</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{items.length} locais cadastrados</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Novo local</button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          toast.ok
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
        }`}>
          {toast.ok ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
          {toast.msg}
        </div>
      )}

      {error && !modalOpen && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card py-20 text-center">
          <MapPin size={36} className="text-slate-200 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum local cadastrado</p>
          <button className="btn-primary mt-4" onClick={openCreate}><Plus size={15} /> Criar local</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((loc) => (
            <div
              key={loc.id}
              className="card p-5 group hover:shadow-md transition-all cursor-pointer hover:border-primary-200 dark:hover:border-primary-800"
              onClick={() => openDetail(loc)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-primary-500 dark:text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{loc.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {loc.equipment_count ?? 0} equipamento{(loc.equipment_count ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  {/* Send report button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openSendModal(loc) }}
                    title="Enviar relatório por e-mail"
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    <Send size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(loc) }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleting(loc) }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                  <div className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 group-hover:text-primary-400 dark:group-hover:text-primary-400 transition-colors">
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>

              {loc.description && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 line-clamp-2">{loc.description}</p>
              )}

              {/* Manager email tag */}
              {loc.manager_email && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                  <Mail size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{loc.manager_email}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Detail modal ── */}
      <Modal open={!!detailLoc} onClose={() => setDetailLoc(null)} title={detailLoc?.name ?? ''} size="lg">
        <div className="space-y-4">
          {detailLoc?.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{detailLoc.description}</p>
          )}

          {/* Send report button inside detail */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Equipamentos neste local
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium px-2 py-0.5 rounded-full">
                {detailLoading ? '...' : detailEquip.length}
              </span>
              {detailLoc && (
                <button
                  onClick={() => { setDetailLoc(null); openSendModal(detailLoc) }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  <Send size={12} /> Enviar relatório
                </button>
              )}
            </div>
          </div>

          {detailLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : detailEquip.length === 0 ? (
            <div className="py-10 text-center">
              <Monitor size={28} className="text-slate-200 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum equipamento neste local</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {detailEquip.map((eq) => (
                <div
                  key={eq.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: eq.category_color ? eq.category_color + '20' : '#f1f5f9' }}
                  >
                    <Monitor size={14} style={{ color: eq.category_color ?? '#94a3b8' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{eq.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {eq.category_name && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">{eq.category_name}</span>
                      )}
                      {eq.serial_number && (
                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <Hash size={9} />{eq.serial_number}
                        </span>
                      )}
                      {eq.asset_tag && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <Tag size={9} />{eq.asset_tag}
                        </span>
                      )}
                      {eq.assigned_to && (
                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <User size={9} />{eq.assigned_to}
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
          <div>
            <label className="label">E-mail do gestor responsável</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                type="email"
                placeholder="gestor@empresa.com"
                value={form.manager_email}
                onChange={(e) => setForm({ ...form, manager_email: e.target.value })}
              />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Usado para envio automático do relatório de equipamentos
            </p>
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

      {/* ── Send report modal ── */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-700">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Send size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Enviar relatório por e-mail</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[220px]">{sendModal.name}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Enviar para</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9"
                    type="email"
                    placeholder="gestor@empresa.com"
                    value={sendEmail}
                    onChange={(e) => { setSendEmail(e.target.value); setSendError('') }}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSendReport()}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  O relatório incluirá todos os equipamentos de <strong>{sendModal.name}</strong>
                </p>
              </div>

              {sendError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <p className="text-red-600 dark:text-red-400 text-xs">{sendError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setSendModal(null)}
                  disabled={sending}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 inline-flex items-center justify-center gap-2 btn-primary py-2.5"
                  onClick={handleSendReport}
                  disabled={sending}
                >
                  {sending ? (
                    <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>Enviando...</>
                  ) : (
                    <><Send size={14} /> Enviar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
