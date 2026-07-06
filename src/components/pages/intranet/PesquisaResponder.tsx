import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardList, CheckCircle2, AlertCircle, Loader2, ChevronLeft } from 'lucide-react'
import { api } from '../../../lib/api'

type TipoPergunta = 'multipla_escolha' | 'checkbox' | 'escala' | 'texto' | 'sim_nao' | 'nps'

interface OpcaoPergunta { id: number; texto: string }
interface Pergunta {
  id: number
  titulo: string
  tipo: TipoPergunta
  obrigatoria: boolean
  opcoes?: OpcaoPergunta[]
  escala_min?: number
  escala_max?: number
  escala_label_min?: string
  escala_label_max?: string
}

interface Pesquisa {
  id: number
  nome: string
  objetivo?: string
  tipo: string
  situacao: string
  anonima: boolean
  perguntas?: Pergunta[]
}

type Resposta =
  | { tipo: 'multipla_escolha'; valor: string }
  | { tipo: 'checkbox'; valor: string[] }
  | { tipo: 'escala'; valor: number | null }
  | { tipo: 'texto'; valor: string }
  | { tipo: 'sim_nao'; valor: 'Sim' | 'Não' | null }
  | { tipo: 'nps'; valor: number | null }

function initResposta(p: Pergunta): Resposta {
  switch (p.tipo) {
    case 'multipla_escolha': return { tipo: 'multipla_escolha', valor: '' }
    case 'checkbox':         return { tipo: 'checkbox', valor: [] }
    case 'escala':           return { tipo: 'escala', valor: null }
    case 'texto':            return { tipo: 'texto', valor: '' }
    case 'sim_nao':          return { tipo: 'sim_nao', valor: null }
    case 'nps':              return { tipo: 'nps', valor: null }
  }
}

function isRespondida(r: Resposta): boolean {
  switch (r.tipo) {
    case 'multipla_escolha': return r.valor !== ''
    case 'checkbox':         return r.valor.length > 0
    case 'escala':           return r.valor !== null
    case 'texto':            return r.valor.trim() !== ''
    case 'sim_nao':          return r.valor !== null
    case 'nps':              return r.valor !== null
  }
}

/* ─── Campo de resposta por tipo ─── */
function CampoResposta({ pergunta, resposta, onChange }: {
  pergunta: Pergunta
  resposta: Resposta
  onChange: (r: Resposta) => void
}) {
  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition resize-none'

  if (resposta.tipo === 'multipla_escolha') {
    const opcoes = pergunta.opcoes ?? []
    return (
      <div className="space-y-2.5 mt-4">
        {opcoes.map(op => {
          const checked = resposta.valor === op.texto
          return (
            <label key={op.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              checked ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                checked ? 'border-primary-500 bg-primary-500' : 'border-slate-300 dark:border-slate-500'
              }`}>
                {checked && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300">{op.texto || `Opção ${op.id}`}</span>
              <input type="radio" name={`pergunta-${pergunta.id}`} value={op.texto} checked={checked}
                onChange={() => onChange({ tipo: 'multipla_escolha', valor: op.texto })}
                className="sr-only" />
            </label>
          )
        })}
      </div>
    )
  }

  if (resposta.tipo === 'checkbox') {
    const opcoes = pergunta.opcoes ?? []
    return (
      <div className="space-y-2.5 mt-4">
        {opcoes.map(op => {
          const checked = resposta.valor.includes(op.texto)
          return (
            <label key={op.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              checked ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                checked ? 'border-primary-500 bg-primary-500' : 'border-slate-300 dark:border-slate-500'
              }`}>
                {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>}
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300">{op.texto || `Opção ${op.id}`}</span>
              <input type="checkbox" checked={checked}
                onChange={() => {
                  const next = checked ? resposta.valor.filter(v => v !== op.texto) : [...resposta.valor, op.texto]
                  onChange({ tipo: 'checkbox', valor: next })
                }}
                className="sr-only" />
            </label>
          )
        })}
      </div>
    )
  }

  if (resposta.tipo === 'escala') {
    const min = pergunta.escala_min ?? 1
    const max = pergunta.escala_max ?? 5
    const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min)
    return (
      <div className="mt-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {nums.map(n => (
            <button key={n} type="button"
              onClick={() => onChange({ tipo: 'escala', valor: n })}
              className={`w-10 h-10 rounded-xl text-sm font-semibold border-2 transition-all ${
                resposta.valor === n
                  ? 'border-primary-500 bg-primary-500 text-white shadow-md shadow-primary-500/30'
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }`}>
              {n}
            </button>
          ))}
        </div>
        {(pergunta.escala_label_min || pergunta.escala_label_max) && (
          <div className="flex justify-between text-xs text-slate-400">
            <span>{pergunta.escala_label_min}</span>
            <span>{pergunta.escala_label_max}</span>
          </div>
        )}
      </div>
    )
  }

  if (resposta.tipo === 'texto') {
    return (
      <div className="mt-4">
        <textarea rows={4} value={resposta.valor}
          onChange={e => onChange({ tipo: 'texto', valor: e.target.value })}
          placeholder="Escreva sua resposta aqui..."
          className={inputCls} />
      </div>
    )
  }

  if (resposta.tipo === 'sim_nao') {
    return (
      <div className="flex gap-3 mt-4">
        {(['Sim', 'Não'] as const).map(op => (
          <button key={op} type="button"
            onClick={() => onChange({ tipo: 'sim_nao', valor: op })}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
              resposta.valor === op
                ? op === 'Sim'
                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'border-red-500 bg-red-500 text-white shadow-md shadow-red-500/30'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
            }`}>
            {op}
          </button>
        ))}
      </div>
    )
  }

  if (resposta.tipo === 'nps') {
    const nums = Array.from({ length: 11 }, (_, i) => i)
    return (
      <div className="mt-4 space-y-3">
        <div className="flex gap-1.5 flex-wrap">
          {nums.map(n => {
            const color = n <= 6 ? 'border-red-300 dark:border-red-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              : n <= 8 ? 'border-amber-300 dark:border-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              : 'border-emerald-300 dark:border-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            const activeColor = n <= 6 ? 'border-red-500 bg-red-500 text-white shadow-md shadow-red-500/20'
              : n <= 8 ? 'border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
            return (
              <button key={n} type="button"
                onClick={() => onChange({ tipo: 'nps', valor: n })}
                className={`w-9 h-9 rounded-xl text-sm font-semibold border-2 transition-all ${
                  resposta.valor === n ? activeColor : `border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 ${color}`
                }`}>
                {n}
              </button>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Pouco provável</span>
          <span>Muito provável</span>
        </div>
      </div>
    )
  }

  return null
}

/* ─── Page ─── */
export default function PesquisaResponder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [pesquisa, setPesquisa]   = useState<Pesquisa | null>(null)
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [jaRespondeu, setJaRespondeu] = useState(false)

  useEffect(() => {
    if (!id) { setError('ID inválido'); setLoading(false); return }
    Promise.all([
      api.pesquisas.get(parseInt(id)),
      api.pesquisaRespostas.jaRespondi(),
    ]).then(([p, jrs]) => {
      if (!p) { setError('Pesquisa não encontrada'); return }
      const pesq = p as Pesquisa
      setPesquisa(pesq)
      setRespostas((pesq.perguntas ?? []).map(initResposta))
      if ((jrs as number[]).includes(pesq.id)) setJaRespondeu(true)
    }).catch(e => {
      setError((e as any).message || 'Erro ao carregar pesquisa')
    }).finally(() => setLoading(false))
  }, [id])

  function handleChange(index: number, r: Resposta) {
    setRespostas(prev => prev.map((item, i) => i === index ? r : item))
  }

  async function handleSubmit() {
    if (!pesquisa) return
    const perguntas = pesquisa.perguntas ?? []

    // Validação
    for (let i = 0; i < perguntas.length; i++) {
      if (perguntas[i].obrigatoria && !isRespondida(respostas[i])) {
        setError(`Por favor, responda a pergunta ${i + 1}: "${perguntas[i].titulo || 'sem título'}"`)
        document.getElementById(`pergunta-${perguntas[i].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }
    setError('')
    setSaving(true)
    try {
      const payload = perguntas.map((p, i) => ({
        pergunta_id: p.id,
        titulo: p.titulo,
        tipo: p.tipo,
        valor: respostas[i] ? (respostas[i] as any).valor : null,
      }))
      await api.pesquisaRespostas.submit(pesquisa.id, payload)
      setConcluido(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) {
      setError(e.message || 'Erro ao enviar resposta. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const perguntas = pesquisa?.perguntas ?? []
  const obrigatorias = perguntas.filter(p => p.obrigatoria).length
  const respondidas  = respostas.filter((r, i) => perguntas[i] && isRespondida(r)).length
  const progress     = perguntas.length > 0 ? Math.round((respondidas / perguntas.length) * 100) : 0

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-primary-400" />
        <p className="text-sm text-slate-400">Carregando pesquisa...</p>
      </div>
    </div>
  )

  if (error && !pesquisa) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center max-w-sm w-full">
        <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Pesquisa não disponível</h2>
        <p className="text-sm text-slate-500 mb-6">{error}</p>
        <button onClick={() => navigate('/intranet/pesquisas')}
          className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">
          Voltar
        </button>
      </div>
    </div>
  )

  if (jaRespondeu) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-amber-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Já respondida</h2>
        <p className="text-sm text-slate-500 mb-6">Você já respondeu esta pesquisa anteriormente. Obrigado pela participação!</p>
        <button onClick={() => navigate('/intranet')}
          className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">
          Ir para o início
        </button>
      </div>
    </div>
  )

  if (concluido) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center max-w-sm w-full shadow-lg">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Obrigado!</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-1">
          Suas respostas foram registradas com sucesso.
        </p>
        {pesquisa?.anonima && (
          <p className="text-xs text-slate-400 mt-2 mb-6">Esta pesquisa é anônima. Sua identidade não será revelada.</p>
        )}
        <div className="mt-6 flex gap-3 justify-center">
          <button onClick={() => navigate('/intranet')}
            className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">
            Início
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <button onClick={() => navigate('/intranet')}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-4">
            <ChevronLeft size={15} /> Início
          </button>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                <ClipboardList size={20} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">{pesquisa?.tipo}</p>
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{pesquisa?.nome}</h1>
              </div>
            </div>
            {pesquisa?.objetivo && (
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
                {pesquisa.objetivo}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400">
                {perguntas.length} pergunta{perguntas.length !== 1 ? 's' : ''}
                {obrigatorias > 0 && ` · ${obrigatorias} obrigatória${obrigatorias !== 1 ? 's' : ''}`}
              </p>
              {pesquisa?.anonima && (
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full">Anônima</span>
              )}
            </div>
          </div>
        </div>

        {/* Progresso */}
        {perguntas.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-500">{respondidas} de {perguntas.length} respondidas</span>
              <span className="font-semibold text-primary-600">{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Erro global */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Perguntas */}
        {perguntas.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <ClipboardList size={32} className="mx-auto mb-3 text-slate-200 dark:text-slate-600" />
            <p className="text-sm text-slate-400">Esta pesquisa não possui perguntas.</p>
          </div>
        ) : (
          perguntas.map((p, i) => (
            <div key={p.id} id={`pergunta-${p.id}`}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                    {p.titulo || <span className="text-slate-400 italic">Pergunta sem título</span>}
                    {p.obrigatoria && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  {respostas[i] && (
                    <CampoResposta pergunta={p} resposta={respostas[i]} onChange={r => handleChange(i, r)} />
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Enviar */}
        {perguntas.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center gap-3">
            {obrigatorias > 0 && (
              <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Perguntas obrigatórias</p>
            )}
            <button onClick={handleSubmit} disabled={saving}
              className="w-full py-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : 'Enviar respostas'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
