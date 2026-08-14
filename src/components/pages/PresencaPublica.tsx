import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Clock, XCircle, Search, User, X } from 'lucide-react'

const BASE = '/.netlify/functions'

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options })
  const data = await res.json()
  if (!res.ok) throw Object.assign(new Error(data.error || 'Erro'), { status: res.status })
  return data
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Red header with Rema logo */}
      <div className="w-full bg-red-700 py-4 px-4 flex items-center justify-center shadow-md">
        <div className="bg-white rounded-xl px-5 py-2 shadow-sm">
          <img src="/rema-logo.png" alt="Rema" className="h-8 object-contain" />
        </div>
      </div>
      {/* Sub-header label */}
      <div className="w-full bg-black py-2 px-4 flex items-center justify-center">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-white/80">Lista de Presença · Treinamento</p>
      </div>
      <div className="w-full max-w-md px-4 py-6">
        {children}
      </div>
    </div>
  )
}

type PageState = 'loading' | 'ready' | 'submitting' | 'success' | 'already' | 'closed' | 'not_open' | 'not_found' | 'error'

export default function PresencaPublica() {
  const { token } = useParams<{ token: string }>()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [evento, setEvento] = useState<any>(null)
  const [tituloFallback, setTituloFallback] = useState('')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [codigo, setCodigo] = useState('')
  const [searching, setSearching] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const lsKey = `presenca_${token}`

  useEffect(() => {
    if (localStorage.getItem(lsKey)) { setPageState('already'); return }
    fetchJson(`${BASE}/presenca-publica?token=${encodeURIComponent(token ?? '')}`)
      .then(ev => { setEvento(ev); setPageState('ready') })
      .catch(err => {
        const msg: string = err.message ?? ''
        if ((err as any).status === 410 || msg.includes('encerrada')) setPageState('closed')
        else if ((err as any).status === 409 || msg.includes('não foi aberta')) setPageState('not_open')
        else if ((err as any).status === 404 || msg.includes('não encontrado')) setPageState('not_found')
        else setPageState('error')
        if (msg.includes('titulo')) {
          try { setTituloFallback(JSON.parse(msg).titulo ?? '') } catch (_) {}
        }
      })
  }, [token])

  // Debounced search
  useEffect(() => {
    if (selected) return
    if (search.trim().length < 2) { setResults([]); return }
    const t = setTimeout(() => {
      setSearching(true)
      const tokenParam = evento?.tem_lista ? `&token=${encodeURIComponent(token ?? '')}` : ''
      fetchJson(`${BASE}/presenca-publica?action=buscar&q=${encodeURIComponent(search.trim())}${tokenParam}`)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 400)
    return () => clearTimeout(t)
  }, [search, selected, evento, token])

  async function handleSubmit() {
    if (!selected) return
    if (localStorage.getItem(lsKey)) { setPageState('already'); return }
    setSubmitError('')
    setPageState('submitting')
    try {
      await fetchJson(`${BASE}/presenca-publica`, {
        method: 'POST',
        body: JSON.stringify({
          token,
          colaborador_id: selected.from_lista ? undefined : selected.id,
          nome: selected.nome,
          cargo: selected.cargo ?? null,
          area: selected.area ?? null,
          codigo: codigo || undefined,
        }),
      })
      localStorage.setItem(lsKey, '1')
      setPageState('success')
    } catch (err: any) {
      if (err.message?.includes('já registrou')) {
        localStorage.setItem(lsKey, '1')
        setPageState('already')
      } else if (err.message?.includes('Código')) {
        setSubmitError(err.message)
        setPageState('ready')
      } else {
        setSubmitError(err.message || 'Erro ao registrar presença')
        setPageState('ready')
      }
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <Shell>
        <div className="flex items-center justify-center h-48 text-gray-400 gap-2 text-sm">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin" />
          Carregando...
        </div>
      </Shell>
    )
  }

  if (pageState === 'success') {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Presença confirmada!</h2>
          <p className="text-sm text-gray-500 mb-2">
            Olá, <span className="font-semibold text-gray-800">{selected?.nome}</span>. Sua presença foi registrada com sucesso.
          </p>
          <p className="text-xs text-gray-400 mt-4">{evento?.titulo}</p>
        </div>
      </Shell>
    )
  }

  if (pageState === 'already') {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Presença já registrada</h2>
          <p className="text-sm text-gray-500">Você já confirmou sua presença neste treinamento.</p>
          {(evento?.titulo || tituloFallback) && (
            <p className="text-xs text-gray-400 mt-4">{evento?.titulo || tituloFallback}</p>
          )}
        </div>
      </Shell>
    )
  }

  if (pageState === 'closed') {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} className="text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Lista encerrada</h2>
          <p className="text-sm text-gray-500">A lista de presença deste treinamento foi encerrada.</p>
          {tituloFallback && <p className="text-xs text-gray-400 mt-4">{tituloFallback}</p>}
        </div>
      </Shell>
    )
  }

  if (pageState === 'not_open') {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Aguardando abertura</h2>
          <p className="text-sm text-gray-500">O instrutor ainda não abriu a lista de presença. Tente novamente em instantes.</p>
          {tituloFallback && <p className="text-xs text-gray-400 mt-4">{tituloFallback}</p>}
        </div>
      </Shell>
    )
  }

  if (pageState === 'not_found') {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Evento não encontrado</h2>
          <p className="text-sm text-gray-500">Este link de presença é inválido ou o evento foi removido.</p>
        </div>
      </Shell>
    )
  }

  if (pageState === 'error') {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Erro ao carregar</h2>
          <p className="text-sm text-gray-500">Não foi possível carregar o treinamento. Verifique sua conexão e tente novamente.</p>
          <button
            onClick={() => { setPageState('loading'); window.location.reload() }}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </Shell>
    )
  }

  // ── Ready — show form ──────────────────────────────────────────────────────
  const isSubmitting = pageState === 'submitting'

  return (
    <Shell>
      {/* Event header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
        <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">Treinamento presencial</p>
        <h1 className="text-base font-bold text-gray-900 leading-snug">{evento?.titulo}</h1>
        {(evento?.instrutor || evento?.local || evento?.data_evento) && (
          <div className="mt-2 space-y-0.5">
            {evento?.instrutor && (
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">Instrutor:</span> {evento.instrutor}
              </p>
            )}
            {evento?.local && (
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">Local:</span> {evento.local}
              </p>
            )}
            {evento?.data_evento && (
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">Data:</span>{' '}
                {new Date(evento.data_evento).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-bold text-gray-900 mb-3">Confirme sua presença</p>

          {!selected ? (
            <>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                {evento?.tem_lista ? 'Busque seu nome na lista de participantes' : 'Busque seu nome'}
              </label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Digite seu nome..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  autoFocus
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin" />
                )}
              </div>

              {search.trim().length >= 2 && results.length === 0 && !searching && (
                <p className="text-xs text-gray-400 mt-2 text-center py-3">Nenhum colaborador encontrado</p>
              )}

              {results.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {results.map(r => (
                    <li key={r.id}>
                      <button
                        onClick={() => { setSelected(r); setSearch(''); setResults([]) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                          <User size={14} className="text-red-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{r.nome}</p>
                          <p className="text-xs text-gray-400 truncate">{[r.cargo, r.area].filter(Boolean).join(' · ')}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 bg-red-50 rounded-xl px-3 py-3">
              <div className="w-9 h-9 rounded-full bg-red-200 flex items-center justify-center shrink-0">
                <User size={16} className="text-red-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-900 truncate">{selected.nome}</p>
                <p className="text-xs text-red-500 truncate">{[selected.cargo, selected.area].filter(Boolean).join(' · ')}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors shrink-0"
                title="Trocar"
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Instructor code field */}
        {evento?.tem_codigo && selected && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Código do instrutor</label>
            <input
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              placeholder="Digite o código exibido pelo instrutor"
              maxLength={10}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent tracking-widest text-center font-mono"
            />
          </div>
        )}

        {submitError && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs px-3 py-2.5 rounded-xl">
            <AlertCircle size={14} className="shrink-0" />
            {submitError}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selected || isSubmitting || (evento?.tem_codigo && !codigo)}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-100 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Registrando...</>
          ) : (
            <><CheckCircle2 size={16} /> Confirmar presença</>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Ao confirmar, sua presença será registrada no sistema.
        </p>
      </div>
    </Shell>
  )
}
