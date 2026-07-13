import { useAuth } from '../../../lib/auth'
import { BookOpen, MessageSquare, Target, TrendingUp, CheckCircle2, AlertCircle, Star, Camera, ClipboardList, Users, Cake, Building2, Gift, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../../ui/Avatar'
import PhotoUploadModal from '../../ui/PhotoUploadModal'
import { api } from '../../../lib/api'

// ─── Catalog (same as Treinamentos.tsx) – used only for labels/icons ─────────
const CATALOG: Record<number, { titulo: string; icone: string }> = {
  1: { titulo: 'LGPD e Proteção de Dados',        icone: '🔒' },
  2: { titulo: 'Cultura de Segurança no Trabalho', icone: '⛑️' },
  3: { titulo: 'Excelência no Atendimento',        icone: '🤝' },
  4: { titulo: 'Liderança Situacional',            icone: '🧭' },
  5: { titulo: 'Excel Avançado para Gestores',     icone: '📊' },
  6: { titulo: 'Comunicação Não-Violenta',         icone: '💬' },
  7: { titulo: 'Normas de Segurança NR-12',        icone: '⚙️' },
  8: { titulo: 'Gestão de Tempo e Produtividade',  icone: '⏱️' },
}
const MODULOS_TOTAL: Record<number, number> = { 1:5, 2:4, 3:5, 4:6, 5:5, 6:5, 7:3, 8:5 }

const MOODS = [
  { emoji: '😡', label: 'Zangado',   value: 'zangado',   color: 'hover:bg-red-100 dark:hover:bg-red-900/20'    },
  { emoji: '😔', label: 'Triste',    value: 'triste',    color: 'hover:bg-orange-100 dark:hover:bg-orange-900/20' },
  { emoji: '😐', label: 'Neutro',    value: 'neutro',    color: 'hover:bg-slate-100 dark:hover:bg-slate-700'    },
  { emoji: '😊', label: 'Satisfeito',value: 'satisfeito',color: 'hover:bg-green-100 dark:hover:bg-green-900/20' },
  { emoji: '😄', label: 'Alegre',    value: 'alegre',    color: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/20' },
]

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-black ${color ?? 'text-slate-800 dark:text-slate-100'}`}>{value}</p>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        {action}
      </div>
      <div>{children}</div>
    </div>
  )
}

interface PdiItem { status: string; pct: number }
interface ProgItem { curso_id: number; modulo_id: number; concluido: boolean }
interface PesquisaPendente { id: number; nome: string; tipo: string; data_fim: string | null }
interface AvaliacaoPendente { id: number; nome: string; cargo: string }
interface Aniversariante {
  id: number; nome: string; cargo?: string; area?: string; photo_url?: string
  proxima_data: string
  data_nascimento?: string
  data_admissao?: string
  anos_empresa?: number
}

const PORTAIS = [
  { nome: 'Estoque',           desc: 'Sistema de gestão de estoque',    emoji: '📦', from: 'from-blue-500',    to: 'to-blue-700',    url: 'https://sistema1.rttshop.com.br' },
  { nome: 'E-mail',            desc: 'E-mail corporativo',              emoji: '📧', from: 'from-red-500',     to: 'to-rose-700',    url: 'https://mail.google.com' },
  { nome: 'Ponto Eletrônico',  desc: 'Registro de ponto e jornada',     emoji: '🕐', from: 'from-emerald-500', to: 'to-teal-700',    url: '#' },
  { nome: 'Drive',             desc: 'Documentos e arquivos',           emoji: '📁', from: 'from-amber-500',   to: 'to-orange-600',  url: 'https://drive.google.com' },
  { nome: 'WhatsApp',          desc: 'Atendimento ao cliente',          emoji: '💬', from: 'from-green-500',   to: 'to-green-700',   url: 'https://web.whatsapp.com' },
  { nome: 'Meet',              desc: 'Reuniões e videoconferências',    emoji: '🎥', from: 'from-sky-500',     to: 'to-blue-600',    url: 'https://meet.google.com' },
]

function PortaisHub() {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(true)

  function updateArrows() {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  function scroll(dir: 'left' | 'right') {
    ref.current?.scrollBy({ left: dir === 'right' ? 192 : -192, behavior: 'smooth' })
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Portais</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${canLeft ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300' : 'text-slate-200 dark:text-slate-600 cursor-default'}`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${canRight ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300' : 'text-slate-200 dark:text-slate-600 cursor-default'}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={ref}
        onScroll={updateArrows}
        className="flex gap-3 p-4 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {PORTAIS.map(p => (
          <a
            key={p.nome}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-none w-40 rounded-xl overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={`bg-gradient-to-br ${p.from} ${p.to} p-4 flex flex-col gap-2.5`}>
              <span className="text-[32px] leading-none drop-shadow">{p.emoji}</span>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{p.nome}</p>
                <p className="text-[11px] text-white/70 leading-snug mt-0.5">{p.desc}</p>
              </div>
            </div>
            <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-700/60 flex items-center justify-between group-hover:bg-slate-100 dark:group-hover:bg-slate-700 transition-colors">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Acessar</span>
              <ExternalLink size={11} className="text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors" />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

function isGestor(role?: string) {
  if (!role) return false
  return role.toLowerCase().includes('gestor') || role.toLowerCase().includes('administrador')
}

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function diasAte(dataStr: string): number {
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const alvo = new Date(dataStr + 'T00:00:00'); alvo.setHours(0,0,0,0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
}

function fmtData(dataStr: string) {
  const d = new Date(dataStr + 'T00:00:00')
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}

function BadgeDias({ dias, dataStr }: { dias: number; dataStr: string }) {
  if (dias === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">Hoje! 🎉</span>
  if (dias === 1) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-white">Amanhã</span>
  if (dias <= 7)  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">em {dias}d</span>
  return <span className="text-[10px] text-slate-400">{fmtData(dataStr)}</span>
}

function AniversariantesCard({ nascimento, empresa }: { nascimento: Aniversariante[]; empresa: Aniversariante[] }) {
  const [aba, setAba] = useState<'nascimento' | 'empresa'>('nascimento')
  const lista = aba === 'nascimento' ? nascimento : empresa
  const totalHoje = [...nascimento, ...empresa].filter(a => diasAte(a.proxima_data) === 0).length

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Gift size={15} className="text-rose-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Aniversariantes</h3>
          {totalHoje > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{totalHoje}</span>
          )}
        </div>
        <span className="text-[10px] text-slate-400">próx. 30 dias</span>
      </div>

      {/* Abas */}
      <div className="flex border-b border-slate-100 dark:border-slate-700">
        <button
          onClick={() => setAba('nascimento')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${aba === 'nascimento' ? 'border-rose-400 text-rose-500 dark:text-rose-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <Cake size={12} /> Aniversário
          {nascimento.length > 0 && <span className="ml-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{nascimento.length}</span>}
        </button>
        <button
          onClick={() => setAba('empresa')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${aba === 'empresa' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <Building2 size={12} /> Empresa
          {empresa.length > 0 && <span className="ml-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{empresa.length}</span>}
        </button>
      </div>

      {/* Lista */}
      <div className="divide-y divide-slate-50 dark:divide-slate-700/50 max-h-72 overflow-y-auto">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
            {aba === 'nascimento'
              ? <Cake size={24} className="text-slate-200 dark:text-slate-600" />
              : <Building2 size={24} className="text-slate-200 dark:text-slate-600" />}
            <p className="text-xs text-slate-400">Nenhum aniversariante nos próximos 30 dias.</p>
          </div>
        ) : lista.map(a => {
          const dias = diasAte(a.proxima_data)
          const isHoje = dias === 0
          return (
            <div key={`${aba}-${a.id}`} className={`flex items-center gap-3 px-4 py-3 ${isHoje ? 'bg-rose-50/60 dark:bg-rose-900/10' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isHoje ? 'ring-2 ring-rose-400' : ''}`}
                style={{ background: a.photo_url ? 'transparent' : `hsl(${(a.nome.charCodeAt(0) * 37) % 360},55%,70%)` }}>
                {a.photo_url
                  ? <img src={a.photo_url} alt={a.nome} className="w-8 h-8 rounded-full object-cover" />
                  : <span className="text-white text-xs font-bold">{a.nome.charAt(0).toUpperCase()}</span>
                }
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${isHoje ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
                  {a.nome}{isHoje && ' 🎂'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {a.cargo ?? ''}
                  {aba === 'empresa' && a.anos_empresa !== undefined && (
                    <span className={`ml-1 font-semibold ${a.anos_empresa >= 5 ? 'text-amber-500' : 'text-primary-500'}`}>
                      · {a.anos_empresa} ano{a.anos_empresa !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
              {/* Badge */}
              <BadgeDias dias={dias} dataStr={a.proxima_data} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MinhaVisao() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mood, setMood] = useState<string | null>(null)
  const [moodComment, setMoodComment] = useState('')
  const [moodSent, setMoodSent] = useState(false)
  const [moodSaving, setMoodSaving] = useState(false)
  const [photoModal, setPhotoModal] = useState(false)
  const firstName = user?.name?.split(' ')[0] ?? 'Colaborador'

  function handleMoodSelect(value: string) {
    if (moodSent) return
    setMood(value)
    setMoodComment('')
  }

  async function handleMoodSend() {
    if (!mood || moodSaving) return
    setMoodSaving(true)
    try {
      await api.humorFeedback.save(mood, moodComment.trim() || undefined)
      setMoodSent(true)
    } catch {
      // falha silenciosa — não bloqueia o usuário
      setMoodSent(true)
    } finally {
      setMoodSaving(false)
    }
  }

  const [pdiItems, setPdiItems] = useState<PdiItem[]>([])
  const [progItems, setProgItems] = useState<ProgItem[]>([])
  const [pesquisasPendentes, setPesquisasPendentes] = useState<PesquisaPendente[]>([])
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState<AvaliacaoPendente[]>([])
  const [anivNasc, setAnivNasc] = useState<Aniversariante[]>([])
  const [anivEmp, setAnivEmp] = useState<Aniversariante[]>([])

  useEffect(() => {
    api.pdi.list().then((d: unknown) => setPdiItems((d as PdiItem[]) || [])).catch(() => {})
    api.treinamentoProgresso.list().then((d: unknown) => setProgItems((d as ProgItem[]) || [])).catch(() => {})
    api.pesquisas.minhas().then((d: unknown) => setPesquisasPendentes((d as PesquisaPendente[]) || [])).catch(() => {})
    api.aniversariantes.list().then((d: any) => {
      setAnivNasc(d?.nascimento || [])
      setAnivEmp(d?.empresa || [])
    }).catch(() => {})
    if (isGestor(user?.role)) {
      api.avaliacoesPendentes.list().then((d: unknown) => setAvaliacoesPendentes((d as AvaliacaoPendente[]) || [])).catch(() => {})
    }
  }, [user?.role])

  // PDI stats
  const pdiConcluidos = pdiItems.filter(i => i.status === 'concluido').length
  const pdiAtrasados  = pdiItems.filter(i => i.status === 'atrasado').length
  const pdiTotal      = pdiItems.length
  const pdiPct        = pdiTotal === 0 ? 0 : Math.round(pdiItems.reduce((a, i) => a + i.pct, 0) / pdiTotal)

  // Treinamentos stats — aggregate by curso_id
  const cursosMap: Record<number, { feitos: number; total: number }> = {}
  for (const r of progItems) {
    if (!cursosMap[r.curso_id]) cursosMap[r.curso_id] = { feitos: 0, total: MODULOS_TOTAL[r.curso_id] ?? 1 }
    if (r.concluido) cursosMap[r.curso_id].feitos++
  }
  // Include courses that appear in catalog but have no rows yet
  for (const id of Object.keys(CATALOG).map(Number)) {
    if (!cursosMap[id]) cursosMap[id] = { feitos: 0, total: MODULOS_TOTAL[id] ?? 1 }
  }
  const cursoEntries = Object.entries(cursosMap).map(([id, { feitos, total }]) => ({
    id: Number(id), pct: Math.round((feitos / total) * 100),
  }))
  const treinosEmAndamento = cursoEntries.filter(c => c.pct > 0 && c.pct < 100)

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-5">

      {/* ── Coluna esquerda: perfil ── */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center gap-3">
          <div className="relative">
            <Avatar name={user?.name ?? ''} photoUrl={user?.photo_url} size="lg" />
            <button
              onClick={() => setPhotoModal(true)}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-md transition-colors"
              title="Alterar foto"
            >
              <Camera size={13} />
            </button>
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">{user?.name}</p>
            <p className="text-xs text-slate-400 mt-0.5 italic">"People first, People always"</p>
          </div>
          <div className="w-full space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            {user?.area && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Target size={13} className="shrink-0 text-slate-400" />
                <span className="truncate">{user.area}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Star size={13} className="shrink-0 text-slate-400" />
              <span>{user?.role}</span>
            </div>
            {user?.email && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <MessageSquare size={13} className="shrink-0 text-slate-400" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Links rápidos */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Acesso rápido</p>
          <div className="space-y-1">
            {[
              { label: 'Meus treinamentos', icon: BookOpen,     to: '/intranet/treinamentos' },
              { label: 'Comunicados',       icon: AlertCircle,  to: '/intranet/comunicados'  },
              { label: 'Meu PDI',           icon: TrendingUp,   to: '/intranet/pdi'          },
              { label: 'Minha Equipe',      icon: MessageSquare,to: '/intranet/equipe'       },
            ].map(({ label, icon: Icon, to }) => (
              <button key={label} onClick={() => navigate(to)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left">
                <Icon size={15} className="shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Coluna central ── */}
      <div className="space-y-5">
        {/* Humor */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Como você está se sentindo hoje, {firstName}?
          </p>

          {moodSent ? (
            <div className="flex items-center gap-3 py-2">
              <span className="text-3xl">{MOODS.find(m => m.value === mood)?.emoji}</span>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Obrigado pelo seu feedback! 🙌</p>
                <p className="text-xs text-slate-400 mt-0.5">Sua resposta foi registrada com sucesso.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-3 flex-wrap">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => handleMoodSelect(m.value)}
                    className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 transition-all ${
                      mood === m.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : `border-transparent ${m.color}`
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{m.label}</span>
                  </button>
                ))}
              </div>

              {mood && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Quer nos contar um pouco mais sobre como você está se sentindo? <span className="text-slate-400">(opcional)</span>
                  </p>
                  <textarea
                    value={moodComment}
                    onChange={e => setMoodComment(e.target.value)}
                    placeholder={`O que está te deixando ${MOODS.find(m => m.value === mood)?.label.toLowerCase()}?`}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                  <button
                    onClick={handleMoodSend}
                    disabled={moodSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {moodSaving ? 'Enviando...' : 'Enviar feedback'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pendências */}
        <SectionCard title="Pendências">
          {pesquisasPendentes.length === 0 && avaliacoesPendentes.length === 0 ? (
            <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
              <CheckCircle2 size={28} className="text-slate-200 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhuma pendência no momento</p>
              <p className="text-xs text-slate-400">Pesquisas e avaliações pendentes aparecerão aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {pesquisasPendentes.map(p => (
                <div key={`pesq-${p.id}`} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <ClipboardList size={15} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{p.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pesquisa{p.data_fim ? ` · até ${new Date(p.data_fim).toLocaleDateString('pt-BR')}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/intranet/pesquisas/${p.id}/responder`)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shrink-0"
                  >
                    Responder
                  </button>
                </div>
              ))}
              {isGestor(user?.role) && avaliacoesPendentes.length > 0 && (
                <div className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                    <Users size={15} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {avaliacoesPendentes.length} avaliação{avaliacoesPendentes.length !== 1 ? 'ões' : ''} pendente{avaliacoesPendentes.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Colaboradores aguardando avaliação</p>
                  </div>
                  <button
                    onClick={() => navigate('/avaliacoes')}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shrink-0"
                  >
                    Avaliar
                  </button>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Treinamentos em andamento */}
        <SectionCard
          title="Meus Treinamentos"
          action={<span className="text-xs text-primary-500 cursor-pointer hover:underline">Ver todos</span>}
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {treinosEmAndamento.length === 0 ? (
              <div className="px-5 py-6 text-center text-xs text-slate-400">
                Nenhum treinamento em andamento. Acesse a aba Treinamentos para começar!
              </div>
            ) : treinosEmAndamento.slice(0, 4).map(c => {
              const info = CATALOG[c.id]
              if (!info) return null
              return (
                <div key={c.id} className="px-5 py-3.5 flex items-center gap-4">
                  <span className="text-xl shrink-0">{info.icone}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{info.titulo}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${c.pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{c.pct}%</span>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0">
                    Continuar
                  </button>
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* Hub de portais */}
        <PortaisHub />
      </div>

      {/* ── Coluna direita ── */}
      <div className="space-y-4">
        {/* Aniversariantes */}
        <AniversariantesCard nascimento={anivNasc} empresa={anivEmp} />

        {/* OKRs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">OKRs</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">Em breve</span>
          </div>
          <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
            <Target size={28} className="text-slate-200 dark:text-slate-600" />
            <p className="text-xs text-slate-400">Módulo de OKRs em desenvolvimento.</p>
          </div>
        </div>

        {/* PDI */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">PDI</h3>
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-700" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - pdiPct / 100)}`} strokeLinecap="round" className="text-primary-500" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary-600">{pdiPct}%</span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-tight">Conclusão do plano de desenvolvimento</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <StatCard label="Iniciativas" value={pdiTotal}     color="text-slate-700 dark:text-slate-200" />
            <StatCard label="Atrasadas"   value={pdiAtrasados} color="text-red-500" />
            <StatCard label="Concluídas"  value={pdiConcluidos} color="text-emerald-600" />
          </div>
        </div>

        {/* Conversas 1-1 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Conversas 1-1</h3>
          <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
            <MessageSquare size={28} className="text-slate-200 dark:text-slate-600" />
            <p className="text-xs text-slate-400">Módulo de 1-1 em desenvolvimento.</p>
          </div>
        </div>
      </div>
    </div>
    {photoModal && <PhotoUploadModal onClose={() => setPhotoModal(false)} />}
    </>
  )
}
