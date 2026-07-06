import { useState, useEffect } from 'react'
import {
  ClipboardList, Plus, Search, Filter, X, Pencil, BarChart2, Link2,
  ChevronLeft, ChevronDown, AlertCircle, Info, Trash2, Users, Calendar, Clock,
  Loader2, ChevronUp, GripVertical, CheckSquare, AlignLeft, Hash, Send,
  CheckCircle2, ArrowUp, ArrowDown, Eye, MessageSquare,
} from 'lucide-react'
import { api } from '../../../lib/api'

/* ─── Types ─── */
type Situacao = 'LIBERADA' | 'FINALIZADA' | 'RASCUNHO'
type Status   = 'ATIVA'    | 'INATIVA'
type Tipo     = 'Desligamento' | 'Enquete' | 'Pesquisa de pulso' | 'Pesquisa Padrão' | 'Pesquisa Temporal' | 'eNPS' | 'Clima' | 'Satisfação'
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
  tipo: Tipo
  situacao: Situacao
  status: Status
  anonima: boolean
  ocultar_min: boolean
  data_inicio?: string
  data_fim?: string
  frequencia_pulso?: string
  perguntas_por_pulso?: number
  questionario?: string
  email_auto: boolean
  dias_aviso?: number
  relatorio_permissao: boolean
  relatorio_selecionados: boolean
  notif_respondido: boolean
  autenticacao_codigo: boolean
  vinculos_desligamento: VinculoDesligamento[]
  colaborador_ids: number[]
  perguntas?: Pergunta[]
  total_respostas?: number
  created_at: string
}

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

const TIPOS_PERGUNTA: { tipo: TipoPergunta; label: string; cor: string; icon: React.ReactNode }[] = [
  { tipo: 'multipla_escolha', label: 'Múltipla escolha', cor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: <CheckCircle2 size={12} /> },
  { tipo: 'checkbox',         label: 'Caixas de seleção', cor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', icon: <CheckSquare size={12} /> },
  { tipo: 'escala',           label: 'Escala linear', cor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: <Hash size={12} /> },
  { tipo: 'texto',            label: 'Resposta em texto', cor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: <AlignLeft size={12} /> },
  { tipo: 'sim_nao',          label: 'Sim / Não', cor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', icon: <MessageSquare size={12} /> },
  { tipo: 'nps',              label: 'NPS (0–10)', cor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', icon: <BarChart2 size={12} /> },
]

function tipoPerguntaInfo(tipo: TipoPergunta) {
  return TIPOS_PERGUNTA.find(t => t.tipo === tipo) ?? TIPOS_PERGUNTA[0]
}

function novaPergunta(id: number): Pergunta {
  return { id, titulo: '', tipo: 'multipla_escolha', obrigatoria: false,
    opcoes: [{ id: 1, texto: '' }, { id: 2, texto: '' }] }
}

/* ─── Form state ─── */
interface FormState {
  nome: string; objetivo: string; tipo: Tipo | ''
  questionario: string; frequenciaPulso: string; perguntasPorPulso: string
  dataInicio: string; horaInicio: string; dataFim: string; horaFim: string
  anonima: boolean; ocultarMin: boolean; ativa: boolean
  emailAuto: boolean; diasAviso: string
  relatorioPermissao: boolean; relatorioSelecionados: boolean
  notifRespondido: boolean; autenticacaoCodigo: boolean
  perguntas: Pergunta[]
}

const INIT: FormState = {
  nome: '', objetivo: '', tipo: '', questionario: '',
  frequenciaPulso: '', perguntasPorPulso: '',
  dataInicio: '', horaInicio: '', dataFim: '', horaFim: '',
  anonima: false, ocultarMin: false, ativa: true,
  emailAuto: false, diasAviso: '',
  relatorioPermissao: true, relatorioSelecionados: false,
  notifRespondido: false, autenticacaoCodigo: true,
  perguntas: [],
}

interface VinculoDesligamento { questionario: string; categoria: string }

const QUESTIONARIOS_DESLIGAMENTO = ['Pesquisa de Desligamento','Pesquisa de desligamento involuntário','Pesquisa de desligamento voluntário']
const CATEGORIAS_DESLIGAMENTO = ['Voluntário','Involuntário','Acordo','Aposentadoria','Término de contrato']
const FREQUENCIAS_PULSO = ['Semanalmente','Quinzenalmente','Mensalmente','Bimestralmente','Trimestralmente']
const PERGUNTAS_PULSO   = ['1','2','3','4','5']

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
interface ColaboradorBasico { id: number; nome: string; cargo?: string; area?: string }

function SelecaoPublico({ tipo, selectedIds, onChangeIds }: {
  tipo: Tipo | ''; selectedIds: number[]; onChangeIds: (ids: number[]) => void
}) {
  const [colaboradores, setColaboradores] = useState<ColaboradorBasico[]>([])
  const [busca, setBusca] = useState('')
  const isPulso = tipo === 'Pesquisa de pulso'

  useEffect(() => {
    api.colaboradores.list().then(list => setColaboradores(list as ColaboradorBasico[])).catch(() => {})
  }, [])

  const filtrados = colaboradores.filter(c => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()))

  function toggle(id: number) {
    if (selectedIds.includes(id)) onChangeIds(selectedIds.filter(x => x !== id))
    else onChangeIds([...selectedIds, id])
  }

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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">
          <Filter size={12} />
          <span className="font-medium">Selecionar público</span>
          {selectedIds.length > 0 && (
            <span className="bg-primary-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{selectedIds.length}</span>
          )}
        </div>
        {selectedIds.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full">
            {selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''}
            <button onClick={() => onChangeIds([])} className="hover:text-red-500 transition-colors ml-1"><X size={11} /></button>
          </span>
        )}
      </div>
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/30 text-xs text-slate-500">
          <span className="font-semibold text-emerald-600">Selecionados ({selectedIds.length})</span>
          <span className="text-slate-400">Não Selecionados ({colaboradores.length - selectedIds.length})</span>
          {!isPulso && selectedIds.length > 0 && (
            <button onClick={() => onChangeIds([])} className="ml-2 flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors">
              <Trash2 size={11} /> Remover todos
            </button>
          )}
          <div className="ml-auto relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar"
              className="pl-6 pr-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500/30 w-36" />
          </div>
        </div>
        <div className="grid text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-700/20"
          style={{ gridTemplateColumns: '2rem 1fr 1fr 1fr' }}>
          <span />
          <span className="flex items-center gap-1"><Users size={11} /> Usuários</span>
          <span>Cargo</span>
          <span>Área</span>
        </div>
        {filtrados.map(c => (
          <div key={c.id} onClick={() => toggle(c.id)}
            className="grid items-center px-4 py-2.5 border-b border-slate-100/60 dark:border-slate-700/40 hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors text-sm cursor-pointer"
            style={{ gridTemplateColumns: '2rem 1fr 1fr 1fr' }}>
            <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggle(c.id)}
              onClick={e => e.stopPropagation()}
              className="w-3.5 h-3.5 rounded border-slate-300 text-primary-500 focus:ring-primary-400" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                {c.nome.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-slate-700 dark:text-slate-300">{c.nome}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{c.cargo ?? '—'}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{c.area ?? '—'}</span>
          </div>
        ))}
        <div className="flex items-center justify-end px-4 py-2.5 text-xs text-slate-400 bg-slate-50/40 dark:bg-slate-700/20">
          <span>{filtrados.length} colaborador{filtrados.length !== 1 ? 'es' : ''}</span>
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
  tipo: Tipo | ''; form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void
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
        </div>
      ) : tipo === 'Pesquisa de pulso' ? (
        <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4">
          <label className="flex flex-wrap items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.emailAuto} onChange={e => set('emailAuto', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Enviar <span className="text-primary-500">e-mail</span> para usuários que não responderam a cada</span>
            {diasField}
            <span className="text-xs text-slate-400">dias</span>
          </label>
        </div>
      ) : (
        <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4">
          <label className="flex flex-wrap items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.emailAuto} onChange={e => set('emailAuto', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Enviar e-mail para usuários que não responderam</span>
            {diasField}
            <span className="text-xs text-slate-400">dias antes da data de término.</span>
          </label>
        </div>
      )}
    </section>
  )
}

/* ─── PerguntaCard ─── */
function PerguntaCard({ pergunta, index, total, onChange, onRemove, onMove }: {
  pergunta: Pergunta
  index: number
  total: number
  onChange: (p: Pergunta) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  const [expanded, setExpanded] = useState(true)
  const info = tipoPerguntaInfo(pergunta.tipo)

  function setField<K extends keyof Pergunta>(k: K, v: Pergunta[K]) {
    onChange({ ...pergunta, [k]: v })
  }

  function addOpcao() {
    const nextId = Math.max(0, ...(pergunta.opcoes ?? []).map(o => o.id)) + 1
    setField('opcoes', [...(pergunta.opcoes ?? []), { id: nextId, texto: '' }])
  }

  function removeOpcao(id: number) {
    if ((pergunta.opcoes?.length ?? 0) <= 2) return
    setField('opcoes', (pergunta.opcoes ?? []).filter(o => o.id !== id))
  }

  function setOpcao(id: number, texto: string) {
    setField('opcoes', (pergunta.opcoes ?? []).map(o => o.id === id ? { ...o, texto } : o))
  }

  function onTipoChange(tipo: TipoPergunta) {
    const base: Pergunta = { ...pergunta, tipo }
    if (tipo === 'multipla_escolha' || tipo === 'checkbox') {
      base.opcoes = pergunta.opcoes?.length ? pergunta.opcoes : [{ id: 1, texto: '' }, { id: 2, texto: '' }]
      delete base.escala_min; delete base.escala_max
    } else if (tipo === 'escala') {
      base.escala_min = pergunta.escala_min ?? 1
      base.escala_max = pergunta.escala_max ?? 5
      delete base.opcoes
    } else {
      delete base.opcoes; delete base.escala_min; delete base.escala_max
    }
    onChange(base)
  }

  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition'

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/30">
        <GripVertical size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
        <span className="text-xs font-semibold text-slate-400 w-5 shrink-0">{index + 1}.</span>
        <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${info.cor}`}>
          {info.icon}{info.label}
        </span>
        <div className="flex-1 min-w-0">
          {!expanded && (
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
              {pergunta.titulo || <span className="text-slate-400 italic">Sem título</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onMove('up')} disabled={index === 0}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-20 transition-colors">
            <ArrowUp size={12} />
          </button>
          <button onClick={() => onMove('down')} disabled={index === total - 1}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-20 transition-colors">
            <ArrowDown size={12} />
          </button>
          <button onClick={onRemove}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors">
            <Trash2 size={12} />
          </button>
          <button onClick={() => setExpanded(v => !v)}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Título + tipo + obrigatória */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-500">Texto da pergunta</label>
              <input value={pergunta.titulo} onChange={e => setField('titulo', e.target.value)}
                placeholder="Ex: Como você avalia o clima da equipe?"
                className={inputCls} />
            </div>
            <div className="w-44 space-y-1">
              <label className="text-xs font-medium text-slate-500">Tipo</label>
              <div className="relative">
                <select value={pergunta.tipo} onChange={e => onTipoChange(e.target.value as TipoPergunta)}
                  className={`${inputCls} appearance-none pr-8`}>
                  {TIPOS_PERGUNTA.map(t => (
                    <option key={t.tipo} value={t.tipo}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col justify-end pb-0.5 space-y-1">
              <label className="text-xs font-medium text-slate-500 text-center">Obrig.</label>
              <div className="flex justify-center">
                <Toggle on={pergunta.obrigatoria} onToggle={() => setField('obrigatoria', !pergunta.obrigatoria)} />
              </div>
            </div>
          </div>

          {/* Opções para multipla_escolha / checkbox */}
          {(pergunta.tipo === 'multipla_escolha' || pergunta.tipo === 'checkbox') && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">Opções de resposta</p>
              {(pergunta.opcoes ?? []).map((op, i) => (
                <div key={op.id} className="flex items-center gap-2">
                  <div className={`w-4 h-4 shrink-0 border-2 border-slate-300 dark:border-slate-500 ${pergunta.tipo === 'multipla_escolha' ? 'rounded-full' : 'rounded'} bg-white dark:bg-slate-700`} />
                  <input value={op.texto} onChange={e => setOpcao(op.id, e.target.value)}
                    placeholder={`Opção ${i + 1}`}
                    className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition" />
                  <button onClick={() => removeOpcao(op.id)} disabled={(pergunta.opcoes?.length ?? 0) <= 2}
                    className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-400 disabled:opacity-20 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button onClick={addOpcao}
                className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors mt-1">
                <Plus size={13} /> Adicionar opção
              </button>
            </div>
          )}

          {/* Escala */}
          {pergunta.tipo === 'escala' && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500">Configuração da escala</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-slate-400">Valor mínimo</label>
                  <select value={pergunta.escala_min ?? 1} onChange={e => setField('escala_min', parseInt(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 appearance-none">
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-slate-400">Valor máximo</label>
                  <select value={pergunta.escala_max ?? 5} onChange={e => setField('escala_max', parseInt(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 appearance-none">
                    {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-slate-400">Label do mínimo</label>
                  <input value={pergunta.escala_label_min ?? ''} onChange={e => setField('escala_label_min', e.target.value)}
                    placeholder="Ex: Discordo totalmente"
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-slate-400">Label do máximo</label>
                  <input value={pergunta.escala_label_max ?? ''} onChange={e => setField('escala_label_max', e.target.value)}
                    placeholder="Ex: Concordo totalmente"
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition" />
                </div>
              </div>
            </div>
          )}

          {/* NPS info */}
          {pergunta.tipo === 'nps' && (
            <div className="flex gap-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-xl p-3">
              <Info size={14} className="text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                O NPS usa uma escala fixa de 0 a 10. Respondentes são segmentados em Detratores (0–6), Neutros (7–8) e Promotores (9–10).
              </p>
            </div>
          )}

          {/* Sim/Não info */}
          {pergunta.tipo === 'sim_nao' && (
            <div className="flex gap-2">
              {['Sim', 'Não'].map(o => (
                <div key={o} className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 bg-slate-50 dark:bg-slate-700/50">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700" />
                  <span className="text-xs text-slate-500">{o}</span>
                </div>
              ))}
            </div>
          )}

          {/* Texto info */}
          {pergunta.tipo === 'texto' && (
            <div className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-slate-50/50 dark:bg-slate-700/30">
              <p className="text-xs text-slate-400 italic">Campo de texto livre — respondente poderá escrever livremente.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Builder de Perguntas ─── */
function BuilderPerguntas({ perguntas, onChange }: { perguntas: Pergunta[]; onChange: (p: Pergunta[]) => void }) {
  function addPergunta() {
    const nextId = Math.max(0, ...perguntas.map(p => p.id)) + 1
    onChange([...perguntas, novaPergunta(nextId)])
  }

  function updatePergunta(id: number, updated: Pergunta) {
    onChange(perguntas.map(p => p.id === id ? updated : p))
  }

  function removePergunta(id: number) {
    onChange(perguntas.filter(p => p.id !== id))
  }

  function movePergunta(index: number, dir: 'up' | 'down') {
    const newArr = [...perguntas]
    const target = dir === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newArr.length) return
    ;[newArr[index], newArr[target]] = [newArr[target], newArr[index]]
    onChange(newArr)
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Questionário</h2>
          <p className="text-xs text-slate-400 mt-0.5">{perguntas.length} pergunta{perguntas.length !== 1 ? 's' : ''} adicionada{perguntas.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={addPergunta}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-colors">
          <Plus size={13} /> Adicionar pergunta
        </button>
      </div>

      {perguntas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <ClipboardList size={32} className="text-slate-200 dark:text-slate-600" />
          <p className="text-sm text-slate-400">Nenhuma pergunta adicionada ainda</p>
          <button onClick={addPergunta}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700 text-primary-500 text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
            <Plus size={14} /> Criar primeira pergunta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {perguntas.map((p, i) => (
            <PerguntaCard key={p.id} pergunta={p} index={i} total={perguntas.length}
              onChange={updated => updatePergunta(p.id, updated)}
              onRemove={() => removePergunta(p.id)}
              onMove={dir => movePergunta(i, dir)} />
          ))}
          <button onClick={addPergunta}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-400 hover:border-primary-400 hover:text-primary-500 transition-colors">
            <Plus size={15} /> Adicionar mais uma pergunta
          </button>
        </div>
      )}
    </section>
  )
}

/* ─── pesquisaToForm ─── */
function pesquisaToForm(p: Pesquisa): FormState {
  const toDate = (dt?: string) => dt ? dt.split('T')[0] : ''
  const toTime = (dt?: string) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }
  return {
    nome: p.nome, objetivo: p.objetivo ?? '', tipo: p.tipo,
    questionario: p.questionario ?? '',
    frequenciaPulso: p.frequencia_pulso ?? '',
    perguntasPorPulso: p.perguntas_por_pulso ? String(p.perguntas_por_pulso) : '',
    dataInicio: toDate(p.data_inicio), horaInicio: toTime(p.data_inicio),
    dataFim: toDate(p.data_fim), horaFim: toTime(p.data_fim),
    anonima: p.anonima, ocultarMin: p.ocultar_min, ativa: p.status === 'ATIVA',
    emailAuto: p.email_auto, diasAviso: p.dias_aviso ? String(p.dias_aviso) : '',
    relatorioPermissao: p.relatorio_permissao, relatorioSelecionados: p.relatorio_selecionados,
    notifRespondido: p.notif_respondido, autenticacaoCodigo: p.autenticacao_codigo,
    perguntas: p.perguntas ?? [],
  }
}

/* ─── Nova Pesquisa Form ─── */
function NovaPesquisaForm({ onBack, pesquisaInicial }: { onBack: (recarregar?: boolean) => void; pesquisaInicial?: Pesquisa }) {
  const [form, setForm] = useState<FormState>(pesquisaInicial ? pesquisaToForm(pesquisaInicial) : INIT)
  const [vinculos, setVinculos] = useState<VinculoDesligamento[]>(
    pesquisaInicial?.vinculos_desligamento?.length ? pesquisaInicial.vinculos_desligamento : [{ questionario: '', categoria: '' }]
  )
  const [selectedIds, setSelectedIds] = useState<number[]>(pesquisaInicial?.colaborador_ids ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm(f => ({ ...f, [k]: v })) }

  function addVinculo()             { if (vinculos.length < 5) setVinculos(v => [...v, { questionario: '', categoria: '' }]) }
  function removeVinculo(i: number) { setVinculos(v => v.filter((_, idx) => idx !== i)) }
  function setVinculo(i: number, field: keyof VinculoDesligamento, val: string) {
    setVinculos(v => v.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  async function handleSave(publicar = false) {
    if (!form.nome.trim() || !form.tipo) return
    setSaving(true)
    setError('')
    try {
      const buildDatetime = (date: string, time: string) => date ? `${date}T${time || '00:00'}:00` : null
      const situacao = publicar ? 'LIBERADA' : (pesquisaInicial?.situacao === 'LIBERADA' ? 'LIBERADA' : 'RASCUNHO')
      const payload = {
        nome: form.nome, objetivo: form.objetivo || null, tipo: form.tipo,
        situacao, status: form.ativa ? 'ATIVA' : 'INATIVA',
        anonima: form.anonima, ocultar_min: form.ocultarMin,
        data_inicio: buildDatetime(form.dataInicio, form.horaInicio),
        data_fim: buildDatetime(form.dataFim, form.horaFim),
        frequencia_pulso: form.frequenciaPulso || null,
        perguntas_por_pulso: form.perguntasPorPulso ? parseInt(form.perguntasPorPulso) : null,
        questionario: form.questionario || null,
        email_auto: form.emailAuto, dias_aviso: form.diasAviso ? parseInt(form.diasAviso) : null,
        relatorio_permissao: form.relatorioPermissao, relatorio_selecionados: form.relatorioSelecionados,
        notif_respondido: form.notifRespondido, autenticacao_codigo: form.autenticacaoCodigo,
        vinculos_desligamento: vinculos.filter(v => v.questionario || v.categoria),
        colaborador_ids: selectedIds,
        perguntas: form.perguntas,
      }
      if (pesquisaInicial) {
        await api.pesquisas.update(pesquisaInicial.id, payload)
      } else {
        await api.pesquisas.create(payload)
      }
      onBack(true)
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar pesquisa')
    } finally {
      setSaving(false)
    }
  }

  const tipo = form.tipo
  const showPublico    = tipo !== '' && tipo !== 'Desligamento'
  const hasDateFields  = tipo === 'Pesquisa Padrão' || tipo === 'Pesquisa Temporal'
  const hasPulsoFields = tipo === 'Pesquisa de pulso'
  const hasDesligamento = tipo === 'Desligamento'
  const isLiberada = pesquisaInicial?.situacao === 'LIBERADA'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => onBack()} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <ChevronLeft size={16} /> Pesquisas
        </button>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-medium text-primary-600">{pesquisaInicial ? 'Editar Pesquisa' : 'Nova Pesquisa'}</span>
        {pesquisaInicial && (
          <span className={`text-xs font-semibold ml-2 ${SIT_STYLE[pesquisaInicial.situacao]}`}>{pesquisaInicial.situacao}</span>
        )}
      </div>

      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{pesquisaInicial ? 'Editar Pesquisa' : 'Nova Pesquisa'}</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle size={15} /> {error}
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
          <textarea value={form.objetivo} onChange={e => set('objetivo', e.target.value)}
            placeholder="Descreva o objetivo da pesquisa" rows={3}
            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition resize-none" />
        </div>
      </section>

      {/* ── Configuração ── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-3">
          Configuração
        </h2>
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
        </div>

        {hasPulsoFields && (
          <div className="flex gap-4">
            <SelectField label="Frequência do pulso" required value={form.frequenciaPulso}
              onChange={v => set('frequenciaPulso', v)} options={FREQUENCIAS_PULSO} />
            <SelectField label="Perguntas por pulso" required value={form.perguntasPorPulso}
              onChange={v => set('perguntasPorPulso', v)} options={PERGUNTAS_PULSO} />
          </div>
        )}

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

        {hasDesligamento && (
          <div className="space-y-4">
            <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Você pode criar até cinco pesquisas distintas ao estabelecer vínculos entre categorias de desligamento e questionários.
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
          </div>
        )}

        {!hasDesligamento && tipo !== '' && (
          <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Anonimato da Pesquisa</p>
            <p className="text-xs text-slate-400">O RH e administradores conseguem visualizar apenas as respostas, mas não têm acesso à identidade dos respondentes.</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <Toggle on={form.anonima} onToggle={() => set('anonima', !form.anonima)} />
              <span className="text-xs text-slate-600 dark:text-slate-400">Habilitar pesquisa anônima</span>
            </label>
          </div>
        )}

        <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Situação</p>
          <label className="flex items-center gap-3 cursor-pointer mt-2">
            <Toggle on={form.ativa} onToggle={() => set('ativa', !form.ativa)} />
            <span className={`text-xs font-medium ${form.ativa ? 'text-emerald-600' : 'text-slate-400'}`}>
              {form.ativa ? 'Ativa' : 'Inativa'}
            </span>
          </label>
        </div>
      </section>

      {/* ── Builder de Perguntas ── */}
      {tipo !== '' && (
        <BuilderPerguntas perguntas={form.perguntas} onChange={p => set('perguntas', p)} />
      )}

      {showPublico && <SelecaoPublico tipo={tipo} selectedIds={selectedIds} onChangeIds={setSelectedIds} />}
      {tipo !== '' && <VisualizarRelatorios form={form} set={set} />}
      {tipo !== '' && <Notificacoes tipo={tipo} form={form} set={set} />}

      <div className="flex items-center justify-end gap-3 pb-6">
        <button type="button" onClick={() => onBack()}
          className="px-5 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          Fechar
        </button>
        {!isLiberada && (
          <button type="button" onClick={() => handleSave(false)} disabled={!form.nome.trim() || !form.tipo || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-sm font-medium transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Salvar rascunho
          </button>
        )}
        <button type="button" onClick={() => handleSave(isLiberada ? false : true)} disabled={!form.nome.trim() || !form.tipo || saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-sm shadow-primary-500/30">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {isLiberada ? 'Salvar' : <><Send size={14} /> Publicar</>}
        </button>
      </div>
    </div>
  )
}

/* ─── Resultados ─── */
function ResultadosView({ pesquisa, onBack }: { pesquisa: Pesquisa; onBack: () => void }) {
  const [respostas, setRespostas] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.pesquisaRespostas.list(pesquisa.id)
      .then((data: any) => setRespostas(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [pesquisa.id])

  const perguntas = pesquisa.perguntas ?? []
  const total     = respostas.length
  const pubTotal  = pesquisa.colaborador_ids?.length ?? 0
  const taxa      = pubTotal > 0 ? Math.round((total / pubTotal) * 100) : null

  function getValores(pergId: number) {
    return respostas
      .map(r => (r.respostas as any[]).find((x: any) => x.pergunta_id === pergId)?.valor ?? null)
      .filter(v => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
  }

  function contarOpcoes(valores: any[]) {
    const counts: Record<string, number> = {}
    for (const v of valores) {
      if (Array.isArray(v)) {
        for (const item of v) counts[item] = (counts[item] ?? 0) + 1
      } else {
        counts[String(v)] = (counts[String(v)] ?? 0) + 1
      }
    }
    return counts
  }

  function calcMedia(valores: any[]) {
    if (valores.length === 0) return 0
    return valores.reduce((a, v) => a + Number(v), 0) / valores.length
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <ChevronLeft size={16} /> Pesquisas
        </button>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-medium text-primary-600">Resultados</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{pesquisa.nome}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{pesquisa.tipo}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-primary-600">{loading ? '—' : total}</p>
            <p className="text-xs text-slate-400">Respostas</p>
          </div>
          {taxa !== null && (
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-600">{loading ? '—' : `${taxa}%`}</p>
              <p className="text-xs text-slate-400">Taxa de resposta</p>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary-400" />
        </div>
      ) : total === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <BarChart2 size={36} className="mx-auto mb-3 text-slate-200 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">Ainda não há respostas</p>
          <p className="text-xs text-slate-400 mt-1">As respostas aparecerão aqui assim que os colaboradores responderem.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {perguntas.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <p className="text-sm text-slate-400">Esta pesquisa não possui perguntas configuradas.</p>
            </div>
          ) : perguntas.map((p, idx) => {
            const valores = getValores(p.id)
            const info    = tipoPerguntaInfo(p.tipo)

            return (
              <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Pergunta {idx + 1}</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{p.titulo || '(sem título)'}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${info.cor}`}>
                    {info.label}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{valores.length} resposta{valores.length !== 1 ? 's' : ''}</p>

                {/* múltipla escolha / checkbox / sim_não */}
                {(p.tipo === 'multipla_escolha' || p.tipo === 'checkbox' || p.tipo === 'sim_nao') && (() => {
                  const counts = contarOpcoes(valores)
                  const opcoes = p.tipo === 'sim_nao'
                    ? ['Sim', 'Não']
                    : (p.opcoes ?? []).map(o => o.texto).filter(Boolean)
                  const maxCount = Math.max(1, ...Object.values(counts))
                  return (
                    <div className="space-y-2.5">
                      {opcoes.map(op => {
                        const n   = counts[op] ?? 0
                        const pct = valores.length > 0 ? Math.round((n / valores.length) * 100) : 0
                        return (
                          <div key={op} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-700 dark:text-slate-300">{op}</span>
                              <span className="text-slate-500 tabular-nums">{n} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                style={{ width: `${maxCount > 0 ? (n / maxCount) * 100 : 0}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* escala */}
                {p.tipo === 'escala' && (() => {
                  const media = calcMedia(valores)
                  const min   = p.escala_min ?? 1
                  const max   = p.escala_max ?? 5
                  const counts = contarOpcoes(valores)
                  const nums   = Array.from({ length: max - min + 1 }, (_, i) => i + min)
                  const maxCount = Math.max(1, ...nums.map(n => counts[String(n)] ?? 0))
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-3xl font-black text-primary-600 tabular-nums">{media.toFixed(1)}</p>
                          <p className="text-xs text-slate-400">Média</p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {nums.map(n => {
                            const cnt = counts[String(n)] ?? 0
                            const pct = valores.length > 0 ? Math.round((cnt / valores.length) * 100) : 0
                            return (
                              <div key={n} className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 w-3 text-right tabular-nums">{n}</span>
                                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary-400 rounded-full" style={{ width: `${maxCount > 0 ? (cnt / maxCount) * 100 : 0}%` }} />
                                </div>
                                <span className="text-xs text-slate-400 w-10 tabular-nums">{pct}%</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      {(p.escala_label_min || p.escala_label_max) && (
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{p.escala_label_min}</span>
                          <span>{p.escala_label_max}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* NPS */}
                {p.tipo === 'nps' && (() => {
                  const media      = calcMedia(valores)
                  const counts     = contarOpcoes(valores)
                  const detratores = valores.filter(v => Number(v) <= 6).length
                  const neutros    = valores.filter(v => Number(v) >= 7 && Number(v) <= 8).length
                  const promotores = valores.filter(v => Number(v) >= 9).length
                  const nps        = valores.length > 0 ? Math.round(((promotores - detratores) / valores.length) * 100) : 0
                  const nums       = Array.from({ length: 11 }, (_, i) => i)
                  const maxCount   = Math.max(1, ...nums.map(n => counts[String(n)] ?? 0))
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className={`text-3xl font-black tabular-nums ${nps >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{nps > 0 ? '+' : ''}{nps}</p>
                          <p className="text-xs text-slate-400">NPS Score</p>
                        </div>
                        <div className="flex gap-4 text-center">
                          <div><p className="text-lg font-bold text-red-500 tabular-nums">{detratores}</p><p className="text-xs text-slate-400">Detratores</p></div>
                          <div><p className="text-lg font-bold text-amber-500 tabular-nums">{neutros}</p><p className="text-xs text-slate-400">Neutros</p></div>
                          <div><p className="text-lg font-bold text-emerald-500 tabular-nums">{promotores}</p><p className="text-xs text-slate-400">Promotores</p></div>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {nums.map(n => {
                          const cnt  = counts[String(n)] ?? 0
                          const pct  = maxCount > 0 ? (cnt / maxCount) * 100 : 0
                          const color = n <= 6 ? 'bg-red-400' : n <= 8 ? 'bg-amber-400' : 'bg-emerald-500'
                          return (
                            <div key={n} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-sm overflow-hidden" style={{ height: 40 }}>
                                <div className={`w-full ${color} rounded-sm transition-all duration-500`} style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-400 tabular-nums">{n}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Texto */}
                {p.tipo === 'texto' && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(valores as string[]).map((v, i) => (
                      <div key={i} className="bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5">
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Respostas individuais */}
          {!pesquisa.anonima && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Respondentes</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {respostas.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[11px] font-bold text-primary-600 dark:text-primary-400 shrink-0">
                      {r.colaborador_nome ? r.colaborador_nome.charAt(0) : '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.colaborador_nome ?? 'Anônimo'}</p>
                      {r.colaborador_cargo && <p className="text-xs text-slate-400">{r.colaborador_cargo}</p>}
                    </div>
                    <p className="ml-auto text-xs text-slate-400">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Lista de Pesquisas ─── */
export default function PesquisasPage() {
  const [view, setView]             = useState<'list' | 'new' | 'edit' | 'resultados'>('list')
  const [editando, setEditando]     = useState<Pesquisa | undefined>()
  const [resultadosDe, setResultadosDe] = useState<Pesquisa | undefined>()
  const [pesquisas, setPesquisas]   = useState<Pesquisa[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState('')
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilter]   = useState<Status | ''>('')
  const [showFilter, setShowFilter] = useState(false)
  const [copiedId, setCopiedId]     = useState<number | null>(null)

  function carregar() {
    setLoading(true)
    setLoadError('')
    api.pesquisas.list()
      .then(data => setPesquisas(data as Pesquisa[]))
      .catch(e => setLoadError((e as any).message || 'Erro ao carregar pesquisas'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  function handleBack(recarregar?: boolean) {
    setView('list')
    setEditando(undefined)
    setResultadosDe(undefined)
    if (recarregar) carregar()
  }

  async function handleDelete(p: Pesquisa) {
    if (!confirm(`Excluir "${p.nome}"?`)) return
    try {
      await api.pesquisas.delete(p.id)
      carregar()
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir')
    }
  }

  function handleCopyLink(p: Pesquisa) {
    const url = `${window.location.origin}/intranet/pesquisas/${p.id}/responder`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(p.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function openResultados(p: Pesquisa) {
    setResultadosDe(p)
    setView('resultados')
  }

  if (view === 'new') return <NovaPesquisaForm onBack={handleBack} />
  if (view === 'edit') return <NovaPesquisaForm onBack={handleBack} pesquisaInicial={editando} />
  if (view === 'resultados' && resultadosDe) return <ResultadosView pesquisa={resultadosDe} onBack={handleBack} />

  const filtered = pesquisas.filter(p => {
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 w-[35%]">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Situação</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Respostas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                  <Loader2 size={20} className="mx-auto mb-2 animate-spin opacity-40" />
                  Carregando...
                </td></tr>
              ) : loadError ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <p className="text-sm text-red-500 mb-2">{loadError}</p>
                  <button onClick={carregar} className="text-xs text-primary-500 hover:underline">Tentar novamente</button>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                  <ClipboardList size={24} className="mx-auto mb-2 opacity-30" />
                  Nenhuma pesquisa encontrada.
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="px-5 py-3.5">
                    <button onClick={() => { setEditando(p); setView('edit') }}
                      className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline text-left">{p.nome}</button>
                    {(p.perguntas?.length ?? 0) > 0 && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{p.perguntas!.length} pergunta{p.perguntas!.length !== 1 ? 's' : ''}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 text-sm">{p.tipo}</td>
                  <td className="px-4 py-3.5"><span className={`text-xs ${SIT_STYLE[p.situacao] ?? 'text-slate-400 font-semibold'}`}>{p.situacao}</span></td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${STATUS_STYLE[p.status] ?? 'bg-slate-300 text-white'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {p.total_respostas ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button title="Editar" onClick={() => { setEditando(p); setView('edit') }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button title="Ver resultados" onClick={() => openResultados(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        <BarChart2 size={14} />
                      </button>
                      <button title={copiedId === p.id ? 'Copiado!' : 'Copiar link de resposta'} onClick={() => handleCopyLink(p)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${copiedId === p.id ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                        <Link2 size={14} />
                      </button>
                      <button title="Excluir" onClick={() => handleDelete(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
          {loading ? 'Carregando...' : `${filtered.length} pesquisa${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`}
        </div>
      </div>
    </div>
  )
}
