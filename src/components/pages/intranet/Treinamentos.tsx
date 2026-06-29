import { useState, useEffect, useRef } from 'react'
import {
  Search, X, BookOpen, Clock, Star, CheckCircle2, Play, Award,
  ChevronRight, Users, BarChart2, ShieldCheck, Video, FileText,
  HelpCircle, Lock, ChevronDown, ChevronUp, Layers, BadgeCheck,
  AlertTriangle, Eye, Link, Edit2, Save, ExternalLink, RefreshCw,
  Plus, Trash2, Pencil,
} from 'lucide-react'
import { useAuth, isAdmin, isGestor } from '../../../lib/auth'
import { api } from '../../../lib/api'

// ─── Video helpers ────────────────────────────────────────────────────────────

function parseVideoUrl(url: string): { type: 'youtube' | 'vimeo' | 'direct' | null; embedUrl: string | null } {
  if (!url) return { type: null, embedUrl: null }
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0` }
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vi[1]}?autoplay=1` }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { type: 'direct', embedUrl: url }
  return { type: null, embedUrl: null }
}

// ─── VideoPlayer ──────────────────────────────────────────────────────────────

function VideoPlayer({
  url, titulo, concluido, onMarcarConcluido, onClose,
}: {
  url: string; titulo: string; concluido: boolean
  onMarcarConcluido: () => void; onClose: () => void
}) {
  const { type, embedUrl } = parseVideoUrl(url)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ended, setEnded] = useState(false)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-sm font-semibold text-white truncate pr-4">{titulo}</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:bg-white/10 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* Player */}
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          {type === 'direct' ? (
            <video
              ref={videoRef}
              src={embedUrl!}
              controls
              autoPlay
              className="absolute inset-0 w-full h-full bg-black"
              onEnded={() => { setEnded(true); if (!concluido) onMarcarConcluido() }}
            />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
              URL de vídeo inválida
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 gap-3">
          <p className="text-xs text-white/40">
            {type === 'youtube' && 'YouTube'}
            {type === 'vimeo' && 'Vimeo'}
            {type === 'direct' && 'Vídeo direto'}
          </p>
          {concluido ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 size={14} /> Concluído
            </span>
          ) : (
            <button
              onClick={() => { onMarcarConcluido(); setEnded(true) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
            >
              <CheckCircle2 size={13} /> Marcar como concluído
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

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

const CAPA_PRESETS = [
  { from: 'from-rose-500',   to: 'to-red-600',     label: 'Rosa' },
  { from: 'from-amber-500',  to: 'to-orange-600',  label: 'Âmbar' },
  { from: 'from-emerald-500',to: 'to-teal-600',    label: 'Verde' },
  { from: 'from-violet-500', to: 'to-purple-600',  label: 'Violeta' },
  { from: 'from-sky-500',    to: 'to-blue-600',    label: 'Azul' },
  { from: 'from-pink-500',   to: 'to-rose-600',    label: 'Pink' },
  { from: 'from-orange-500', to: 'to-red-500',     label: 'Laranja' },
  { from: 'from-indigo-500', to: 'to-blue-600',    label: 'Índigo' },
  { from: 'from-teal-500',   to: 'to-cyan-600',    label: 'Teal' },
  { from: 'from-green-500',  to: 'to-emerald-600', label: 'Verde escuro' },
  { from: 'from-yellow-500', to: 'to-orange-500',  label: 'Amarelo' },
  { from: 'from-slate-500',  to: 'to-slate-700',   label: 'Cinza' },
]

function dbToTreinamento(row: any, progressoMap: Record<string, boolean> = {}): Treinamento {
  const modulos: Modulo[] = (row.modulos ?? []).map((m: any) => ({
    id: m.id,
    titulo: m.titulo ?? '',
    duracao: m.duracao ?? '—',
    tipo: m.tipo ?? 'video',
    concluido: progressoMap[`${row.id}_${m.id}`] ?? false,
  }))
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao ?? '',
    categoria: row.categoria ?? 'Geral',
    duracao: row.duracao ?? '',
    nivel: row.nivel ?? 'Básico',
    obrigatorio: row.obrigatorio ?? false,
    instrutor: row.instrutor ?? '',
    avaliacao: parseFloat(row.avaliacao) || 5.0,
    totalAlunos: row.total_alunos ?? 0,
    capa: { from: row.capa_from ?? 'from-slate-500', to: row.capa_to ?? 'to-slate-600' },
    icone: row.icone ?? '📚',
    modulos,
    trilhaId: row.trilha_id ?? undefined,
  }
}

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
    <div className="flex items-center gap-1">
      <Star size={11} className="text-amber-400 fill-amber-400" />
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{value.toFixed(1)}</span>
    </div>
  )
}

function ProgressBar({ pct, sm }: { pct: number; sm?: boolean }) {
  return (
    <div className={`${sm ? 'h-px' : 'h-1'} bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── EditCursoModal ───────────────────────────────────────────────────────────

type ModuloEdit = { id: number; titulo: string; tipo: 'video' | 'pdf' | 'quiz'; duracao: string }

function EditCursoModal({ curso, onClose, onSave, onDelete }: {
  curso: Treinamento | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const isNew = !curso
  const [titulo, setTitulo] = useState(curso?.titulo ?? '')
  const [descricao, setDescricao] = useState(curso?.descricao ?? '')
  const [categoria, setCategoria] = useState(curso?.categoria ?? 'Compliance')
  const [nivel, setNivel] = useState(curso?.nivel ?? 'Básico')
  const [duracao, setDuracao] = useState(curso?.duracao ?? '')
  const [instrutor, setInstrutor] = useState(curso?.instrutor ?? '')
  const [avaliacao, setAvaliacao] = useState(String(curso?.avaliacao ?? '5.0'))
  const [icone, setIcone] = useState(curso?.icone ?? '📚')
  const [obrigatorio, setObrigatorio] = useState(curso?.obrigatorio ?? false)
  const [capa, setCapa] = useState(curso?.capa ?? { from: 'from-slate-500', to: 'to-slate-600' })
  const [modulos, setModulos] = useState<ModuloEdit[]>(
    (curso?.modulos ?? []).map(m => ({ id: m.id, titulo: m.titulo, tipo: m.tipo, duracao: m.duracao }))
  )
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function addModulo() {
    const baseId = (curso?.id ?? 0) * 100
    const maxId = modulos.length > 0 ? Math.max(...modulos.map(m => m.id)) : baseId
    setModulos(prev => [...prev, { id: maxId + 1, titulo: '', tipo: 'video', duracao: '' }])
  }

  function updateModulo(idx: number, field: string, value: string) {
    setModulos(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  async function handleSave() {
    if (!titulo.trim()) return
    setSaving(true)
    try {
      await onSave({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria,
        nivel,
        duracao: duracao.trim(),
        instrutor: instrutor.trim(),
        avaliacao: parseFloat(avaliacao) || 5.0,
        obrigatorio,
        capa_from: capa.from,
        capa_to: capa.to,
        icone: icone.trim() || '📚',
        modulos: modulos.map(m => ({ id: m.id, titulo: m.titulo, tipo: m.tipo, duracao: m.duracao })),
      })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {isNew ? 'Novo curso' : 'Editar curso'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Preview */}
          <div className={`bg-gradient-to-br ${capa.from} ${capa.to} rounded-xl p-4 flex items-center gap-3`}>
            <span className="text-3xl">{icone || '📚'}</span>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{titulo || 'Título do curso'}</p>
              <p className="text-white/70 text-xs mt-0.5">{instrutor || 'Instrutor'}</p>
            </div>
          </div>

          {/* Título + Descrição */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Título *</label>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Nome do treinamento"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Descrição</label>
            <textarea
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={3}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva o objetivo e conteúdo do curso"
            />
          </div>

          {/* Grade de campos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Categoria', value: categoria, set: setCategoria, opts: ['Compliance','Liderança','Técnico','Soft Skills','Segurança','Geral'] },
              { label: 'Nível',     value: nivel,     set: setNivel,     opts: ['Básico','Intermediário','Avançado'] },
            ].map(({ label, value, set, opts }) => (
              <div key={label} className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={value}
                  onChange={e => set(e.target.value)}
                >
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Duração</label>
              <input
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={duracao} onChange={e => setDuracao(e.target.value)} placeholder="ex: 2h"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Avaliação</label>
              <input
                type="number" min="0" max="5" step="0.1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={avaliacao} onChange={e => setAvaliacao(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Instrutor</label>
              <input
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={instrutor} onChange={e => setInstrutor(e.target.value)} placeholder="Nome do instrutor"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Ícone (emoji)</label>
              <input
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={icone} onChange={e => setIcone(e.target.value)} placeholder="🎓" maxLength={4}
              />
            </div>
          </div>

          {/* Obrigatório */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setObrigatorio(v => !v)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${obrigatorio ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-600'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${obrigatorio ? 'left-5' : 'left-1'}`} />
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-200">Treinamento obrigatório</span>
          </label>

          {/* Capa */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Cor da capa</label>
            <div className="grid grid-cols-6 gap-2">
              {CAPA_PRESETS.map(p => (
                <button
                  key={p.from}
                  onClick={() => setCapa({ from: p.from, to: p.to })}
                  className={`h-8 rounded-lg bg-gradient-to-br ${p.from} ${p.to} transition-all ${capa.from === p.from ? 'ring-2 ring-offset-2 ring-primary-500' : 'hover:scale-105'}`}
                  title={p.label}
                />
              ))}
            </div>
          </div>

          {/* Módulos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Módulos do curso ({modulos.length})
              </label>
              <button
                onClick={addModulo}
                className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <Plus size={13} />Adicionar módulo
              </button>
            </div>
            {modulos.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl">
                Nenhum módulo cadastrado
              </p>
            )}
            {modulos.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <span className="text-[10px] text-slate-400 w-5 shrink-0 text-center font-semibold">{idx + 1}</span>
                <input
                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-0"
                  value={m.titulo}
                  onChange={e => updateModulo(idx, 'titulo', e.target.value)}
                  placeholder="Título do módulo"
                />
                <select
                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none shrink-0"
                  value={m.tipo}
                  onChange={e => updateModulo(idx, 'tipo', e.target.value)}
                >
                  <option value="video">Vídeo</option>
                  <option value="pdf">PDF</option>
                  <option value="quiz">Quiz</option>
                </select>
                <input
                  className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none shrink-0"
                  value={m.duracao}
                  onChange={e => updateModulo(idx, 'duracao', e.target.value)}
                  placeholder="15min"
                />
                <button
                  onClick={() => setModulos(prev => prev.filter((_, i) => i !== idx))}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-2 items-center shrink-0">
          {!isNew && onDelete && (
            confirmDelete ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
                >
                  {deleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Confirmar exclusão
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancelar</button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={12} />Excluir
              </button>
            )
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!titulo.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-60"
          >
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            {isNew ? 'Criar curso' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CourseCard ───────────────────────────────────────────────────────────────

function CourseCard({ t, onClick, onEdit, canAdmin }: { t: Treinamento; onClick: () => void; onEdit?: (e: React.MouseEvent) => void; canAdmin?: boolean }) {
  const pct = getProgresso(t)
  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden cursor-pointer flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Capa */}
      <div className={`relative bg-gradient-to-br ${t.capa.from} ${t.capa.to} h-40 flex-shrink-0 overflow-hidden`}>
        {/* Dot texture */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        />
        {/* Emoji — bottom-left */}
        <div className="absolute bottom-4 left-4">
          <span className="text-[38px] leading-none drop-shadow select-none">{t.icone}</span>
        </div>
        {/* Obrigatório */}
        {t.obrigatorio && (
          <span className="absolute top-3 left-3 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-sm text-white tracking-wide">
            Obrigatório
          </span>
        )}
        {/* Completion badge */}
        {pct === 100 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 shadow-sm">
            <CheckCircle2 size={11} className="text-white" />
            <span className="text-[10px] font-bold text-white">Concluído</span>
          </div>
        )}
        {/* Admin edit — on hover */}
        {canAdmin && onEdit && pct < 100 && (
          <button
            onClick={onEdit}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/20 hover:bg-black/35 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Editar curso"
          >
            <Pencil size={12} />
          </button>
        )}
        {canAdmin && onEdit && pct === 100 && (
          <button
            onClick={onEdit}
            className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-black/20 hover:bg-black/35 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Editar curso"
          >
            <Pencil size={12} />
          </button>
        )}
        {/* Progress stripe */}
        {pct > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-[3px] bg-black/10">
            <div
              className={`h-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-400' : 'bg-white/75'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Level + category */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${NIVEL_COLORS[t.nivel]}`}>{t.nivel}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.categoria}</span>
        </div>

        {/* Title + description */}
        <div className="flex-1 min-h-0">
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-50 leading-snug line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {t.titulo}
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{t.descricao}</p>
        </div>

        {/* In-progress bar (body) */}
        {pct > 0 && pct < 100 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Progresso</span>
              <span className="font-semibold text-primary-600">{pct}%</span>
            </div>
            <ProgressBar pct={pct} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-0.5 border-t border-slate-50 dark:border-slate-800">
          <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1"><Clock size={11} />{t.duracao}</span>
            <span className="flex items-center gap-1"><Layers size={11} />{t.modulos.length} mód.</span>
          </div>
          <Stars value={t.avaliacao} />
        </div>
      </div>
    </div>
  )
}

// ─── CourseModal ──────────────────────────────────────────────────────────────

function CourseModal({ t, onClose, onToggle, moduloConfigs, onSaveConfig, canAdmin }: {
  t: Treinamento
  onClose: () => void
  onToggle: (cursoId: number, moduloId: number, done: boolean) => Promise<void>
  moduloConfigs: Record<string, string>
  onSaveConfig: (cursoId: number, moduloId: number, url: string | null) => Promise<void>
  canAdmin: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const [videoAberto, setVideoAberto] = useState<number | null>(null)
  const [editando, setEditando] = useState<number | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)
  const pct = getProgresso(t)

  function getVideoUrl(moduloId: number) {
    return moduloConfigs[`${t.id}_${moduloId}`] ?? ''
  }

  async function saveUrl(moduloId: number) {
    setSavingUrl(true)
    await onSaveConfig(t.id, moduloId, editUrl.trim() || null)
    setSavingUrl(false)
    setEditando(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header capa */}
        <div className={`bg-gradient-to-br ${t.capa.from} ${t.capa.to} relative shrink-0 overflow-hidden`}>
          {/* Dot texture */}
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          <div className="relative px-6 pt-10 pb-6">
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 backdrop-blur-sm flex items-center justify-center text-white transition-colors">
              <X size={14} />
            </button>
            <div className="flex items-end gap-4">
              <span className="text-[48px] leading-none drop-shadow">{t.icone}</span>
              <div>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {t.obrigatorio && <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-black/20 backdrop-blur-sm text-white">Obrigatório</span>}
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-black/20 backdrop-blur-sm text-white">{t.nivel}</span>
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">{t.titulo}</h2>
                <p className="text-white/60 text-xs mt-0.5 font-medium">por {t.instrutor}</p>
              </div>
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
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Seu progresso</span>
              <span className={`text-lg font-black tabular-nums ${pct === 100 ? 'text-emerald-600' : 'text-primary-600'}`}>{pct}%</span>
            </div>
            <ProgressBar pct={pct} />
            <p className="text-[11px] text-slate-400">
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
                  const videoUrl = getVideoUrl(m.id)
                  const temVideo = !!videoUrl
                  const isEditando = editando === m.id
                  const isVideoAberto = videoAberto === m.id

                  return (
                    <div key={m.id} className="space-y-0">
                      <div
                        onClick={() => {
                          if (bloqueado) return
                          if (m.tipo === 'video' && temVideo) { setVideoAberto(isVideoAberto ? null : m.id); return }
                          if (m.tipo !== 'video') onToggle(t.id, m.id, !m.concluido)
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          m.concluido
                            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                            : bloqueado
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 opacity-60'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 hover:border-primary-300 cursor-pointer'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                          {m.concluido ? <CheckCircle2 size={20} className="text-emerald-500" />
                            : bloqueado ? <Lock size={13} className="text-slate-400" />
                            : TIPO_ICON[m.tipo]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{m.titulo}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{m.tipo} · {m.duracao}</p>
                        </div>
                        {/* Estado do vídeo */}
                        {!bloqueado && m.tipo === 'video' && (
                          temVideo
                            ? <Play size={13} className="text-primary-500 shrink-0" />
                            : canAdmin
                            ? <span className="text-[10px] text-amber-500 shrink-0">sem vídeo</span>
                            : <span className="text-[10px] text-slate-300 shrink-0">em breve</span>
                        )}
                        {!bloqueado && m.tipo !== 'video' && !m.concluido && (
                          <ChevronRight size={14} className="text-slate-400 shrink-0" />
                        )}
                        {/* Botão editar URL (admin) */}
                        {canAdmin && !bloqueado && m.tipo === 'video' && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setEditando(isEditando ? null : m.id)
                              setEditUrl(videoUrl)
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-primary-500 transition-colors shrink-0"
                            title="Editar URL do vídeo"
                          >
                            <Edit2 size={11} />
                          </button>
                        )}
                      </div>

                      {/* Editor de URL (admin) */}
                      {isEditando && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 mt-1">
                          <Link size={13} className="text-slate-400 shrink-0" />
                          <input
                            autoFocus
                            className="flex-1 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400"
                            placeholder="Cole a URL do YouTube, Vimeo ou MP4..."
                            value={editUrl}
                            onChange={e => setEditUrl(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveUrl(m.id); if (e.key === 'Escape') setEditando(null) }}
                          />
                          <button onClick={() => saveUrl(m.id)} disabled={savingUrl} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-600 text-white text-[10px] font-semibold disabled:opacity-60 transition-colors">
                            {savingUrl ? <RefreshCw size={10} className="animate-spin" /> : <Save size={10} />} Salvar
                          </button>
                          <button onClick={() => setEditando(null)} className="text-[10px] text-slate-400 hover:text-slate-600">Cancelar</button>
                        </div>
                      )}

                      {/* Player inline */}
                      {isVideoAberto && temVideo && (
                        <VideoPlayer
                          url={videoUrl}
                          titulo={m.titulo}
                          concluido={m.concluido}
                          onMarcarConcluido={() => { onToggle(t.id, m.id, true); setVideoAberto(null) }}
                          onClose={() => setVideoAberto(null)}
                        />
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
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
        <div className="border-t border-slate-50 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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

function RHView({ todosCursos }: { todosCursos: Treinamento[] }) {
  const [funcionarios, setFuncionarios] = useState<ProgressoFuncionario[]>(FUNCIONARIOS_MOCK)
  const [cursoSelecionado, setCursoSelecionado] = useState<number>(todosCursos[0]?.id ?? 0)
  const [search, setSearch] = useState('')
  const [apenasObrigatorios, setApenasObrigatorios] = useState(false)

  const cursos = apenasObrigatorios ? todosCursos.filter(t => t.obrigatorio) : todosCursos
  const curso = todosCursos.find(t => t.id === cursoSelecionado) ?? todosCursos[0]

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
          <span><strong>{pendentesValidacao} colaborador(es)</strong> concluíram "{curso?.titulo}" e aguardam validação.</span>
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
      {curso && (
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
      )}

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
  const [cursos, setCursos] = useState<Treinamento[]>([])
  const [moduloConfigs, setModuloConfigs] = useState<Record<string, string>>({})
  const [editCurso, setEditCurso] = useState<Treinamento | null | 'new'>(null)

  useEffect(() => {
    Promise.all([
      api.cursos.list().catch(() => []),
      api.treinamentoProgresso.list().catch(() => []),
      api.moduloConfig.list().catch(() => []),
    ]).then(([cursosDb, progressoRows, configRows]) => {
      const progressoMap: Record<string, boolean> = {}
      for (const r of progressoRows as { curso_id: number; modulo_id: number; concluido: boolean }[]) {
        progressoMap[`${r.curso_id}_${r.modulo_id}`] = r.concluido
      }

      const configMap: Record<string, string> = {}
      for (const r of configRows as { curso_id: number; modulo_id: number; video_url: string }[]) {
        if (r.video_url) configMap[`${r.curso_id}_${r.modulo_id}`] = r.video_url
      }

      setCursos((cursosDb as any[]).map(row => dbToTreinamento(row, progressoMap)))
      setModuloConfigs(configMap)
    })
  }, [])

  async function saveConfig(cursoId: number, moduloId: number, url: string | null) {
    await api.moduloConfig.save(cursoId, moduloId, url)
    setModuloConfigs(prev => {
      const next = { ...prev }
      const key = `${cursoId}_${moduloId}`
      if (url) next[key] = url
      else delete next[key]
      return next
    })
  }

  async function handleSaveCurso(data: any) {
    if (editCurso === 'new') {
      const row = await api.cursos.create(data)
      setCursos(prev => [...prev, dbToTreinamento(row as any)])
    } else if (editCurso) {
      const row = await api.cursos.update(editCurso.id, data)
      const updated = dbToTreinamento(row as any)
      setCursos(prev => prev.map(c => c.id === updated.id ? { ...updated, modulos: updated.modulos.map(m => ({ ...m, concluido: c.modulos.find(om => om.id === m.id)?.concluido ?? false })) } : c))
      if (modalCurso?.id === editCurso.id) {
        setModalCurso(prev => prev ? { ...updated, modulos: updated.modulos.map(m => ({ ...m, concluido: prev.modulos.find(om => om.id === m.id)?.concluido ?? false })) } : null)
      }
    }
  }

  async function handleDeleteCurso() {
    if (!editCurso || editCurso === 'new') return
    await api.cursos.delete(editCurso.id)
    setCursos(prev => prev.filter(c => c.id !== (editCurso as Treinamento).id))
    if (modalCurso?.id === (editCurso as Treinamento).id) setModalCurso(null)
  }

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
        <div className="flex items-center gap-2">
          {isAdmin(user?.role) && (
            <button
              onClick={() => setEditCurso('new')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              <Plus size={13} />Novo curso
            </button>
          )}
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
      </div>

      {view === 'gestao' ? <RHView todosCursos={cursos} /> : (
        <>
          {/* Resumo de progresso */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-6 py-5 flex flex-col sm:flex-row items-stretch gap-5">
            {/* Número principal */}
            <div className="shrink-0 flex flex-col justify-center sm:pr-6 sm:border-r sm:border-slate-100 sm:dark:border-slate-800">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Meu progresso</p>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-black text-slate-900 dark:text-slate-50 tabular-nums leading-none">{pctGeral}</span>
                <span className="text-2xl font-bold text-slate-200 dark:text-slate-700 leading-none">%</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">{concluidos} de {cursos.length} cursos concluídos</p>
            </div>

            {/* Stats + barra */}
            <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Concluídos', value: concluidos, cls: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Em andamento', value: emAndamento, cls: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Obrig. pendentes', value: obrigPend, cls: obrigPend > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-600' },
                ].map(({ label, value, cls }) => (
                  <div key={label}>
                    <p className={`text-2xl font-black tabular-nums leading-none ${cls}`}>{value}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-700"
                    style={{ width: `${pctGeral}%` }}
                  />
                </div>
                {obrigPend > 0 && (
                  <p className="text-[11px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
                    <AlertTriangle size={11} /> {obrigPend} treinamento{obrigPend > 1 ? 's' : ''} obrigatório{obrigPend > 1 ? 's' : ''} pendente{obrigPend > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Obrigatórios em destaque */}
          {obrigPend > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ação necessária</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {cursos.filter(t => t.obrigatorio && getProgresso(t) < 100).map(t => {
                  const pct = getProgresso(t)
                  return (
                    <button
                      key={t.id}
                      onClick={() => setModalCurso(t)}
                      className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/50 rounded-2xl hover:border-red-300 dark:hover:border-red-700 hover:shadow-sm transition-all text-left group/ob"
                    >
                      <span className="text-xl shrink-0">{t.icone}</span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{t.titulo}</p>
                        <ProgressBar pct={pct} sm />
                        <p className="text-[10px] text-slate-400">{pct}% concluído</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover/ob:text-red-400 transition-colors shrink-0" />
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
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIAS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  categoria === cat
                    ? 'bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'
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
              <div className="flex flex-col items-center justify-center h-56 text-slate-400 gap-3">
                <BookOpen size={28} className="opacity-30" strokeWidth={1.5} />
                <p className="text-sm text-slate-400">Nenhum treinamento encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map(t => <CourseCard key={t.id} t={t} onClick={() => setModalCurso(t)} canAdmin={isAdmin(user?.role)} onEdit={e => { e.stopPropagation(); setEditCurso(t) }} />)}
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
      {modalCurso && (
        <CourseModal
          t={modalCurso}
          onClose={() => setModalCurso(null)}
          onToggle={toggleModulo}
          moduloConfigs={moduloConfigs}
          onSaveConfig={saveConfig}
          canAdmin={podeGerenciar}
        />
      )}

      {/* Modal de edição (admin) */}
      {editCurso !== null && (
        <EditCursoModal
          curso={editCurso === 'new' ? null : editCurso}
          onClose={() => setEditCurso(null)}
          onSave={handleSaveCurso}
          onDelete={editCurso !== 'new' ? handleDeleteCurso : undefined}
        />
      )}
    </div>
  )
}
