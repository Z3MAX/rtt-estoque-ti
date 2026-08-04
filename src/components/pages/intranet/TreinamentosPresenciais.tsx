import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus, QrCode, Users, Edit2, Trash2, Download, Copy, Check,
  Calendar, MapPin, User, Key, Play, Square, AlertCircle, RefreshCw,
  Printer, X, CheckCircle2, Clock, XCircle, ChevronDown, Upload,
} from 'lucide-react'
import QRCode from 'qrcode'
import ExcelJS from 'exceljs'
import { useAuth, isAdmin } from '../../../lib/auth'
import { api } from '../../../lib/api'

interface TreinamentoPresencial {
  id: number
  titulo: string
  descricao?: string
  instrutor?: string
  local?: string
  data_evento?: string
  status: 'AGENDADO' | 'ABERTA' | 'ENCERRADA'
  token: string
  codigo?: string
  total_presencas: number
  created_at: string
}

interface PresencaRegistro {
  id: number
  colaborador_id?: number
  nome: string
  cargo?: string
  area?: string
  created_at: string
}

interface Participante {
  nome: string
  cargo?: string
  area?: string
}

const EMPTY_FORM = {
  titulo: '', descricao: '', instrutor: '', local: '', data_evento: '', codigo: '',
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function StatusBadge({ status }: { status: TreinamentoPresencial['status'] }) {
  if (status === 'ABERTA') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />ABERTA
    </span>
  )
  if (status === 'ENCERRADA') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
      <XCircle size={10} />ENCERRADA
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
      <Clock size={10} />AGENDADO
    </span>
  )
}

// ─── Form Modal ─────────────────────────────────────────────────────────────

function EventoModal({
  initial, onClose, onSave,
}: {
  initial?: Partial<typeof EMPTY_FORM>
  onClose: () => void
  onSave: (data: typeof EMPTY_FORM, participantes: Participante[]) => Promise<void>
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [parseError, setParseError] = useState('')

  const isEdit = !!initial?.titulo
  const field = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError('')
    try {
      const buffer = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      const sheet = workbook.worksheets[0]
      if (!sheet) throw new Error('Planilha vazia')

      const firstRow = sheet.getRow(1)
      const firstCellVal = String(firstRow.getCell(1).value ?? '').toLowerCase().trim()
      const isHeader = ['nome', 'name', 'colaborador', 'funcionário', 'participante'].includes(firstCellVal)

      let nomeCol = 1, cargoCol = 2, areaCol = 3
      if (isHeader) {
        firstRow.eachCell((cell, col) => {
          const v = String(cell.value ?? '').toLowerCase().trim()
          if (['nome', 'name', 'colaborador', 'funcionário', 'participante'].includes(v)) nomeCol = col
          else if (['cargo', 'função', 'funcao', 'role', 'position'].includes(v)) cargoCol = col
          else if (['area', 'área', 'departamento', 'setor'].includes(v)) areaCol = col
        })
      }

      const result: Participante[] = []
      sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
        if (isHeader && rowNum === 1) return
        const nome = String(row.getCell(nomeCol).value ?? '').trim()
        if (!nome) return
        result.push({
          nome,
          cargo: String(row.getCell(cargoCol).value ?? '').trim() || undefined,
          area: String(row.getCell(areaCol).value ?? '').trim() || undefined,
        })
      })

      if (result.length === 0) throw new Error('Nenhum participante encontrado na planilha')
      setParticipantes(result)
    } catch (err: any) {
      setParseError(err.message || 'Erro ao ler a planilha')
      setParticipantes([])
    }
    e.target.value = ''
  }

  async function handleSave() {
    if (!form.titulo.trim()) { setError('Título obrigatório'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(form, participantes)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800">{initial?.titulo ? 'Editar treinamento' : 'Novo treinamento presencial'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Título *</label>
            <input value={form.titulo} onChange={field('titulo')} placeholder="Ex: Treinamento de Segurança" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Lista de participantes esperados <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              {participantes.length === 0 ? (
                <label className="flex items-center gap-3 w-full px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors group">
                  <Upload size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                  <div>
                    <span className="text-sm text-slate-500 group-hover:text-blue-600 transition-colors">Importar planilha Excel (.xlsx)</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Ao escanear o QR, participantes buscam o nome nessa lista</p>
                  </div>
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                </label>
              ) : (
                <div className="border border-blue-200 rounded-xl overflow-hidden bg-blue-50/40">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-blue-100">
                    <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                      <Upload size={12} />{participantes.length} participantes na lista
                    </span>
                    <button type="button" onClick={() => setParticipantes([])} className="text-[11px] text-slate-400 hover:text-red-500 transition-colors">Remover</button>
                  </div>
                  <div className="max-h-24 overflow-y-auto divide-y divide-blue-100/60">
                    {participantes.slice(0, 6).map((p, i) => (
                      <div key={i} className="px-3 py-1.5 text-xs text-slate-700">
                        {p.nome}{p.cargo ? <span className="text-slate-400"> · {p.cargo}</span> : null}
                      </div>
                    ))}
                    {participantes.length > 6 && (
                      <div className="px-3 py-1.5 text-xs text-slate-400 italic">+{participantes.length - 6} outros...</div>
                    )}
                  </div>
                </div>
              )}
              {parseError && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{parseError}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={field('descricao')} rows={2} placeholder="Detalhes do treinamento..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Instrutor</label>
              <input value={form.instrutor} onChange={field('instrutor')} placeholder="Nome do instrutor" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Local</label>
              <input value={form.local} onChange={field('local')} placeholder="Sala, endereço..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data e horário</label>
            <input type="datetime-local" value={form.data_evento} onChange={field('data_evento')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Código do instrutor <span className="font-normal text-slate-400">(opcional — exigido dos participantes ao confirmar presença)</span>
            </label>
            <input value={form.codigo} onChange={field('codigo')} placeholder="Ex: 1234" maxLength={10} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest" />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl">
            <AlertCircle size={13} />{error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {saving ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Salvando...</> : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── QR Modal ───────────────────────────────────────────────────────────────

function QRModal({ evento, onClose }: { evento: TreinamentoPresencial; onClose: () => void }) {
  const [qrUrl, setQrUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const presencaUrl = `${window.location.origin}/presenca/${evento.token}`

  useEffect(() => {
    QRCode.toDataURL(presencaUrl, { width: 280, margin: 2, color: { dark: '#1e293b', light: '#ffffff' } })
      .then(setQrUrl)
  }, [presencaUrl])

  function handleCopy() {
    navigator.clipboard.writeText(presencaUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>${evento.titulo}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px;color:#1e293b}
      h2{margin:0 0 8px;font-size:22px}p{margin:4px 0;font-size:14px;color:#64748b}
      img{display:block;margin:24px auto;width:280px;height:280px}
      .url{font-size:11px;color:#94a3b8;word-break:break-all;margin-top:8px}</style></head>
      <body><h2>${evento.titulo}</h2>
      ${evento.instrutor ? `<p>Instrutor: ${evento.instrutor}</p>` : ''}
      ${evento.local ? `<p>Local: ${evento.local}</p>` : ''}
      ${evento.data_evento ? `<p>${new Date(evento.data_evento).toLocaleString('pt-BR')}</p>` : ''}
      <img src="${qrUrl}" /><p class="url">${presencaUrl}</p>
      <script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
    win.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">QR Code</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <p className="text-sm font-semibold text-slate-700 mb-1 truncate">{evento.titulo}</p>
        {evento.data_evento && <p className="text-xs text-slate-400 mb-4">{fmtDate(evento.data_evento)}</p>}

        <div className="flex justify-center mb-4">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code" className="w-52 h-52 rounded-xl" />
          ) : (
            <div className="w-52 h-52 bg-slate-100 rounded-xl flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
        </div>

        <p className="text-[10px] text-slate-400 text-center break-all mb-4 font-mono">{presencaUrl}</p>

        <div className="flex gap-2">
          <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
            {copied ? <><Check size={14} className="text-emerald-500" />Copiado!</> : <><Copy size={14} />Copiar link</>}
          </button>
          <button onClick={handlePrint} disabled={!qrUrl} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Printer size={14} />Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Attendance Modal ────────────────────────────────────────────────────────

function PresencaModal({ evento, onClose }: { evento: TreinamentoPresencial; onClose: () => void }) {
  const [registros, setRegistros] = useState<PresencaRegistro[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.treinamentosPresenciais.presenca(evento.id)
      .then(setRegistros)
      .catch(() => setRegistros([]))
      .finally(() => setLoading(false))
  }, [evento.id])

  async function exportXLSX() {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Presença')
    ws.addRow(['#', 'Nome', 'Cargo', 'Área', 'Horário de chegada'])
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    registros.forEach((r, i) => {
      ws.addRow([
        i + 1,
        r.nome,
        r.cargo ?? '',
        r.area ?? '',
        new Date(r.created_at).toLocaleString('pt-BR'),
      ])
    })
    ws.columns = [{ width: 5 }, { width: 35 }, { width: 30 }, { width: 25 }, { width: 22 }]
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `presenca_${evento.titulo.replace(/\s+/g, '_')}.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col mx-0 sm:mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800">Lista de presença</h3>
            <p className="text-xs text-slate-400 truncate max-w-xs">{evento.titulo}</p>
          </div>
          <div className="flex items-center gap-2">
            {registros.length > 0 && (
              <button onClick={exportXLSX} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors">
                <Download size={13} />Excel
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 gap-2 text-sm">
              <RefreshCw size={16} className="animate-spin" />Carregando...
            </div>
          ) : registros.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <Users size={28} className="mb-2 opacity-50" />
              <p className="text-sm">Nenhuma presença registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-0">
              <p className="text-xs text-slate-400 mb-3 font-medium">{registros.length} presença{registros.length !== 1 ? 's' : ''} registrada{registros.length !== 1 ? 's' : ''}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-slate-400 border-b border-slate-100">
                    <th className="text-left py-2 pr-3">#</th>
                    <th className="text-left py-2 pr-3">Nome</th>
                    <th className="text-left py-2 pr-3 hidden sm:table-cell">Cargo / Área</th>
                    <th className="text-left py-2">Horário</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, i) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2.5 pr-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-slate-800">{r.nome}</p>
                      </td>
                      <td className="py-2.5 pr-3 hidden sm:table-cell">
                        <p className="text-xs text-slate-500">{[r.cargo, r.area].filter(Boolean).join(' · ') || '—'}</p>
                      </td>
                      <td className="py-2.5">
                        <p className="text-xs text-slate-400 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm ──────────────────────────────────────────────────────────

function DeleteConfirm({ titulo, onConfirm, onCancel }: { titulo: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 mx-4">
        <h3 className="font-bold text-slate-800 mb-2">Excluir treinamento</h3>
        <p className="text-sm text-slate-500 mb-6">
          Tem certeza que deseja excluir <span className="font-semibold text-slate-700">"{titulo}"</span>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">Excluir</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TreinamentosPresenciais() {
  const { user } = useAuth()
  const canAdmin = isAdmin(user?.role)

  const [eventos, setEventos] = useState<TreinamentoPresencial[]>([])
  const [loading, setLoading] = useState(true)
  const [modalCreate, setModalCreate] = useState(false)
  const [modalEdit, setModalEdit] = useState<TreinamentoPresencial | null>(null)
  const [modalQR, setModalQR] = useState<TreinamentoPresencial | null>(null)
  const [modalPresenca, setModalPresenca] = useState<TreinamentoPresencial | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TreinamentoPresencial | null>(null)
  const [statusLoading, setStatusLoading] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await api.treinamentosPresenciais.list()
      setEventos(rows as TreinamentoPresencial[])
    } catch { setEventos([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(form: typeof EMPTY_FORM, participantes: Participante[]) {
    const row = await api.treinamentosPresenciais.create({
      titulo: form.titulo,
      descricao: form.descricao || undefined,
      instrutor: form.instrutor || undefined,
      local: form.local || undefined,
      data_evento: form.data_evento || undefined,
      codigo: form.codigo || undefined,
      participantes: participantes.length > 0 ? participantes : undefined,
    })
    setEventos(prev => [row as TreinamentoPresencial, ...prev])
  }

  async function handleEdit(form: typeof EMPTY_FORM, _participantes: Participante[]) {
    if (!modalEdit) return
    const row = await api.treinamentosPresenciais.update(modalEdit.id, {
      titulo: form.titulo,
      descricao: form.descricao || null,
      instrutor: form.instrutor || null,
      local: form.local || null,
      data_evento: form.data_evento || null,
      codigo: form.codigo || null,
    })
    setEventos(prev => prev.map(e => e.id === modalEdit.id ? row as TreinamentoPresencial : e))
  }

  async function handleStatusChange(ev: TreinamentoPresencial, newStatus: 'ABERTA' | 'ENCERRADA') {
    setStatusLoading(ev.id)
    try {
      const row = await api.treinamentosPresenciais.update(ev.id, { status: newStatus })
      setEventos(prev => prev.map(e => e.id === ev.id ? row as TreinamentoPresencial : e))
      showToast(newStatus === 'ABERTA' ? 'Lista de presença aberta!' : 'Lista de presença encerrada.')
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar status')
    } finally { setStatusLoading(null) }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    await api.treinamentosPresenciais.delete(confirmDelete.id)
    setEventos(prev => prev.filter(e => e.id !== confirmDelete.id))
    setConfirmDelete(null)
    showToast('Treinamento excluído.')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Gerencie listas de presença com QR codes</p>
        </div>
        {canAdmin && (
          <button
            onClick={() => setModalCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={15} />Novo treinamento
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2 text-sm">
          <RefreshCw size={16} className="animate-spin" />Carregando...
        </div>
      ) : eventos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <QrCode size={36} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhum treinamento presencial cadastrado</p>
          {canAdmin && (
            <button onClick={() => setModalCreate(true)} className="mt-4 text-sm text-blue-600 hover:underline font-medium">
              + Criar primeiro treinamento
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {eventos.map(ev => (
            <div key={ev.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-slate-800 text-sm truncate">{ev.titulo}</h3>
                      <StatusBadge status={ev.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400 mt-1">
                      {ev.instrutor && (
                        <span className="flex items-center gap-1"><User size={11} />{ev.instrutor}</span>
                      )}
                      {ev.local && (
                        <span className="flex items-center gap-1"><MapPin size={11} />{ev.local}</span>
                      )}
                      {ev.data_evento && (
                        <span className="flex items-center gap-1"><Calendar size={11} />{fmtDate(ev.data_evento)}</span>
                      )}
                    </div>
                  </div>

                  {/* Presence count */}
                  <button
                    onClick={() => setModalPresenca(ev)}
                    className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <span className="text-lg font-black text-slate-800 leading-none tabular-nums">{ev.total_presencas}</span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">presentes</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-50">
                  {/* Status button */}
                  {canAdmin && ev.status === 'AGENDADO' && (
                    <button
                      onClick={() => handleStatusChange(ev, 'ABERTA')}
                      disabled={statusLoading === ev.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                    >
                      {statusLoading === ev.id ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> : <Play size={12} />}
                      Abrir lista
                    </button>
                  )}
                  {canAdmin && ev.status === 'ABERTA' && (
                    <button
                      onClick={() => handleStatusChange(ev, 'ENCERRADA')}
                      disabled={statusLoading === ev.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-60 transition-colors"
                    >
                      {statusLoading === ev.id ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> : <Square size={12} />}
                      Encerrar lista
                    </button>
                  )}

                  <button
                    onClick={() => setModalQR(ev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <QrCode size={13} />QR Code
                  </button>

                  <button
                    onClick={() => setModalPresenca(ev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <Users size={13} />Presenças
                  </button>

                  {canAdmin && (
                    <>
                      <button
                        onClick={() => setModalEdit(ev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <Edit2 size={13} />Editar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(ev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-100 text-red-500 text-xs font-medium rounded-xl hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modalCreate && (
        <EventoModal onClose={() => setModalCreate(false)} onSave={handleCreate} />
      )}
      {modalEdit && (
        <EventoModal
          initial={{
            titulo: modalEdit.titulo,
            descricao: modalEdit.descricao ?? '',
            instrutor: modalEdit.instrutor ?? '',
            local: modalEdit.local ?? '',
            data_evento: modalEdit.data_evento ? new Date(modalEdit.data_evento).toISOString().slice(0, 16) : '',
            codigo: modalEdit.codigo ?? '',
          }}
          onClose={() => setModalEdit(null)}
          onSave={handleEdit}
        />
      )}
      {modalQR && <QRModal evento={modalQR} onClose={() => setModalQR(null)} />}
      {modalPresenca && <PresencaModal evento={modalPresenca} onClose={() => setModalPresenca(null)} />}
      {confirmDelete && (
        <DeleteConfirm
          titulo={confirmDelete.titulo}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-400" />{toast}
        </div>
      )}
    </div>
  )
}
