import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2, X, Trash2, AlertCircle, RefreshCw, ClipboardList, ChevronRight, ShieldCheck, Info } from 'lucide-react'
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

// ─── Sucessão ────────────────────────────────────────────────────────────────

const PROB_CRITERIA = [
  'Baixa – Demonstra satisfação, engajamento e perspectiva de futuro na empresa. Sem sinais de insatisfação ou busca por vagas externas.',
  'Média – Já demonstrou sinal pontual de insatisfação (reclamações isoladas, comentários sobre salário/carreira), sem indícios concretos de movimentação no mercado.',
  'Alta – Sinais consistentes de insatisfação (queda de engajamento, comentários recorrentes sobre saída, participação em processos seletivos externos).',
  'Altíssima – Já comunicou intenção de saída (formal ou informalmente), está em processo seletivo avançado ou recebeu proposta concreta de outra empresa.',
]
const IMPACTO_CRITERIA = [
  'Baixo – A saída não compromete entregas, prazos ou relacionamentos-chave. Atividades são redistribuíveis com facilidade.',
  'Médio – Gera desorganização temporária ou sobrecarga no time, mas sem comprometer entregas críticas ou relacionamentos estratégicos.',
  'Alto – Detém conhecimento técnico/processual relevante ou relacionamento estratégico com clientes/fornecedores; a saída impacta resultado ou prazo.',
  'Altíssimo – Detentor de conhecimento crítico não documentado, referência única na função, ou figura-chave em relações estratégicas. Saída gera risco real ao negócio.',
]
const DIFICU_CRITERIA = [
  'Baixa – Perfil amplamente disponível no mercado. Reposição estimada em até 30 dias, baixo custo de atração.',
  'Média – Perfil disponível no mercado, mas com reposição entre 30 e 60 dias ou processo seletivo mais elaborado.',
  'Alta – Perfil escasso (técnico, especializado ou de liderança). Reposição estimada entre 60 e 90 dias.',
  'Altíssima – Perfil raro/estratégico, poucos profissionais qualificados disponíveis. Reposição superior a 90 dias e/ou alto custo de atração.',
]

const PRONTIDAO_OPTS = [
  { key: 'interino',  label: 'Interino',      desc: 'Assume imediatamente em caráter emergencial' },
  { key: '0_1',       label: '0 – 1 ano',     desc: 'Pronto no curto prazo' },
  { key: '1_3',       label: '1 – 3 anos',    desc: 'Pronto no médio prazo' },
  { key: '3_5',       label: '3 – 5 anos',    desc: 'Pronto no longo prazo' },
  { key: '5mais',     label: 'Acima de 5 anos', desc: 'Desenvolvimento contínuo necessário' },
]

const STATUS_OPTS = ['Pendente', 'Em andamento', 'Concluído']

interface AcaoDesenvolvimento {
  id:            number
  competencia:   string
  acao:          string
  prazo:         string
  responsavel:   string
  status:        string
}

interface SucessaoState {
  candidato:     boolean
  probabilidade: number
  impacto:       number
  dificuldade:   number
  prontidao:     string
  acoes:         AcaoDesenvolvimento[]
}

function RatingButton({ value, selected, label, tooltip, onClick }: {
  value: number; selected: boolean; label: string; tooltip: string; onClick: () => void
}) {
  const [tipStyle, setTipStyle] = useState<React.CSSProperties | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  function showTooltip() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const tipW = 256
    let left = rect.left + rect.width / 2 - tipW / 2
    if (left < 8) left = 8
    if (left + tipW > window.innerWidth - 8) left = window.innerWidth - tipW - 8
    setTipStyle({ position: 'fixed', top: rect.top - 8, left, transform: 'translateY(-100%)', width: tipW })
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTipStyle(null)}
        className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all ${
          selected
            ? 'bg-primary-500 border-primary-500 text-white shadow-md shadow-primary-500/30'
            : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-primary-300 hover:text-primary-600'
        }`}
      >
        {value}
      </button>
      {tipStyle && (
        <div style={tipStyle} className="bg-slate-900 text-white text-xs rounded-xl p-3 z-[9999] shadow-xl leading-relaxed pointer-events-none">
          <span className="font-semibold text-primary-300">{label}</span><br />
          {tooltip}
        </div>
      )}
    </div>
  )
}

function RiskBadge({ score }: { score: number }) {
  if (score === 0) return null
  if (score > 16) return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Alto Risco</span>
  if (score >= 12) return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Médio Risco</span>
  return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Baixo Risco</span>
}

const EMPTY_SUCESSAO: SucessaoState = {
  candidato: false, probabilidade: 0, impacto: 0, dificuldade: 0, prontidao: '', acoes: [],
}

function SucessaoPanel({ colabId, colabNome, onSave }: { colabId: number; colabNome: string; onSave: (msg: string) => void }) {
  const [state, setState] = useState<SucessaoState>(EMPTY_SUCESSAO)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hasSavedPlan, setHasSavedPlan] = useState(false)

  useEffect(() => {
    api.sucessao.get(colabId)
      .then((data: any) => {
        if (data) {
          setHasSavedPlan(true)
          setState({
            candidato: data.candidato ?? false,
            probabilidade: data.probabilidade ?? 0,
            impacto: data.impacto ?? 0,
            dificuldade: data.dificuldade ?? 0,
            prontidao: data.prontidao ?? '',
            acoes: data.acoes ?? [],
          })
        }
      })
      .catch(() => {})
  }, [colabId])

  function set<K extends keyof SucessaoState>(k: K, v: SucessaoState[K]) {
    setState(s => ({ ...s, [k]: v }))
  }

  function addAcao() {
    setState(s => ({
      ...s,
      acoes: [...s.acoes, { id: Date.now(), competencia: '', acao: '', prazo: '', responsavel: '', status: 'Pendente' }],
    }))
  }

  function removeAcao(id: number) {
    setState(s => ({ ...s, acoes: s.acoes.filter(a => a.id !== id) }))
  }

  function setAcao(id: number, field: keyof AcaoDesenvolvimento, val: string) {
    setState(s => ({ ...s, acoes: s.acoes.map(a => a.id === id ? { ...a, [field]: val } : a) }))
  }

  async function handleSave(overrideState?: SucessaoState) {
    setSaving(true)
    try {
      await api.sucessao.save(colabId, overrideState ?? state)
      setHasSavedPlan(true)
      onSave('Plano de sucessão salvo com sucesso')
    } catch {
      onSave('Erro ao salvar plano de sucessão')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleCandidato() {
    const newVal = !state.candidato
    const newState = { ...state, candidato: newVal }
    setState(newState)
    // Auto-save imediato ao alterar o toggle
    await handleSave(newState)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.sucessao.delete(colabId)
      setState(EMPTY_SUCESSAO)
      setHasSavedPlan(false)
      setConfirmDelete(false)
      onSave('Plano de sucessão removido')
    } catch {
      onSave('Erro ao remover plano de sucessão')
    } finally {
      setDeleting(false)
    }
  }

  const resultado = state.probabilidade * state.impacto * state.dificuldade

  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition'

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <ShieldCheck size={15} className="text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Plano de Sucessão & Risco</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Botão deletar */}
          {hasSavedPlan && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
            >
              <Trash2 size={12} /> Deletar plano
            </button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Confirmar exclusão?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-60"
              >
                {deleting ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                {deleting ? 'Removendo...' : 'Sim, deletar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
          {/* Toggle candidato */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <span className="text-xs text-slate-500 dark:text-slate-400">Candidato a sucessor</span>
            <button
              type="button"
              onClick={handleToggleCandidato}
              disabled={saving}
              className={`w-11 h-6 rounded-full flex items-center transition-colors shrink-0 disabled:opacity-60 ${state.candidato ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-600'}`}
            >
              <span className={`w-5 h-5 rounded-full bg-white shadow transition-all mx-0.5 ${state.candidato ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>
        </div>
      </div>

      {!state.candidato ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <ShieldCheck size={28} className="opacity-25" />
          <p className="text-sm">Ative o toggle para indicar {colabNome.split(' ')[0]} como candidato a sucessor</p>
        </div>
      ) : (
        <div className="p-6 space-y-8">

          {/* ── Risk Assessment ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Risk Assessment — Retenção de Talentos</h3>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Avalie de 1 a 4 cada dimensão. Passe o mouse sobre os números para ver os critérios. O resultado é calculado automaticamente.
            </p>

            <div className="grid sm:grid-cols-3 gap-5">
              {/* Probabilidade */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Probabilidade de Saída <span className="text-red-400">*</span></p>
                <div className="flex gap-2">
                  {[1,2,3,4].map(v => (
                    <RatingButton key={v} value={v} selected={state.probabilidade === v}
                      label={['Baixa','Média','Alta','Altíssima'][v-1]}
                      tooltip={PROB_CRITERIA[v-1]}
                      onClick={() => set('probabilidade', state.probabilidade === v ? 0 : v)} />
                  ))}
                </div>
              </div>

              {/* Impacto */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Impacto da Saída <span className="text-red-400">*</span></p>
                <div className="flex gap-2">
                  {[1,2,3,4].map(v => (
                    <RatingButton key={v} value={v} selected={state.impacto === v}
                      label={['Baixo','Médio','Alto','Altíssimo'][v-1]}
                      tooltip={IMPACTO_CRITERIA[v-1]}
                      onClick={() => set('impacto', state.impacto === v ? 0 : v)} />
                  ))}
                </div>
              </div>

              {/* Dificuldade */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Dificuldade de Recolocação <span className="text-red-400">*</span></p>
                <div className="flex gap-2">
                  {[1,2,3,4].map(v => (
                    <RatingButton key={v} value={v} selected={state.dificuldade === v}
                      label={['Baixa','Média','Alta','Altíssima'][v-1]}
                      tooltip={DIFICU_CRITERIA[v-1]}
                      onClick={() => set('dificuldade', state.dificuldade === v ? 0 : v)} />
                  ))}
                </div>
              </div>
            </div>

            {/* Resultado */}
            {resultado > 0 && (
              <div className="flex items-center gap-4 mt-2 p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{resultado}</p>
                  <p className="text-xs text-slate-400">Resultado</p>
                </div>
                <div className="w-px h-10 bg-slate-200 dark:bg-slate-600" />
                <RiskBadge score={resultado} />
                <p className="text-xs text-slate-400 ml-2">
                  {state.probabilidade} × {state.impacto} × {state.dificuldade} = {resultado}
                  {resultado > 16 && ' — Ação imediata necessária'}
                  {resultado >= 12 && resultado <= 16 && ' — Monitorar de perto'}
                  {resultado < 12 && resultado > 0 && ' — Risco administrável'}
                </p>
              </div>
            )}

            {/* Legenda compacta */}
            <div className="flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> &gt;16 Alto</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> 12–16 Médio</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> &lt;12 Baixo</span>
            </div>
          </div>

          {/* ── Plano de Sucessão ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Plano de Sucessão</h3>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
            </div>

            {/* Prontidão */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Prontidão para Sucessão</p>
              <div className="flex flex-wrap gap-2">
                {PRONTIDAO_OPTS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => set('prontidao', state.prontidao === opt.key ? '' : opt.key)}
                    title={opt.desc}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      state.prontidao === opt.key
                        ? 'bg-violet-500 border-violet-500 text-white shadow-md shadow-violet-500/25'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-violet-300 hover:text-violet-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  O <strong>Interino</strong> assume em caráter emergencial/imediato, sem necessariamente ser o sucessor formal.
                  Os demais horizontes indicam o prazo estimado para o colaborador assumir a posição em definitivo.
                </p>
              </div>
            </div>

            {/* Ações de Desenvolvimento */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Ações de Desenvolvimento por Colaborador Elegível</p>
                <button type="button" onClick={addAcao}
                  className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 font-medium transition-colors">
                  <Plus size={13} /> Adicionar ação
                </button>
              </div>

              {state.acoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 gap-2">
                  <p className="text-xs">Nenhuma ação cadastrada</p>
                  <button type="button" onClick={addAcao}
                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium">
                    + Adicionar primeira ação
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-700/40 border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-500 dark:text-slate-400 w-[22%]">Competência / Gap</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-500 dark:text-slate-400 w-[28%]">Ação de Desenvolvimento</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-500 dark:text-slate-400 w-[14%]">Prazo Esperado</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-500 dark:text-slate-400 w-[18%]">Responsável</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-500 dark:text-slate-400 w-[13%]">Status</th>
                        <th className="px-3 py-2.5 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {state.acoes.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="px-3 py-2">
                            <input value={a.competencia} onChange={e => setAcao(a.id, 'competencia', e.target.value)}
                              placeholder="Ex: Liderança de equipes" className={inputCls} />
                          </td>
                          <td className="px-3 py-2">
                            <input value={a.acao} onChange={e => setAcao(a.id, 'acao', e.target.value)}
                              placeholder="Ex: Shadowing com o gestor" className={inputCls} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="month" value={a.prazo} onChange={e => setAcao(a.id, 'prazo', e.target.value)}
                              className={inputCls} />
                          </td>
                          <td className="px-3 py-2">
                            <input value={a.responsavel} onChange={e => setAcao(a.id, 'responsavel', e.target.value)}
                              placeholder="Nome do responsável" className={inputCls} />
                          </td>
                          <td className="px-3 py-2">
                            <select value={a.status} onChange={e => setAcao(a.id, 'status', e.target.value)}
                              className={`${inputCls} ${
                                a.status === 'Concluído' ? 'text-emerald-600 dark:text-emerald-400' :
                                a.status === 'Em andamento' ? 'text-amber-600 dark:text-amber-400' :
                                'text-slate-500'
                              }`}>
                              {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeAcao(a.id)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700 overflow-visible">
            <button type="button" onClick={() => handleSave()} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-sm shadow-violet-500/30 whitespace-nowrap shrink-0">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              {saving ? 'Salvando...' : 'Salvar plano de sucessão'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
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

      {/* Plano de Sucessão */}
      <SucessaoPanel colabId={colab.id} colabNome={colab.nome} onSave={showToast} />

      {showEdit && colab && <EditModal colab={colab} onSave={handleEdit} onClose={() => setShowEdit(false)} />}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm px-4 py-3 rounded-xl shadow-lg animate-slide-up z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
