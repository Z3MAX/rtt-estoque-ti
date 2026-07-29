import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ClipboardList, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api'

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

function gerarTokenAnonimo(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function CampoResposta({ pergunta, resposta, onChange }: {
  pergunta: Pergunta; resposta: Resposta; onChange: (r: Resposta) => void
}) {
  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition resize-none'

  if (resposta.tipo === 'multipla_escolha') {
    return (
      <div className="space-y-2.5 mt-4">
        {(pergunta.opcoes ?? []).map(op => {
          const checked = resposta.valor === op.texto
          return (
            <label key={op.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? 'border-primary-500 bg-primary-500' : 'border-slate-300 dark:border-slate-500'}`}>
                {checked && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-200">{op.texto}</span>
              <input type="radio" className="sr-only" checked={checked} onChange={() => onChange({ tipo: 'multipla_escolha', valor: op.texto })} />
            </label>
          )
        })}
      </div>
    )
  }

  if (resposta.tipo === 'checkbox') {
    return (
      <div className="space-y-2.5 mt-4">
        {(pergunta.opcoes ?? []).map(op => {
          const checked = resposta.valor.includes(op.texto)
          return (
            <label key={op.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${checked ? 'border-primary-500 bg-primary-500' : 'border-slate-300 dark:border-slate-500'}`}>
                {checked && <svg viewBox="0 0 10 8" className="w-3 h-3 fill-white"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-200">{op.texto}</span>
              <input type="checkbox" className="sr-only" checked={checked} onChange={e => {
                const next = e.target.checked ? [...resposta.valor, op.texto] : resposta.valor.filter(v => v !== op.texto)
                onChange({ tipo: 'checkbox', valor: next })
              }} />
            </label>
          )
        })}
      </div>
    )
  }

  if (resposta.tipo === 'escala') {
    const min = pergunta.escala_min ?? 1
    const max = pergunta.escala_max ?? 5
    const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)
    return (
      <div className="mt-4">
        <div className="flex gap-2 flex-wrap">
          {steps.map(v => (
            <button key={v} type="button"
              onClick={() => onChange({ tipo: 'escala', valor: v })}
              className={`w-10 h-10 rounded-xl text-sm font-semibold border-2 transition-all ${resposta.valor === v ? 'border-primary-500 bg-primary-500 text-white' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400'}`}>
              {v}
            </button>
          ))}
        </div>
        {(pergunta.escala_label_min || pergunta.escala_label_max) && (
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>{pergunta.escala_label_min}</span>
            <span>{pergunta.escala_label_max}</span>
          </div>
        )}
      </div>
    )
  }

  if (resposta.tipo === 'nps') {
    return (
      <div className="mt-4">
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 11 }, (_, i) => i).map(v => {
            const cor = v <= 6 ? 'hover:border-red-400 hover:bg-red-50' : v <= 8 ? 'hover:border-amber-400 hover:bg-amber-50' : 'hover:border-emerald-400 hover:bg-emerald-50'
            const sel = resposta.valor === v ? (v <= 6 ? 'border-red-500 bg-red-500 text-white' : v <= 8 ? 'border-amber-500 bg-amber-500 text-white' : 'border-emerald-500 bg-emerald-500 text-white') : `border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 ${cor}`
            return (
              <button key={v} type="button" onClick={() => onChange({ tipo: 'nps', valor: v })}
                className={`w-9 h-9 rounded-lg text-sm font-semibold border-2 transition-all ${sel}`}>
                {v}
              </button>
            )
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>0 — Nada provável</span><span>10 — Extremamente provável</span>
        </div>
      </div>
    )
  }

  if (resposta.tipo === 'sim_nao') {
    return (
      <div className="flex gap-3 mt-4">
        {(['Sim', 'Não'] as const).map(op => (
          <button key={op} type="button" onClick={() => onChange({ tipo: 'sim_nao', valor: op })}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${resposta.valor === op ? 'border-primary-500 bg-primary-500 text-white' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400'}`}>
            {op}
          </button>
        ))}
      </div>
    )
  }

  // texto
  return (
    <textarea className={`${inputCls} mt-4`} rows={3} placeholder="Digite sua resposta..."
      value={resposta.tipo === 'texto' ? resposta.valor : ''}
      onChange={e => onChange({ tipo: 'texto', valor: e.target.value })} />
  )
}

export default function PesquisaPublica() {
  const { token } = useParams<{ token: string }>()
  const [pesquisa, setPesquisa] = useState<{ id: number; nome: string; objetivo?: string; perguntas: Pergunta[] } | null>(null)
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'done' | 'already' | 'closed' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [erros, setErros] = useState<number[]>([])

  useEffect(() => {
    if (!token) { setStatus('error'); return }

    // Layer 1: check localStorage for prior submission
    if (localStorage.getItem(`pesq_pub_${token}`)) {
      setStatus('already')
      return
    }

    api.pesquisaPublica.get(token)
      .then((data: any) => {
        setPesquisa(data)
        setRespostas((data.perguntas ?? []).map(initResposta))
        setStatus('ready')
      })
      .catch((err: any) => {
        if (err?.status === 403 || err?.message?.includes('disponível')) setStatus('closed')
        else if (err?.status === 404) setStatus('error')
        else { setErrorMsg(err?.message || 'Erro ao carregar pesquisa'); setStatus('error') }
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pesquisa || !token) return

    const perguntas = pesquisa.perguntas ?? []
    const invalidas = perguntas
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => p.obrigatoria && !isRespondida(respostas[i]))
      .map(({ i }) => i)

    if (invalidas.length > 0) {
      setErros(invalidas)
      document.getElementById(`pergunta-${invalidas[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setErros([])

    // Get or create anonymous token for this device+survey
    const storageKey = `pesq_tok_${token}`
    let tokenAnonimo = localStorage.getItem(storageKey)
    if (!tokenAnonimo) {
      tokenAnonimo = gerarTokenAnonimo()
      localStorage.setItem(storageKey, tokenAnonimo)
    }

    const payload = perguntas.map((p, i) => ({ pergunta_id: p.id, titulo: p.titulo, valor: respostas[i] ? (respostas[i] as any).valor : null }))

    setSubmitting(true)
    try {
      await api.pesquisaPublica.submit({ token, token_anonimo: tokenAnonimo, respostas: payload })
      localStorage.setItem(`pesq_pub_${token}`, new Date().toISOString())
      setStatus('done')
    } catch (err: any) {
      const code = err?.body?.code || err?.code
      if (code === 'duplicate_token' || code === 'duplicate_ip') {
        localStorage.setItem(`pesq_pub_${token}`, new Date().toISOString())
        setStatus('already')
      } else {
        alert(err?.message || 'Erro ao enviar resposta. Tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center mb-8 gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <ClipboardList size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-slate-700">RTT Sistema</span>
        </div>
        {children}
      </div>
    </div>
  )

  if (status === 'loading') return (
    <Shell>
      <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-primary-400" /></div>
    </Shell>
  )

  if (status === 'done') return (
    <Shell>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Obrigado pela participação!</h2>
        <p className="text-sm text-slate-500">Sua resposta foi registrada de forma anônima.</p>
      </div>
    </Shell>
  )

  if (status === 'already') return (
    <Shell>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Você já respondeu esta pesquisa</h2>
        <p className="text-sm text-slate-500">Sua participação já foi registrada. Obrigado!</p>
      </div>
    </Shell>
  )

  if (status === 'closed') return (
    <Shell>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Pesquisa indisponível</h2>
        <p className="text-sm text-slate-500">Esta pesquisa não está disponível no momento.</p>
      </div>
    </Shell>
  )

  if (status === 'error' || !pesquisa) return (
    <Shell>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Pesquisa não encontrada</h2>
        <p className="text-sm text-slate-500">{errorMsg || 'O link pode estar incorreto ou a pesquisa foi encerrada.'}</p>
      </div>
    </Shell>
  )

  const perguntas = pesquisa.perguntas ?? []

  return (
    <Shell>
      {/* Anonymous banner */}
      <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-6">
        <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-700 font-medium">
          Esta pesquisa é <strong>100% anônima</strong>. Suas respostas não serão vinculadas à sua identidade.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="bg-primary-600 px-6 py-5">
          <h1 className="text-lg font-bold text-white">{pesquisa.nome}</h1>
          {pesquisa.objetivo && <p className="text-sm text-primary-100 mt-1">{pesquisa.objetivo}</p>}
        </div>
        <div className="px-6 py-4 text-xs text-slate-400 border-b border-slate-100">
          {perguntas.length} pergunta{perguntas.length !== 1 ? 's' : ''} · Todas as marcadas com <span className="text-red-500">*</span> são obrigatórias
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {perguntas.map((p, idx) => {
          const hasError = erros.includes(idx)
          return (
            <div id={`pergunta-${idx}`} key={p.id}
              className={`bg-white rounded-2xl shadow-sm border ${hasError ? 'border-red-300' : 'border-slate-200'} p-6 transition-all`}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="text-xs text-slate-400">Pergunta {idx + 1}</p>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {p.titulo || '(sem título)'}
                {p.obrigatoria && <span className="text-red-500 ml-1">*</span>}
              </p>
              {hasError && <p className="text-xs text-red-500 mt-1">Esta pergunta é obrigatória</p>}
              <CampoResposta
                pergunta={p}
                resposta={respostas[idx]}
                onChange={r => setRespostas(prev => prev.map((v, i) => i === idx ? r : v))}
              />
            </div>
          )
        })}

        <button type="submit" disabled={submitting}
          className="w-full py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors shadow-sm">
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : 'Enviar respostas'}
        </button>

        <p className="text-center text-xs text-slate-400 pb-4">
          Ao enviar, você confirma que leu e concorda com a política de privacidade.
        </p>
      </form>
    </Shell>
  )
}
