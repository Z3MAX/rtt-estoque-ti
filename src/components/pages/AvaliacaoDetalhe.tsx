import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, ChevronRight, Pencil } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth, isAdmin } from '../../lib/auth'
import type { CicloAvaliacao, Colaborador } from '../../lib/types'

// ─── Shared data (mirrored from NovaAvaliacao) ────────────────────────────────

const COMP_DESEMPENHO = [
  { id: 'qualidade-entregas',     nome: 'Qualidade das entregas',           icon: '🎯', bg: '#E1F5EE' },
  { id: 'cumprimento-prazos',     nome: 'Cumprimento de prazos',            icon: '📈', bg: '#EEEDFE' },
  { id: 'autonomia-proatividade', nome: 'Autonomia e proatividade',         icon: '💡', bg: '#FAEEDA' },
  { id: 'impacto-time',           nome: 'Impacto no time / área',           icon: '🔄', bg: '#FAECE7' },
  { id: 'evolucao-periodo',       nome: 'Evolução no período',              icon: '⭐', bg: '#E6F1FB' },
]
const COMP_POTENCIAL = [
  { id: 'foco-cliente',    nome: 'Foco no/do Cliente',                 icon: '🎯', bg: '#E1F5EE' },
  { id: 'foco-resultado',  nome: 'Foco no Resultado',                   icon: '📈', bg: '#EEEDFE' },
  { id: 'empreendedorismo',nome: 'Empreendedorismo Interno',           icon: '💡', bg: '#FAEEDA' },
  { id: 'resiliencia',     nome: 'Resiliência',                         icon: '🔄', bg: '#FAECE7' },
  { id: 'alta-performance',nome: 'Alta e Consistente Performance',     icon: '⭐', bg: '#E6F1FB' },
]
const COMP_LIDERANCA = [
  { id: 'liderando-negocio', nome: 'Liderando o Negócio',    icon: '🧭', bg: '#EAF3DE' },
  { id: 'liderando-pessoas', nome: 'Liderando Pessoas',       icon: '🤝', bg: '#FBEAF0' },
  { id: 'liderando-si',      nome: 'Liderando a Si Mesmo',   icon: '🪞', bg: '#EEEDFE' },
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

// ─── Competency row ───────────────────────────────────────────────────────────

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
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
              {rating}/5 · {LABELS_NOTA[rating]}
            </span>
          ) : (
            <span className="text-xs text-slate-300 dark:text-slate-600 italic">Não avaliado</span>
          )}
        </div>
        {rated && <ScoreBar rating={rating} tipo={tipo} />}
        {observation && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed italic">"{observation}"</p>
        )}
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

  const respostas = (avaliacao.respostas as unknown as Record<string, { rating: number; observation: string }>) || {}
  const qInfo = QUADRANTE_INFO[avaliacao.quadrante ?? '']
  const temLideranca = avaliacao.tipo === 'lideranca' && COMP_LIDERANCA.some(c => respostas[c.id]?.rating)
  const periodo = `${PERIODOS[avaliacao.periodo_inicial] || avaliacao.periodo_inicial}${avaliacao.periodo_final && avaliacao.periodo_final !== avaliacao.periodo_inicial ? ` → ${PERIODOS[avaliacao.periodo_final] || avaliacao.periodo_final}` : ''}`

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-4xl">
      {/* Breadcrumb + back */}
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
          {/* Edit button — admin only */}
          {userIsAdmin && colab && (
            <div className="w-full flex justify-end -mb-2">
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
                <span>·</span>
                <span>{periodo}</span>
                <span>·</span>
                <span>Avaliado por: {avaliacao.avaliador_nome || '—'}</span>
                <span>·</span>
                <span>{formatDate(avaliacao.created_at)}</span>
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
              {NINE_BOX.map((row, ri) =>
                row.map((cell, ci) => (
                  <div
                    key={cell}
                    className={`h-14 rounded-lg flex items-center justify-center text-xs font-black transition-all
                      ${cell === avaliacao.quadrante
                        ? `${NINE_BOX_BG[cell]} text-white scale-110 shadow-lg ring-2 ring-white dark:ring-slate-900`
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                      }`}
                  >
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
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${((avaliacao.score_desempenho ?? 0) / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">{Number(avaliacao.score_desempenho ?? 0).toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-24 shrink-0">Potencial</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-600 dark:bg-slate-400 rounded-full transition-all" style={{ width: `${((avaliacao.score_potencial ?? 0) / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">{Number(avaliacao.score_potencial ?? 0).toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desempenho */}
      {COMP_DESEMPENHO.some(c => respostas[c.id]?.rating) && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" /> Competências de Desempenho
          </h2>
          {COMP_DESEMPENHO.map(c => (
            <CompRow key={c.id} comp={c} rating={respostas[c.id]?.rating} observation={respostas[c.id]?.observation} tipo="desempenho" />
          ))}
        </div>
      )}

      {/* Potencial */}
      {COMP_POTENCIAL.some(c => respostas[c.id]?.rating) && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-600 dark:bg-slate-400 shrink-0" /> Competências de Potencial
          </h2>
          {COMP_POTENCIAL.map(c => (
            <CompRow key={c.id} comp={c} rating={respostas[c.id]?.rating} observation={respostas[c.id]?.observation} tipo="potencial" />
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
            <CompRow key={c.id} comp={c} rating={respostas[c.id]?.rating} observation={respostas[c.id]?.observation} tipo="lideranca" />
          ))}
        </div>
      )}
    </div>
  )
}
