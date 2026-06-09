import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2, X, Trash2, AlertCircle, RefreshCw, ClipboardList, ChevronRight } from 'lucide-react'
import { api } from '../../lib/api'
import type { Colaborador, CicloAvaliacao, NivelCargo } from '../../lib/types'
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

const QUADRANTE_LABELS: Record<string, string> = {
  E3: 'Talento Top / Estrela', E2: 'Potencial Forte',       E1: 'Enigma',
  M3: 'Forte Desempenho',     M2: 'Mantenedor / Eficaz',    M1: 'Questionável',
  B3: 'Dedicado / Especialista', B2: 'Bom Profissional',    B1: 'Risco / Subpadrão',
}

const PERIODO_LABELS: Record<string, string> = {
  '2Sem_2025': '2º Sem 2025', '1Sem_2026': '1º Sem 2026',
  '2Sem_2026': '2º Sem 2026', '1Sem_2025': '1º Sem 2025',
}

const TIPO_LABELS: Record<string, string> = {
  autoavaliacao: 'Autoavaliação', lideranca: 'Avaliação pela liderança',
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  colab: Colaborador
  onSave: (data: Partial<Colaborador>) => Promise<void>
  onClose: () => void
}

function EditModal({ colab, onSave, onClose }: EditModalProps) {
  const [form, setForm] = useState({
    nome: colab.nome,
    cargo: colab.cargo ?? '',
    nivel: (colab.nivel ?? '') as NivelCargo | '',
    area: colab.area ?? '',
    email: colab.email ?? '',
    gestor_nome: colab.gestor_nome ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Editar colaborador</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X size={16} /></button>
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
              <input className="input" value={form.nome} onChange={set('nome')} required />
            </div>
            <div>
              <label className="label">Cargo / Função</label>
              <input className="input" value={form.cargo} onChange={set('cargo')} />
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
              <input className="input" value={form.area} onChange={set('area')} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="col-span-2">
              <label className="label">Gestor responsável</label>
              <input className="input" value={form.gestor_nome} onChange={set('gestor_nome')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ColaboradorPerfil() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [colab, setColab] = useState<Colaborador | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<CicloAvaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  const load = async () => {
    if (!id) return
    setLoading(true)
    setLoadError('')
    try {
      const [c, a] = await Promise.all([
        api.colaboradores.get(Number(id)) as Promise<Colaborador>,
        api.avaliacoes.list(Number(id)) as Promise<CicloAvaliacao[]>,
      ])
      setColab(c ?? null)
      setAvaliacoes(a ?? [])
    } catch (err) {
      setLoadError((err as Error).message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleEdit = async (data: Partial<Colaborador>) => {
    await api.colaboradores.update(Number(id), data)
    await load()
    showToast('Colaborador atualizado')
  }

  const handleDelete = async (avaliacaoId: number) => {
    if (!confirm('Deseja excluir esta avaliação? Esta ação não pode ser desfeita.')) return
    setDeleting(avaliacaoId)
    try {
      await api.avaliacoes.delete(avaliacaoId)
      setAvaliacoes(prev => prev.filter(a => a.id !== avaliacaoId))
      showToast('Avaliação excluída')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div className="card p-12 text-center space-y-4">
          <AlertCircle size={32} className="mx-auto text-red-400" />
          <p className="text-slate-600 dark:text-slate-400">{loadError}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={load} className="btn-primary">Tentar novamente</button>
            <Link to="/colaboradores" className="btn-secondary">Voltar</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!colab) {
    return (
      <div className="p-6">
        <div className="card p-12 text-center">
          <p className="text-slate-500 mb-4">Colaborador não encontrado.</p>
          <Link to="/colaboradores" className="btn-secondary">Voltar</Link>
        </div>
      </div>
    )
  }

  const ultimaAvaliacao = avaliacoes[0]

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/colaboradores')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft size={15} /> Colaboradores
        </button>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{colab.nome}</span>
      </div>

      {/* Info card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <span className="text-primary-600 dark:text-primary-400 text-2xl font-bold">{colab.nome[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{colab.nome}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {colab.cargo || 'Sem cargo'}
                  {colab.nivel && <span className="ml-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{NIVEL_LABELS[colab.nivel]}</span>}
                </p>
              </div>
              <button onClick={() => setShowEdit(true)} className="btn-secondary gap-2 shrink-0 text-xs">
                <Edit2 size={13} /> Editar
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Área</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{colab.area || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">E-mail</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{colab.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Gestor</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{colab.gestor_nome || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
          <div className="text-center px-4">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{colab.total_avaliacoes ?? avaliacoes.length}</p>
            <p className="text-xs text-slate-400">Avaliações</p>
          </div>
          {ultimaAvaliacao?.quadrante && (
            <div className="text-center px-4 border-l border-slate-100 dark:border-slate-700">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{ultimaAvaliacao.quadrante}</p>
              <p className="text-xs text-slate-400">{QUADRANTE_LABELS[ultimaAvaliacao.quadrante]}</p>
            </div>
          )}
          {ultimaAvaliacao?.score_desempenho != null && (
            <div className="text-center px-4 border-l border-slate-100 dark:border-slate-700">
              <p className="text-2xl font-bold text-primary-600">{Number(ultimaAvaliacao.score_desempenho).toFixed(1)}</p>
              <p className="text-xs text-slate-400">Desempenho</p>
            </div>
          )}
          {ultimaAvaliacao?.score_potencial != null && (
            <div className="text-center px-4 border-l border-slate-100 dark:border-slate-700">
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{Number(ultimaAvaliacao.score_potencial).toFixed(1)}</p>
              <p className="text-xs text-slate-400">Potencial</p>
            </div>
          )}
        </div>
      </div>

      {/* Avaliações */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ciclos de Avaliação ({avaliacoes.length})
          </h2>
          <button
            onClick={() => navigate(`/avaliacoes/nova/${colab.id}`)}
            className="btn-primary text-xs gap-1.5"
          >
            <Plus size={13} /> Nova avaliação
          </button>
        </div>

        {avaliacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-4">
            <ClipboardList size={36} className="opacity-40" />
            <p className="text-sm">Nenhuma avaliação registrada</p>
            <button onClick={() => navigate(`/avaliacoes/nova/${colab.id}`)} className="btn-primary text-xs gap-1.5">
              <Plus size={13} /> Iniciar primeira avaliação
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {avaliacoes.map(a => (
              <div
                key={a.id}
                onClick={() => navigate(`/avaliacoes/${a.id}`)}
                className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
              >
                {/* Quadrant badge */}
                <div className="shrink-0 mt-0.5">
                  {a.quadrante ? (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${QUADRANTE_COLORS[a.quadrante] || ''}`}>
                      {a.quadrante}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">—</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {PERIODO_LABELS[a.periodo_inicial] || a.periodo_inicial || '—'}
                      {a.periodo_final && a.periodo_final !== a.periodo_inicial && ` → ${PERIODO_LABELS[a.periodo_final] || a.periodo_final}`}
                    </span>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                      {TIPO_LABELS[a.tipo] || a.tipo}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    {a.quadrante && <span className="text-xs text-slate-500">{QUADRANTE_LABELS[a.quadrante]}</span>}
                    {a.score_desempenho != null && (
                      <span className="text-xs text-slate-400">
                        Desempenho: <strong className="text-primary-600">{Number(a.score_desempenho).toFixed(1)}</strong>
                        {' '}/{' '}
                        Potencial: <strong className="text-slate-700 dark:text-slate-300">{Number(a.score_potencial).toFixed(1)}</strong>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Avaliado por: {a.avaliador_nome || '—'} · {formatDate(a.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(a.id) }}
                    disabled={deleting === a.id}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                    title="Excluir avaliação"
                  >
                    {deleting === a.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                  <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEdit && colab && <EditModal colab={colab} onSave={handleEdit} onClose={() => setShowEdit(false)} />}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm px-4 py-3 rounded-xl shadow-lg animate-slide-up z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
