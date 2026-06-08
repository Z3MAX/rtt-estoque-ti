import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Printer, Save } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { Colaborador, NivelCargo } from '../../lib/types'
import { NIVEL_LABELS } from '../../lib/types'

// ─── Competency data ──────────────────────────────────────────────────────────

interface Competencia {
  id: string
  nome: string
  categoria: string
  icon: string
  bg: string
  descricao: string
  criterios: [string, string, string, string, string]
}

const COMP_DESEMPENHO: Competencia[] = [
  {
    id: 'qualidade-entregas', nome: 'Qualidade das entregas', categoria: 'Desempenho', icon: '🎯', bg: '#E1F5EE',
    descricao: 'Ao longo deste último semestre, o trabalho entregue atendeu consistentemente aos critérios de qualidade esperados e gerou os resultados planejados para o período?',
    criterios: [
      'Entregas frequentemente incompletas, com erros ou aquém do esperado, exigindo retrabalho constante.',
      'Entregou o básico, mas com inconsistências de qualidade ou necessitando de correções frequentes.',
      'Atendeu ao padrão esperado na maioria das entregas, com consistência razoável e poucos ajustes necessários.',
      'Entregou com alta qualidade de forma consistente; o trabalho é confiável e gerou resultado perceptível.',
      'Referência em qualidade: elevou o padrão das entregas, antecipou melhorias e inspirou boas práticas no time.',
    ],
  },
  {
    id: 'cumprimento-prazos', nome: 'Cumprimento de prazos', categoria: 'Desempenho', icon: '📈', bg: '#EEEDFE',
    descricao: 'Durante este semestre, com que frequência organizou seu tempo de forma eficiente para honrar os prazos e compromissos assumidos?',
    criterios: [
      'Frequentemente descumpriu prazos sem comunicação prévia, comprometendo o fluxo do time.',
      'Apresentou atrasos recorrentes ou comunicou problemas de prazo de forma reativa e tardia.',
      'Cumpriu a maioria dos prazos; quando houve imprevistos, comunicou com antecedência razoável.',
      'Honrou consistentemente os compromissos assumidos, com boa gestão do tempo e comunicação proativa.',
      'Referência em confiabilidade: organizou-se com excelência, antecipou gargalos e ajudou o time a manter os prazos.',
    ],
  },
  {
    id: 'autonomia-proatividade', nome: 'Autonomia e proatividade', categoria: 'Desempenho', icon: '💡', bg: '#FAEEDA',
    descricao: 'Neste último semestre, demonstrou iniciativa para antecipar problemas e agir com autonomia, sem a necessidade de direcionamento constante?',
    criterios: [
      'Necessitou de direcionamento constante para iniciar ou avançar das tarefas; raramente agiu por iniciativa própria.',
      'Executou bem quando orientado, mas raramente tomou iniciativa ou antecipou situações sem ser solicitado.',
      'Atuou com autonomia na maior parte das situações e demonstrou iniciativa em contextos conhecidos.',
      'Agiu de forma independente, antecipou problemas e propôs soluções antes de ser acionado.',
      'Referência em proatividade: identificou oportunidades de melhoria, mobilizou pessoas e gerou movimento sem depender de estímulos externos.',
    ],
  },
  {
    id: 'impacto-time', nome: 'Impacto no time / área', categoria: 'Desempenho', icon: '🔄', bg: '#FAECE7',
    descricao: 'Considerando os desafios do semestre, de que forma as entregas e atitudes impactaram e elevaram o resultado coletivo do time ou da área?',
    criterios: [
      'Suas ações têm pouco ou nenhum impacto no resultado coletivo; por vezes gera retrabalho para outros.',
      'Contribuiu de forma isolada, com pouca integração ou impacto perceptível no resultado do time.',
      'Suas entregas contribuíram de forma consistente para os objetivos da área, colaborando bem com o coletivo.',
      'Gerou impacto claro no time: potencializou resultados, apoia colegas e é reconhecido como peça importante.',
      'Multiplica resultados coletivos: eleva o nível do time, compartilha conhecimento e é referência de colaboração.',
    ],
  },
  {
    id: 'evolucao-periodo', nome: 'Evolução no período', categoria: 'Desempenho', icon: '⭐', bg: '#E6F1FB',
    descricao: 'Apresentou melhora em relação ao ciclo anterior (ou ao início)?',
    criterios: [
      'Não demonstra evolução perceptível; repetiu os mesmos padrões ou dificuldades do ciclo anterior.',
      'Evolução tímida e pontual; avanços ocorrem, mas sem consistência ou aplicação prática clara.',
      'Apresenta evolução visível em aspectos relevantes, com aplicação prática das aprendizagens.',
      'Demonstra crescimento consistente e expressivo; incorpora feedbacks e evolui de forma autônoma.',
      'Evolução notável e inspiradora: supera expectativas de desenvolvimento e se torna referência para o time.',
    ],
  },
]

const COMP_POTENCIAL: Competencia[] = [
  {
    id: 'foco-cliente', nome: 'Foco no/do Cliente', categoria: 'Potencial', icon: '🎯', bg: '#E1F5EE',
    descricao: 'Nas interações e projetos deste semestre, como a pessoa traduziu as necessidades dos clientes em soluções de valor real através de escuta ativa e empatia?',
    criterios: [
      'Raramente demonstrou interesse genuíno pelo cliente ou suas necessidades.',
      'Atendeu demandas básicas, mas sem proatividade ou escuta ativa consistente.',
      'Demonstrou interesse pelo cliente e buscou soluções satisfatórias na maior parte das situações.',
      'Praticou escuta ativa, comunicou com clareza e entregou soluções que o cliente percebe como valor.',
      'Referência em orientação ao cliente: antecipa necessidades, supera expectativas e inspira outros.',
    ],
  },
  {
    id: 'foco-resultado', nome: 'Foco no Resultado', categoria: 'Potencial', icon: '📈', bg: '#EEEDFE',
    descricao: 'Frente aos acontecimentos deste semestre, a pessoa utilizou o tempo e os recursos de forma eficiente para fazer acontecer e garantir as entregas?',
    criterios: [
      'Dificuldade para cumprir metas e prazos; uso ineficiente de recursos.',
      'Entregou resultados parciais ou com qualidade/prazo abaixo do esperado com frequência.',
      'Atingiu as metas na maioria das vezes, respeitando qualidade e prazo.',
      'Cumpriu consistentemente as metas com qualidade; prioriza bem e se adapta às mudanças.',
      'Superou metas de forma consistente; foi referência em eficiência e entrega de impacto.',
    ],
  },
  {
    id: 'empreendedorismo', nome: 'Empreendedorismo Interno', categoria: 'Potencial', icon: '💡', bg: '#FAEEDA',
    descricao: 'Ao longo do último semestre, de que maneira a pessoa identificou oportunidades e transformou ideias em ações inovadoras para o negócio?',
    criterios: [
      'Não demonstrou iniciativa ou interesse em identificar melhorias e oportunidades.',
      'Eventualmente sugeriu ideias, mas raramente as transformou em ações concretas.',
      'Propôs melhorias com alguma frequência e implementou soluções simples.',
      'Identificou oportunidades, agiu de forma proativa e transformou ideias em resultados com consistência.',
      'Intraempreendedor nato: liderou inovações, gerou valor sustentável e inspirou a equipe.',
    ],
  },
  {
    id: 'resiliencia', nome: 'Resiliência', categoria: 'Potencial', icon: '🔄', bg: '#FAECE7',
    descricao: 'Diante dos acontecimentos e mudanças ocorridas neste semestre, como a pessoa reagiu emocionalmente e o quanto aprendeu com os erros para continuar motivada?',
    criterios: [
      'Abalou-se facilmente diante de pressão ou adversidade; dificuldade para se recuperar.',
      'Reagiu ao estresse com alguma instabilidade; recuperação lenta após dificuldades.',
      'Manteve o equilíbrio na maioria das situações adversas e aprendeu com os erros.',
      'Enfrentou desafios com maturidade emocional, adaptou-se rápido e manteve a motivação.',
      'Modelo de resiliência: inspirou o time em momentos difíceis e cresceu com cada adversidade.',
    ],
  },
  {
    id: 'alta-performance', nome: 'Alta e Consistente Performance', categoria: 'Potencial', icon: '⭐', bg: '#E6F1FB',
    descricao: 'Avaliando a jornada deste semestre como um todo, a pessoa manteve o nível de excelência e organização de forma constante e responsável?',
    criterios: [
      'Performance instável; frequentes lacunas de qualidade, prazo ou organização.',
      'Entrega abaixo do esperado em algumas áreas; desempenho inconsistente.',
      'Mantém bom nível de performance com pequenas oscilações; confiável na maioria das situações.',
      'Performance elevada e consistente; referência em organização, qualidade e prazo.',
      'Performance exemplar: entrega com excelência mesmo sob alta pressão; inspira o time.',
    ],
  },
]

const COMP_LIDERANCA: Competencia[] = [
  {
    id: 'liderando-negocio', nome: 'Liderando o Negócio', categoria: 'Liderança', icon: '🧭', bg: '#EAF3DE',
    descricao: 'No decorrer deste semestre, como o líder identificou tendências e direcionou a equipe estrategicamente para as prioridades do negócio?',
    criterios: [
      'Pouca visão estratégica; dificuldade para conectar o trabalho do time aos objetivos do negócio.',
      'Entendeu o negócio, mas raramente traduziu isso em direcionamento claro para a equipe.',
      'Comunicou prioridades e entregas com regularidade; manteve o time alinhado na maioria das vezes.',
      'Teve visão estratégica e direcionou o time com clareza, antecipando tendências e oportunidades.',
      'Liderou o negócio com excelência: visão de longo prazo, decisões assertivas e time engajado.',
    ],
  },
  {
    id: 'liderando-pessoas', nome: 'Liderando Pessoas', categoria: 'Liderança', icon: '🤝', bg: '#FBEAF0',
    descricao: 'No dia a dia deste último semestre, o líder agiu como um exemplo inspirador, promovendo um ambiente de escuta, confiança e desenvolvimento?',
    criterios: [
      'Dificuldade para inspirar, motivar ou criar um ambiente de confiança e respeito.',
      'Relação com o time é funcional, mas com pouco investimento em engajamento e desenvolvimento.',
      'Construiu boas relações, promoveu respeito e apoiou o time com regularidade.',
      'Inspirou confiança, promoveu ambiente positivo e desenvolveu as pessoas com propósito.',
      'Líder referência: criou cultura de alta confiança, reteve talentos e multiplicou líderes.',
    ],
  },
  {
    id: 'liderando-si', nome: 'Liderando a Si Mesmo', categoria: 'Liderança', icon: '🪞', bg: '#EEEDFE',
    descricao: 'Considerando o seu desenvolvimento neste semestre, como o líder demonstrou autoconhecimento e equilíbrio emocional para buscar melhoria contínua?',
    criterios: [
      'Baixo autoconhecimento; dificuldade para reconhecer pontos de melhoria e gerenciar emoções.',
      'Alguma consciência sobre si, mas com dificuldade para transformar isso em desenvolvimento.',
      'Reconhece suas forças e limitações; age com responsabilidade e busca melhoria contínua.',
      'Alto nível de autoconhecimento; age com equilíbrio, responsabilidade e busca constante evolução.',
      'Referência em autodesenvolvimento: reflexivo, equilibrado e em constante crescimento.',
    ],
  },
]

const NIVEIS_LIDERANCA: NivelCargo[] = ['senior', 'supervisor', 'especialista', 'coordenador', 'gerente', 'diretor']
const LABELS_NOTA = ['Muito baixo', 'Abaixo', 'Adequado', 'Acima', 'Referência']

const PERIODOS = [
  { value: '2Sem_2024', label: '2º Semestre / 2024' },
  { value: '1Sem_2025', label: '1º Semestre / 2025' },
  { value: '2Sem_2025', label: '2º Semestre / 2025' },
  { value: '1Sem_2026', label: '1º Semestre / 2026' },
  { value: '2Sem_2026', label: '2º Semestre / 2026' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classificarEixo(media: number): string {
  if (media >= 3.7) return 'Alto'
  if (media >= 2.7) return 'Médio'
  return 'Baixo'
}

function getQuadrante(potencial: string, desempenho: string): string {
  const row = potencial === 'Alto' ? 'E' : potencial === 'Médio' ? 'M' : 'B'
  const col = desempenho === 'Alto' ? '3' : desempenho === 'Médio' ? '2' : '1'
  return row + col
}

const QUADRANTE_INFO: Record<string, { label: string; bg: string; border: string }> = {
  E3: { label: 'Talento Top / Estrela',   bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
  E2: { label: 'Potencial Forte',         bg: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-800' },
  E1: { label: 'Enigma',                  bg: 'bg-slate-50 dark:bg-slate-800',       border: 'border-slate-200 dark:border-slate-600' },
  M3: { label: 'Forte Desempenho',        bg: 'bg-teal-50 dark:bg-teal-900/20',     border: 'border-teal-200 dark:border-teal-800' },
  M2: { label: 'Mantenedor / Eficaz',     bg: 'bg-slate-50 dark:bg-slate-800',       border: 'border-slate-200 dark:border-slate-600' },
  M1: { label: 'Questionável',            bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800' },
  B3: { label: 'Dedicado / Especialista', bg: 'bg-slate-50 dark:bg-slate-800',       border: 'border-slate-200 dark:border-slate-600' },
  B2: { label: 'Bom Profissional',        bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
  B1: { label: 'Risco / Subpadrão',       bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800' },
}

const NINE_BOX_CELLS = [
  ['E1','E2','E3'],
  ['M1','M2','M3'],
  ['B1','B2','B3'],
]

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CompCardProps {
  comp: Competencia
  tipo: 'desempenho' | 'potencial' | 'lideranca'
  rating?: number
  observation?: string
  hoveredV?: number
  onRate: (v: number) => void
  onHover: (v: number | null) => void
  onObsChange: (v: string) => void
}

function CompCard({ comp, tipo, rating, observation, hoveredV, onRate, onHover, onObsChange }: CompCardProps) {
  const isRated = rating != null

  const criterioText = hoveredV != null
    ? `Nível ${hoveredV}: ${comp.criterios[hoveredV - 1]}`
    : rating != null
      ? `Nível ${rating}: ${comp.criterios[rating - 1]}`
      : 'Passe o mouse sobre uma nota para ver a descrição do nível.'

  const borderClass = isRated
    ? tipo === 'potencial' ? 'border-slate-700 dark:border-slate-400'
    : tipo === 'lideranca' ? 'border-lime-600'
    : 'border-primary-500'
    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'

  const selectedClass = (v: number) => {
    if (rating !== v) return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-primary-400'
    return tipo === 'potencial' ? 'bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 text-white dark:text-slate-900'
      : tipo === 'lideranca' ? 'bg-lime-600 border-lime-600 text-white'
      : 'bg-primary-600 border-primary-600 text-white'
  }

  const categoryColor = tipo === 'potencial'
    ? 'text-slate-600 dark:text-slate-400'
    : tipo === 'lideranca'
      ? 'text-lime-700 dark:text-lime-500'
      : 'text-primary-600 dark:text-primary-400'

  const statusClass = isRated
    ? tipo === 'potencial' ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    : tipo === 'lideranca' ? 'bg-lime-50 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400'
    : 'bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400'
    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'

  const requiresObs = rating === 1 || rating === 5

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${borderClass}`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: comp.bg }}>
          {comp.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{comp.nome}</p>
          <p className={`text-xs font-medium uppercase tracking-wide ${categoryColor}`}>{tipo === 'potencial' ? 'Potencial' : comp.categoria}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusClass}`}>
          {isRated ? `Nota ${rating}` : 'Pendente'}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500 dark:text-slate-400 px-4 pb-3 leading-relaxed">{comp.descricao}</p>

      {/* Rating */}
      <div className="px-4 pt-3 pb-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Nível observado — escolha de 1 a 5</p>
        <div className="grid grid-cols-5 gap-2">
          {[1,2,3,4,5].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => onRate(v)}
              onMouseEnter={() => onHover(v)}
              onMouseLeave={() => onHover(null)}
              className={`rounded-xl border py-2 text-center transition-all text-xs font-medium ${selectedClass(v)}`}
            >
              <span className="block text-base font-semibold">{v}</span>
              <span className={`block text-[10px] leading-tight mt-0.5 ${rating === v ? 'opacity-80' : 'text-slate-400 dark:text-slate-500'}`}>
                {LABELS_NOTA[v - 1]}
              </span>
            </button>
          ))}
        </div>

        {/* Criteria display */}
        <div className={`text-xs text-slate-500 dark:text-slate-400 p-2 rounded-lg bg-white dark:bg-slate-800 leading-relaxed min-h-[40px] transition-all ${(hoveredV != null || rating != null) ? 'border-l-2 border-primary-400 pl-3' : ''}`}>
          {criterioText}
        </div>

        {/* Observation */}
        {requiresObs && (
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
            ⚠️ Justificativa obrigatória para notas 1 e 5:
          </p>
        )}
        <textarea
          value={observation || ''}
          onChange={e => onObsChange(e.target.value)}
          placeholder={requiresObs ? 'Preenchimento obrigatório — cite fatos e dados concretos...' : 'Observações, exemplos ou evidências (opcional)...'}
          rows={2}
          className={`w-full text-xs rounded-xl px-3 py-2 resize-y outline-none transition-all font-sans
            ${requiresObs && !observation?.trim()
              ? 'border-2 border-dashed border-red-400 bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 placeholder-red-400'
              : 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:border-primary-400 focus:ring-1 focus:ring-primary-200'
            }`}
        />
      </div>
    </div>
  )
}

// ─── 9-Box Grid ───────────────────────────────────────────────────────────────

function NineBoxGrid({ quadrante, nomeAvaliado }: { quadrante: string; nomeAvaliado: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex items-center justify-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Potencial (Y)</span>
      </div>
      <div className="flex-1">
        <div className="grid grid-cols-3 gap-1.5" style={{ aspectRatio: '1.4/1' }}>
          {NINE_BOX_CELLS.flat().map(id => {
            const info = QUADRANTE_INFO[id]
            const isHighlighted = id === quadrante
            return (
              <div
                key={id}
                className={`rounded-xl border p-2 flex flex-col justify-between transition-all duration-300 ${info.bg} ${info.border}
                  ${isHighlighted ? 'border-2 !border-slate-900 dark:!border-slate-100 shadow-lg scale-105 z-10 relative' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-medium text-slate-400">{id[0] === 'E' ? 'Alto' : id[0] === 'M' ? 'Médio' : 'Baixo'}</span>
                  <span className={`text-[9px] font-bold ${isHighlighted ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>{id}</span>
                </div>
                <p className={`text-[10px] font-semibold leading-tight ${isHighlighted ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {info.label}
                </p>
                {isHighlighted && (
                  <div className="mt-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[9px] font-medium px-1.5 py-0.5 rounded-md truncate text-center animate-fade-in">
                    {nomeAvaliado}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mt-2">
          Desempenho (X) → Baixo — Médio — Alto
        </p>
      </div>
    </div>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 dark:text-slate-400 w-44 text-right shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value / 5) * 100}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-5 shrink-0">{value}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NovaAvaliacao() {
  const { colaboradorId } = useParams<{ colaboradorId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [colab, setColab] = useState<Colaborador | null>(null)
  const [loadingColab, setLoadingColab] = useState(true)

  // Form state
  const [avaliador, setAvaliador] = useState(user?.name ?? '')
  const [tipo, setTipo] = useState('')
  const [periodoInicial, setPeriodoInicial] = useState('')
  const [periodoFinal, setPeriodoFinal] = useState('')

  // Ratings
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [observations, setObservations] = useState<Record<string, string>>({})
  const [hovered, setHovered] = useState<Record<string, number>>({})

  // Results
  const [showResults, setShowResults] = useState(false)
  const [result, setResult] = useState<{ avgDesempenho: number; avgPotencial: number; quadrante: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!colaboradorId) return
      try {
        const c = await api.colaboradores.get(Number(colaboradorId)) as Colaborador
        setColab(c ?? null)
      } finally {
        setLoadingColab(false)
      }
    }
    load()
  }, [colaboradorId])

  if (loadingColab) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={18} className="animate-spin" /> <span className="text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!colab) {
    return <div className="p-6"><div className="card p-12 text-center"><p className="text-slate-500">Colaborador não encontrado.</p></div></div>
  }

  const nivel = colab.nivel as NivelCargo | undefined
  const temLideranca = nivel ? NIVEIS_LIDERANCA.includes(nivel) : false
  const compDesempenho = temLideranca ? COMP_DESEMPENHO.slice(0, 4) : COMP_DESEMPENHO
  const compLideranca  = temLideranca ? COMP_LIDERANCA : []
  const todasComps     = [...compDesempenho, ...COMP_POTENCIAL, ...compLideranca]
  const totalPerguntas = todasComps.length

  // Progress
  const done = todasComps.filter(c => ratings[c.id] != null).length
  const obsOk = todasComps.every(c => {
    const r = ratings[c.id]
    if (r === 1 || r === 5) return (observations[c.id] ?? '').trim().length > 0
    return true
  })
  const progressPct = Math.round((done / totalPerguntas) * 100)
  const canGenerate = done === totalPerguntas && obsOk && tipo && periodoInicial && periodoFinal

  const handleRate = (id: string, v: number) => setRatings(r => ({ ...r, [id]: v }))
  const handleHover = (id: string, v: number | null) => setHovered(h => {
    const n = { ...h }
    if (v == null) delete n[id]; else n[id] = v
    return n
  })
  const handleObs = (id: string, v: string) => setObservations(o => ({ ...o, [id]: v }))

  const handleGenerate = () => {
    const somaDesemp = [...compDesempenho, ...compLideranca].reduce((s, c) => s + (ratings[c.id] ?? 0), 0)
    const divisorDesemp = compDesempenho.length + compLideranca.length
    const avgDesempenho = somaDesemp / divisorDesemp

    const somaPot = COMP_POTENCIAL.reduce((s, c) => s + (ratings[c.id] ?? 0), 0)
    const avgPotencial = somaPot / COMP_POTENCIAL.length

    const nivelDesemp = classificarEixo(avgDesempenho)
    const nivelPot    = classificarEixo(avgPotencial)
    const quadrante   = getQuadrante(nivelPot, nivelDesemp)

    setResult({ avgDesempenho, avgPotencial, quadrante })
    setShowResults(true)
    setTimeout(() => document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    try {
      const respostas: Record<string, { nota: number; observacao?: string }> = {}
      for (const c of todasComps) {
        respostas[c.id] = { nota: ratings[c.id], observacao: observations[c.id] || undefined }
      }
      await api.avaliacoes.create({
        colaborador_id:  colab.id,
        colaborador_nome: colab.nome,
        avaliador_nome:  avaliador || user?.name,
        tipo:            tipo as 'autoavaliacao' | 'lideranca',
        periodo_inicial: periodoInicial,
        periodo_final:   periodoFinal,
        nivel_cargo:     nivel,
        score_desempenho: parseFloat(result.avgDesempenho.toFixed(2)),
        score_potencial:  parseFloat(result.avgPotencial.toFixed(2)),
        nivel_desempenho: classificarEixo(result.avgDesempenho),
        nivel_potencial:  classificarEixo(result.avgPotencial),
        quadrante:       result.quadrante,
        respostas,
        status:          'concluido',
      })
      setSaved(true)
      setTimeout(() => navigate(`/colaboradores/${colab.id}`), 1500)
    } catch (err) {
      alert('Erro ao salvar: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const QUADRANTE_LABELS_LOCAL: Record<string, string> = {
    E3: 'Talento Top / Estrela', E2: 'Potencial Forte', E1: 'Enigma',
    M3: 'Forte Desempenho', M2: 'Mantenedor / Eficaz', M1: 'Questionável',
    B3: 'Dedicado / Especialista', B2: 'Bom Profissional', B1: 'Risco / Subpadrão',
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(`/colaboradores/${colab.id}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft size={15} /> {colab.nome}
        </button>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Nova avaliação</span>
      </div>

      {/* Header */}
      <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-700">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Avaliação de Desempenho e Potencial</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto">
          Identifique o nível de entrega (Desempenho) e a capacidade de crescimento (Potencial) para posicionamento na Matriz 9 Box.
        </p>
      </div>

      {/* Identity */}
      <div className="card p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Identificação Corporativa</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Colaborador avaliado</label>
            <input className="input bg-slate-50 dark:bg-slate-900/50" value={colab.nome} readOnly />
          </div>
          <div>
            <label className="label">Cargo / Nível</label>
            <input className="input bg-slate-50 dark:bg-slate-900/50" value={`${colab.cargo || ''}${nivel ? ' · ' + NIVEL_LABELS[nivel] : ''}`} readOnly />
          </div>
          <div>
            <label className="label">Avaliador</label>
            <input className="input" value={avaliador} onChange={e => setAvaliador(e.target.value)} placeholder="Nome do avaliador" />
          </div>
          <div>
            <label className="label">Tipo de avaliação</label>
            <select className="input" value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">Selecione</option>
              <option value="autoavaliacao">Autoavaliação Semestral</option>
              <option value="lideranca">Avaliação pela liderança (Top-Down)</option>
            </select>
          </div>
          <div>
            <label className="label">Semestre inicial</label>
            <select className="input" value={periodoInicial} onChange={e => setPeriodoInicial(e.target.value)}>
              <option value="">Selecione</option>
              {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Semestre final</label>
            <select className="input" value={periodoFinal} onChange={e => setPeriodoFinal(e.target.value)}>
              <option value="">Selecione</option>
              {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">{done} de {totalPerguntas} quesitos respondidos</span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all duration-400" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Desempenho */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest">Eixo X: Desempenho (Entregas)</span>
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
        </div>
        {compDesempenho.map(c => (
          <CompCard key={c.id} comp={c} tipo="desempenho"
            rating={ratings[c.id]} observation={observations[c.id]} hoveredV={hovered[c.id] ?? undefined}
            onRate={v => handleRate(c.id, v)} onHover={v => handleHover(c.id, v)} onObsChange={v => handleObs(c.id, v)} />
        ))}
      </div>

      {/* Potencial */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Eixo Y: Potencial (Competências FFERA)</span>
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
        </div>
        {COMP_POTENCIAL.map(c => (
          <CompCard key={c.id} comp={c} tipo="potencial"
            rating={ratings[c.id]} observation={observations[c.id]} hoveredV={hovered[c.id] ?? undefined}
            onRate={v => handleRate(c.id, v)} onHover={v => handleHover(c.id, v)} onObsChange={v => handleObs(c.id, v)} />
        ))}
      </div>

      {/* Liderança */}
      {temLideranca && compLideranca.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
            <span className="text-xs font-semibold text-lime-700 dark:text-lime-500 uppercase tracking-widest">Competências de Liderança</span>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
          </div>
          {compLideranca.map(c => (
            <CompCard key={c.id} comp={c} tipo="lideranca"
              rating={ratings[c.id]} observation={observations[c.id]} hoveredV={hovered[c.id] ?? undefined}
              onRate={v => handleRate(c.id, v)} onHover={v => handleHover(c.id, v)} onObsChange={v => handleObs(c.id, v)} />
          ))}
        </div>
      )}

      {/* Action */}
      <div className="flex justify-center gap-3 pt-2">
        <button type="button" onClick={() => navigate(`/colaboradores/${colab.id}`)} className="btn-secondary">
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="btn-primary disabled:opacity-40"
        >
          Ver resultado consolidado
        </button>
      </div>

      {/* Results */}
      {showResults && result && (
        <div id="results-section" className="card p-6 space-y-6 animate-slide-up">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Resumo dos Eixos Semestrais</p>

          {/* Score circles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <div className="w-20 h-20 rounded-full border-4 border-primary-500 flex flex-col items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-primary-600">{result.avgDesempenho.toFixed(1)}</span>
                <span className="text-xs text-slate-400">/5,0</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Eixo X: Desempenho</p>
              <p className="text-xs text-slate-400 mt-0.5">Nível: {classificarEixo(result.avgDesempenho)}</p>
            </div>
            <div className="text-center p-5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <div className="w-20 h-20 rounded-full border-4 border-slate-700 dark:border-slate-400 flex flex-col items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{result.avgPotencial.toFixed(1)}</span>
                <span className="text-xs text-slate-400">/5,0</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Eixo Y: Potencial</p>
              <p className="text-xs text-slate-400 mt-0.5">Nível: {classificarEixo(result.avgPotencial)}</p>
            </div>
          </div>

          {/* Quadrant result */}
          <div className="text-center p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <p className="text-xs text-primary-600 dark:text-primary-400 uppercase tracking-widest font-medium mb-1">Quadrante identificado</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{result.quadrante}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{QUADRANTE_LABELS_LOCAL[result.quadrante]}</p>
          </div>

          {/* 9-Box grid */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Matriz 9 Box</p>
            <NineBoxGrid quadrante={result.quadrante} nomeAvaliado={colab.nome} />
          </div>

          {/* Bar chart */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Notas por Competência</p>
            <div className="space-y-2">
              {compDesempenho.map(c => <BarRow key={c.id} label={c.nome} value={ratings[c.id] ?? 0} color="#e30613" />)}
              {COMP_POTENCIAL.map(c => <BarRow key={c.id} label={c.nome} value={ratings[c.id] ?? 0} color="#1e293b" />)}
              {compLideranca.map(c => <BarRow key={c.id} label={c.nome} value={ratings[c.id] ?? 0} color="#65a30d" />)}
            </div>
          </div>

          {/* Save + Print */}
          <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button onClick={() => window.print()} className="btn-secondary gap-2 flex-1">
              <Printer size={14} /> Gerar PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="btn-primary gap-2 flex-1"
            >
              {saved ? '✓ Salvo!' : saving ? 'Salvando...' : <><Save size={14} /> Salvar avaliação</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
