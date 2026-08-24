/* ─── Tipos e componentes compartilhados entre a resposta autenticada
       (PesquisaResponder) e a resposta pública/anônima (PesquisaPublica).
       Mantidos num único lugar para evitar os dois desalinharem com o tempo. ─── */

export type TipoPergunta = 'multipla_escolha' | 'checkbox' | 'escala' | 'texto' | 'sim_nao' | 'nps'

export interface OpcaoPergunta { id: number; texto: string }
export interface Pergunta {
  id: number
  titulo: string
  tipo: TipoPergunta
  obrigatoria: boolean
  categoria?: string
  opcoes?: OpcaoPergunta[]
  escala_min?: number
  escala_max?: number
  escala_label_min?: string
  escala_label_max?: string
}

export type Resposta =
  | { tipo: 'multipla_escolha'; valor: string }
  | { tipo: 'checkbox'; valor: string[] }
  | { tipo: 'escala'; valor: number | null }
  | { tipo: 'texto'; valor: string }
  | { tipo: 'sim_nao'; valor: 'Sim' | 'Não' | null }
  | { tipo: 'nps'; valor: number | null }

export function initResposta(p: Pergunta): Resposta {
  switch (p.tipo) {
    case 'multipla_escolha': return { tipo: 'multipla_escolha', valor: '' }
    case 'checkbox':         return { tipo: 'checkbox', valor: [] }
    case 'escala':           return { tipo: 'escala', valor: null }
    case 'texto':            return { tipo: 'texto', valor: '' }
    case 'sim_nao':          return { tipo: 'sim_nao', valor: null }
    case 'nps':              return { tipo: 'nps', valor: null }
  }
}

export function isRespondida(r: Resposta): boolean {
  switch (r.tipo) {
    case 'multipla_escolha': return r.valor !== ''
    case 'checkbox':         return r.valor.length > 0
    case 'escala':           return r.valor !== null
    case 'texto':            return r.valor.trim() !== ''
    case 'sim_nao':          return r.valor !== null
    case 'nps':              return r.valor !== null
  }
}

/** Agrupa perguntas consecutivas pela mesma categoria (comparação sem distinguir
 *  caixa/espaços, para "Finanças" e "finanças " caírem no mesmo grupo), preservando
 *  os índices originais para indexar em respostas[]. */
export function agruparPorCategoria(perguntas: Pergunta[]): { categoria: string; items: { pergunta: Pergunta; index: number }[] }[] {
  const grupos: { categoria: string; chave: string; items: { pergunta: Pergunta; index: number }[] }[] = []
  perguntas.forEach((p, i) => {
    const categoria = p.categoria?.trim() || ''
    const chave = categoria.toLowerCase()
    const last = grupos[grupos.length - 1]
    if (last && last.chave === chave) {
      last.items.push({ pergunta: p, index: i })
    } else {
      grupos.push({ categoria, chave, items: [{ pergunta: p, index: i }] })
    }
  })
  return grupos.map(({ categoria, items }) => ({ categoria, items }))
}

/* ─── Campo de resposta por tipo ─── */
export function CampoResposta({ pergunta, resposta, onChange }: {
  pergunta: Pergunta; resposta: Resposta; onChange: (r: Resposta) => void
}) {
  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition resize-none'

  if (resposta.tipo === 'multipla_escolha') {
    return (
      <div className="space-y-2.5 mt-4">
        {(pergunta.opcoes ?? []).map(op => {
          const checked = resposta.valor === op.texto
          return (
            <label key={op.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'border-primary-500 bg-primary-500' : 'border-slate-300 dark:border-slate-500'}`}>
                {checked && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300">{op.texto}</span>
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
            <label key={op.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'border-primary-500 bg-primary-500' : 'border-slate-300 dark:border-slate-500'}`}>
                {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300">{op.texto}</span>
              <input type="checkbox" className="sr-only" checked={checked} onChange={() => {
                const next = checked ? resposta.valor.filter(v => v !== op.texto) : [...resposta.valor, op.texto]
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
    const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min)
    return (
      <div className="mt-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {nums.map(n => (
            <button key={n} type="button" onClick={() => onChange({ tipo: 'escala', valor: n })}
              className={`w-10 h-10 rounded-xl text-sm font-semibold border-2 transition-all ${resposta.valor === n ? 'border-primary-500 bg-primary-500 text-white shadow-md shadow-primary-500/30' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}>
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
        <textarea rows={4} value={resposta.valor} onChange={e => onChange({ tipo: 'texto', valor: e.target.value })}
          placeholder="Escreva sua resposta aqui..." className={inputCls} />
      </div>
    )
  }

  if (resposta.tipo === 'sim_nao') {
    return (
      <div className="flex gap-3 mt-4">
        {(['Sim', 'Não'] as const).map(op => (
          <button key={op} type="button" onClick={() => onChange({ tipo: 'sim_nao', valor: op })}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
              resposta.valor === op
                ? op === 'Sim' ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'border-red-500 bg-red-500 text-white shadow-md shadow-red-500/30'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
            }`}>
            {op}
          </button>
        ))}
      </div>
    )
  }

  // nps
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
            <button key={n} type="button" onClick={() => onChange({ tipo: 'nps', valor: n })}
              className={`w-9 h-9 rounded-xl text-sm font-semibold border-2 transition-all ${resposta.valor === n ? activeColor : `border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 ${color}`}`}>
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
