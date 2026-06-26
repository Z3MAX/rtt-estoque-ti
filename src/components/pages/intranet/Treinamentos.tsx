import { useState, useEffect } from 'react'
import {
  Search, X, BookOpen, Clock, Star, CheckCircle2, Play, Award,
  ChevronRight, Users, BarChart2, ShieldCheck, Video, FileText,
  HelpCircle, Lock, ChevronDown, ChevronUp, Layers, BadgeCheck,
  AlertTriangle, Eye,
} from 'lucide-react'
import { useAuth, isAdmin, isGestor } from '../../../lib/auth'
import { api } from '../../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Modulo {
  id: number
  titulo: string
  duracao: string
  tipo: 'video' | 'pdf' | 'quiz'
  concluido: boolean
}

interface Treinamento {
  id: number
  titulo: string
  descricao: string
  categoria: string
  duracao: string
  nivel: string
  obrigatorio: boolean
  instrutor: string
  avaliacao: number
  totalAlunos: number
  capa: { from: string; to: string }
  icone: string
  modulos: Modulo[]
  trilhaId?: number
}

interface Trilha {
  id: number
  titulo: string
  descricao: string
  cursoIds: number[]
  cor: string
}

interface ProgressoFuncionario {
  id: number
  nome: string
  cargo: string
  area: string
  progresso: Record<number, { pct: number; validado: boolean; dataValidacao?: string }>
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const TRILHAS: Trilha[] = [
  { id: 1, titulo: 'Trilha de Compliance',  descricao: 'Fundamentos legais e segurança',      cursoIds: [1, 2, 7], cor: 'from-rose-500 to-red-600' },
  { id: 2, titulo: 'Trilha de Liderança',   descricao: 'Desenvolva sua capacidade de liderar', cursoIds: [4, 3],    cor: 'from-violet-500 to-purple-600' },
  { id: 3, titulo: 'Trilha de Produtividade', descricao: 'Ferramentas e métodos de eficiência', cursoIds: [5, 8],   cor: 'from-sky-500 to-blue-600' },
]

const TREINAMENTOS: Treinamento[] = [
  {
    id: 1, titulo: 'LGPD e Proteção de Dados', descricao: 'Entenda os princípios da Lei Geral de Proteção de Dados e como aplicá-los no dia a dia da empresa, garantindo conformidade e segurança.',
    categoria: 'Compliance', duracao: '2h', nivel: 'Básico', obrigatorio: true, instrutor: 'Ana Beatriz Costa',
    avaliacao: 4.7, totalAlunos: 142, capa: { from: 'from-rose-500', to: 'to-red-600' }, icone: '🔒',
    trilhaId: 1,
    modulos: [
      { id: 11, titulo: 'Introdução à LGPD', duracao: '18min', tipo: 'video', concluido: true },
      { id: 12, titulo: 'Princípios e bases legais', duracao: '22min', tipo: 'video', concluido: true },
      { id: 13, titulo: 'Direitos dos titulares', duracao: '15min', tipo: 'video', concluido: true },
      { id: 14, titulo: 'Material de apoio', duracao: '—', tipo: 'pdf', concluido: false },
      { id: 15, titulo: 'Avaliação final', duracao: '20min', tipo: 'quiz', concluido: false },
    ],
  },
  {
    id: 2, titulo: 'Cultura de Segurança no Trabalho', descricao: 'Aprenda sobre prevenção de acidentes, uso de EPIs e procedimentos de emergência para manter um ambiente de trabalho seguro.',
    categoria: 'Segurança', duracao: '3h', nivel: 'Básico', obrigatorio: true, instrutor: 'Carlos Eduardo Lima',
    avaliacao: 4.5, totalAlunos: 138, capa: { from: 'from-amber-500', to: 'to-orange-600' }, icone: '⛑️',
    trilhaId: 1,
    modulos: [
      { id: 21, titulo: 'Introdução à segurança', duracao: '20min', tipo: 'video', concluido: true },
      { id: 22, titulo: 'EPIs obrigatórios', duracao: '25min', tipo: 'video', concluido: false },
      { id: 23, titulo: 'Procedimentos de emergência', duracao: '30min', tipo: 'video', concluido: false },
      { id: 24, titulo: 'Quiz de fixação', duracao: '15min', tipo: 'quiz', concluido: false },
    ],
  },
  {
    id: 3, titulo: 'Excelência no Atendimento', descricao: 'Técnicas e práticas para oferecer um atendimento de qualidade, fidelizar clientes e resolver conflitos com empatia.',
    categoria: 'Soft Skills', duracao: '1h30', nivel: 'Intermediário', obrigatorio: false, instrutor: 'Mariana Oliveira',
    avaliacao: 4.9, totalAlunos: 87, capa: { from: 'from-emerald-500', to: 'to-teal-600' }, icone: '🤝',
    trilhaId: 2,
    modulos: [
      { id: 31, titulo: 'Fundamentos do atendimento', duracao: '20min', tipo: 'video', concluido: true },
      { id: 32, titulo: 'Comunicação assertiva', duracao: '18min', tipo: 'video', concluido: true },
      { id: 33, titulo: 'Gestão de conflitos', duracao: '22min', tipo: 'video', concluido: true },
      { id: 34, titulo: 'Casos práticos', duracao: '15min', tipo: 'video', concluido: true },
      { id: 35, titulo: 'Avaliação', duracao: '15min', tipo: 'quiz', concluido: false },
    ],
  },
  {
    id: 4, titulo: 'Liderança Situacional', descricao: 'Aprenda a adaptar seu estilo de liderança conforme a maturidade e o contexto de cada colaborador para obter melhores resultados.',
    categoria: 'Liderança', duracao: '4h', nivel: 'Avançado', obrigatorio: false, instrutor: 'Ricardo Mendes',
    avaliacao: 4.8, totalAlunos: 63, capa: { from: 'from-violet-500', to: 'to-purple-600' }, icone: '🧭',
    trilhaId: 2,
    modulos: [
      { id: 41, titulo: 'Modelos de liderança', duracao: '30min', tipo: 'video', concluido: false },
      { id: 42, titulo: 'Liderança situacional — teoria', duracao: '35min', tipo: 'video', concluido: false },
      { id: 43, titulo: 'Diagnóstico de equipe', duracao: '25min', tipo: 'video', concluido: false },
      { id: 44, titulo: 'Aplicação prática', duracao: '40min', tipo: 'video', concluido: false },
      { id: 45, titulo: 'Material complementar', duracao: '—', tipo: 'pdf', concluido: false },
      { id: 46, titulo: 'Avaliação final', duracao: '20min', tipo: 'quiz', concluido: false },
    ],
  },
  {
    id: 5, titulo: 'Excel Avançado para Gestores', descricao: 'Domine tabelas dinâmicas, fórmulas avançadas, dashboards e automações com VBA para tomar decisões baseadas em dados.',
    categoria: 'Técnico', duracao: '5h', nivel: 'Avançado', obrigatorio: false, instrutor: 'Felipe Andrade',
    avaliacao: 4.6, totalAlunos: 55, capa: { from: 'from-sky-500', to: 'to-blue-600' }, icone: '📊',
    trilhaId: 3,
    modulos: [
      { id: 51, titulo: 'Revisão de fundamentos', duracao: '25min', tipo: 'video', concluido: false },
      { id: 52, titulo: 'Fórmulas avançadas', duracao: '40min', tipo: 'video', concluido: false },
      { id: 53, titulo: 'Tabelas dinâmicas', duracao: '35min', tipo: 'video', concluido: false },
      { id: 54, titulo: 'Dashboards interativos', duracao: '45min', tipo: 'video', concluido: false },
      { id: 55, titulo: 'Introdução ao VBA', duracao: '30min', tipo: 'video', concluido: false },
    ],
  },
  {
    id: 6, titulo: 'Comunicação Não-Violenta', descricao: 'Aprenda a CNV para melhorar seus relacionamentos profissionais e pessoais com empatia, escuta ativa e observação sem julgamento.',
    categoria: 'Soft Skills', duracao: '2h', nivel: 'Intermediário', obrigatorio: false, instrutor: 'Juliana Ferreira',
    avaliacao: 4.9, totalAlunos: 94, capa: { from: 'from-pink-500', to: 'to-rose-600' }, icone: '💬',
    modulos: [
      { id: 61, titulo: 'O que é CNV', duracao: '20min', tipo: 'video', concluido: true },
      { id: 62, titulo: 'Os 4 componentes', duracao: '25min', tipo: 'video', concluido: true },
      { id: 63, titulo: 'Escuta empática', duracao: '20min', tipo: 'video', concluido: true },
      { id: 64, titulo: 'Exercícios práticos', duracao: '15min', tipo: 'pdf', concluido: true },
      { id: 65, titulo: 'Avaliação final', duracao: '20min', tipo: 'quiz', concluido: true },
    ],
  },
  {
    id: 7, titulo: 'Normas de Segurança NR-12', descricao: 'Conheça os requisitos da NR-12 sobre segurança em máquinas e equipamentos, obrigatória para todas as áreas operacionais.',
    categoria: 'Segurança', duracao: '1h', nivel: 'Básico', obrigatorio: true, instrutor: 'Roberto Souza',
    avaliacao: 4.3, totalAlunos: 131, capa: { from: 'from-orange-500', to: 'to-red-500' }, icone: '⚙️',
    trilhaId: 1,
    modulos: [
      { id: 71, titulo: 'Introdução à NR-12', duracao: '15min', tipo: 'video', concluido: true },
      { id: 72, titulo: 'Requisitos de segurança', duracao: '20min', tipo: 'video', concluido: true },
      { id: 73, titulo: 'Avaliação', duracao: '10min', tipo: 'quiz', concluido: true },
    ],
  },
  {
    id: 8, titulo: 'Gestão de Tempo e Produtividade', descricao: 'Técnicas como GTD, Pomodoro, matriz de Eisenhower e planejamento semanal para maximizar seu rendimento e reduzir o estresse.',
    categoria: 'Soft Skills', duracao: '2h30', nivel: 'Básico', obrigatorio: false, instrutor: 'Camila Nunes',
    avaliacao: 4.7, totalAlunos: 109, capa: { from: 'from-indigo-500', to: 'to-blue-600' }, icone: '⏱️',
    trilhaId: 3,
    modulos: [
      { id: 81, titulo: 'Diagnóstico de tempo', duracao: '20min', tipo: 'video', concluido: false },
      { id: 82, titulo: 'Método GTD', duracao: '25min', tipo: 'video', concluido: false },
      { id: 83, titulo: 'Técnica Pomodoro', duracao: '15min', tipo: 'video', concluido: false },
      { id: 84, titulo: 'Planejamento semanal', duracao: '20min', tipo: 'video', concluido: false },
      { id: 85, titulo: 'Avaliação', duracao: '15min', tipo: 'quiz', concluido: false },
    ],
  },
]

const FUNCIONARIOS_MOCK: ProgressoFuncionario[] = [
  { id: 1, nome: 'Ana Silva',        cargo: 'Analista de RH',       area: 'Recursos Humanos',
    progresso: { 1: { pct: 60, validado: false }, 2: { pct: 30, validado: false }, 6: { pct: 100, validado: true, dataValidacao: '2025-05-20' }, 7: { pct: 100, validado: true, dataValidacao: '2025-05-18' } } },
  { id: 2, nome: 'Bruno Costa',      cargo: 'Analista Comercial',   area: 'Comercial',
    progresso: { 1: { pct: 100, validado: true, dataValidacao: '2025-06-01' }, 2: { pct: 75, validado: false }, 7: { pct: 100, validado: true, dataValidacao: '2025-06-03' } } },
  { id: 3, nome: 'Carlos Mendes',    cargo: 'Gerente de RH',        area: 'Recursos Humanos',
    progresso: { 1: { pct: 100, validado: true, dataValidacao: '2025-04-10' }, 2: { pct: 100, validado: true, dataValidacao: '2025-04-12' }, 4: { pct: 50, validado: false }, 6: { pct: 100, validado: true, dataValidacao: '2025-04-15' }, 7: { pct: 100, validado: true, dataValidacao: '2025-04-11' } } },
  { id: 4, nome: 'Daniela Rocha',    cargo: 'Coordenadora Fiscal',  area: 'Financeiro',
    progresso: { 1: { pct: 40, validado: false }, 7: { pct: 100, validado: true, dataValidacao: '2025-05-30' } } },
  { id: 5, nome: 'Eduardo Pires',    cargo: 'Assistente Comercial', area: 'Comercial',
    progresso: { 2: { pct: 20, validado: false } } },
  { id: 6, nome: 'Fernanda Lima',    cargo: 'Supervisora de Vendas',area: 'Comercial',
    progresso: { 1: { pct: 100, validado: true, dataValidacao: '2025-06-10' }, 2: { pct: 100, validado: false }, 3: { pct: 85, validado: false }, 7: { pct: 100, validado: true, dataValidacao: '2025-06-10' } } },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProgresso(t: Treinamento) {
  const total = t.modulos.length
  const feitos = t.modulos.filter(m => m.concluido).length
  return total === 0 ? 0 : Math.round((feitos / total) * 100)
}

const CATEGORIAS = ['Todos', 'Compliance', 'Liderança', 'Técnico', 'Soft Skills', 'Segurança']

const NIVEL_COLORS: Record<string, string> = {
  'Básico':        'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  'Intermediário': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  'Avançado':      'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
}

const TIPO_ICON: Record<string, JSX.Element> = {
  video: <Video size={13} className="text-primary-500" />,
  pdf:   <FileText size={13} className="text-amber-500" />,
  quiz:  <HelpCircle size={13} className="text-emerald-500" />,
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11} className={i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'} />
      ))}
      <span className="text-xs text-slate-500 ml-1">{value.toFixed(1)}</span>
    </div>
  )
}

function ProgressBar({ pct, sm }: { pct: number; sm?: boolean }) {
  return (
    <div className={`${sm ? 'h-1' : 'h-1.5'} bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── CourseCard ───────────────────────────────────────────────────────────────

function CourseCard({ t, onClick }: { t: Treinamento; onClick: () => void }) {
  const pct = getProgresso(t)
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-700 transition-all cursor-pointer group flex flex-col"
    >
      {/* Capa */}
      <div className={`bg-gradient-to-br ${t.capa.from} ${t.capa.to} h-28 flex items-center justify-center relative`}>
        <span className="text-5xl">{t.icone}</span>
        {t.obrigatorio && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30">
            Obrigatório
          </span>
        )}
        {pct === 100 && (
          <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow">
            <CheckCircle2 size={14} className="text-white" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${NIVEL_COLORS[t.nivel]}`}>{t.nivel}</span>
            <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{t.categoria}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
            {t.titulo}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.descricao}</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          <span className="flex items-center gap-1"><Clock size={11} />{t.duracao}</span>
          <span className="flex items-center gap-1"><Layers size={11} />{t.modulos.length} módulos</span>
          <span className="flex items-center gap-1"><Users size={11} />{t.totalAlunos}</span>
        </div>

        <Stars value={t.avaliacao} />

        <div className="mt-auto pt-1 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Progresso</span>
            <span className={`font-semibold ${pct === 100 ? 'text-emerald-600' : 'text-primary-600'}`}>{pct}%</span>
          </div>
          <ProgressBar pct={pct} />
        </div>

        <button
          onClick={e => { e.stopPropagation(); onClick() }}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors ${
            pct === 100
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {pct === 100 ? <><CheckCircle2 size={14} />Concluído</> : pct > 0 ? <><Play size={14} />Continuar</> : <><Play size={14} />Iniciar</>}
        </button>
      </div>
    </div>
  )
}

// ─── CourseModal ──────────────────────────────────────────────────────────────

function CourseModal({ t, onClose, onToggle }: {
  t: Treinamento
  onClose: () => void
  onToggle: (cursoId: number, moduloId: number, done: boolean) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(true)
  const pct = getProgresso(t)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header capa */}
        <div className={`bg-gradient-to-br ${t.capa.from} ${t.capa.to} px-6 py-8 relative shrink-0`}>
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
            <X size={15} />
          </button>
          <div className="flex items-end gap-4">
            <span className="text-5xl">{t.icone}</span>
            <div>
              <div className="flex gap-2 mb-1 flex-wrap">
                {t.obrigatorio && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">Obrigatório</span>}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">{t.nivel}</span>
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">{t.titulo}</h2>
              <p className="text-white/70 text-xs mt-0.5">por {t.instrutor}</p>
            </div>
          </div>
        </div>

        {/* Body scrollable */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Stats row */}
          <div className="flex gap-4 flex-wrap text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><Clock size={13} />{t.duracao} de conteúdo</span>
            <span className="flex items-center gap-1.5"><Layers size={13} />{t.modulos.length} módulos</span>
            <span className="flex items-center gap-1.5"><Users size={13} />{t.totalAlunos} alunos</span>
            <Stars value={t.avaliacao} />
          </div>

          {/* Descrição */}
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{t.descricao}</p>

          {/* Progresso */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Seu progresso</span>
              <span className={`text-sm font-bold ${pct === 100 ? 'text-emerald-600' : 'text-primary-600'}`}>{pct}%</span>
            </div>
            <ProgressBar pct={pct} />
            <p className="text-xs text-slate-400">
              {t.modulos.filter(m => m.concluido).length} de {t.modulos.length} módulos concluídos
            </p>
          </div>

          {/* Módulos */}
          <div>
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-full flex items-center justify-between py-2"
            >
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Conteúdo do curso</span>
              {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
            </button>
            {expanded && (
              <div className="space-y-2 mt-1">
                {t.modulos.map((m, idx) => {
                  const bloqueado = idx > 0 && !t.modulos[idx - 1].concluido
                  return (
                    <div
                      key={m.id}
                      onClick={() => !bloqueado && onToggle(t.id, m.id, !m.concluido)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        m.concluido
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 cursor-pointer'
                          : bloqueado
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 opacity-60'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 hover:border-primary-300 cursor-pointer'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                        {m.concluido
                          ? <CheckCircle2 size={20} className="text-emerald-500" />
                          : bloqueado
                          ? <Lock size={13} className="text-slate-400" />
                          : TIPO_ICON[m.tipo]
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{m.titulo}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{m.tipo} · {m.duracao}</p>
                      </div>
                      {!m.concluido && !bloqueado && (
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            pct === 100
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
              : 'bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/30'
          }`}>
            {pct === 100 ? <><Award size={15} />Ver certificado</> : pct > 0 ? <><Play size={15} />Continuar de onde parou</> : <><Play size={15} />Começar agora</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── TrilhaCard ───────────────────────────────────────────────────────────────

function TrilhaCard({ trilha, cursos, onCursoClick }: { trilha: Trilha; cursos: Treinamento[]; onCursoClick: (t: Treinamento) => void }) {
  const [open, setOpen] = useState(false)
  const total = cursos.reduce((a, t) => a + t.modulos.length, 0)
  const feitos = cursos.reduce((a, t) => a + t.modulos.filter(m => m.concluido).length, 0)
  const pct = total === 0 ? 0 : Math.round((feitos / total) * 100)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${trilha.cor} flex items-center justify-center shrink-0`}>
          <Layers size={22} className="text-white" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{trilha.titulo}</p>
          <p className="text-xs text-slate-400 mt-0.5">{trilha.descricao} · {cursos.length} cursos</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Progresso da trilha</span>
              <span className={`font-semibold ${pct === 100 ? 'text-emerald-600' : 'text-primary-600'}`}>{pct}%</span>
            </div>
            <ProgressBar pct={pct} sm />
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cursos.map((t, idx) => {
            const pctCurso = getProgresso(t)
            const bloqueado = idx > 0 && getProgresso(cursos[idx - 1]) < 100
            return (
              <button
                key={t.id}
                onClick={() => !bloqueado && onCursoClick(t)}
                disabled={bloqueado}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  bloqueado
                    ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-700/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-primary-50/30 dark:hover:bg-primary-900/10'
                }`}
              >
                <span className="text-2xl shrink-0">{t.icone}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{t.titulo}</p>
                    {bloqueado && <Lock size={11} className="text-slate-400 shrink-0" />}
                    {pctCurso === 100 && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                  </div>
                  <ProgressBar pct={pctCurso} sm />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── RH View ─────────────────────────────────────────────────────────────────

function RHView() {
  const [funcionarios, setFuncionarios] = useState<ProgressoFuncionario[]>(FUNCIONARIOS_MOCK)
  const [cursoSelecionado, setCursoSelecionado] = useState<number>(TREINAMENTOS[0].id)
  const [search, setSearch] = useState('')
  const [apenasObrigatorios, setApenasObrigatorios] = useState(false)

  const cursos = apenasObrigatorios ? TREINAMENTOS.filter(t => t.obrigatorio) : TREINAMENTOS
  const curso = TREINAMENTOS.find(t => t.id === cursoSelecionado)!

  const lista = funcionarios.filter(f =>
    !search || f.nome.toLowerCase().includes(search.toLowerCase()) || f.area.toLowerCase().includes(search.toLowerCase())
  )

  function validar(funcId: number, cursoId: number) {
    setFuncionarios(prev => prev.map(f => {
      if (f.id !== funcId) return f
      const prog = f.progresso[cursoId] || { pct: 0, validado: false }
      return {
        ...f,
        progresso: {
          ...f.progresso,
          [cursoId]: { ...prog, validado: true, dataValidacao: new Date().toLocaleDateString('pt-BR') },
        },
      }
    }))
  }

  const pendentesValidacao = lista.filter(f => {
    const p = f.progresso[cursoSelecionado]
    return p && p.pct === 100 && !p.validado
  }).length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Gestão de Treinamentos</h2>
          <p className="text-xs text-slate-400 mt-0.5">Acompanhe o progresso de cada colaborador e valide a conclusão</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
          <div
            onClick={() => setApenasObrigatorios(v => !v)}
            className={`w-9 h-5 rounded-full transition-colors relative ${apenasObrigatorios ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${apenasObrigatorios ? 'left-4' : 'left-0.5'}`} />
          </div>
          Só obrigatórios
        </label>
      </div>

      {/* Alerta de pendências */}
      {pendentesValidacao > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} className="shrink-0" />
          <span><strong>{pendentesValidacao} colaborador(es)</strong> concluíram "{curso.titulo}" e aguardam validação.</span>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {/* Seletor de curso */}
        <select
          value={cursoSelecionado}
          onChange={e => setCursoSelecionado(Number(e.target.value))}
          className="flex-1 min-w-48 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {cursos.map(t => (
            <option key={t.id} value={t.id}>{t.titulo}{t.obrigatorio ? ' ★' : ''}</option>
          ))}
        </select>

        {/* Busca */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm placeholder-slate-400 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Buscar colaborador ou área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}
        </div>
      </div>

      {/* Sumário do curso selecionado */}
      <div className={`bg-gradient-to-br ${curso.capa.from} ${curso.capa.to} rounded-2xl p-5 flex items-center gap-4`}>
        <span className="text-4xl shrink-0">{curso.icone}</span>
        <div className="flex-1 min-w-0 text-white">
          <p className="font-bold text-base leading-tight">{curso.titulo}</p>
          <p className="text-white/70 text-xs mt-0.5">{curso.modulos.length} módulos · {curso.duracao} · por {curso.instrutor}</p>
        </div>
        <div className="text-right text-white shrink-0">
          <p className="text-2xl font-black">
            {funcionarios.filter(f => (f.progresso[cursoSelecionado]?.pct ?? 0) === 100).length}
            <span className="text-base font-normal opacity-70">/{funcionarios.length}</span>
          </p>
          <p className="text-xs text-white/70">concluíram</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Colaborador</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Área</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-32">Progresso</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Validação</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {lista.map(f => {
                const prog = f.progresso[cursoSelecionado]
                const pct = prog?.pct ?? 0
                const validado = prog?.validado ?? false
                const dataVal = prog?.dataValidacao

                return (
                  <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100 text-xs">{f.nome}</p>
                        <p className="text-[10px] text-slate-400">{f.cargo}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{f.area}</td>
                    <td className="px-4 py-3 min-w-36">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">{pct}%</span>
                        </div>
                        <ProgressBar pct={pct} sm />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pct === 100 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 size={10} />Concluído
                        </span>
                      ) : pct > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          <Play size={10} />Em andamento
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          Não iniciado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {validado ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                          <BadgeCheck size={10} />Validado{dataVal ? ` ${dataVal}` : ''}
                        </span>
                      ) : pct === 100 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          <AlertTriangle size={10} />Pendente
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pct === 100 && !validado ? (
                        <button
                          onClick={() => validar(f.id, cursoSelecionado)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                        >
                          <ShieldCheck size={12} />Validar
                        </button>
                      ) : (
                        <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          <Eye size={12} />Ver
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TreinamentosPage() {
  const { user } = useAuth()
  const podeGerenciar = isAdmin(user?.role) || isGestor(user?.role)

  const [view, setView] = useState<'meus' | 'gestao'>('meus')
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'em-andamento' | 'concluidos' | 'nao-iniciados'>('todos')
  const [modalCurso, setModalCurso] = useState<Treinamento | null>(null)
  const [vistaLista, setVistaLista] = useState<'cursos' | 'trilhas'>('cursos')
  const [cursos, setCursos] = useState<Treinamento[]>(TREINAMENTOS)

  useEffect(() => {
    api.treinamentoProgresso.list().then((rows: unknown) => {
      if (!Array.isArray(rows)) return
      const map: Record<string, boolean> = {}
      for (const r of rows as { curso_id: number; modulo_id: number; concluido: boolean }[]) {
        map[`${r.curso_id}_${r.modulo_id}`] = r.concluido
      }
      setCursos(TREINAMENTOS.map(t => ({
        ...t,
        modulos: t.modulos.map(m => ({
          ...m,
          concluido: map[`${t.id}_${m.id}`] ?? m.concluido,
        })),
      })))
    }).catch(() => {})
  }, [])

  async function toggleModulo(cursoId: number, moduloId: number, done: boolean) {
    await api.treinamentoProgresso.mark(cursoId, moduloId, done)
    setCursos(prev => prev.map(t => t.id === cursoId ? {
      ...t,
      modulos: t.modulos.map(m => m.id === moduloId ? { ...m, concluido: done } : m),
    } : t))
    setModalCurso(prev => prev?.id === cursoId ? {
      ...prev,
      modulos: prev.modulos.map(m => m.id === moduloId ? { ...m, concluido: done } : m),
    } : prev)
  }

  const concluidos   = cursos.filter(t => getProgresso(t) === 100).length
  const emAndamento  = cursos.filter(t => { const p = getProgresso(t); return p > 0 && p < 100 }).length
  const obrigPend    = cursos.filter(t => t.obrigatorio && getProgresso(t) < 100).length
  const pctGeral     = cursos.length === 0 ? 0 : Math.round(cursos.reduce((a, t) => a + getProgresso(t), 0) / cursos.length)

  const filtered = cursos.filter(t => {
    const matchSearch = !search || t.titulo.toLowerCase().includes(search.toLowerCase()) || t.instrutor.toLowerCase().includes(search.toLowerCase())
    const matchCat    = categoria === 'Todos' || t.categoria === categoria
    const pct = getProgresso(t)
    const matchStatus =
      filtroStatus === 'todos'         ? true :
      filtroStatus === 'concluidos'    ? pct === 100 :
      filtroStatus === 'em-andamento'  ? pct > 0 && pct < 100 :
      filtroStatus === 'nao-iniciados' ? pct === 0 : true
    return matchSearch && matchCat && matchStatus
  })

  return (
    <div className="space-y-6">
      {/* Header + tabs */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Treinamentos</h1>
          <p className="text-sm text-slate-400 mt-0.5">Trilhas de desenvolvimento disponíveis para você</p>
        </div>
        {podeGerenciar && (
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl text-sm">
            <button
              onClick={() => setView('meus')}
              className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${view === 'meus' ? 'bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Meus cursos
            </button>
            <button
              onClick={() => setView('gestao')}
              className={`px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${view === 'gestao' ? 'bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <BarChart2 size={14} />Gestão
              {obrigPend > 0 && view === 'meus' && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{obrigPend}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {view === 'gestao' ? <RHView /> : (
        <>
          {/* Hero de progresso */}
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 text-white flex flex-col sm:flex-row gap-6 items-center">
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-sm mb-1">Seu progresso geral</p>
              <p className="text-4xl font-black">{pctGeral}%</p>
              <p className="text-white/70 text-xs mt-1">{concluidos} de {cursos.length} cursos concluídos</p>
              <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden w-full max-w-xs">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pctGeral}%` }} />
              </div>
            </div>
            <div className="flex gap-4 shrink-0">
              {[
                { label: 'Concluídos', value: concluidos, icon: <CheckCircle2 size={18} /> },
                { label: 'Em andamento', value: emAndamento, icon: <Play size={18} /> },
                { label: 'Obrig. pendentes', value: obrigPend, icon: <AlertTriangle size={18} />, warn: obrigPend > 0 },
              ].map(({ label, value, icon, warn }) => (
                <div key={label} className={`rounded-xl px-4 py-3 text-center ${warn ? 'bg-red-500/30 border border-red-400/40' : 'bg-white/10'}`}>
                  <div className="flex justify-center mb-1 text-white/70">{icon}</div>
                  <p className="text-xl font-black">{value}</p>
                  <p className="text-[10px] text-white/60 mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Obrigatórios em destaque */}
          {obrigPend > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Obrigatórios pendentes</p>
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{obrigPend} restantes</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {cursos.filter(t => t.obrigatorio && getProgresso(t) < 100).map(t => {
                  const pct = getProgresso(t)
                  return (
                    <button
                      key={t.id}
                      onClick={() => setModalCurso(t)}
                      className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 rounded-2xl hover:border-amber-400 transition-colors text-left"
                    >
                      <span className="text-2xl shrink-0">{t.icone}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{t.titulo}</p>
                        <ProgressBar pct={pct} sm />
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">{pct}% concluído</p>
                      </div>
                      <ChevronRight size={15} className="text-amber-400 shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Filtros + toggle de vista */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Buscar curso ou instrutor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}
            </div>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value as typeof filtroStatus)}
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="todos">Todos os status</option>
              <option value="nao-iniciados">Não iniciados</option>
              <option value="em-andamento">Em andamento</option>
              <option value="concluidos">Concluídos</option>
            </select>

            <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl text-xs ml-auto">
              <button onClick={() => setVistaLista('cursos')} className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${vistaLista === 'cursos' ? 'bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>
                <BookOpen size={13} />Cursos
              </button>
              <button onClick={() => setVistaLista('trilhas')} className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${vistaLista === 'trilhas' ? 'bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>
                <Layers size={13} />Trilhas
              </button>
            </div>
          </div>

          {/* Categoria tabs */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIAS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  categoria === cat
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Lista de cursos ou trilhas */}
          {/* eslint-disable-next-line no-nested-ternary */}
          {vistaLista === 'cursos' ? (
            filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                <BookOpen size={32} className="opacity-40" />
                <p className="text-sm">Nenhum treinamento encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(t => <CourseCard key={t.id} t={t} onClick={() => setModalCurso(t)} />)}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {TRILHAS.filter(tr => {
                const cursosDaTrilha = cursos.filter(t => t.trilhaId === tr.id)
                return categoria === 'Todos' || cursosDaTrilha.some(t => t.categoria === categoria)
              }).map(trilha => (
                <TrilhaCard
                  key={trilha.id}
                  trilha={trilha}
                  cursos={cursos.filter(t => t.trilhaId === trilha.id)}
                  onCursoClick={setModalCurso}
                />
              ))}
              {/* Cursos sem trilha */}
              {cursos.filter(t => !t.trilhaId && (categoria === 'Todos' || t.categoria === categoria)).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cursos avulsos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cursos.filter(t => !t.trilhaId && (categoria === 'Todos' || t.categoria === categoria)).map(t => (
                      <CourseCard key={t.id} t={t} onClick={() => setModalCurso(t)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal de detalhe */}
      {modalCurso && <CourseModal t={modalCurso} onClose={() => setModalCurso(null)} onToggle={toggleModulo} />}
    </div>
  )
}
