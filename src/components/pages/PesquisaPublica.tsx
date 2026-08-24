import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ClipboardList, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api'
import {
  type Pergunta, type Resposta, initResposta, isRespondida, agruparPorCategoria, CampoResposta,
} from '../../lib/pesquisaCampos'

interface Pesquisa {
  id: number
  nome: string
  objetivo?: string
  tipo: string
  perguntas: Pergunta[]
  pede_local_trabalho?: boolean
  locais_trabalho?: string[]
}

export default function PesquisaPublica() {
  const { token } = useParams<{ token: string }>()
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null)
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [localTrabalho, setLocalTrabalho] = useState('')
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

    if (pesquisa.pede_local_trabalho && !localTrabalho) {
      setErrorMsg('Por favor, selecione seu local de trabalho antes de continuar.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

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
    setErrorMsg('')

    const payload = perguntas.map((p, i) => ({ pergunta_id: p.id, titulo: p.titulo, valor: respostas[i] ? (respostas[i] as any).valor : null }))

    setSubmitting(true)
    try {
      await api.pesquisaPublica.submit({ token, respostas: payload, local_de_trabalho: localTrabalho || undefined })
      localStorage.setItem(`pesq_pub_${token}`, new Date().toISOString())
      setStatus('done')
    } catch (err: any) {
      const code = err?.body?.code || err?.code
      if (code === 'duplicate_token' || code === 'duplicate_ip') {
        localStorage.setItem(`pesq_pub_${token}`, new Date().toISOString())
        setStatus('already')
      } else {
        setErrorMsg(err?.message || 'Erro ao enviar resposta. Tente novamente.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-primary-400" />
        <p className="text-sm text-slate-400">Carregando pesquisa...</p>
      </div>
    </div>
  )

  if (status === 'done') return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center max-w-sm w-full shadow-lg">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Obrigado!</h2>
        <p className="text-sm text-slate-500 leading-relaxed">Sua resposta foi registrada com sucesso.</p>
        <p className="text-xs text-slate-400 mt-2">Esta pesquisa é anônima. Sua identidade não será revelada.</p>
      </div>
    </div>
  )

  if (status === 'already') return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-amber-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Já respondida</h2>
        <p className="text-sm text-slate-500">Você já respondeu esta pesquisa anteriormente. Obrigado pela participação!</p>
      </div>
    </div>
  )

  if (status === 'closed') return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Pesquisa indisponível</h2>
        <p className="text-sm text-slate-500">Esta pesquisa não está disponível no momento.</p>
      </div>
    </div>
  )

  if (status === 'error' || !pesquisa) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center max-w-sm w-full">
        <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Pesquisa não encontrada</h2>
        <p className="text-sm text-slate-500">{errorMsg || 'O link pode estar incorreto ou a pesquisa foi encerrada.'}</p>
      </div>
    </div>
  )

  const perguntas = pesquisa.perguntas ?? []
  const obrigatorias = perguntas.filter(p => p.obrigatoria).length
  const respondidas  = respostas.filter((r, i) => perguntas[i] && isRespondida(r)).length
  const progress     = perguntas.length > 0 ? Math.round((respondidas / perguntas.length) * 100) : 0

  // Agrupa perguntas por categoria mantendo os índices originais para respostas[]
  const grupos = agruparPorCategoria(perguntas)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
              <ClipboardList size={20} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">{pesquisa.tipo}</p>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{pesquisa.nome}</h1>
            </div>
          </div>
          {pesquisa.objetivo && (
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
              {pesquisa.objetivo}
            </p>
          )}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400">
              {perguntas.length} pergunta{perguntas.length !== 1 ? 's' : ''}
              {obrigatorias > 0 && ` · ${obrigatorias} obrigatória${obrigatorias !== 1 ? 's' : ''}`}
            </p>
            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full">Anônima</span>
          </div>
        </div>

        {/* Aviso de anonimato */}
        <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
          <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            Esta pesquisa é <strong>100% anônima</strong>. Suas respostas não serão vinculadas à sua identidade.
          </p>
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
        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {errorMsg}
          </div>
        )}

        {/* Local de trabalho */}
        {pesquisa.pede_local_trabalho && (pesquisa.locais_trabalho?.length ?? 0) > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Local de trabalho <span className="text-red-500">*</span>
            </p>
            <div className="relative">
              <select value={localTrabalho} onChange={e => setLocalTrabalho(e.target.value)}
                className="w-full appearance-none border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition">
                <option value="">Selecione seu local de trabalho</option>
                {pesquisa.locais_trabalho!.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 16 16">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )}

        {/* Perguntas agrupadas por categoria */}
        {perguntas.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <ClipboardList size={32} className="mx-auto mb-3 text-slate-200 dark:text-slate-600" />
            <p className="text-sm text-slate-400">Esta pesquisa não possui perguntas.</p>
          </div>
        ) : (
          grupos.map((grupo, gi) => (
            <div key={gi} className="space-y-3">
              {grupo.categoria && (
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">
                    {grupo.categoria}
                  </span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
              )}
              {grupo.items.map(({ pergunta: p, index: i }) => {
                const hasError = erros.includes(i)
                return (
                  <div key={p.id} id={`pergunta-${i}`}
                    className={`bg-white dark:bg-slate-800 rounded-2xl border ${hasError ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-700'} p-6 transition-all`}>
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                          {p.titulo || <span className="text-slate-400 italic">Pergunta sem título</span>}
                          {p.obrigatoria && <span className="text-red-500 ml-1">*</span>}
                        </p>
                        {hasError && <p className="text-xs text-red-500 mt-1">Esta pergunta é obrigatória</p>}
                        <CampoResposta pergunta={p} resposta={respostas[i]} onChange={r => setRespostas(prev => prev.map((v, idx) => idx === i ? r : v))} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}

        {/* Enviar */}
        {perguntas.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center gap-3">
            {obrigatorias > 0 && (
              <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Perguntas obrigatórias</p>
            )}
            <button type="submit" disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30">
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : 'Enviar respostas'}
            </button>
            <p className="text-center text-xs text-slate-400">
              Ao enviar, você confirma que leu e concorda com a política de privacidade.
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
