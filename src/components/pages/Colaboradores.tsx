import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Upload, X, ChevronRight, UserX, RefreshCw, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { api } from '../../lib/api'
import type { Colaborador, NivelCargo } from '../../lib/types'
import { NIVEL_LABELS } from '../../lib/types'

const QUADRANTE_COLORS: Record<string, string> = {
  E3: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  E2: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  E1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  M3: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  M2: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  M1: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  B3: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  B2: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  B1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function formatDate(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

interface ColabModalProps {
  initial?: Partial<Colaborador>
  onSave: (data: Partial<Colaborador>) => Promise<void>
  onClose: () => void
}

function ColabModal({ initial, onSave, onClose }: ColabModalProps) {
  const [form, setForm] = useState({
    nome: initial?.nome ?? '',
    cargo: initial?.cargo ?? '',
    nivel: (initial?.nivel ?? '') as NivelCargo | '',
    area: initial?.area ?? '',
    email: initial?.email ?? '',
    gestor_nome: initial?.gestor_nome ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }
    setSaving(true)
    try {
      await onSave({ ...form, nivel: form.nivel as NivelCargo || undefined })
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {initial?.id ? 'Editar colaborador' : 'Novo colaborador'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Nome completo *</label>
              <input className="input" value={form.nome} onChange={set('nome')} placeholder="Nome do colaborador" />
            </div>
            <div>
              <label className="label">Cargo / Função</label>
              <input className="input" value={form.cargo} onChange={set('cargo')} placeholder="Ex: Analista Comercial" />
            </div>
            <div>
              <label className="label">Nível</label>
              <select className="input" value={form.nivel} onChange={set('nivel')}>
                <option value="">Selecione</option>
                {(Object.entries(NIVEL_LABELS) as [NivelCargo, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Área / Departamento</label>
              <input className="input" value={form.area} onChange={set('area')} placeholder="Ex: Comercial" />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="email@rtt.com" />
            </div>
            <div className="col-span-2">
              <label className="label">Gestor responsável</label>
              <input className="input" value={form.gestor_nome} onChange={set('gestor_nome')} placeholder="Nome do gestor avaliador" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function normalizeKey(k: string): string {
  return k.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

const COLUMN_MAP: Record<string, keyof Colaborador> = {
  nome: 'nome', name: 'nome',
  cargo: 'cargo', funcao: 'cargo', funcão: 'cargo', position: 'cargo',
  nivel: 'nivel', nível: 'nivel', level: 'nivel',
  area: 'area', área: 'area', departamento: 'area', department: 'area',
  email: 'email',
  gestor: 'gestor_nome', gestornome: 'gestor_nome', manager: 'gestor_nome', gerente: 'gestor_nome',
}

interface ImportModalProps { onImport: (data: Partial<Colaborador>[]) => Promise<void>; onClose: () => void }

function ImportModal({ onImport, onClose }: ImportModalProps) {
  const [rows, setRows] = useState<Partial<Colaborador>[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
        const parsed = raw.map(row => {
          const obj: Partial<Colaborador> = {}
          for (const [k, v] of Object.entries(row)) {
            const mapped = COLUMN_MAP[normalizeKey(k)]
            if (mapped && typeof v === 'string' && v.trim()) {
              (obj as Record<string, string>)[mapped] = v.trim()
            }
          }
          return obj
        }).filter(r => r.nome)
        setRows(parsed)
        setError(parsed.length === 0 ? 'Nenhum colaborador encontrado. Verifique se há uma coluna "Nome".' : '')
      } catch {
        setError('Erro ao ler o arquivo. Verifique se é um Excel válido.')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      await onImport(rows)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Importar colaboradores via Excel</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-6 text-center">
            <Upload size={28} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Selecione um arquivo <strong>.xlsx</strong> com colunas: <em>Nome</em>, Cargo, Nível, Área, Email, Gestor
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-xs">
              Escolher arquivo
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {rows.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{rows.length} colaborador(es) identificados — prévia:</p>
              <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>{['Nome','Cargo','Nível','Área','Gestor'].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{r.nome}</td>
                        <td className="px-3 py-2 text-slate-500">{r.cargo || '—'}</td>
                        <td className="px-3 py-2 text-slate-500">{r.nivel ? NIVEL_LABELS[r.nivel as NivelCargo] || r.nivel : '—'}</td>
                        <td className="px-3 py-2 text-slate-500">{r.area || '—'}</td>
                        <td className="px-3 py-2 text-slate-500">{r.gestor_nome || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && <p className="text-center text-xs text-slate-400 py-2">... e mais {rows.length - 20} registros</p>}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleImport} disabled={rows.length === 0 || importing} className="btn-primary flex-1">
              {importing ? 'Importando...' : `Importar ${rows.length} colaborador(es)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ColaboradoresPage() {
  const navigate = useNavigate()
  const [colabs, setColabs] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [toast, setToast] = useState('')

  const load = async (s?: string) => {
    setLoading(true)
    try { setColabs(await api.colaboradores.list(s) as Colaborador[]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleCreate = async (data: Partial<Colaborador>) => {
    await api.colaboradores.create(data)
    await load(search)
    showToast('Colaborador adicionado com sucesso')
  }

  const handleImport = async (data: Partial<Colaborador>[]) => {
    const r = await api.colaboradores.importBulk(data) as { inserted: number }
    await load(search)
    showToast(`${r.inserted} colaborador(es) importado(s) com sucesso`)
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Colaboradores</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{colabs.length} colaborador(es) na base</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary gap-2">
            <Upload size={15} /> Importar Excel
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary gap-2">
            <Plus size={15} /> Novo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9 max-w-sm"
          placeholder="Buscar por nome, cargo ou área..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
            <RefreshCw size={16} className="animate-spin" /> <span className="text-sm">Carregando...</span>
          </div>
        ) : colabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
            <UserX size={32} className="opacity-40" />
            <p className="text-sm">{search ? 'Nenhum resultado' : 'Nenhum colaborador cadastrado'}</p>
            {!search && <button onClick={() => setShowAdd(true)} className="btn-primary text-xs">Adicionar primeiro colaborador</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {['Colaborador', 'Cargo / Nível', 'Área', 'Gestor', 'Último ciclo', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {colabs.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/colaboradores/${c.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                          <span className="text-primary-600 dark:text-primary-400 text-xs font-bold">{c.nome[0].toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{c.cargo || '—'}</p>
                      {c.nivel && <p className="text-xs text-slate-400">{NIVEL_LABELS[c.nivel]}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{c.area || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{c.gestor_nome || '—'}</td>
                    <td className="px-4 py-3">
                      {c.ultimo_quadrante ? (
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${QUADRANTE_COLORS[c.ultimo_quadrante] || ''}`}>
                            {c.ultimo_quadrante}
                          </span>
                          {c.ultima_avaliacao && <p className="text-xs text-slate-400 mt-0.5">{formatDate(c.ultima_avaliacao)}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sem avaliação</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <ColabModal onSave={handleCreate} onClose={() => setShowAdd(false)} />}
      {showImport && <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm px-4 py-3 rounded-xl shadow-lg animate-slide-up z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
