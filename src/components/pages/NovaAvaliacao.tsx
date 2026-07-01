import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Save, CheckCircle2, AlertTriangle, User, Target, TrendingUp, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { Colaborador, NivelCargo, CicloAvaliacao } from '../../lib/types'
import { NIVEL_LABELS } from '../../lib/types'

// ─── Competency data ──────────────────────────────────────────────────────────

interface Competencia {
  id: string
  nome: string
  categoria: string
  icon: string
  descricao: string
  criterios: [string, string, string, string, string]
}

const COMP_DESEMPENHO: Competencia[] = [
  {
    id: 'qualidade-entregas', nome: 'Qualidade das entregas', categoria: 'Desempenho', icon: '🎯',
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
    id: 'cumprimento-prazos', nome: 'Cumprimento de prazos', categoria: 'Desempenho', icon: '📅',
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
    id: 'autonomia-proatividade', nome: 'Autonomia e proatividade', categoria: 'Desempenho', icon: '💡',
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
    id: 'impacto-time', nome: 'Impacto no time / área', categoria: 'Desempenho', icon: '🔄',
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
    id: 'evolucao-periodo', nome: 'Evolução no período', categoria: 'Desempenho', icon: '⭐',
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
    id: 'foco-cliente', nome: 'Foco no/do Cliente', categoria: 'Potencial', icon: '🎯',
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
    id: 'foco-resultado', nome: 'Foco no Resultado', categoria: 'Potencial', icon: '📈',
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
    id: 'empreendedorismo', nome: 'Empreendedorismo Interno', categoria: 'Potencial', icon: '💡',
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
    id: 'resiliencia', nome: 'Resiliência', categoria: 'Potencial', icon: '🔄',
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
    id: 'alta-performance', nome: 'Alta e Consistente Performance', categoria: 'Potencial', icon: '⭐',
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
    id: 'liderando-negocio', nome: 'Liderando o Negócio', categoria: 'Liderança', icon: '🧭',
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
    id: 'liderando-pessoas', nome: 'Liderando Pessoas', categoria: 'Liderança', icon: '🤝',
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
    id: 'liderando-si', nome: 'Liderando a Si Mesmo', categoria: 'Liderança', icon: '🪞',
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

const NIVEIS_LIDERANCA: NivelCargo[] = ['senior', 'supervisor', 'especialista', 'consultor', 'engenheiro', 'coordenador', 'gerente', 'gerente_executivo', 'diretor']

const PERIODOS = [
  { value: '2Sem_2024', label: '2º Semestre / 2024' },
  { value: '1Sem_2025', label: '1º Semestre / 2025' },
  { value: '2Sem_2025', label: '2º Semestre / 2025' },
  { value: '1Sem_2026', label: '1º Semestre / 2026' },
  { value: '2Sem_2026', label: '2º Semestre / 2026' },
]

const LABELS_NOTA = ['Muito baixo', 'Abaixo', 'Adequado', 'Acima', 'Referência']

const QUADRANTE_INFO: Record<string, { label: string; colors: string }> = {
  E3: { label: 'Talento Top / Estrela',    colors: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  E2: { label: 'Potencial Forte',          colors: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800' },
  E1: { label: 'Enigma',                   colors: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  M3: { label: 'Forte Desempenho',         colors: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  M2: { label: 'Mantenedor / Eficaz',      colors: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600' },
  M1: { label: 'Questionável',             colors: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  B3: { label: 'Dedicado / Especialista',  colors: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  B2: { label: 'Bom Profissional',         colors: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  B1: { label: 'Risco / Subpadrão',        colors: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800' },
}

const NINE_BOX_CELLS = [['E1','E2','E3'],['M1','M2','M3'],['B1','B2','B3']]

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── CompCard ─────────────────────────────────────────────────────────────────

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

const TIPO_THEME = {
  desempenho: {
    accent:      'border-l-primary-500',
    ratingBg:    'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/30',
    ratingHover: 'hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600',
    badge:       'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
    criterioBar: 'border-l-primary-400',
    obsReq:      'border-primary-300 dark:border-primary-700',
  },
  potencial: {
    accent:      'border-l-slate-500',
    ratingBg:    'bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 text-white dark:text-slate-900 shadow-lg shadow-slate-500/20',
    ratingHover: 'hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700',
    badge:       'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    criterioBar: 'border-l-slate-400',
    obsReq:      'border-slate-300 dark:border-slate-500',
  },
  lideranca: {
    accent:      'border-l-lime-500',
    ratingBg:    'bg-lime-600 border-lime-600 text-white shadow-lg shadow-lime-500/30',
    ratingHover: 'hover:border-lime-400 hover:bg-lime-50 dark:hover:bg-lime-900/20 hover:text-lime-700',
    badge:       'bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
    criterioBar: 'border-l-lime-400',
    obsReq:      'border-lime-300 dark:border-lime-700',
  },
}

function CompCard({ comp, tipo, rating, observation, hoveredV, onRate, onHover, onObsChange }: CompCardProps) {
  const [expanded, setExpanded] = useState(false)
  const theme = TIPO_THEME[tipo]
  const isRated = rating != null
  const requiresObs = rating === 1 || rating === 5
  const obsEmpty = requiresObs && !(observation ?? '').trim()

  const criterioText = hoveredV != null
    ? comp.criterios[hoveredV - 1]
    : rating != null
      ? comp.criterios[rating - 1]
      : null

  const criterioLabel = hoveredV != null
    ? `Nível ${hoveredV} — ${LABELS_NOTA[hoveredV - 1]}`
    : rating != null
      ? `Nível ${rating} — ${LABELS_NOTA[rating - 1]}`
      : null

  return (
    <div className={`card border-l-4 ${theme.accent} transition-all duration-200 ${obsEmpty ? 'ring-2 ring-red-300 dark:ring-red-800' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg bg-slate-50 dark:bg-slate-700/50">
          {comp.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{comp.nome}</p>
            {isRated && !obsEmpty && (
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            )}
            {obsEmpty && (
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">{comp.descricao}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isRated ? (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${theme.badge}`}>
              Nota {rating}
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400">
              Pendente
            </span>
          )}
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Rating + criteria */}
      <div className="px-4 pb-4 space-y-3">
        {/* 1-5 buttons */}
        <div className="grid grid-cols-5 gap-2">
          {[1,2,3,4,5].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => onRate(v)}
              onMouseEnter={() => onHover(v)}
              onMouseLeave={() => onHover(null)}
              className={`rounded-xl border-2 py-2.5 text-center transition-all duration-150 select-none
                ${rating === v
                  ? theme.ratingBg
                  : `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 ${theme.ratingHover}`
                }`}
            >
              <span className="block text-base font-bold leading-none">{v}</span>
              <span className={`block text-[10px] mt-1 leading-tight font-medium ${rating === v ? 'opacity-80' : 'text-slate-400 dark:text-slate-500'}`}>
                {LABELS_NOTA[v - 1]}
              </span>
            </button>
          ))}
        </div>

        {/* Criteria tooltip */}
        {criterioText && (
          <div className={`flex gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border-l-2 ${theme.criterioBar}`}>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{criterioLabel}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{criterioText}</p>
            </div>
          </div>
        )}

        {/* Expanded: full description */}
        {expanded && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{comp.descricao}</p>
          </div>
        )}

        {/* Observation */}
        {requiresObs && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <AlertTriangle size={12} />
            Justificativa obrigatória para notas 1 e 5
          </div>
        )}
        <div className="relative">
          <textarea
            value={observation || ''}
            onChange={e => onObsChange(e.target.value)}
            placeholder={requiresObs
              ? 'Preenchimento obrigatório — cite fatos e dados concretos...'
              : 'Observações, exemplos ou evidências (opcional)...'}
            rows={2}
            className={`w-full text-xs rounded-xl px-3 py-2.5 resize-y outline-none transition-all font-sans
              bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300
              placeholder-slate-400 dark:placeholder-slate-500
              ${obsEmpty
                ? 'border-2 border-dashed border-red-400 dark:border-red-600 bg-red-50/50 dark:bg-red-900/10'
                : 'border border-slate-200 dark:border-slate-600 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/20'
              }`}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider({ icon, label, color, sub }: { icon: React.ReactNode; label: string; color: string; sub?: string }) {
  return (
    <div className={`flex items-center gap-3 py-2 px-4 rounded-2xl ${color}`}>
      <div className="flex items-center gap-2.5">
        {icon}
        <div>
          <p className="text-sm font-bold">{label}</p>
          {sub && <p className="text-xs opacity-75">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── 9-Box grid ───────────────────────────────────────────────────────────────

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
                className={`rounded-xl border p-2 flex flex-col justify-between transition-all duration-300
                  ${info.colors}
                  ${isHighlighted ? 'border-2 !border-slate-900 dark:!border-slate-100 shadow-lg scale-105 z-10 relative' : 'opacity-60'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-medium opacity-60">{id[0] === 'E' ? 'Alto' : id[0] === 'M' ? 'Médio' : 'Baixo'}</span>
                  <span className={`text-[9px] font-bold ${isHighlighted ? 'opacity-100' : 'opacity-50'}`}>{id}</span>
                </div>
                <p className={`text-[10px] font-semibold leading-tight ${isHighlighted ? 'opacity-100' : 'opacity-50'}`}>
                  {info.label}
                </p>
                {isHighlighted && (
                  <div className="mt-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[9px] font-medium px-1.5 py-0.5 rounded-md truncate text-center">
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

// ─── Bar row ──────────────────────────────────────────────────────────────────

function BarRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 dark:text-slate-400 w-44 text-right shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value / 5) * 100}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-4 shrink-0">{value || '—'}</span>
    </div>
  )
}

// ─── Inferência de nível a partir do nome do cargo ───────────────────────────

function inferirNivel(cargo?: string): NivelCargo | '' {
  if (!cargo) return ''
  const c = cargo.toUpperCase()
  if (/DIR(ETOR)?/.test(c))                              return 'diretor'
  if (/GER(ENTE)?\s+EXEC/.test(c))                      return 'gerente_executivo'
  if (/GER(ENTE)?/.test(c))                              return 'gerente'
  if (/COORD(ENADOR)?/.test(c))                          return 'coordenador'
  if (/SUP(ERVISOR)?/.test(c))                           return 'supervisor'
  if (/ESP(ECIALISTA)?/.test(c))                         return 'especialista'
  if (/CONSUL(TOR)?/.test(c))                            return 'consultor'
  if (/ENG(ENHEIRO)?/.test(c))                           return 'engenheiro'
  if (/T[EÉ]CN(ICO)?/.test(c))                          return 'tecnico'
  if (/VEND(EDOR)?/.test(c))                             return 'vendedor'
  if (/ASSIST(ENTE)?/.test(c))                           return 'assistente'
  if (/S[EÊ]N?IOR|SR\.?$|SR\s/.test(c))                 return 'senior'
  if (/PLENO|PL\.?$|PL\s/.test(c))                      return 'pleno'
  if (/J[UÚ]NIOR|JR\.?$|JR\s/.test(c))                 return 'junior'
  if (/TRAINEE/.test(c))                                 return 'trainee'
  return ''
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NovaAvaliacao() {
  const { colaboradorId } = useParams<{ colaboradorId: string }>()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit') ? Number(searchParams.get('edit')) : null
  const isEditMode = editId != null

  const navigate = useNavigate()
  const { user } = useAuth()

  const [colab, setColab] = useState<Colaborador | null>(null)
  const [loadingColab, setLoadingColab] = useState(true)
  const [cicloAtivo, setCicloAtivo] = useState<{ id: number; periodo_inicial: string; prazo?: string } | null | undefined>(undefined)
  const [avaliador, setAvaliador] = useState(user?.name ?? '')
  const [nivelSelecionado, setNivelSelecionado] = useState<NivelCargo | ''>('')
  const [tipo, setTipo] = useState('lideranca')
  const [periodoInicial, setPeriodoInicial] = useState('')
  const [periodoFinal, setPeriodoFinal] = useState('')
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [observations, setObservations] = useState<Record<string, string>>({})
  const [hovered, setHovered] = useState<Record<string, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [result, setResult] = useState<{ avgDesempenho: number; avgPotencial: number; quadrante: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Converte data de prazo (YYYY-MM-DD) para código de semestre
  function prazoToSemestre(prazo: string): string {
    const d = new Date(prazo)
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth() + 1
    return month <= 6 ? `1Sem_${year}` : `2Sem_${year}`
  }

  // Normaliza resposta do ciclo: admin recebe array, gestor recebe objeto | null
  function normalizeCiclo(raw: unknown): { id: number; periodo_inicial: string; prazo?: string } | null {
    if (!raw) return null
    if (Array.isArray(raw)) {
      const aberto = (raw as { id: number; periodo_inicial: string; prazo?: string; status: string }[])
        .find(c => c.status === 'aberto')
      return aberto ?? null
    }
    return raw as { id: number; periodo_inicial: string; prazo?: string }
  }

  useEffect(() => {
    api.ciclos.getAtivo()
      .then((c) => setCicloAtivo(normalizeCiclo(c)))
      .catch(() => setCicloAtivo(null))
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!colaboradorId) return
      try {
        const c = await api.colaboradores.get(Number(colaboradorId)) as Colaborador
        setColab(c ?? null)
        const nivelDetectado = (c?.nivel as NivelCargo | undefined) || inferirNivel(c?.cargo) as NivelCargo
        if (nivelDetectado) setNivelSelecionado(nivelDetectado)
        if (editId) {
          const av = await api.avaliacoes.get(editId) as CicloAvaliacao
          if (av) {
            setAvaliador(av.avaliador_nome ?? '')
            setTipo(av.tipo ?? '')
            setPeriodoInicial(av.periodo_inicial ?? '')
            setPeriodoFinal(av.periodo_final ?? '')
            const resps = (av.respostas as unknown as Record<string, { nota?: number; rating?: number; observation?: string; observacao?: string }>) || {}
            const newRatings: Record<string, number> = {}
            const newObs: Record<string, string> = {}
            for (const [k, v] of Object.entries(resps)) {
              if (v.nota != null) newRatings[k] = v.nota
              else if (v.rating != null) newRatings[k] = v.rating
              if (v.observacao) newObs[k] = v.observacao
              else if (v.observation) newObs[k] = v.observation
            }
            setRatings(newRatings)
            setObservations(newObs)
          }
        } else {
          // Pre-fill period from active cycle
          const raw = await api.ciclos.getAtivo().catch(() => null)
          const ciclo = normalizeCiclo(raw)
          if (ciclo?.periodo_inicial) {
            setPeriodoInicial(ciclo.periodo_inicial)
            setPeriodoFinal(ciclo.prazo ? prazoToSemestre(ciclo.prazo) : ciclo.periodo_inicial)
          }
        }
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
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!colab) {
    return <div className="p-6"><div className="card p-12 text-center"><p className="text-slate-500">Colaborador não encontrado.</p></div></div>
  }

  const isGestor = user?.role === 'Gestor'
  if (!isEditMode && cicloAtivo === null && isGestor) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-fade-in">
        <button onClick={() => navigate(`/colaboradores/${colab.id}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-5">
          <ArrowLeft size={14} /> {colab.nome}
        </button>
        <div className="card p-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle size={28} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Nenhum ciclo de avaliação aberto</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
              O RH ainda não abriu um ciclo de avaliação. Aguarde a abertura do ciclo para enviar avaliações.
            </p>
          </div>
          <button onClick={() => navigate(`/colaboradores/${colab.id}`)} className="btn-secondary">
            Voltar
          </button>
        </div>
      </div>
    )
  }

  const nivel = (nivelSelecionado || colab.nivel) as NivelCargo | undefined
  const temLideranca = nivel ? NIVEIS_LIDERANCA.includes(nivel) : false
  const compDesempenho = temLideranca ? COMP_DESEMPENHO.slice(0, 4) : COMP_DESEMPENHO
  const compLideranca  = temLideranca ? COMP_LIDERANCA : []
  const todasComps     = [...compDesempenho, ...COMP_POTENCIAL, ...compLideranca]
  const totalPerguntas = todasComps.length

  const done = todasComps.filter(c => ratings[c.id] != null).length
  const obsOk = todasComps.every(c => {
    const r = ratings[c.id]
    if (r === 1 || r === 5) return (observations[c.id] ?? '').trim().length > 0
    return true
  })
  const progressPct = Math.round((done / totalPerguntas) * 100)
  const canGenerate = done === totalPerguntas && obsOk && tipo && periodoInicial && periodoFinal

  const handleRate   = (id: string, v: number) => setRatings(r => ({ ...r, [id]: v }))
  const handleHover  = (id: string, v: number | null) => setHovered(h => { const n = { ...h }; if (v == null) delete n[id]; else n[id] = v; return n })
  const handleObs    = (id: string, v: string) => setObservations(o => ({ ...o, [id]: v }))

  const handleGenerate = () => {
    const somaDesemp   = [...compDesempenho, ...compLideranca].reduce((s, c) => s + (ratings[c.id] ?? 0), 0)
    const divisorDesemp = compDesempenho.length + compLideranca.length
    const avgDesempenho = somaDesemp / divisorDesemp
    const somaPot       = COMP_POTENCIAL.reduce((s, c) => s + (ratings[c.id] ?? 0), 0)
    const avgPotencial  = somaPot / COMP_POTENCIAL.length
    const nivelDesemp   = classificarEixo(avgDesempenho)
    const nivelPot      = classificarEixo(avgPotencial)
    const quadrante     = getQuadrante(nivelPot, nivelDesemp)
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
      const payload = {
        colaborador_id:   colab.id,
        colaborador_nome: colab.nome,
        avaliador_nome:   avaliador || user?.name,
        tipo:             tipo as 'autoavaliacao' | 'lideranca',
        periodo_inicial:  periodoInicial,
        periodo_final:    periodoFinal,
        nivel_cargo:      nivel,
        score_desempenho: parseFloat(result.avgDesempenho.toFixed(2)),
        score_potencial:  parseFloat(result.avgPotencial.toFixed(2)),
        nivel_desempenho: classificarEixo(result.avgDesempenho),
        nivel_potencial:  classificarEixo(result.avgPotencial),
        quadrante:        result.quadrante,
        respostas,
      }
      if (isEditMode && editId) {
        await api.avaliacoes.update(editId, payload as unknown as Partial<CicloAvaliacao>)
        setSaved(true)
        setTimeout(() => navigate(`/avaliacoes/${editId}`), 1500)
      } else {
        await api.avaliacoes.create(payload as unknown as Partial<CicloAvaliacao>)
        setSaved(true)
        setTimeout(() => navigate(`/colaboradores/${colab.id}`), 1500)
      }
    } catch (err) {
      alert('Erro ao salvar: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // avatar initial color
  const initials = colab.nome.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5 animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate(`/colaboradores/${colab.id}`)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={14} /> {colab.nome}
        </button>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-700 dark:text-slate-300 font-medium">
          {isEditMode ? 'Editar avaliação' : 'Nova avaliação'}
        </span>
      </div>

      {/* Hero card */}
      <div className="card overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary-500 via-primary-400 to-teal-400" />
        <div className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0 shadow-inner">
            <span className="text-primary-700 dark:text-primary-300 text-xl font-black">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{colab.nome}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {colab.cargo}{nivel ? ` · ${NIVEL_LABELS[nivel]}` : ''}{colab.area ? ` · ${colab.area}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Avaliação</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isEditMode ? 'Edição' : 'Nova'}
            </p>
          </div>
        </div>
      </div>

      {/* Identificação */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User size={15} className="text-primary-500" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Identificação Corporativa</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Avaliador</label>
            <input className="input" value={avaliador} onChange={e => setAvaliador(e.target.value)} placeholder="Nome do avaliador" />
          </div>
          <div>
            <label className="label">Nível do cargo</label>
            <select
              className="input"
              value={nivelSelecionado}
              onChange={e => { setNivelSelecionado(e.target.value as NivelCargo | ''); setRatings({}); setObservations({}) }}
            >
              <option value="">Selecione o nível</option>
              {(Object.entries(NIVEL_LABELS) as [NivelCargo, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo de avaliação</label>
            <input className="input bg-slate-50 dark:bg-slate-800 cursor-not-allowed" value="Avaliação pela liderança (Top-Down)" readOnly />
          </div>
          <div>
            <label className="label">
              Semestre inicial
              {!isEditMode && cicloAtivo && <span className="ml-1.5 text-[10px] text-primary-500 font-semibold uppercase tracking-wide">Ciclo ativo</span>}
            </label>
            <select
              className="input disabled:opacity-60 disabled:cursor-not-allowed"
              value={periodoInicial}
              onChange={e => setPeriodoInicial(e.target.value)}
              disabled={!isEditMode && !!cicloAtivo}
            >
              <option value="">Selecione</option>
              {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">
              Semestre final
              {!isEditMode && cicloAtivo?.prazo && <span className="ml-1.5 text-[10px] text-primary-500 font-semibold uppercase tracking-wide">Prazo do ciclo</span>}
            </label>
            <select
              className="input disabled:opacity-60 disabled:cursor-not-allowed"
              value={periodoFinal}
              onChange={e => setPeriodoFinal(e.target.value)}
              disabled={!isEditMode && !!cicloAtivo}
            >
              <option value="">Selecione</option>
              {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Progress card */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Progresso da avaliação</p>
            <p className="text-xs text-slate-400 mt-0.5">{done} de {totalPerguntas} competências avaliadas</p>
          </div>
          <span className={`text-2xl font-black tabular-nums transition-colors ${
            progressPct === 100 ? 'text-emerald-500' : progressPct > 50 ? 'text-primary-500' : 'text-slate-400'
          }`}>{progressPct}%</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct === 100 ? 'bg-emerald-500' : 'bg-primary-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {!obsOk && done === totalPerguntas && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Preencha as justificativas obrigatórias das notas 1 e 5 para continuar.
          </p>
        )}
      </div>

      {/* Desempenho */}
      <div className="space-y-3">
        <SectionDivider
          icon={<Target size={16} className="text-primary-600 dark:text-primary-400" />}
          label="Eixo X — Desempenho"
          sub="Qualidade das entregas e impacto no período"
          color="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
        />
        {compDesempenho.map(c => (
          <CompCard key={c.id} comp={c} tipo="desempenho"
            rating={ratings[c.id]} observation={observations[c.id]} hoveredV={hovered[c.id]}
            onRate={v => handleRate(c.id, v)} onHover={v => handleHover(c.id, v)} onObsChange={v => handleObs(c.id, v)} />
        ))}
      </div>

      {/* Potencial */}
      <div className="space-y-3">
        <SectionDivider
          icon={<TrendingUp size={16} className="text-slate-600 dark:text-slate-400" />}
          label="Eixo Y — Potencial"
          sub="Competências FFERA — capacidade de crescimento"
          color="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300"
        />
        {COMP_POTENCIAL.map(c => (
          <CompCard key={c.id} comp={c} tipo="potencial"
            rating={ratings[c.id]} observation={observations[c.id]} hoveredV={hovered[c.id]}
            onRate={v => handleRate(c.id, v)} onHover={v => handleHover(c.id, v)} onObsChange={v => handleObs(c.id, v)} />
        ))}
      </div>

      {/* Liderança */}
      {temLideranca && compLideranca.length > 0 && (
        <div className="space-y-3">
          <SectionDivider
            icon={<Star size={16} className="text-lime-600 dark:text-lime-400" />}
            label="Competências de Liderança"
            sub="Avaliar somente para cargos de liderança"
            color="bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300"
          />
          {compLideranca.map(c => (
            <CompCard key={c.id} comp={c} tipo="lideranca"
              rating={ratings[c.id]} observation={observations[c.id]} hoveredV={hovered[c.id]}
              onRate={v => handleRate(c.id, v)} onHover={v => handleHover(c.id, v)} onObsChange={v => handleObs(c.id, v)} />
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div>
          {!canGenerate && (
            <p className="text-xs text-slate-400">
              {done < totalPerguntas
                ? `Faltam ${totalPerguntas - done} competência(s) para concluir`
                : !tipo || !periodoInicial || !periodoFinal
                  ? 'Preencha tipo e período antes de gerar'
                  : !obsOk
                    ? 'Preencha as justificativas obrigatórias'
                    : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => navigate(`/colaboradores/${colab.id}`)} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={handleGenerate} disabled={!canGenerate} className="btn-primary disabled:opacity-40">
            Ver resultado consolidado
          </button>
        </div>
      </div>

      {/* Results */}
      {showResults && result && (
        <div id="results-section" className="space-y-4 animate-fade-in">
          <div className="card overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary-500 to-teal-400" />
            <div className="p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Resultado Consolidado</p>

              {/* Score circles */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Desempenho', sub: 'Eixo X', value: result.avgDesempenho, ring: 'ring-primary-400', txt: 'text-primary-600 dark:text-primary-400' },
                  { label: 'Potencial',  sub: 'Eixo Y', value: result.avgPotencial,  ring: 'ring-slate-500',   txt: 'text-slate-700 dark:text-slate-300' },
                ].map(({ label, sub, value, ring, txt }) => (
                  <div key={label} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700">
                    <div className={`w-16 h-16 rounded-full ring-4 ${ring} flex flex-col items-center justify-center shrink-0`}>
                      <span className={`text-xl font-black tabular-nums ${txt}`}>{value.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400">/5,0</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</p>
                      <p className="text-xs text-slate-400">{sub}</p>
                      <p className={`text-xs font-semibold mt-1 ${txt}`}>Nível: {classificarEixo(value)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quadrant badge */}
              {(() => {
                const qi = QUADRANTE_INFO[result.quadrante]
                return (
                  <div className={`flex items-center justify-between p-4 rounded-2xl border-2 ${qi?.colors ?? ''}`}>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-0.5">Quadrante identificado</p>
                      <p className="text-3xl font-black">{result.quadrante}</p>
                      <p className="text-sm font-semibold mt-0.5">{qi?.label}</p>
                    </div>
                    <div className="opacity-20 text-6xl font-black select-none">{result.quadrante}</div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* 9-box */}
          <div className="card p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Matriz 9-Box</p>
            <NineBoxGrid quadrante={result.quadrante} nomeAvaliado={colab.nome} />
          </div>

          {/* Competency bars */}
          <div className="card p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Notas por Competência</p>
            <div className="space-y-2.5">
              {compDesempenho.map(c => <BarRow key={c.id} label={c.nome} value={ratings[c.id] ?? 0} color="var(--color-primary-500, #0f766e)" />)}
              {COMP_POTENCIAL.map(c => <BarRow key={c.id} label={c.nome} value={ratings[c.id] ?? 0} color="#475569" />)}
              {compLideranca.map(c => <BarRow key={c.id} label={c.nome} value={ratings[c.id] ?? 0} color="#65a30d" />)}
            </div>
          </div>

          {/* Save */}
          <div className="card p-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="btn-primary gap-2 flex-1 justify-center py-3"
            >
              {saved
                ? <><CheckCircle2 size={16} /> Avaliação salva!</>
                : saving
                  ? <><RefreshCw size={14} className="animate-spin" /> Salvando...</>
                  : <><Save size={14} /> {isEditMode ? 'Salvar alterações' : 'Salvar avaliação'}</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
