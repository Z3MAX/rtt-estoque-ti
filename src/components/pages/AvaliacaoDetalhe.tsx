import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, ChevronRight, Pencil, CheckCircle2, ClipboardCheck, AlertCircle, Target, TrendingUp, Star } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth, isAdmin } from '../../lib/auth'
import type { CicloAvaliacao, Colaborador } from '../../lib/types'

// ─── Shared data ──────────────────────────────────────────────────────────────

const COMP_DESEMPENHO = [
  { id: 'qualidade-entregas',     nome: 'Qualidade das entregas',       icon: '🎯', bg: '#E1F5EE' },
  { id: 'cumprimento-prazos',     nome: 'Cumprimento de prazos',        icon: '📅', bg: '#EEEDFE' },
  { id: 'autonomia-proatividade', nome: 'Autonomia e proatividade',     icon: '💡', bg: '#FAEEDA' },
  { id: 'impacto-time',           nome: 'Impacto no time / área',       icon: '🔄', bg: '#FAECE7' },
  { id: 'evolucao-periodo',       nome: 'Evolução no período',          icon: '⭐', bg: '#E6F1FB' },
]
const COMP_POTENCIAL = [
  { id: 'foco-cliente',    nome: 'Foco no/do Cliente',             icon: '🎯', bg: '#E1F5EE' },
  { id: 'foco-resultado',  nome: 'Foco no Resultado',               icon: '📈', bg: '#EEEDFE' },
  { id: 'empreendedorismo',nome: 'Empreendedorismo Interno',       icon: '💡', bg: '#FAEEDA' },
  { id: 'resiliencia',     nome: 'Resiliência',                     icon: '🔄', bg: '#FAECE7' },
  { id: 'alta-performance',nome: 'Alta e Consistente Performance', icon: '⭐', bg: '#E6F1FB' },
]
const COMP_LIDERANCA = [
  { id: 'liderando-negocio', nome: 'Liderando o Negócio',  icon: '🧭', bg: '#EAF3DE' },
  { id: 'liderando-pessoas', nome: 'Liderando Pessoas',     icon: '🤝', bg: '#FBEAF0' },
  { id: 'liderando-si',      nome: 'Liderando a Si Mesmo', icon: '🪞', bg: '#EEEDFE' },
]

const LABELS_NOTA = ['', 'Muito baixo', 'Abaixo', 'Adequado', 'Acima', 'Referência']

const QUADRANTE_INFO: Record<string, { label: string; bg: string; text: string; border: string }> = {
  E3: { label: 'Talento Top / Estrela',   bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700' },
  E2: { label: 'Potencial Forte',         bg: 'bg-green-50 dark:bg-green-900/20',     text: 'text-green-700 dark:text-green-400',   border: 'border-green-300 dark:border-green-700' },
  E1: { label: 'Enigma',                  bg: 'bg-slate-50 dark:bg-slate-800',         text: 'text-slate-600 dark:text-slate-300',   border: 'border-slate-300 dark:border-slate-600' },
  M3: { label: 'Forte Desempenho',        bg: 'bg-teal-50 dark:bg-teal-900/20',       text: 'text-teal-700 dark:text-teal-400',     border: 'border-teal-300 dark:border-teal-700' },
  M2: { label: 'Mantenedor / Eficaz',     bg: 'bg-slate-50 dark:bg-slate-800',         text: 'text-slate-600 dark:text-slate-300',   border: 'border-slate-300 dark:border-slate-600' },
  M1: { label: 'Questionável',            bg: 'bg-amber-50 dark:bg-amber-900/20',     text: 'text-amber-700 dark:text-amber-400',   border: 'border-amber-300 dark:border-amber-700' },
  B3: { label: 'Dedicado / Especialista', bg: 'bg-slate-50 dark:bg-slate-800',         text: 'text-slate-600 dark:text-slate-300',   border: 'border-slate-300 dark:border-slate-600' },
  B2: { label: 'Bom Profissional',        bg: 'bg-orange-50 dark:bg-orange-900/20',   text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700' },
  B1: { label: 'Risco / Subpadrão',       bg: 'bg-red-50 dark:bg-red-900/20',         text: 'text-red-700 dark:text-red-400',       border: 'border-red-300 dark:border-red-700' },
}

const NINE_BOX = [['E1','E2','E3'],['M1','M2','M3'],['B1','B2','B3']]
const NINE_BOX_BG: Record<string, string> = {
  E3:'bg-emerald-500', E2:'bg-green-400',  E1:'bg-blue-400',
  M3:'bg-teal-400',    M2:'bg-slate-300',  M1:'bg-amber-400',
  B3:'bg-indigo-400',  B2:'bg-orange-400', B1:'bg-red-500',
}

const PERIODOS: Record<string, string> = {
  '1Sem_2024': '1º Sem / 2024', '2Sem_2024': '2º Sem / 2024',
  '1Sem_2025': '1º Sem / 2025', '2Sem_2025': '2º Sem / 2025',
  '1Sem_2026': '1º Sem / 2026', '2Sem_2026': '2º Sem / 2026',
}

const TIPO_LABELS: Record<string, string> = {
  lideranca: 'Avaliação pela liderança',
  autoavaliacao: 'Autoavaliação',
  par: 'Avaliação por par',
  rh: 'Avaliação RH',
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function classificarEixo(media: number): string {
  if (media >= 3.7) return 'Alto'
  if (media >= 2.7) return 'Médio'
  return 'Baixo'
}

function getQuadrante(potencial: string, desempenho: string): string {
  const row = potencial === 'Alto' ? 'E' : potencial === 'Médio' ? 'M' : 'B'
  const col = desempenho === 'Alto' ? '3' : desempenho === 'Médio' ? '2' : '1'
  return row + col
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ rating, tipo }: { rating: number; tipo: 'desempenho' | 'potencial' | 'lideranca' }) {
  const colors = {
    desempenho: ['bg-primary-500', 'bg-primary-400', 'bg-primary-300', 'bg-primary-200', 'bg-primary-100'],
    potencial:  ['bg-slate-700', 'bg-slate-500', 'bg-slate-400', 'bg-slate-300', 'bg-slate-200'],
    lideranca:  ['bg-lime-600', 'bg-lime-500', 'bg-lime-400', 'bg-lime-300', 'bg-lime-200'],
  }
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(v => (
        <div key={v} className={`h-2 flex-1 rounded-full transition-colors ${v <= rating ? colors[tipo][5 - v] : 'bg-slate-100 dark:bg-slate-700'}`} />
      ))}
    </div>
  )
}

// ─── Competency row (read-only, for detail view) ──────────────────────────────

function CompRow({ comp, rating, observation, tipo }: {
  comp: { id: string; nome: string; icon: string; bg: string }
  rating?: number
  observation?: string
  tipo: 'desempenho' | 'potencial' | 'lideranca'
}) {
  const rated = rating != null && rating > 0
  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: comp.bg }}>
        {comp.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4 mb-1.5">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{comp.nome}</p>
          {rated ? (
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">{rating}/5 · {LABELS_NOTA[rating]}</span>
          ) : (
            <span className="text-xs text-slate-300 dark:text-slate-600 italic">Não avaliado</span>
          )}
        </div>
        {rated && <ScoreBar rating={rating} tipo={tipo} />}
        {observation && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed italic">"{observation}"</p>}
      </div>
    </div>
  )
}

// ─── Calibration modal ────────────────────────────────────────────────────────

interface CompEdit { id: string; nome: string; icon: string; bg: string }

function CompCalibracaoRow({
  comp, tipo, rating, observation,
  onRate, onObs,
}: {
  comp: CompEdit
  tipo: 'desempenho' | 'potencial' | 'lideranca'
  rating: number
  observation: string
  onRate: (v: number) => void
  onObs: (v: string) => void
}) {
  const requiresObs = rating === 1 || rating === 5
  const obsEmpty = requiresObs && !observation.trim()

  const ratingColors: Record<string, string> = {
    desempenho: 'bg-primary-600 border-primary-600 text-white',
    potencial:  'bg-slate-700 border-slate-700 text-white',
    lideranca:  'bg-lime-600 border-lime-600 text-white',
  }

  return (
    <div className={`p-4 rounded-xl border ${obsEmpty ? 'border-red-300 dark:border-red-700 bg-red-50/40 dark:bg-red-900/10' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'} space-y-3`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: comp.bg }}>
          {comp.icon}
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex-1">{comp.nome}</p>
        {rating > 0 && (
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">{LABELS_NOTA[rating]}</span>
        )}
      </div>
      {/* Rating buttons */}
      <div className="grid grid-cols-5 gap-1.5">
        {[1,2,3,4,5].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onRate(v)}
            className={`rounded-lg border-2 py-2 text-center text-sm font-bold transition-all
              ${rating === v
                ? ratingColors[tipo]
                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
          >
            {v}
          </button>
        ))}
      </div>
      {/* Observation */}
      {requiresObs && (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
          <AlertCircle size={11} /> Justificativa obrigatória para notas 1 e 5
        </p>
      )}
      <textarea
        value={observation}
        onChange={e => onObs(e.target.value)}
        placeholder={requiresObs ? 'Justificativa obrigatória...' : 'Observações ou ajustes do RH (opcional)...'}
        rows={2}
        className={`w-full text-xs rounded-xl px-3 py-2 resize-y outline-none font-sans transition-all
          bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300
          placeholder-slate-400 dark:placeholder-slate-500
          ${obsEmpty
            ? 'border-2 border-dashed border-red-400 dark:border-red-600'
            : 'border border-slate-200 dark:border-slate-600 focus:border-primary-400 focus:ring-1 focus:ring-primary-100'
          }`}
      />
    </div>
  )
}

function CalibracaoModal({ avaliacao, onClose, onConcluido }: {
  avaliacao: CicloAvaliacao
  onClose: () => void
  onConcluido: (updated: CicloAvaliacao) => void
}) {
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [observations, setObservations] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const temLideranca = avaliacao.tipo === 'lideranca'
  const compDesempenho = temLideranca ? COMP_DESEMPENHO.slice(0, 4) : COMP_DESEMPENHO
  const compLideranca = temLideranca ? COMP_LIDERANCA : []
  const todasComps = [...compDesempenho, ...COMP_POTENCIAL, ...compLideranca]

  useEffect(() => {
    const resps = (avaliacao.respostas as unknown as Record<string, { nota?: number; rating?: number; observacao?: string; observation?: string }>) || {}
    const r: Record<string, number> = {}
    const o: Record<string, string> = {}
    for (const [k, v] of Object.entries(resps)) {
      r[k] = v.nota ?? v.rating ?? 0
      o[k] = v.observacao ?? v.observation ?? ''
    }
    setRatings(r)
    setObservations(o)
  }, [])

  // Live recalculation
  const somaDesemp = [...compDesempenho, ...compLideranca].reduce((s, c) => s + (ratings[c.id] ?? 0), 0)
  const divisorDesemp = compDesempenho.length + compLideranca.length
  const avgDesempenho = divisorDesemp > 0 ? somaDesemp / divisorDesemp : 0
  const somaPot = COMP_POTENCIAL.reduce((s, c) => s + (ratings[c.id] ?? 0), 0)
  const avgPotencial = COMP_POTENCIAL.length > 0 ? somaPot / COMP_POTENCIAL.length : 0
  const nivelDesemp = classificarEixo(avgDesempenho)
  const nivelPot = classificarEixo(avgPotencial)
  const quadrante = getQuadrante(nivelPot, nivelDesemp)
  const qInfo = QUADRANTE_INFO[quadrante]

  const obsOk = todasComps.every(c => {
    const r = ratings[c.id]
    if (r === 1 || r === 5) return (observations[c.id] ?? '').trim().length > 0
    return true
  })
  const allRated = todasComps.every(c => (ratings[c.id] ?? 0) > 0)
  const canConcluir = allRated && obsOk

  async function handleConcluir() {
    if (!canConcluir) return
    setSaving(true); setError('')
    try {
      const respostas: Record<string, { nota: number; observacao?: string }> = {}
      for (const c of todasComps) {
        respostas[c.id] = { nota: ratings[c.id], observacao: observations[c.id] || undefined }
      }
      // 1. Update scores and respostas
      await api.avaliacoes.update(avaliacao.id, {
        score_desempenho: parseFloat(avgDesempenho.toFixed(2)),
        score_potencial:  parseFloat(avgPotencial.toFixed(2)),
        nivel_desempenho: nivelDesemp,
        nivel_potencial:  nivelPot,
        quadrante,
        respostas,
      } as never)
      // 2. Mark as concluido
      const updated = await api.avaliacoes.update(avaliacao.id, { calibrar: true } as never) as CicloAvaliacao
      onConcluido(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir calibração')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Calibração — {avaliacao.colaborador_nome}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Revise e ajuste as notas antes de concluir a calibração</p>
        </div>
        {/* Live quadrante preview */}
        {qInfo && (
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${qInfo.bg} ${qInfo.border} ${qInfo.text}`}>
            <span className="text-lg font-black">{quadrante}</span>
            <span>{qInfo.label}</span>
          </div>
        )}
      </div>

      {/* Live score strip */}
      <div className="grid grid-cols-3 gap-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        {[
          { label: 'Desempenho', value: avgDesempenho, nivel: nivelDesemp, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Potencial',  value: avgPotencial,  nivel: nivelPot,    color: 'text-slate-700 dark:text-slate-200' },
          { label: 'Quadrante',  value: null,           nivel: quadrante,   color: qInfo ? qInfo.text : 'text-slate-600' },
        ].map(({ label, value, nivel, color }) => (
          <div key={label} className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-700 last:border-0">
            <p className={`text-xl font-black ${color}`}>{value != null ? value.toFixed(1) : nivel}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}{value != null ? ` · ${nivel}` : ''}</p>
          </div>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Desempenho */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 py-2 px-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
            <Target size={15} /><p className="text-sm font-bold">Eixo X — Desempenho</p>
          </div>
          {compDesempenho.map(c => (
            <CompCalibracaoRow key={c.id} comp={c} tipo="desempenho"
              rating={ratings[c.id] ?? 0} observation={observations[c.id] ?? ''}
              onRate={v => setRatings(r => ({ ...r, [c.id]: v }))}
              onObs={v => setObservations(o => ({ ...o, [c.id]: v }))}
            />
          ))}
        </div>

        {/* Potencial */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300">
            <TrendingUp size={15} /><p className="text-sm font-bold">Eixo Y — Potencial</p>
          </div>
          {COMP_POTENCIAL.map(c => (
            <CompCalibracaoRow key={c.id} comp={c} tipo="potencial"
              rating={ratings[c.id] ?? 0} observation={observations[c.id] ?? ''}
              onRate={v => setRatings(r => ({ ...r, [c.id]: v }))}
              onObs={v => setObservations(o => ({ ...o, [c.id]: v }))}
            />
          ))}
        </div>

        {/* Liderança */}
        {temLideranca && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 py-2 px-4 rounded-xl bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300">
              <Star size={15} /><p className="text-sm font-bold">Competências de Liderança</p>
            </div>
            {COMP_LIDERANCA.map(c => (
              <CompCalibracaoRow key={c.id} comp={c} tipo="lideranca"
                rating={ratings[c.id] ?? 0} observation={observations[c.id] ?? ''}
                onRate={v => setRatings(r => ({ ...r, [c.id]: v }))}
                onObs={v => setObservations(o => ({ ...o, [c.id]: v }))}
              />
            ))}
          </div>
        )}

        {/* Padding bottom */}
        <div className="h-4" />
      </div>

      {/* Bottom action bar */}
      <div className="px-6 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-3">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {!allRated && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
            {todasComps.filter(c => !(ratings[c.id] > 0)).length} competência(s) sem nota — avalie todas para concluir.
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={saving} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleConcluir}
            disabled={!canConcluir || saving}
            className="btn-primary flex-1 gap-2 justify-center disabled:opacity-40"
          >
            {saving ? <><RefreshCw size={14} className="animate-spin" /> Salvando...</> : <><CheckCircle2 size={14} /> Concluir calibração</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AvaliacaoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userIsAdmin = isAdmin(user?.role)
  const [avaliacao, setAvaliacao] = useState<CicloAvaliacao | null>(null)
  const [colab, setColab] = useState<Colaborador | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCalibracao, setShowCalibracao] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const av = await api.avaliacoes.get(Number(id)) as CicloAvaliacao
        if (!av) { setError('Avaliação não encontrada'); return }
        setAvaliacao(av)
        const col = await api.colaboradores.get(av.colaborador_id) as Colaborador
        setColab(col ?? null)
      } catch {
        setError('Erro ao carregar avaliação')
      } finally {
        setLoading(false)
      }
    }
    if (id) load()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 gap-2 p-6">
      <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
    </div>
  )

  if (error || !avaliacao) return (
    <div className="p-6 text-center text-slate-500">{error || 'Avaliação não encontrada'}</div>
  )

  const respostas = (avaliacao.respostas as unknown as Record<string, { rating?: number; nota?: number; observation?: string; observacao?: string }>) || {}
  const getRating = (id: string) => respostas[id]?.nota ?? respostas[id]?.rating
  const getObs    = (id: string) => respostas[id]?.observacao ?? respostas[id]?.observation

  const qInfo = QUADRANTE_INFO[avaliacao.quadrante ?? '']
  const temLideranca = avaliacao.tipo === 'lideranca' && COMP_LIDERANCA.some(c => getRating(c.id))
  const periodo = `${PERIODOS[avaliacao.periodo_inicial] || avaliacao.periodo_inicial}${avaliacao.periodo_final && avaliacao.periodo_final !== avaliacao.periodo_inicial ? ` → ${PERIODOS[avaliacao.periodo_final] || avaliacao.periodo_final}` : ''}`

  return (
    <>
      {showCalibracao && avaliacao && (
        <CalibracaoModal
          avaliacao={avaliacao}
          onClose={() => setShowCalibracao(false)}
          onConcluido={(updated) => { setAvaliacao(updated); setShowCalibracao(false) }}
        />
      )}

      <div className="p-6 space-y-6 animate-fade-in max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => colab ? navigate(`/colaboradores/${colab.id}`) : navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="cursor-pointer hover:text-primary-500" onClick={() => navigate('/colaboradores')}>Colaboradores</span>
            <ChevronRight size={12} />
            {colab && <span className="cursor-pointer hover:text-primary-500" onClick={() => navigate(`/colaboradores/${colab.id}`)}>{colab.nome}</span>}
            {colab && <ChevronRight size={12} />}
            <span className="text-slate-600 dark:text-slate-300 font-medium">Ciclo {periodo}</span>
          </div>
        </div>

        {/* Header card */}
        <div className="card p-5">
          <div className="flex flex-wrap items-start gap-4 justify-between">
            {/* Admin actions */}
            {userIsAdmin && colab && (
              <div className="w-full flex justify-end gap-2 -mb-2">
                {avaliacao.status === 'pendente' && (
                  <button
                    onClick={() => setShowCalibracao(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all"
                  >
                    <ClipboardCheck size={12} /> Realizar calibração
                  </button>
                )}
                {avaliacao.status === 'concluido' && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                    <CheckCircle2 size={12} /> Calibração concluída
                  </span>
                )}
                <button
                  onClick={() => navigate(`/avaliacoes/nova/${colab.id}?edit=${id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-700 transition-all"
                >
                  <Pencil size={12} /> Editar avaliação
                </button>
              </div>
            )}
            <div className="flex items-center gap-4">
              {colab && (
                <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <span className="text-primary-600 dark:text-primary-400 font-bold">{colab.nome[0]}</span>
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{avaliacao.colaborador_nome}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-400">
                  <span>{TIPO_LABELS[avaliacao.tipo] || avaliacao.tipo}</span>
                  <span>·</span><span>{periodo}</span>
                  <span>·</span><span>Avaliado por: {avaliacao.avaliador_nome || '—'}</span>
                  <span>·</span><span>{formatDate(avaliacao.created_at)}</span>
                </div>
              </div>
            </div>

            {avaliacao.quadrante && qInfo && (
              <div className={`px-4 py-2 rounded-xl border ${qInfo.bg} ${qInfo.border} text-center`}>
                <p className={`text-2xl font-black ${qInfo.text}`}>{avaliacao.quadrante}</p>
                <p className={`text-xs font-medium mt-0.5 ${qInfo.text}`}>{qInfo.label}</p>
              </div>
            )}
          </div>

          {/* Score pills */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
            {avaliacao.score_desempenho != null && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Desempenho</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-primary-600">{Number(avaliacao.score_desempenho).toFixed(1)}</span>
                  <span className="text-xs text-slate-400">/5 · {avaliacao.nivel_desempenho}</span>
                </div>
              </div>
            )}
            {avaliacao.score_potencial != null && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Potencial</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-700 dark:text-slate-200">{Number(avaliacao.score_potencial).toFixed(1)}</span>
                  <span className="text-xs text-slate-400">/5 · {avaliacao.nivel_potencial}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 9-Box */}
        {avaliacao.quadrante && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Posição no 9-Box</h2>
            <div className="flex gap-6 items-start flex-wrap">
              <div className="grid grid-cols-3 gap-1.5" style={{ width: 180 }}>
                {NINE_BOX.map(row =>
                  row.map(cell => (
                    <div key={cell} className={`h-14 rounded-lg flex items-center justify-center text-xs font-black transition-all ${cell === avaliacao.quadrante ? `${NINE_BOX_BG[cell]} text-white scale-110 shadow-lg ring-2 ring-white dark:ring-slate-900` : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                      {cell}
                    </div>
                  ))
                )}
              </div>
              <div className="flex-1 min-w-0">
                {qInfo && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold mb-3 ${qInfo.bg} ${qInfo.border} ${qInfo.text}`}>
                    {avaliacao.quadrante} · {qInfo.label}
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 w-24 shrink-0">Desempenho</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${((avaliacao.score_desempenho ?? 0) / 5) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">{Number(avaliacao.score_desempenho ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 w-24 shrink-0">Potencial</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-600 dark:bg-slate-400 rounded-full" style={{ width: `${((avaliacao.score_potencial ?? 0) / 5) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">{Number(avaliacao.score_potencial ?? 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desempenho */}
        {COMP_DESEMPENHO.some(c => getRating(c.id)) && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" /> Competências de Desempenho
            </h2>
            {COMP_DESEMPENHO.map(c => (
              <CompRow key={c.id} comp={c} rating={getRating(c.id)} observation={getObs(c.id)} tipo="desempenho" />
            ))}
          </div>
        )}

        {/* Potencial */}
        {COMP_POTENCIAL.some(c => getRating(c.id)) && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-600 dark:bg-slate-400 shrink-0" /> Competências de Potencial
            </h2>
            {COMP_POTENCIAL.map(c => (
              <CompRow key={c.id} comp={c} rating={getRating(c.id)} observation={getObs(c.id)} tipo="potencial" />
            ))}
          </div>
        )}

        {/* Liderança */}
        {temLideranca && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-lime-700 dark:text-lime-500 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-600 shrink-0" /> Competências de Liderança
            </h2>
            {COMP_LIDERANCA.map(c => (
              <CompRow key={c.id} comp={c} rating={getRating(c.id)} observation={getObs(c.id)} tipo="lideranca" />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
