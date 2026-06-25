import { useState } from 'react'
import {
  ClipboardList, Plus, Search, Filter, X, Pencil, BarChart2, Link2,
  ChevronLeft, ChevronDown, AlertCircle, Info, Trash2, Users, Calendar, Clock,
} from 'lucide-react'

/* ─── Types ─── */
type Situacao = 'LIBERADA' | 'FINALIZADA' | 'RASCUNHO'
type Status   = 'ATIVA'    | 'INATIVA'
type Tipo     = 'Desligamento' | 'Enquete' | 'Pesquisa de pulso' | 'Pesquisa Padrão' | 'Pesquisa Temporal' | 'eNPS' | 'Clima' | 'Satisfação'

interface Pesquisa { id: number; nome: string; tipo: Tipo; situacao: Situacao; status: Status }

const MOCK: Pesquisa[] = [
  { id: 1, nome: 'Pesquisa período de experiência (90 dias)', tipo: 'Pesquisa Temporal', situacao: 'LIBERADA',   status: 'ATIVA'   },
  { id: 2, nome: 'Enquete satisfação TI',                    tipo: 'Enquete',            situacao: 'FINALIZADA', status: 'ATIVA'   },
  { id: 3, nome: 'eNPS 2026',                                tipo: 'eNPS',               situacao: 'FINALIZADA', status: 'ATIVA'   },
  { id: 4, nome: 'Pesquisa de Clima 2026',                   tipo: 'Pesquisa Padrão',    situacao: 'FINALIZADA', status: 'ATIVA'   },
  { id: 5, nome: 'Enquete benefícios',                       tipo: 'Enquete',            situacao: 'FINALIZADA', status: 'ATIVA'   },
  { id: 6, nome: 'Pesquisa de pulso Q2',                     tipo: 'Pesquisa de pulso',  situacao: 'RASCUNHO',   status: 'INATIVA' },
]

const SIT_STYLE: Record<Situacao, string> = {
  LIBERADA:   'text-emerald-600 font-semibold',
  FINALIZADA: 'text-red-500 font-semibold',
  RASCUNHO:   'text-slate-400 font-semibold',
}
const STATUS_STYLE: Record<Status, string> = {
  ATIVA:   'bg-emerald-500 text-white',
  INATIVA: 'bg-slate-400 text-white',
}
const TIPOS: Tipo[] = ['Desligamento','Enquete','Pesquisa de pulso','Pesquisa Padrão','Pesquisa Temporal','Clima','Satisfação','eNPS']

/* ─── Form state ─── */
interface FormState {
  nome:                  string
  objetivo:              string
  tipo:                  Tipo | ''
  questionario:          string
  // Pulso
  frequenciaPulso:       string
  perguntasPorPulso:     string
  // Padrão / Temporal
  dataInicio:            string
  horaInicio:            string
  dataFim:               string
  horaFim:               string
  // Comum
  anonima:               boolean
  ocultarMin:            boolean
  ativa:                 boolean
  emailAuto:             boolean
  diasAviso:             string
  relatorioPermissao:    boolean
  relatorioSelecionados: boolean
  notifRespondido:       boolean
  autenticacaoCodigo:    boolean
}

const INIT: FormState = {
  nome: '', objetivo: '', tipo: '', questionario: '',
  frequenciaPulso: '', perguntasPorPulso: '',
  dataInicio: '', horaInicio: '', dataFim: '', horaFim: '',
  anonima: false, ocultarMin: false, ativa: true,
  emailAuto: false, diasAviso: '',
  relatorioPermissao: true, relatorioSelecionados: false,
  notifRespondido: false, autenticacaoCodigo: true,
}

interface VinculoDesligamento { questionario: string; categoria: string }

const QUESTIONARIOS_DESLIGAMENTO = [
  'Pesquisa de Desligamento',
  'Pesquisa de desligamento involuntário',
  'Pesquisa de desligamento voluntário',
]
const CATEGORIAS_DESLIGAMENTO = ['Voluntário','Involuntário','Acordo','Aposentadoria','Término de contrato']
const FREQUENCIAS_PULSO = ['Semanalmente','Quinzenalmente','Mensalmente','Bimestralmente','Trimestralmente']
const PERGUNTAS_PULSO   = ['1','2','3','4','5']
const QUESTIONARIOS_MOCK = ['Questionário de Clima','Questionário de Engajamento','Questionário de Satisfação','Questionário eNPS','Questionário de Pulso']

/* ─── Reusable atoms ─── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={`w-10 h-5 rounded-full flex items-center transition-colors shrink-0 ${on ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
      <span className={`w-4 h-4 rounded-full bg-white shadow transition-all mx-0.5 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function SelectField({ label, value, onChange, options, placeholder = 'Selecionar', required }: {
  label?: string; value: string; onChange: (v: string) => void
  options: string[]; placeholder?: string; required?: boolean
}) {
  return (
    <div className="space-y-1.5 flex-1">
      {label && <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}{required && <span className="text-red-500"> *</span>}</label>}
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition">
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}

function DateField({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}{required && <span className="text-red-500"> *</span>}</label>
      <div className="relative">
        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input type="date" value={value} onChange={e => onChange(e.target.value)}
          className="w-full pl-8 pr-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition" />
      </div>
    </div>
  )
}

function TimeField({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}{required && <span className="text-red-500"> *</span>}</label>
      <div className="relative">
        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input type="time" value={value} onChange={e => onChange(e.target.value)}
          className="w-full pl-8 pr-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition" />
      </div>
    </div>
  )
}

/* ─── Seleção de Público ─── */
const MOCK_COLABORADORES = [
  { ini: 'C', nome: 'Cida',         cargo: 'Coordenadora', time: 'CS'        },
  { ini: 'C', nome: 'Claudia',      cargo: 'Supervisora',  time: 'CS'        },
  { ini: 'M', nome: 'Manoel',       cargo: 'Assistente',   time: 'Marketing' },
  { ini: 'M', nome: 'Marina',       cargo: 'Coordenador',  time: 'Marketing' },
  { ini: 'M', nome: 'Mel',          cargo: 'Analista',     time: 'Marketing' },
  { ini: 'M', nome: 'Milla',        cargo: 'Supervisora',  time: 'Marketing' },
  { ini: 'M', nome: 'Milton',       cargo: 'Gestor',       time: 'Marketing' },
  { ini: 'M', nome: 'Márcia',       cargo: 'Diretora',     time: 'CS'        },
  { ini: 'MB',nome: 'Márcia Borges',cargo: 'Consultor de RH', time: 'RH'    },
]

function SelecaoPublico({ tipo }: { tipo: Tipo | '' }) {
  const isPulso = tipo === 'Pesquisa de pulso'
  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-3">
        Seleção de público
      </h2>

      {isPulso && (
        <div className="flex gap-3 bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <Info size={15} className="text-slate-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            O público é atualizado automaticamente sempre que um usuário é inserido ou removido de algum time que faz parte do público da pesquisa.
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">
          <Filter size={12} />
          <span className="font-medium">Selecionar público</span>
          <span className="bg-primary-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">1</span>
        </div>
        <span className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full">
          {isPulso ? 'Times: Todos' : 'Usuários: Todos'}
          <button className="hover:text-red-500 transition-colors ml-1"><X size={11} /></button>
        </span>
      </div>

      {/* Table header */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/30 text-xs text-slate-500">
          <span className="font-semibold text-emerald-600">Selecionados (32)</span>
          <span className="text-slate-400">Não Selecionadas (0)</span>
          {!isPulso && (
            <button className="ml-2 flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors">
              <Trash2 size={11} /> Remover todos os usuários
            </button>
          )}
          <span className="ml-auto text-slate-400">Colunas adicionais 3</span>
        </div>

        {/* Column headers */}
        <div className="grid text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-700/20"
          style={{ gridTemplateColumns: isPulso ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr' }}>
          <span className="flex items-center gap-1"><Users size={11} /> Usuários</span>
          <span>Cargo</span>
          <span>Time</span>
          {!isPulso && <span>Gestor</span>}
        </div>

        {/* Rows */}
        {MOCK_COLABORADORES.map(c => (
          <div key={c.nome} className="grid items-center px-4 py-2.5 border-b border-slate-100/60 dark:border-slate-700/40 hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors text-sm"
            style={{ gridTemplateColumns: isPulso ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr' }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                {c.ini}
              </div>
              <span className="text-xs text-slate-700 dark:text-slate-300">{c.nome}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{c.cargo}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{c.time}</span>
            {!isPulso && <span className="text-xs text-slate-400">—</span>}
          </div>
        ))}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 text-xs text-slate-400 bg-slate-50/40 dark:bg-slate-700/20">
          {isPulso && <span>Inserir automaticamente novos times vinculados abaixo de time já selecionados</span>}
          <span className="ml-auto flex items-center gap-2">
            Linhas por página
            <select className="border border-slate-200 dark:border-slate-600 rounded-lg px-1.5 py-0.5 text-xs bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400">
              <option>10</option><option>20</option><option>50</option>
            </select>
            1 - {Math.min(10, MOCK_COLABORADORES.length)} de {MOCK_COLABORADORES.length}
          </span>
        </div>
      </div>
    </section>
  )
}

/* ─── Visualizar Relatórios ─── */
function VisualizarRelatorios({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-3">
        Visualizar Relatórios
      </h2>
      <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <Toggle on={form.relatorioPermissao} onToggle={() => set('relatorioPermissao', !form.relatorioPermissao)} />
          <span className="text-xs text-slate-600 dark:text-slate-400">Usuários <span className="text-primary-500 font-medium">com permissão</span></span>
        </label>
      </div>
      <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <Toggle on={form.relatorioSelecionados} onToggle={() => set('relatorioSelecionados', !form.relatorioSelecionados)} />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Usuários <span className="text-primary-500 font-medium">com permissão</span> + <span className="text-primary-500 font-medium">Selecionados</span>
          </span>
        </label>
      </div>
    </section>
  )
}

/* ─── Notificações ─── */
function Notificacoes({ tipo, form, set }: {
  tipo: Tipo | ''
  form: FormState
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void
}) {
  const diasField = (
    <input type="number" value={form.diasAviso} onChange={e => set('diasAviso', e.target.value)}
      disabled={!form.emailAuto} placeholder="0"
      className="w-14 text-center border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
  )

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-3">
        Notificações
      </h2>

      {tipo === 'Desligamento' ? (
        <div className="space-y-4">
          <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4">
            <label className="flex flex-wrap items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.emailAuto} onChange={e => set('emailAuto', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Enviar <span className="text-primary-500">e-mail</span> para não respondentes</span>
              {diasField}
              <span className="text-xs text-slate-400">dias após o primeiro <span className="text-primary-500">e-mail</span>.</span>
            </label>
          </div>
          <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={form.notifRespondido} onChange={e => set('notifRespondido', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400 mt-0.5" />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Notificar pessoas abaixo por <span className="text-primary-500">e-mail</span> sempre que um questionário for respondido.
              </span>
            </label>
            {form.notifRespondido && (
              <div className="space-y-1 mt-2">
                <div className="relative">
                  <select className="w-full appearance-none border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition">
                    <option value="">Selecionar</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 px-1">Você pode selecionar até 5 pessoas.</p>
              </div>
            )}
          </div>
        </div>
      ) : tipo === 'Pesquisa de pulso' ? (
        <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4">
          <label className="flex flex-wrap items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.emailAuto} onChange={e => set('emailAuto', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Enviar <span className="text-primary-500">e-mail</span> para usuários que não responderam a pesquisa a cada
            </span>
            {diasField}
            <span className="text-xs text-slate-400">dias</span>
          </label>
        </div>
      ) : (
        <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4">
          <label className="flex flex-wrap items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.emailAuto} onChange={e => set('emailAuto', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Enviar e-mail para usuários que não responderam a pesquisa
            </span>
            {diasField}
            <span className="text-xs text-slate-400">dias antes da data de término da pesquisa.</span>
          </label>
        </div>
      )}
    </section>
  )
}

/* ─── Mensagem ─── */
function Mensagem({ tipo, form, set }: {
  tipo: Tipo | ''
  form: FormState
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void
}) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-3">
        Mensagem
      </h2>
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">E-mail</p>
        {tipo === 'Desligamento' && (
          <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Esta configuração é válida somente para envio direto pelo sistema. Quando o envio for feito por link externo, os participantes sempre receberão um{' '}
              <span className="text-blue-500">e-mail</span> informando sobre a pesquisa.
            </p>
          </div>
        )}
        <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <Toggle on={form.emailAuto} onToggle={() => set('emailAuto', !form.emailAuto)} />
            <span className="text-xs text-primary-500">
              Enviar e-mail automático para o público da pesquisa{' '}
              {tipo === 'Pesquisa de pulso' && <span className="text-slate-400 text-[10px]">ⓘ</span>}
            </span>
          </label>
        </div>
      </div>
    </section>
  )
}

/* ─── Nova Pesquisa Form ─── */
function NovaPesquisaForm({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<FormState>(INIT)
  const [saved, setSaved] = useState(false)
  const [vinculos, setVinculos] = useState<VinculoDesligamento[]>([{ questionario: '', categoria: '' }])

  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm(f => ({ ...f, [k]: v })) }

  function addVinculo()           { if (vinculos.length < 5) setVinculos(v => [...v, { questionario: '', categoria: '' }]) }
  function removeVinculo(i: number) { setVinculos(v => v.filter((_, idx) => idx !== i)) }
  function setVinculo(i: number, field: keyof VinculoDesligamento, val: string) {
    setVinculos(v => v.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  function handleSave() {
    if (!form.nome.trim() || !form.tipo) return
    setSaved(true)
    setTimeout(onBack, 1200)
  }

  const tipo = form.tipo
  const showPublico       = tipo !== '' && tipo !== 'Desligamento'
  const showRelatorios    = tipo !== ''
  const showSeguranca     = tipo === 'Desligamento'
  const hasDateFields     = tipo === 'Pesquisa Padrão' || tipo === 'Pesquisa Temporal'
  const hasPulsoFields    = tipo === 'Pesquisa de pulso'
  const hasQuestionario   = tipo !== '' && tipo !== 'Desligamento'
  const hasDesligamento   = tipo === 'Desligamento'

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <ChevronLeft size={16} /> Pesquisas
        </button>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-medium text-primary-600">Nova Pesquisa</span>
      </div>

      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Nova Pesquisa</h1>

      {saved && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <AlertCircle size={15} /> Pesquisa criada com sucesso!
        </div>
      )}

      {/* ── Informações Básicas ── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-3">
          Informações Básicas
        </h2>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Nome da Pesquisa <span className="text-red-500">*</span></label>
          <input value={form.nome} onChange={e => set('nome', e.target.value)}
            placeholder="Digite aqui o nome da pesquisa"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Objetivo</label>
          <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              {['B','I','S'].map(b => (
                <button key={b} type="button" className="w-6 h-6 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors">{b}</button>
              ))}
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1" />
              {['≡','☰'].map(b => (
                <button key={b} type="button" className="w-6 h-6 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors">{b}</button>
              ))}
            </div>
            <textarea value={form.objetivo} onChange={e => set('objetivo', e.target.value)}
              placeholder="Descreva o objetivo da pesquisa" rows={4}
              className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none" />
          </div>
        </div>
      </section>

      {/* ── Configuração ── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-3">
          Configuração
        </h2>

        {/* Row 1: Tipo + Questionário */}
        <div className="flex gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tipo <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={form.tipo} onChange={e => set('tipo', e.target.value as Tipo | '')}
                className="w-full appearance-none border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition">
                <option value="">Selecionar</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {hasQuestionario && (
            <SelectField label="Questionário" required value={form.questionario}
              onChange={v => set('questionario', v)} options={QUESTIONARIOS_MOCK} />
          )}
        </div>

        {/* Pesquisa de Pulso extra fields */}
        {hasPulsoFields && (
          <div className="flex gap-4">
            <SelectField label="Frequência do pulso" required value={form.frequenciaPulso}
              onChange={v => set('frequenciaPulso', v)} options={FREQUENCIAS_PULSO} />
            <SelectField label="Perguntas por pulso" required value={form.perguntasPorPulso}
              onChange={v => set('perguntasPorPulso', v)} options={PERGUNTAS_PULSO} />
          </div>
        )}

        {/* Pesquisa Padrão / Temporal: date fields */}
        {hasDateFields && (
          <>
            <div className="flex gap-4">
              <DateField label="Data de início" required value={form.dataInicio} onChange={v => set('dataInicio', v)} />
              <TimeField label="Hora de Início" required value={form.horaInicio} onChange={v => set('horaInicio', v)} />
            </div>
            <div className="flex gap-4">
              <DateField label="Data de fim" required value={form.dataFim} onChange={v => set('dataFim', v)} />
              <TimeField label="Hora de Fim" required value={form.horaFim} onChange={v => set('horaFim', v)} />
            </div>
          </>
        )}

        {/* Desligamento: vínculos */}
        {hasDesligamento && (
          <div className="space-y-4">
            <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Você pode criar até cinco pesquisas distintas ao estabelecer vínculos entre categorias de desligamento e questionários.
                Além das categorias Voluntário e Involuntário, é possível criar novas categorias e atribuir questionários específicos a cada uma delas.
                Além disso, <span className="text-blue-500 font-medium">um mesmo questionário pode ser selecionado mais de uma vez, mas com categorias diferentes.</span>
              </p>
            </div>
            <div className="space-y-3">
              {vinculos.map((v, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    {i === 0 && <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Questionário <span className="text-red-500">*</span></label>}
                    <div className="relative">
                      <select value={v.questionario} onChange={e => setVinculo(i, 'questionario', e.target.value)}
                        className="w-full appearance-none border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition">
                        <option value="">Selecionar</option>
                        {QUESTIONARIOS_DESLIGAMENTO.map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {i === 0 && <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Categoria de desligamento <span className="text-red-500">*</span></label>}
                    <div className="relative">
                      <select value={v.categoria} onChange={e => setVinculo(i, 'categoria', e.target.value)}
                        className="w-full appearance-none border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition">
                        <option value="">Selecione</option>
                        {CATEGORIAS_DESLIGAMENTO.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 ${i === 0 ? 'mt-5' : ''}`}>
                    <button type="button" onClick={addVinculo} disabled={vinculos.length >= 5}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors text-base font-light">+</button>
                    <button type="button" onClick={() => removeVinculo(i)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button type="button" className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-colors shadow-sm shadow-primary-500/30">
                Novo questionário
              </button>
            </div>
          </div>
        )}

        {/* Anonimato — não aparece no Desligamento */}
        {!hasDesligamento && (
          <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Anonimato da Pesquisa</p>
              <p className="text-xs text-slate-400 mt-0.5">O RH e administradores conseguem visualizar apenas as respostas, mas não têm acesso à identidade dos respondentes.</p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <Toggle on={form.anonima} onToggle={() => set('anonima', !form.anonima)} />
              <span className="text-xs text-slate-600 dark:text-slate-400">Habilitar pesquisa anônima</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Toggle on={form.ocultarMin} onToggle={() => set('ocultarMin', !form.ocultarMin)} />
              <span className="text-xs text-slate-600 dark:text-slate-400">Ocultar dados de etapas com menos de 3 respostas</span>
            </label>
          </div>
        )}

        {/* Situação */}
        <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Situação</p>
          <p className="text-xs text-slate-400">A pesquisa ficará ativa ou inativa</p>
          <label className="flex items-center gap-3 cursor-pointer mt-2">
            <Toggle on={form.ativa} onToggle={() => set('ativa', !form.ativa)} />
            <span className={`text-xs font-medium ${form.ativa ? 'text-emerald-600' : 'text-slate-400'}`}>
              {form.ativa ? 'Ativa' : 'Inativa'}
            </span>
          </label>
        </div>
      </section>

      {/* ── Seleção de Público ── */}
      {showPublico && <SelecaoPublico tipo={tipo} />}

      {/* ── Visualizar Relatórios ── */}
      {showRelatorios && <VisualizarRelatorios form={form} set={set} />}

      {/* ── Notificações ── */}
      {tipo !== '' && <Notificacoes tipo={tipo} form={form} set={set} />}

      {/* ── Mensagem ── */}
      {tipo !== '' && <Mensagem tipo={tipo} form={form} set={set} />}

      {/* ── Segurança (Desligamento only) ── */}
      {showSeguranca && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-3">
            Segurança
          </h2>
          <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Código de autenticação</p>
            <p className="text-xs text-blue-500 leading-relaxed">
              Ao habilitar, <span className="font-medium">sempre que uma pesquisa for enviada via link externo</span>, o usuário receberá um código de verificação por{' '}
              <span className="font-medium">e-mail</span> para confirmar sua identidade.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <Toggle on={form.autenticacaoCodigo} onToggle={() => set('autenticacaoCodigo', !form.autenticacaoCodigo)} />
              <span className="text-xs text-slate-600 dark:text-slate-400">Habilitar autenticação por código</span>
            </label>
          </div>
        </section>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <button type="button" onClick={onBack}
          className="px-5 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          Fechar
        </button>
        <button type="button" onClick={handleSave} disabled={!form.nome.trim() || !form.tipo}
          className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-sm shadow-primary-500/30">
          Salvar
        </button>
      </div>
    </div>
  )
}

/* ─── Lista de Pesquisas ─── */
export default function PesquisasPage() {
  const [view, setView]             = useState<'list' | 'new'>('list')
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilter]   = useState<Status | ''>('')
  const [showFilter, setShowFilter] = useState(false)

  if (view === 'new') return <NovaPesquisaForm onBack={() => setView('list')} />

  const filtered = MOCK.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || p.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pesquisas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gerencie pesquisas e enquetes internas</p>
        </div>
        <button onClick={() => setView('new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors shadow-sm shadow-primary-500/30">
          <Plus size={16} /> Nova Pesquisa
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setShowFilter(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilter || filterStatus ? 'border-primary-400 text-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
          <Filter size={14} /> Filtrar
          {filterStatus && <span className="ml-1 bg-primary-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">1</span>}
        </button>
        {filterStatus && (
          <span className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full">
            Status: {filterStatus}
            <button onClick={() => setFilter('')} className="hover:text-red-500 transition-colors"><X size={12} /></button>
          </span>
        )}
        {showFilter && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status:</span>
            {(['ATIVA','INATIVA'] as Status[]).map(s => (
              <button key={s} onClick={() => { setFilter(filterStatus === s ? '' : s); setShowFilter(false) }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${filterStatus === s ? 'border-primary-400 bg-primary-50 text-primary-600 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pesquisas</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar"
              className="pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition w-52" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 w-[45%]">Nome da Pesquisa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Situação</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                  <ClipboardList size={24} className="mx-auto mb-2 opacity-30" />
                  Nenhuma pesquisa encontrada.
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="px-5 py-3.5">
                    <button className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline text-left">{p.nome}</button>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 text-sm">{p.tipo}</td>
                  <td className="px-4 py-3.5"><span className={`text-xs ${SIT_STYLE[p.situacao]}`}>{p.situacao}</span></td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      {[{ icon: Pencil, title: 'Editar' }, { icon: ClipboardList, title: 'Respostas' }, { icon: BarChart2, title: 'Resultados' }, { icon: Link2, title: 'Copiar link' }].map(({ icon: Icon, title }) => (
                        <button key={title} title={title}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                          <Icon size={14} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
          {filtered.length} pesquisa{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
