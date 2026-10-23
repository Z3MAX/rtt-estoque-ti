import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, ChevronRight, Pencil, CheckCircle2, ClipboardCheck, AlertCircle, Target, TrendingUp, Star, Lock, ArrowRight } from 'lucide-react'
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

type Respostas = Record<string, { rating?: number; nota?: number; observation?: string; observacao?: string }>
type TipoComp = 'desempenho' | 'potencial' | 'lideranca'
type CompDef = { id: string; nome: string; icon: string; bg: string }

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function classificarEixo(media: number): string {
  if (media >= 4) return 'Alto'
  if (media >= 2.7) return 'Médio'
  return 'Baixo'
}

function getQuadrante(potencial: string, desempenho: string): string {
  const row = potencial === 'Alto' ? 'E' : potencial === 'Médio' ? 'M' : 'B'
  const col = desempenho === 'Alto' ? '3' : desempenho === 'Médio' ? '2' : '1'
  return row + col
}

const ratingOf = (r: Respostas | null | undefined, id: string) => r?.[id]?.nota ?? r?.[id]?.rating
const obsOf    = (r: Respostas | null | undefined, id: string) => r?.[id]?.observacao ?? r?.[id]?.observation

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ rating, tipo }: { rating: number; tipo: TipoComp }) {
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

function CompRow({ comp, rating, observation, tipo, gestorRating, rhComment }: {
  comp: CompDef
  rating?: number
  observation?: string
  tipo: TipoComp
  /** Consolidado: nota original do gestor, para sinalizar o que o RH ajustou. */
  gestorRating?: number
  /** Consolidado: comentário do RH (só chega para quem pode ver). */
  rhComment?: string
}) {
  const rated = rating != null && rating > 0
  const ajustada = rated && gestorRating != null && gestorRating > 0 && gestorRating !== rating
  const separar = !!rhComment
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
        {ajustada && (
          <p className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-1.5 py-0.5">
            Gestor: {gestorRating} <ArrowRight size={10} /> Calibrado: {rating}
          </p>
        )}
        {observation && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed italic">
            {separar && <span className="not-italic font-semibold">Gestor: </span>}"{observation}"
          </p>
        )}
        {rhComment && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed italic">
            <span className="not-italic font-semibold">RH: </span>"{rhComment}"
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Calibration modal ────────────────────────────────────────────────────────

function CompCalibracaoRow({
  comp, tipo, gestorRating, gestorObs, rating, comment,
  onRate, onComment,
}: {
  comp: CompDef
  tipo: TipoComp
  gestorRating: number
  gestorObs: string
  rating: number
  comment: string
  onRate: (v: number) => void
  onComment: (v: string) => void
}) {
  // Notas 1 e 5 exigem justificativa — vale a do gestor ou a do RH
  const requiresObs = rating === 1 || rating === 5
  const obsEmpty = requiresObs && !gestorObs.trim() && !comment.trim()
  const ajustada = gestorRating > 0 && rating > 0 && rating !== gestorRating

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

      {/* O que o gestor avaliou — somente leitura */}
      <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Avaliação do gestor</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Nota <span className="font-bold">{gestorRating > 0 ? gestorRating : '—'}</span>
          {gestorObs.trim()
            ? <span className="italic text-slate-500 dark:text-slate-400"> · "{gestorObs}"</span>
            : <span className="text-slate-400"> · sem observação</span>}
        </p>
      </div>

      {/* Nota final (calibrada) */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
          Nota calibrada {ajustada && <span className="text-amber-600 dark:text-amber-400 normal-case">· ajustada pelo RH</span>}
        </p>
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
      </div>

      {requiresObs && (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
          <AlertCircle size={11} /> {obsEmpty ? 'Justificativa obrigatória para notas 1 e 5 (o gestor não escreveu uma).' : 'Notas 1 e 5 exigem justificativa — já registrada.'}
        </p>
      )}

      {/* Comentário do RH — fica separado do que o gestor escreveu */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">Comentário do RH</p>
        <textarea
          value={comment}
          onChange={e => onComment(e.target.value)}
          placeholder={obsEmpty ? 'Justificativa obrigatória...' : 'Comentário do RH sobre esta competência (opcional)...'}
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
    </div>
  )
}

function CalibracaoModal({ avaliacao, onClose, onConcluido }: {
  avaliacao: CicloAvaliacao
  onClose: () => void
  onConcluido: (updated: CicloAvaliacao) => void
}) {
  // O que o gestor avaliou (não é alterado pela calibração)
  const respostasGestor = (avaliacao.respostas as unknown as Respostas) || {}
  const gestorRating = (id: string) => ratingOf(respostasGestor, id) ?? 0
  const gestorObs    = (id: string) => obsOf(respostasGestor, id) ?? ''

  const temLideranca = COMP_LIDERANCA.some(c => gestorRating(c.id) > 0)
  const compDesempenho = COMP_DESEMPENHO
  const compLideranca = temLideranca ? COMP_LIDERANCA : []
  const todasComps = [...compDesempenho, ...COMP_POTENCIAL, ...compLideranca]

  // Começa com as notas do gestor; o RH ajusta apenas onde discordar
  const [ratings, setRatings] = useState<Record<string, number>>(
    () => Object.fromEntries(todasComps.map(c => [c.id, gestorRating(c.id)]))
  )
  const [comments, setComments] = useState<Record<string, string>>({})
  const [parecer, setParecer] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Live recalculation — liderança entra apenas no Potencial, não no Desempenho
  const somaDesemp    = compDesempenho.reduce((s, c) => s + (ratings[c.id] ?? 0), 0)
  const avgDesempenho = compDesempenho.length > 0 ? somaDesemp / compDesempenho.length : 0
  const somaPot       = [...COMP_POTENCIAL, ...compLideranca].reduce((s, c) => s + (ratings[c.id] ?? 0), 0)
  const divisorPot    = COMP_POTENCIAL.length + compLideranca.length
  const avgPotencial  = divisorPot > 0 ? somaPot / divisorPot : 0
  const nivelDesemp = classificarEixo(avgDesempenho)
  const nivelPot = classificarEixo(avgPotencial)
  const quadrante = getQuadrante(nivelPot, nivelDesemp)
  const qInfo = QUADRANTE_INFO[quadrante]

  const obsOk = todasComps.every(c => {
    const r = ratings[c.id]
    if (r === 1 || r === 5) return gestorObs(c.id).trim().length > 0 || (comments[c.id] ?? '').trim().length > 0
    return true
  })
  const allRated = todasComps.every(c => (ratings[c.id] ?? 0) > 0)
  const canConcluir = allRated && obsOk
  const ajustes = todasComps.filter(c => gestorRating(c.id) > 0 && ratings[c.id] !== gestorRating(c.id)).length

  async function handleConcluir() {
    if (!canConcluir) return
    setSaving(true); setError('')
    try {
      const notas: Record<string, { nota: number }> = {}
      for (const c of todasComps) notas[c.id] = { nota: ratings[c.id] }
      // Uma única chamada: o servidor guarda a avaliação original do gestor, aplica a nota
      // calibrada e registra os comentários do RH em separado.
      const updated = await api.avaliacoes.update(avaliacao.id, {
        calibrar: true,
        calibracao: { respostas: notas, comentarios: comments, parecer },
        score_desempenho: parseFloat(avgDesempenho.toFixed(2)),
        score_potencial:  parseFloat(avgPotencial.toFixed(2)),
        nivel_desempenho: nivelDesemp,
        nivel_potencial:  nivelPot,
        quadrante,
      } as never) as CicloAvaliacao
      onConcluido(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir calibração')
    } finally {
      setSaving(false)
    }
  }

  const rowProps = (c: CompDef) => ({
    comp: c,
    gestorRating: gestorRating(c.id),
    gestorObs: gestorObs(c.id),
    rating: ratings[c.id] ?? 0,
    comment: comments[c.id] ?? '',
    onRate: (v: number) => setRatings(r => ({ ...r, [c.id]: v })),
    onComment: (v: string) => setComments(o => ({ ...o, [c.id]: v })),
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Calibração — {avaliacao.colaborador_nome}</h2>
          <p className="text-xs text-slate-400 mt-0.5">A avaliação do gestor é preservada. Seus comentários ficam na aba “Calibração RH”.</p>
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
          {compDesempenho.map(c => <CompCalibracaoRow key={c.id} tipo="desempenho" {...rowProps(c)} />)}
        </div>

        {/* Potencial */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300">
            <TrendingUp size={15} /><p className="text-sm font-bold">Eixo Y — Potencial</p>
          </div>
          {COMP_POTENCIAL.map(c => <CompCalibracaoRow key={c.id} tipo="potencial" {...rowProps(c)} />)}
        </div>

        {/* Liderança */}
        {temLideranca && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 py-2 px-4 rounded-xl bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300">
              <Star size={15} /><p className="text-sm font-bold">Competências de Liderança</p>
            </div>
            {COMP_LIDERANCA.map(c => <CompCalibracaoRow key={c.id} tipo="lideranca" {...rowProps(c)} />)}
          </div>
        )}

        {/* Parecer geral do RH */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 py-2 px-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
            <Lock size={15} /><p className="text-sm font-bold">Parecer geral do RH</p>
          </div>
          <textarea
            value={parecer}
            onChange={e => setParecer(e.target.value)}
            placeholder="Resumo da calibração: o que foi discutido e o motivo dos ajustes (opcional)..."
            rows={4}
            className="w-full text-sm rounded-xl px-3 py-2 resize-y outline-none font-sans bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 border border-slate-200 dark:border-slate-600 focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
          />
        </div>

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
        {allRated && !obsOk && (
          <p className="text-xs text-red-500 dark:text-red-400 mb-3">Há notas 1 ou 5 sem justificativa.</p>
        )}
        {allRated && obsOk && (
          <p className="text-xs text-slate-400 mb-3">
            {ajustes === 0 ? 'Nenhuma nota foi alterada em relação ao gestor.' : `${ajustes} nota(s) ajustada(s) em relação ao gestor.`}
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

// ─── Result view (9-Box + competências) — reutilizada pelas abas ──────────────

interface ResultView {
  respostas: Respostas
  score_desempenho?: number | null
  score_potencial?: number | null
  quadrante?: string | null
}

function ResultadoView({ view, tipoAvaliacao, gestorRespostas, rhComentarios }: {
  view: ResultView
  tipoAvaliacao: string
  /** Aba Consolidado: respostas originais do gestor, para destacar ajustes. */
  gestorRespostas?: Respostas | null
  /** Aba Consolidado: comentários do RH por competência. */
  rhComentarios?: Record<string, string>
}) {
  const getRating = (id: string) => ratingOf(view.respostas, id)
  const getObs    = (id: string) => obsOf(view.respostas, id)
  const qInfo = QUADRANTE_INFO[view.quadrante ?? '']
  const temLideranca = tipoAvaliacao === 'lideranca' && COMP_LIDERANCA.some(c => getRating(c.id))

  const rowFor = (c: CompDef, tipo: TipoComp) => (
    <CompRow
      key={c.id} comp={c} tipo={tipo}
      rating={getRating(c.id)} observation={getObs(c.id)}
      gestorRating={gestorRespostas ? ratingOf(gestorRespostas, c.id) : undefined}
      rhComment={rhComentarios?.[c.id]}
    />
  )

  return (
    <div className="space-y-6">
      {/* 9-Box */}
      {view.quadrante && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Posição no 9-Box</h2>
          <div className="flex gap-6 items-start flex-wrap">
            <div className="grid grid-cols-3 gap-1.5" style={{ width: 180 }}>
              {NINE_BOX.map(row =>
                row.map(cell => (
                  <div key={cell} className={`h-14 rounded-lg flex items-center justify-center text-xs font-black transition-all ${cell === view.quadrante ? `${NINE_BOX_BG[cell]} text-white scale-110 shadow-lg ring-2 ring-white dark:ring-slate-900` : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                    {cell}
                  </div>
                ))
              )}
            </div>
            <div className="flex-1 min-w-[13rem]">
              {qInfo && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold mb-3 ${qInfo.bg} ${qInfo.border} ${qInfo.text}`}>
                  {view.quadrante} · {qInfo.label}
                </div>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-24 shrink-0">Desempenho</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${((view.score_desempenho ?? 0) / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">{Number(view.score_desempenho ?? 0).toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-24 shrink-0">Potencial</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-600 dark:bg-slate-400 rounded-full" style={{ width: `${((view.score_potencial ?? 0) / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">{Number(view.score_potencial ?? 0).toFixed(1)}</span>
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
          {COMP_DESEMPENHO.map(c => rowFor(c, 'desempenho'))}
        </div>
      )}

      {/* Potencial */}
      {COMP_POTENCIAL.some(c => getRating(c.id)) && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-600 dark:bg-slate-400 shrink-0" /> Competências de Potencial
          </h2>
          {COMP_POTENCIAL.map(c => rowFor(c, 'potencial'))}
        </div>
      )}

      {/* Liderança */}
      {temLideranca && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-lime-700 dark:text-lime-500 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime-600 shrink-0" /> Competências de Liderança
          </h2>
          {COMP_LIDERANCA.map(c => rowFor(c, 'lideranca'))}
        </div>
      )}
    </div>
  )
}

// ─── Aba "Calibração RH": só os comentários do RH ─────────────────────────────

function CalibracaoRHTab({ avaliacao, podeCalibrar, onCalibrar }: {
  avaliacao: CicloAvaliacao
  podeCalibrar: boolean
  onCalibrar: () => void
}) {
  const cal = avaliacao.calibracao
  if (!cal) {
    return (
      <div className="card p-10 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
          <ClipboardCheck size={22} className="text-amber-500" />
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Esta avaliação ainda não foi calibrada</p>
        <p className="text-xs text-slate-400 max-w-sm">Os comentários e o parecer do RH aparecem aqui depois da calibração, separados do que o gestor avaliou.</p>
        {podeCalibrar && (
          <button onClick={onCalibrar} className="btn-primary gap-2 mt-1"><ClipboardCheck size={14} /> Realizar calibração</button>
        )}
      </div>
    )
  }

  const gestor = avaliacao.gestor_original?.respostas as Respostas | undefined
  const final  = avaliacao.respostas as unknown as Respostas | undefined
  const todas: Array<CompDef & { tipo: TipoComp }> = [
    ...COMP_DESEMPENHO.map(c => ({ ...c, tipo: 'desempenho' as const })),
    ...COMP_POTENCIAL.map(c => ({ ...c, tipo: 'potencial' as const })),
    ...COMP_LIDERANCA.map(c => ({ ...c, tipo: 'lideranca' as const })),
  ].filter(c => ratingOf(final, c.id))

  const comComentario = todas.filter(c => cal.comentarios?.[c.id])
  const semComentario = todas.filter(c => !cal.comentarios?.[c.id])
  const ajustadas = todas.filter(c => {
    const g = ratingOf(gestor, c.id), f = ratingOf(final, c.id)
    return g != null && f != null && g !== f
  })

  return (
    <div className="space-y-6">
      <div className="card p-5 border-l-4 border-l-amber-400">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2"><Lock size={14} /> Parecer geral do RH</h2>
          <span className="text-xs text-slate-400">
            Calibrado por {cal.calibrado_por_nome || '—'} · {formatDate(cal.calibrado_em)}
          </span>
        </div>
        {cal.parecer
          ? <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{cal.parecer}</p>
          : <p className="text-sm text-slate-400 italic">Nenhum parecer geral registrado.</p>}
        <p className="text-xs text-slate-400 mt-3">
          {ajustadas.length === 0 ? 'Nenhuma nota foi alterada em relação ao gestor.' : `${ajustadas.length} nota(s) ajustada(s) em relação ao gestor.`}
        </p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Comentários do RH por competência</h2>
        <p className="text-xs text-slate-400 mb-3">Visível somente para o RH. O gestor não vê esta aba.</p>
        {comComentario.length === 0 && <p className="text-sm text-slate-400 italic py-2">Nenhum comentário por competência.</p>}
        {comComentario.map(c => {
          const g = ratingOf(gestor, c.id), f = ratingOf(final, c.id)
          const mudou = g != null && f != null && g !== f
          return (
            <div key={c.id} className="flex items-start gap-4 py-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: c.bg }}>{c.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.nome}</p>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0 inline-flex items-center gap-1">
                    {mudou ? <>Gestor {g} <ArrowRight size={10} /> RH {f}</> : <>Nota {f}</>}
                  </span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed whitespace-pre-wrap">{cal.comentarios[c.id]}</p>
              </div>
            </div>
          )
        })}
        {semComentario.length > 0 && (
          <p className="text-xs text-slate-400 mt-3">
            Sem comentário do RH: {semComentario.map(c => c.nome).join(', ')}.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Aba = 'consolidado' | 'gestor' | 'rh'

export default function AvaliacaoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userIsAdmin = isAdmin(user?.role)
  const [avaliacao, setAvaliacao] = useState<CicloAvaliacao | null>(null)
  const [colab, setColab] = useState<Colaborador | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCalibracao, setShowCalibracao] = useState(searchParams.get('calibrar') === '1')
  const [aba, setAba] = useState<Aba | null>(null)

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

  const respostasFinais = (avaliacao.respostas as unknown as Respostas) || {}
  const original = avaliacao.gestor_original
  // Calibrada com o novo fluxo: temos a avaliação original do gestor guardada
  const calibrada = avaliacao.status === 'concluido' && !!original
  // Só o RH recebe os comentários (a API remove "calibracao" para os demais)
  const veRH = !!avaliacao.calibracao
  const pendenteAdmin = avaliacao.status === 'pendente' && userIsAdmin

  const abas: Array<{ id: Aba; label: string }> = calibrada
    ? [
        { id: 'consolidado', label: 'Consolidado' },
        { id: 'gestor', label: 'Avaliação do gestor' },
        ...(veRH ? [{ id: 'rh' as const, label: 'Calibração RH' }] : []),
      ]
    : pendenteAdmin
      ? [{ id: 'gestor', label: 'Avaliação do gestor' }, { id: 'rh', label: 'Calibração RH' }]
      : []

  const abaAtiva: Aba = aba && abas.some(a => a.id === aba) ? aba : (calibrada ? 'consolidado' : 'gestor')

  const viewFinal: ResultView = {
    respostas: respostasFinais,
    score_desempenho: avaliacao.score_desempenho,
    score_potencial: avaliacao.score_potencial,
    quadrante: avaliacao.quadrante,
  }
  const viewGestor: ResultView = calibrada
    ? {
        respostas: (original?.respostas as Respostas) || {},
        score_desempenho: original?.score_desempenho,
        score_potencial: original?.score_potencial,
        quadrante: original?.quadrante,
      }
    : viewFinal

  const periodo = `${PERIODOS[avaliacao.periodo_inicial] || avaliacao.periodo_inicial}${avaliacao.periodo_final && avaliacao.periodo_final !== avaliacao.periodo_inicial ? ` → ${PERIODOS[avaliacao.periodo_final] || avaliacao.periodo_final}` : ''}`

  return (
    <>
      {showCalibracao && avaliacao && (
        <CalibracaoModal
          avaliacao={avaliacao}
          onClose={() => setShowCalibracao(false)}
          onConcluido={(updated) => { setAvaliacao(updated); setShowCalibracao(false); setAba('consolidado') }}
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
          </div>
        </div>

        {/* Abas */}
        {abas.length > 0 && (
          <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto" role="tablist">
            {abas.map(a => (
              <button
                key={a.id}
                role="tab"
                aria-selected={abaAtiva === a.id}
                onClick={() => setAba(a.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                  abaAtiva === a.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {a.id === 'rh' && <Lock size={12} />}
                {a.label}
              </button>
            ))}
          </div>
        )}

        {abaAtiva === 'rh' && abas.length > 0 && (
          <CalibracaoRHTab avaliacao={avaliacao} podeCalibrar={pendenteAdmin} onCalibrar={() => setShowCalibracao(true)} />
        )}

        {abaAtiva === 'consolidado' && abas.length > 0 && (
          <>
            <p className="text-xs text-slate-400 -mt-2">
              Resultado final após a calibração. As notas ajustadas pelo RH aparecem sinalizadas{veRH ? ' e os comentários do RH ficam ao lado da observação do gestor' : ''}.
            </p>
            <ResultadoView
              view={viewFinal}
              tipoAvaliacao={avaliacao.tipo}
              gestorRespostas={original?.respostas as Respostas | undefined}
              rhComentarios={avaliacao.calibracao?.comentarios}
            />
          </>
        )}

        {(abaAtiva === 'gestor' || abas.length === 0) && (
          <>
            {calibrada && (
              <p className="text-xs text-slate-400 -mt-2">
                Avaliação original enviada pelo gestor, exatamente como foi preenchida (antes da calibração).
              </p>
            )}
            <ResultadoView view={viewGestor} tipoAvaliacao={avaliacao.tipo} />
          </>
        )}
      </div>
    </>
  )
}
