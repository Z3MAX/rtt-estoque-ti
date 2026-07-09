import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, BookOpen, Clock, Star, CheckCircle2, Play, Award,
  ChevronRight, Users, BarChart2, ShieldCheck, Video, FileText,
  HelpCircle, Lock, ChevronDown, ChevronUp, Layers, BadgeCheck,
  AlertTriangle, Eye, Link, Edit2, Save, ExternalLink, RefreshCw,
  Plus, Trash2, Pencil, Send, Download, GraduationCap, Target,
  FileSpreadsheet, UserCheck, Briefcase, ArrowLeft, BookMarked, UserPlus,
  Globe, FilePen,
} from 'lucide-react'
import { useAuth, isAdmin, isGestor, isInstrutor } from '../../../lib/auth'
import { api } from '../../../lib/api'

// ─── Video helpers ────────────────────────────────────────────────────────────

function parseVideoUrl(url: string, startSec = 0): { type: 'youtube' | 'vimeo' | 'direct' | null; embedUrl: string | null } {
  if (!url) return { type: null, embedUrl: null }
  const start = Math.floor(startSec)
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1${start > 0 ? `&start=${start}` : ''}` }
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vi[1]}?autoplay=1&api=1${start > 0 ? `#t=${start}s` : ''}` }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { type: 'direct', embedUrl: url }
  return { type: null, embedUrl: null }
}

// ─── VideoPlayer ──────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function VideoPlayer({
  url, titulo, concluido, onMarcarConcluido, onClose, cursoId, moduloId, segundosInicial,
}: {
  url: string; titulo: string; concluido: boolean
  onMarcarConcluido: () => void; onClose: () => void
  cursoId: number; moduloId: number; segundosInicial: number
}) {
  const { type, embedUrl } = parseVideoUrl(url, concluido ? 0 : segundosInicial)
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Refs for interval logic (avoids stale closures)
  const initSec = concluido ? Infinity : segundosInicial
  const watchedRef = useRef(initSec)
  const durationRef = useRef(0)
  const unlockedRef = useRef(concluido)
  const lastSavedRef = useRef(initSec)

  const [watchedSec, setWatchedSec] = useState(initSec)
  const [totalDuration, setTotalDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [unlocked, setUnlocked] = useState(concluido)
  const [showWarning, setShowWarning] = useState(false)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Save seconds helper
  function persistSeconds() {
    const secs = watchedRef.current
    if (!isFinite(secs) || secs <= 0 || secs === lastSavedRef.current) return
    lastSavedRef.current = secs
    api.treinamentoProgresso.saveSeconds(cursoId, moduloId, Math.floor(secs)).catch(err => console.error('[VideoPlayer] saveSeconds failed:', err))
  }

  // Save on unmount
  useEffect(() => () => { persistSeconds() }, [])

  // Wall-clock timer: counts real seconds while the video is playing
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      watchedRef.current = Math.min(watchedRef.current + 1, durationRef.current || Infinity)
      setWatchedSec(watchedRef.current)
      // Unlock at 95% to account for end-screen/credits
      if (!unlockedRef.current && durationRef.current > 0 && watchedRef.current >= durationRef.current * 0.95) {
        unlockedRef.current = true
        setUnlocked(true)
        if (!concluido) onMarcarConcluido()
      }
      // Persist every 10 seconds
      if (Math.floor(watchedRef.current) % 10 === 0) persistSeconds()
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, concluido, onMarcarConcluido])

  // postMessage handler for YouTube & Vimeo
  useEffect(() => {
    if (type !== 'youtube' && type !== 'vimeo') return

    function handle(e: MessageEvent) {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data

        if (type === 'youtube') {
          // infoDelivery carries duration + currentTime while playing
          if (d.event === 'infoDelivery' && d.info?.duration && durationRef.current === 0) {
            durationRef.current = d.info.duration
            setTotalDuration(d.info.duration)
          }
          if (d.event === 'onStateChange') {
            if (d.info === 1) setIsPlaying(true)   // playing
            if (d.info === 2) setIsPlaying(false)  // paused
            if (d.info === 0) setIsPlaying(false)  // ended — timer already handled unlock
          }
        }

        if (type === 'vimeo') {
          if (d.event === 'timeupdate') {
            // duration arrives in first timeupdate
            if (d.data?.duration && durationRef.current === 0) {
              durationRef.current = d.data.duration
              setTotalDuration(d.data.duration)
            }
            setIsPlaying(true)
          }
          if (d.event === 'play') setIsPlaying(true)
          if (d.event === 'pause' || d.event === 'finish') setIsPlaying(false)
        }
      } catch { /* ignore */ }
    }

    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [type])

  function onIframeLoad() {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    if (type === 'youtube') {
      win.postMessage(JSON.stringify({ event: 'listening' }), '*')
      win.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), '*')
    } else if (type === 'vimeo') {
      win.postMessage(JSON.stringify({ method: 'addEventListener', value: 'play' }), '*')
      win.postMessage(JSON.stringify({ method: 'addEventListener', value: 'pause' }), '*')
      win.postMessage(JSON.stringify({ method: 'addEventListener', value: 'timeupdate' }), '*')
      win.postMessage(JSON.stringify({ method: 'addEventListener', value: 'finish' }), '*')
    }
  }

  function handleButtonClick() {
    if (unlocked) { onMarcarConcluido(); return }
    setShowWarning(true)
    if (warningTimer.current) clearTimeout(warningTimer.current)
    warningTimer.current = setTimeout(() => setShowWarning(false), 6000)
  }

  useEffect(() => () => { if (warningTimer.current) clearTimeout(warningTimer.current) }, [])

  const watchPct = totalDuration > 0 ? Math.min(watchedSec / totalDuration, 1) : 0
  const progressPct = Math.round(watchPct * 100)
  const hasDuration = totalDuration > 0
  const remaining = hasDuration ? Math.max(0, totalDuration - watchedSec) : null

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
              onLoadedMetadata={() => {
                const dur = videoRef.current?.duration ?? 0
                durationRef.current = dur
                setTotalDuration(dur)
                if (!concluido && segundosInicial > 0 && videoRef.current) {
                  videoRef.current.currentTime = segundosInicial
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          ) : embedUrl ? (
            <>
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                onLoad={onIframeLoad}
              />
              {/* Bloqueia clique no botão "Assistir no YouTube" (canto inferior direito) */}
              {type === 'youtube' && (
                <div className="absolute bottom-0 right-0 w-36 h-10 z-10" style={{ pointerEvents: 'all' }} />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
              URL de vídeo inválida
            </div>
          )}
        </div>

        {/* Watch progress bar */}
        {!concluido && (
          <div className="h-[3px] bg-white/10">
            <div
              className={`h-full transition-all duration-1000 ${unlocked ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${unlocked ? 100 : progressPct}%` }}
            />
          </div>
        )}

        {/* Warning banner — shown when user clicks button while locked */}
        {showWarning && (
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300">Avançar o vídeo não conta</p>
              <p className="text-[11px] text-amber-400/80 mt-0.5 leading-relaxed">
                O sistema mede o tempo real assistido — não a posição do vídeo.
                {hasDuration && remaining !== null && remaining > 0
                  ? ` Faltam aprox. ${fmtTime(remaining)} para desbloquear.`
                  : ' Continue assistindo sem pular para desbloquear.'}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          {/* Left: time watched */}
          <div className="flex items-center gap-2 text-xs text-white/35 min-w-0">
            <span>
              {type === 'youtube' && 'YouTube'}
              {type === 'vimeo' && 'Vimeo'}
              {type === 'direct' && 'Vídeo direto'}
            </span>
            {hasDuration && !unlocked && watchedSec > 0 && (
              <span className="text-amber-400/80 font-medium tabular-nums">
                {fmtTime(watchedSec)} / {fmtTime(totalDuration)} assistido
              </span>
            )}
          </div>

          {/* Right: action button */}
          {concluido ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-xs text-emerald-400 font-semibold shrink-0">
              <CheckCircle2 size={13} /> Concluído
            </span>
          ) : unlocked ? (
            <button
              onClick={handleButtonClick}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-semibold transition-all shrink-0"
            >
              <CheckCircle2 size={13} /> Marcar como concluído
            </button>
          ) : (
            <button
              onClick={handleButtonClick}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/30 text-white/50 hover:text-amber-300 text-xs font-medium transition-all shrink-0 group"
            >
              <Lock size={12} className="transition-colors" />
              <span>Bloqueado</span>
              {hasDuration && progressPct > 0 && (
                <span className="text-white/30 group-hover:text-amber-400/50 tabular-nums">· {progressPct}%</span>
              )}
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
  tipo: 'video' | 'pdf' | 'quiz' | 'texto' | 'link'
  concluido: boolean
  descricao?: string
  url?: string
  conteudo?: string
  quiz?: any
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
  capaUrl?: string
  icone: string
  modulos: Modulo[]
  trilhaId?: number
}

interface Trilha {
  id: number
  titulo: string
  descricao: string
  cursoIds?: number[]
  cor: string
  icone?: string
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
    capaUrl: row.capa_url ?? undefined,
    icone: row.icone ?? '📚',
    modulos,
    trilhaId: row.trilha_id ?? undefined,
  }
}

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

function Stars({ value, total }: { value: number | null; total?: number }) {
  if (value === null) return (
    <span className="text-[11px] text-slate-400 italic">Sem avaliações</span>
  )
  return (
    <div className="flex items-center gap-1">
      <Star size={11} className="text-amber-400 fill-amber-400" />
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {value.toFixed(1)}{total !== undefined && total > 0 ? ` (${total})` : ''}
      </span>
    </div>
  )
}

function StarsInterativas({ cursoId, mediaInicial, totalInicial, minhaNota: minhaNtInicial }: {
  cursoId: number; mediaInicial: number | null; totalInicial: number; minhaNota: number | null
}) {
  const [hover, setHover] = useState(0)
  const [minhaNota, setMinhaNota] = useState(minhaNtInicial)
  const [media, setMedia] = useState(mediaInicial)
  const [total, setTotal] = useState(totalInicial)
  const [salvando, setSalvando] = useState(false)

  async function handleClick(nota: number) {
    if (salvando) return
    setSalvando(true)
    try {
      const res = await api.cursoAvaliacoes.submit(cursoId, nota)
      setMinhaNota(res!.minha_nota)
      setMedia(res!.media)
      setTotal(res!.total)
    } catch {
      // silently fail
    } finally {
      setSalvando(false)
    }
  }

  const exibir = hover || minhaNota || 0
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" disabled={salvando}
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            onClick={() => handleClick(n)}
            className="transition-transform hover:scale-125 disabled:opacity-50 p-0.5">
            <Star size={18}
              className={`transition-colors ${n <= exibir ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600 fill-transparent'}`} />
          </button>
        ))}
        {minhaNota && (
          <span className="ml-1.5 text-xs text-slate-400">Sua nota: {minhaNota}/5</span>
        )}
      </div>
      {media !== null && (
        <p className="text-[11px] text-slate-400">
          Média: <span className="font-semibold text-amber-500">{media.toFixed(1)}</span>
          {total > 0 && ` · ${total} avaliação${total !== 1 ? 'ões' : ''}`}
        </p>
      )}
      {media === null && !minhaNota && (
        <p className="text-[11px] text-slate-400 italic">Seja o primeiro a avaliar este curso</p>
      )}
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

type TipoModulo = 'video' | 'pdf' | 'quiz' | 'texto' | 'link'

type OpcaoResposta = { id: number; texto: string }

type Pergunta = {
  id: number
  pergunta: string
  tipo: 'multipla_escolha' | 'verdadeiro_falso'
  opcoes: OpcaoResposta[]
  correta: number
  explicacao?: string
}

type QuizConfig = {
  aprovacao_minima: number
  embaralhar: boolean
  perguntas: Pergunta[]
}

type ModuloEdit = {
  id: number
  titulo: string
  tipo: TipoModulo
  duracao: string
  descricao?: string
  url?: string
  conteudo?: string
  quiz?: QuizConfig
}

const TIPO_MODULO_LABELS: Record<TipoModulo, string> = {
  video:  'Vídeo',
  pdf:    'PDF / Documento',
  quiz:   'Quiz / Avaliação',
  texto:  'Texto / Artigo',
  link:   'Link externo',
}

const TIPO_MODULO_ICONS: Record<TipoModulo, React.ReactNode> = {
  video:  <Video size={13} className="text-primary-500" />,
  pdf:    <FileText size={13} className="text-amber-500" />,
  quiz:   <HelpCircle size={13} className="text-violet-500" />,
  texto:  <BookOpen size={13} className="text-emerald-500" />,
  link:   <ExternalLink size={13} className="text-sky-500" />,
}

function newQuiz(): QuizConfig {
  return { aprovacao_minima: 70, embaralhar: false, perguntas: [] }
}

function newPergunta(id: number): Pergunta {
  return {
    id,
    pergunta: '',
    tipo: 'multipla_escolha',
    opcoes: [{ id: 1, texto: '' }, { id: 2, texto: '' }, { id: 3, texto: '' }, { id: 4, texto: '' }],
    correta: 0,
    explicacao: '',
  }
}

// ─── ModuloEditorCard ─────────────────────────────────────────────────────────

function ModuloEditorCard({ m, idx, total, onChange, onDelete, onMove }: {
  m: ModuloEdit
  idx: number
  total: number
  onChange: (updated: ModuloEdit) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const [expanded, setExpanded] = useState(false)

  function set(field: keyof ModuloEdit, value: any) {
    onChange({ ...m, [field]: value })
  }

  function setTipo(tipo: TipoModulo) {
    const base: ModuloEdit = { ...m, tipo, url: undefined, conteudo: undefined, quiz: undefined }
    if (tipo === 'quiz' && !m.quiz) base.quiz = newQuiz()
    onChange(base)
  }

  // Quiz helpers
  function setQuiz(q: Partial<QuizConfig>) {
    onChange({ ...m, quiz: { ...(m.quiz ?? newQuiz()), ...q } })
  }

  function addPergunta() {
    const quiz = m.quiz ?? newQuiz()
    const maxId = quiz.perguntas.length > 0 ? Math.max(...quiz.perguntas.map(p => p.id)) : 0
    setQuiz({ perguntas: [...quiz.perguntas, newPergunta(maxId + 1)] })
  }

  function updatePergunta(pidx: number, updated: Pergunta) {
    const perguntas = (m.quiz?.perguntas ?? []).map((p, i) => i === pidx ? updated : p)
    setQuiz({ perguntas })
  }

  function deletePergunta(pidx: number) {
    setQuiz({ perguntas: (m.quiz?.perguntas ?? []).filter((_, i) => i !== pidx) })
  }

  function setPerguntaTipo(pidx: number, tipo: Pergunta['tipo']) {
    const p = m.quiz!.perguntas[pidx]
    const updated: Pergunta = {
      ...p,
      tipo,
      opcoes: tipo === 'verdadeiro_falso'
        ? [{ id: 1, texto: 'Verdadeiro' }, { id: 2, texto: 'Falso' }]
        : p.tipo === 'verdadeiro_falso'
        ? [{ id: 1, texto: '' }, { id: 2, texto: '' }, { id: 3, texto: '' }, { id: 4, texto: '' }]
        : p.opcoes,
      correta: 0,
    }
    updatePergunta(pidx, updated)
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400'

  return (
    <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800">
        {/* Ordem */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button disabled={idx === 0} onClick={() => onMove(-1)} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 leading-none"><ChevronUp size={12} /></button>
          <button disabled={idx === total - 1} onClick={() => onMove(1)} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 leading-none"><ChevronDown size={12} /></button>
        </div>
        <span className="text-[10px] text-slate-400 font-bold w-4 shrink-0">{idx + 1}</span>

        {/* Tipo icon */}
        <div className="shrink-0">{TIPO_MODULO_ICONS[m.tipo]}</div>

        {/* Título */}
        <input
          value={m.titulo}
          onChange={e => set('titulo', e.target.value)}
          placeholder="Título do módulo"
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none min-w-0"
        />

        {/* Tipo select */}
        <select
          value={m.tipo}
          onChange={e => setTipo(e.target.value as TipoModulo)}
          onClick={e => e.stopPropagation()}
          className="text-[11px] border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg px-1.5 py-1 focus:outline-none shrink-0"
        >
          {(Object.entries(TIPO_MODULO_LABELS) as [TipoModulo, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Duração */}
        <input
          value={m.duracao}
          onChange={e => set('duracao', e.target.value)}
          placeholder="15min"
          onClick={e => e.stopPropagation()}
          className="w-14 text-center text-[11px] border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400 shrink-0"
        />

        {/* Expand */}
        <button onClick={() => setExpanded(v => !v)} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Delete */}
        <button onClick={onDelete} className="w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-700">

          {/* Descrição */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Descrição / instrução</label>
            <textarea
              value={m.descricao ?? ''}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Explique o que o aluno vai encontrar neste módulo…"
              rows={2}
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Tipo-specific */}
          {(m.tipo === 'video') && (
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">URL do vídeo</label>
              <input value={m.url ?? ''} onChange={e => set('url', e.target.value)} placeholder="YouTube, Vimeo ou .mp4 direto" className={inputCls} />
              <p className="text-[10px] text-slate-400">Suporta youtube.com, youtu.be, vimeo.com e arquivos .mp4/.webm</p>
            </div>
          )}

          {(m.tipo === 'pdf') && (
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">URL do PDF</label>
              <input value={m.url ?? ''} onChange={e => set('url', e.target.value)} placeholder="https://... (link público do documento)" className={inputCls} />
            </div>
          )}

          {(m.tipo === 'link') && (
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">URL externa</label>
              <input value={m.url ?? ''} onChange={e => set('url', e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
          )}

          {(m.tipo === 'texto') && (
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Conteúdo do artigo</label>
              <textarea
                value={m.conteudo ?? ''}
                onChange={e => set('conteudo', e.target.value)}
                placeholder="Escreva o conteúdo do módulo aqui…"
                rows={6}
                className={inputCls + ' resize-y'}
              />
            </div>
          )}

          {/* ── Quiz Builder ── */}
          {m.tipo === 'quiz' && (
            <div className="space-y-4">
              {/* Configurações gerais do quiz */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nota mínima para aprovação (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={0} max={100} step={5}
                      value={m.quiz?.aprovacao_minima ?? 70}
                      onChange={e => setQuiz({ aprovacao_minima: parseInt(e.target.value) })}
                      className="flex-1 accent-primary-500"
                    />
                    <span className="text-xs font-bold text-primary-600 w-10 text-right tabular-nums">{m.quiz?.aprovacao_minima ?? 70}%</span>
                  </div>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer select-none pb-0.5">
                    <div
                      onClick={() => setQuiz({ embaralhar: !(m.quiz?.embaralhar ?? false) })}
                      className={`w-8 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${m.quiz?.embaralhar ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${m.quiz?.embaralhar ? 'left-3.5' : 'left-0.5'}`} />
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300">Embaralhar perguntas</span>
                  </label>
                </div>
              </div>

              {/* Perguntas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Perguntas ({m.quiz?.perguntas.length ?? 0})
                  </span>
                  <button onClick={addPergunta} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                    <Plus size={12} /> Adicionar pergunta
                  </button>
                </div>

                {(m.quiz?.perguntas ?? []).length === 0 && (
                  <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-400">
                    Nenhuma pergunta ainda. Clique em "Adicionar pergunta".
                  </div>
                )}

                {(m.quiz?.perguntas ?? []).map((p, pidx) => (
                  <PerguntaEditor
                    key={p.id}
                    p={p}
                    idx={pidx}
                    onChange={updated => updatePergunta(pidx, updated)}
                    onDelete={() => deletePergunta(pidx)}
                    onSetTipo={tipo => setPerguntaTipo(pidx, tipo)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PerguntaEditor ───────────────────────────────────────────────────────────

function PerguntaEditor({ p, idx, onChange, onDelete, onSetTipo }: {
  p: Pergunta; idx: number
  onChange: (updated: Pergunta) => void
  onDelete: () => void
  onSetTipo: (tipo: Pergunta['tipo']) => void
}) {
  const [exp, setExp] = useState(true)
  const inputCls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400'

  return (
    <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden bg-white dark:bg-slate-800/50">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/80 dark:bg-slate-800">
        <span className="text-[10px] font-bold text-slate-400 w-5">{idx + 1}</span>
        <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
          {p.pergunta || <span className="text-slate-400 italic">Pergunta sem texto</span>}
        </span>
        <select
          value={p.tipo}
          onChange={e => onSetTipo(e.target.value as Pergunta['tipo'])}
          className="text-[11px] border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg px-1.5 py-1 focus:outline-none shrink-0"
        >
          <option value="multipla_escolha">Múltipla escolha</option>
          <option value="verdadeiro_falso">Verdadeiro / Falso</option>
        </select>
        <button onClick={() => setExp(v => !v)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 shrink-0">
          {exp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button onClick={onDelete} className="w-5 h-5 flex items-center justify-center text-red-400 hover:text-red-600 shrink-0">
          <Trash2 size={11} />
        </button>
      </div>

      {exp && (
        <div className="p-3 space-y-3">
          {/* Enunciado */}
          <textarea
            value={p.pergunta}
            onChange={e => onChange({ ...p, pergunta: e.target.value })}
            placeholder="Escreva a pergunta aqui…"
            rows={2}
            className={inputCls + ' resize-none'}
          />

          {/* Opções */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Opções — marque a correta</p>
            {p.opcoes.map((op, oidx) => (
              <div key={op.id} className="flex items-center gap-2">
                <button
                  onClick={() => onChange({ ...p, correta: oidx })}
                  className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${p.correta === oidx ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-500 hover:border-emerald-400'}`}
                >
                  {p.correta === oidx && <div className="w-2 h-2 rounded-full bg-white" />}
                </button>
                {p.tipo === 'verdadeiro_falso' ? (
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{op.texto}</span>
                ) : (
                  <input
                    value={op.texto}
                    onChange={e => {
                      const opcoes = p.opcoes.map((o, i) => i === oidx ? { ...o, texto: e.target.value } : o)
                      onChange({ ...p, opcoes })
                    }}
                    placeholder={`Opção ${String.fromCharCode(65 + oidx)}`}
                    className={inputCls}
                  />
                )}
              </div>
            ))}
            {/* Adicionar/remover opção (só para múltipla escolha) */}
            {p.tipo === 'multipla_escolha' && (
              <div className="flex gap-2 pt-1">
                {p.opcoes.length < 5 && (
                  <button
                    onClick={() => {
                      const maxId = Math.max(...p.opcoes.map(o => o.id))
                      onChange({ ...p, opcoes: [...p.opcoes, { id: maxId + 1, texto: '' }] })
                    }}
                    className="text-[11px] text-primary-500 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus size={11} /> Opção
                  </button>
                )}
                {p.opcoes.length > 2 && (
                  <button
                    onClick={() => {
                      const opcoes = p.opcoes.slice(0, -1)
                      onChange({ ...p, opcoes, correta: Math.min(p.correta, opcoes.length - 1) })
                    }}
                    className="text-[11px] text-red-400 hover:text-red-600 flex items-center gap-1"
                  >
                    <Trash2 size={11} /> Remover última
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Explicação */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Explicação (exibida após responder)</label>
            <textarea
              value={p.explicacao ?? ''}
              onChange={e => onChange({ ...p, explicacao: e.target.value })}
              placeholder="Por que esta é a resposta correta? (opcional)"
              rows={2}
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [capaUrl, setCapaUrl] = useState(curso?.capaUrl ?? '')
  const [modulos, setModulos] = useState<ModuloEdit[]>(
    (curso?.modulos ?? []).map(m => ({
      id: m.id, titulo: m.titulo, tipo: (m.tipo as TipoModulo) ?? 'video',
      duracao: m.duracao, descricao: m.descricao, url: m.url, conteudo: m.conteudo,
      quiz: m.quiz,
    }))
  )
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function addModulo() {
    const baseId = (curso?.id ?? 0) * 100
    const maxId = modulos.length > 0 ? Math.max(...modulos.map(m => m.id)) : baseId
    setModulos(prev => [...prev, { id: maxId + 1, titulo: '', tipo: 'video', duracao: '' }])
  }

  function moveModulo(idx: number, dir: -1 | 1) {
    setModulos(prev => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
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
        capa_url: capaUrl.trim() || null,
        icone: icone.trim() || '📚',
        modulos,
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
          <div
            className={`relative rounded-xl p-4 flex items-center gap-3 overflow-hidden ${!capaUrl ? `bg-gradient-to-br ${capa.from} ${capa.to}` : ''}`}
            style={capaUrl ? { backgroundImage: `url(${capaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          >
            {capaUrl && <div className="absolute inset-0 bg-black/50" />}
            <span className="relative text-3xl">{icone || '📚'}</span>
            <div className="relative">
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
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Imagem de capa (URL)</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs">
                  <Link size={11} className="text-slate-400 shrink-0" />
                  <input
                    value={capaUrl}
                    onChange={e => setCapaUrl(e.target.value)}
                    placeholder="https://... (opcional — substitui a cor)"
                    className="flex-1 bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  {capaUrl && (
                    <button onClick={() => setCapaUrl('')} className="text-slate-400 hover:text-slate-600 shrink-0">
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Se preenchida, a imagem substitui a cor do gradiente.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Cor da capa</label>
              <div className={`grid grid-cols-6 gap-2 transition-opacity ${capaUrl ? 'opacity-40 pointer-events-none' : ''}`}>
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
              <ModuloEditorCard
                key={m.id}
                m={m}
                idx={idx}
                total={modulos.length}
                onChange={updated => setModulos(prev => prev.map((x, i) => i === idx ? updated : x))}
                onDelete={() => setModulos(prev => prev.filter((_, i) => i !== idx))}
                onMove={dir => moveModulo(idx, dir)}
              />
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
      <div
        className={`relative h-40 flex-shrink-0 overflow-hidden ${!t.capaUrl ? `bg-gradient-to-br ${t.capa.from} ${t.capa.to}` : 'bg-slate-900'}`}
        style={t.capaUrl ? { backgroundImage: `url(${t.capaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {t.capaUrl && <div className="absolute inset-0 bg-black/40" />}
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

function CourseModal({ t, onClose, onToggle, moduloConfigs, onSaveConfig, canAdmin, progressoSegsMap }: {
  t: Treinamento
  onClose: () => void
  onToggle: (cursoId: number, moduloId: number, done: boolean) => Promise<void>
  moduloConfigs: Record<string, string>
  onSaveConfig: (cursoId: number, moduloId: number, url: string | null) => Promise<void>
  canAdmin: boolean
  progressoSegsMap: Record<string, number>
}) {
  const [expanded, setExpanded] = useState(true)
  const [videoAberto, setVideoAberto] = useState<number | null>(null)
  const [editando, setEditando] = useState<number | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)
  const [avaliacaoNota, setAvaliacaoNota] = useState<number | null>(null)
  const [avaliacaoComentario, setAvaliacaoComentario] = useState('')
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false)
  const [savingAvaliacao, setSavingAvaliacao] = useState(false)
  const [mediaReal, setMediaReal] = useState<number | null>(null)
  const [totalAvaliacoes, setTotalAvaliacoes] = useState(0)
  const pct = getProgresso(t)

  useEffect(() => {
    api.cursoAvaliacao.get(t.id).then(r => {
      if (!r) return
      if (r.nota) { setAvaliacaoNota(r.nota); setAvaliacaoComentario(r.comentario ?? ''); setAvaliacaoEnviada(true) }
      setMediaReal(r.media)
      setTotalAvaliacoes(r.total)
    }).catch(() => {})
  }, [t.id])

  async function handleEnviarAvaliacao() {
    if (!avaliacaoNota) return
    setSavingAvaliacao(true)
    const res = await api.cursoAvaliacao.save(t.id, avaliacaoNota, avaliacaoComentario || undefined).catch(() => null)
    if (res) { setMediaReal(res.media); setTotalAvaliacoes(res.total) }
    setSavingAvaliacao(false)
    setAvaliacaoEnviada(true)
  }

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
            <Stars value={mediaReal} total={totalAvaliacoes} />
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
                          cursoId={t.id}
                          moduloId={m.id}
                          segundosInicial={progressoSegsMap[`${t.id}_${m.id}`] ?? 0}
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
          {pct === 100 ? (
            <div className="space-y-3">
              {avaliacaoEnviada ? (
                <div className="flex flex-col items-center gap-1 py-2">
                  <span className="text-2xl">{['😞','😕','😐','🙂','🤩'][avaliacaoNota! - 1]}</span>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Avaliação enviada — obrigado!</p>
                  {avaliacaoComentario && <p className="text-[11px] text-slate-400 text-center italic">"{avaliacaoComentario}"</p>}
                  <button onClick={() => setAvaliacaoEnviada(false)} className="text-[11px] text-slate-400 hover:text-slate-600 underline mt-1">Alterar avaliação</button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 text-center">O que achou do curso?</p>
                    <div className="flex justify-center gap-2">
                      {[{emoji:'😞',label:'Ruim',nota:1},{emoji:'😕',label:'Regular',nota:2},{emoji:'😐',label:'Ok',nota:3},{emoji:'🙂',label:'Bom',nota:4},{emoji:'🤩',label:'Excelente',nota:5}].map(({emoji,label,nota}) => (
                        <button
                          key={nota}
                          onClick={() => setAvaliacaoNota(nota)}
                          title={label}
                          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
                            avaliacaoNota === nota
                              ? 'bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-400 scale-110'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className="text-xl leading-none">{emoji}</span>
                          <span className="text-[9px] text-slate-400">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {avaliacaoNota && (
                    <textarea
                      value={avaliacaoComentario}
                      onChange={e => setAvaliacaoComentario(e.target.value)}
                      placeholder="Comentário opcional..."
                      rows={2}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder:text-slate-300"
                    />
                  )}
                  <button
                    onClick={handleEnviarAvaliacao}
                    disabled={!avaliacaoNota || savingAvaliacao}
                    className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingAvaliacao ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    Enviar avaliação
                  </button>
                </>
              )}
            </div>
          ) : (
            <button className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/30">
              {pct > 0 ? <><Play size={15} />Continuar de onde parou</> : <><Play size={15} />Começar agora</>}
            </button>
          )}
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

interface InscritoRow {
  colaborador_id: number
  nome: string
  cargo: string
  area: string
  total_modulos: number
  modulos_concluidos: number
  validado: boolean
  data_validacao: string | null
  validado_por: string | null
}

// Download helper: converts array of objects to CSV and triggers download
function downloadCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const escape = (v: any) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [cols.join(','), ...rows.map(r => cols.map(c => escape(r[c])).join(','))]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

type RHTab = 'progresso' | 'requisitos' | 'relatorio' | 'instrutores'

function RHView({ todosCursos }: { todosCursos: Treinamento[] }) {
  const [tab, setTab] = useState<RHTab>('progresso')
  const [cursoSelecionado, setCursoSelecionado] = useState<number>(todosCursos[0]?.id ?? 0)
  const [inscritos, setInscritos] = useState<InscritoRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [apenasObrigatorios, setApenasObrigatorios] = useState(false)
  const [validandoId, setValidandoId] = useState<number | null>(null)
  const [removendoId, setRemovendoId] = useState<number | null>(null)

  // Requisitos tab
  const [requisitos, setRequisitos] = useState<{ cargo?: string; area?: string; obrigatorio: boolean }[]>([])
  const [novoReqCargo, setNovoReqCargo] = useState('')
  const [novoReqArea, setNovoReqArea] = useState('')
  const [novoReqObrig, setNovoReqObrig] = useState(true)
  const [savingReq, setSavingReq] = useState(false)
  const [loadingReq, setLoadingReq] = useState(false)
  const [cargosDisponiveis, setCargosDisponiveis] = useState<string[]>([])
  const [areasDisponiveis, setAreasDisponiveis] = useState<string[]>([])

  // Relatório tab
  const [relatorioRows, setRelatorioRows] = useState<any[]>([])
  const [loadingRel, setLoadingRel] = useState(false)
  const [relCursoId, setRelCursoId] = useState<number | ''>('')

  // Instrutores tab
  const [instResumo, setInstResumo] = useState<any[]>([])
  const [instDetalhe, setInstDetalhe] = useState<any[]>([])
  const [loadingInst, setLoadingInst] = useState(false)
  const [instSelecionado, setInstSelecionado] = useState<string | null>(null)

  // Carrega cargos e áreas únicos dos colaboradores uma vez
  useEffect(() => {
    api.colaboradores.list().then((cols: any) => {
      const cargos = [...new Set((cols as any[]).filter(c => c.cargo).map((c: any) => c.cargo as string))].sort()
      const areas  = [...new Set((cols as any[]).filter(c => c.area).map((c: any) => c.area  as string))].sort()
      setCargosDisponiveis(cargos)
      setAreasDisponiveis(areas)
    }).catch(() => {})
  }, [])

  const cursos = apenasObrigatorios ? todosCursos.filter(t => t.obrigatorio) : todosCursos
  const curso = todosCursos.find(t => t.id === cursoSelecionado) ?? todosCursos[0]

  useEffect(() => {
    if (tab !== 'progresso' || !cursoSelecionado) return
    setLoading(true)
    api.cursoAtribuicao.getForCurso(cursoSelecionado)
      .then((data: any) => setInscritos(data?.inscritos ?? []))
      .catch(() => setInscritos([]))
      .finally(() => setLoading(false))
  }, [cursoSelecionado, tab])

  useEffect(() => {
    if (tab !== 'requisitos' || !cursoSelecionado) return
    setLoadingReq(true)
    api.cursoRequisitos.list(cursoSelecionado)
      .then((rows: any) => setRequisitos(rows.map((r: any) => ({ cargo: r.cargo, area: r.area, obrigatorio: r.obrigatorio }))))
      .catch(() => setRequisitos([]))
      .finally(() => setLoadingReq(false))
  }, [cursoSelecionado, tab])

  useEffect(() => {
    if (tab !== 'relatorio') return
    setLoadingRel(true)
    api.relatorioTreinamentos.colaboradores(relCursoId ? { curso_id: Number(relCursoId) } : undefined)
      .then((data: any) => setRelatorioRows(data?.rows ?? []))
      .catch(() => setRelatorioRows([]))
      .finally(() => setLoadingRel(false))
  }, [tab, relCursoId])

  useEffect(() => {
    if (tab !== 'instrutores') return
    setLoadingInst(true)
    api.relatorioTreinamentos.instrutores()
      .then((data: any) => {
        setInstResumo(data?.resumo ?? [])
        setInstDetalhe(data?.detalhe ?? [])
        if (data?.resumo?.length > 0 && !instSelecionado) setInstSelecionado(data.resumo[0].instrutor)
      })
      .catch(() => { setInstResumo([]); setInstDetalhe([]) })
      .finally(() => setLoadingInst(false))
  }, [tab])

  useEffect(() => {
    const lista = apenasObrigatorios ? todosCursos.filter(t => t.obrigatorio) : todosCursos
    if (lista.length > 0 && !lista.find(t => t.id === cursoSelecionado)) {
      setCursoSelecionado(lista[0].id)
    }
  }, [apenasObrigatorios])

  async function handleValidar(inscrito: InscritoRow) {
    setValidandoId(inscrito.colaborador_id)
    try {
      await api.treinamentoProgresso.validar(inscrito.colaborador_id, cursoSelecionado)
      setInscritos(prev => prev.map(i =>
        i.colaborador_id === inscrito.colaborador_id
          ? { ...i, validado: true, data_validacao: new Date().toISOString().slice(0, 10) }
          : i
      ))
    } catch { /* noop */ } finally {
      setValidandoId(null)
    }
  }

  async function handleRemover(inscrito: InscritoRow) {
    if (!window.confirm(`Remover ${inscrito.nome} do curso?`)) return
    setRemovendoId(inscrito.colaborador_id)
    try {
      const novosIds = inscritos.filter(i => i.colaborador_id !== inscrito.colaborador_id).map(i => i.colaborador_id)
      await api.cursoAtribuicao.setForCurso(cursoSelecionado, novosIds)
      setInscritos(prev => prev.filter(i => i.colaborador_id !== inscrito.colaborador_id))
    } catch { /* noop */ } finally {
      setRemovendoId(null)
    }
  }

  async function handleSaveRequisitos() {
    setSavingReq(true)
    try {
      await api.cursoRequisitos.save(cursoSelecionado, requisitos)
    } catch { /* noop */ } finally {
      setSavingReq(false)
    }
  }

  function addRequisito() {
    if (!novoReqCargo && !novoReqArea) return
    setRequisitos(prev => [...prev, { cargo: novoReqCargo || undefined, area: novoReqArea || undefined, obrigatorio: novoReqObrig }])
    setNovoReqCargo(''); setNovoReqArea('')
  }

  const lista = inscritos.filter(f =>
    !search || f.nome.toLowerCase().includes(search.toLowerCase()) || (f.area ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const pendentesValidacao = lista.filter(f => {
    const pct = f.total_modulos > 0 ? Math.round((f.modulos_concluidos / f.total_modulos) * 100) : 0
    return pct === 100 && !f.validado
  }).length

  const TABS: { id: RHTab; label: string; icon: React.ReactNode }[] = [
    { id: 'progresso',   label: 'Progresso',   icon: <BarChart2 size={13} /> },
    { id: 'requisitos',  label: 'Requisitos',   icon: <Target size={13} /> },
    { id: 'relatorio',   label: 'Relatórios',   icon: <FileSpreadsheet size={13} /> },
    { id: 'instrutores', label: 'Instrutores',  icon: <UserCheck size={13} /> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Gestão de Treinamentos</h2>
          <p className="text-xs text-slate-400 mt-0.5">Acompanhe o progresso, defina requisitos e extraia relatórios</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id
                ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Progresso ── */}
      {tab === 'progresso' && (
        <div className="space-y-4">
          {pendentesValidacao > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle size={16} className="shrink-0" />
              <span><strong>{pendentesValidacao} colaborador(es)</strong> concluíram "{curso?.titulo}" e aguardam validação.</span>
            </div>
          )}

          <div className="flex gap-3 flex-wrap items-center">
            <select
              value={cursoSelecionado}
              onChange={e => setCursoSelecionado(Number(e.target.value))}
              className="flex-1 min-w-48 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {cursos.map(t => (
                <option key={t.id} value={t.id}>{t.titulo}{t.obrigatorio ? ' ★' : ''}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300 shrink-0">
              <div onClick={() => setApenasObrigatorios(v => !v)} className={`w-9 h-5 rounded-full transition-colors relative ${apenasObrigatorios ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${apenasObrigatorios ? 'left-4' : 'left-0.5'}`} />
              </div>
              Só obrigatórios
            </label>
            <div className="relative flex-1 min-w-40">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm placeholder-slate-400 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}
            </div>
            {lista.length > 0 && (
              <button
                onClick={() => downloadCSV(lista.map(f => ({
                  Colaborador: f.nome, Cargo: f.cargo, Área: f.area,
                  Progresso: `${f.total_modulos > 0 ? Math.round((f.modulos_concluidos / f.total_modulos) * 100) : 0}%`,
                  'Módulos concluídos': f.modulos_concluidos,
                  'Total módulos': f.total_modulos,
                  Validado: f.validado ? 'Sim' : 'Não',
                  'Data validação': f.data_validacao ?? '',
                  'Validado por': f.validado_por ?? '',
                })), `progresso_${curso?.titulo?.replace(/\s/g, '_') ?? 'curso'}.csv`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                <Download size={13} />CSV
              </button>
            )}
          </div>

          {curso && (
            <div className={`relative rounded-2xl p-5 flex items-center gap-4 overflow-hidden ${!curso.capaUrl ? `bg-gradient-to-br ${curso.capa.from} ${curso.capa.to}` : 'bg-slate-900'}`} style={curso.capaUrl ? { backgroundImage: `url(${curso.capaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
              {curso.capaUrl && <div className="absolute inset-0 bg-black/55" />}
              <span className="relative text-4xl shrink-0">{curso.icone}</span>
              <div className="relative flex-1 min-w-0 text-white">
                <p className="font-bold text-base leading-tight">{curso.titulo}</p>
                <p className="text-white/70 text-xs mt-0.5">{curso.modulos.length} módulos · {curso.duracao} · por {curso.instrutor}</p>
              </div>
              <div className="relative text-right text-white shrink-0">
                <p className="text-2xl font-black tabular-nums">
                  {inscritos.filter(f => f.total_modulos > 0 && f.modulos_concluidos >= f.total_modulos).length}
                  <span className="text-base font-normal opacity-70">/{inscritos.length}</span>
                </p>
                <p className="text-xs text-white/70">concluíram</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm"><RefreshCw size={14} className="animate-spin" /> Carregando…</div>
            ) : lista.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-sm">
                <Users size={24} className="opacity-30" />
                <p>Nenhum colaborador inscrito neste curso</p>
                <p className="text-xs">Use "Enviar Cursos" para inscrever colaboradores</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Colaborador</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Área</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-32">Progresso</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Validação</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {lista.map(f => {
                      const pct = f.total_modulos > 0 ? Math.round((f.modulos_concluidos / f.total_modulos) * 100) : 0
                      const validado = f.validado
                      const dataVal = f.data_validacao ? new Date(f.data_validacao).toLocaleDateString('pt-BR') : null
                      const isValidando = validandoId === f.colaborador_id
                      return (
                        <tr key={f.colaborador_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 dark:text-slate-100 text-xs">{f.nome}</p>
                            <p className="text-[10px] text-slate-400">{f.cargo}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{f.area}</td>
                          <td className="px-4 py-3 min-w-36">
                            <span className="text-[10px] text-slate-400 tabular-nums">{pct}%</span>
                            <ProgressBar pct={pct} sm />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {pct === 100 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={10} />Concluído</span>
                            ) : pct > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"><Play size={10} />Em andamento</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">Não iniciado</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {validado ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"><BadgeCheck size={10} />Validado{dataVal ? ` ${dataVal}` : ''}</span>
                            ) : pct === 100 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><AlertTriangle size={10} />Pendente</span>
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {pct === 100 && !validado && (
                                <button onClick={() => handleValidar(f)} disabled={isValidando} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-60">
                                  {isValidando ? <RefreshCw size={11} className="animate-spin" /> : <ShieldCheck size={12} />}Validar
                                </button>
                              )}
                              {pct === 100 && validado && (
                                <CertificadoBtn colaborador={f.nome} cargo={f.cargo} curso={curso?.titulo ?? ''} instrutor={curso?.instrutor ?? ''} dataValidacao={f.data_validacao} validadoPor={f.validado_por} />
                              )}
                              {pct < 100 && <span className="text-[10px] text-slate-300 dark:text-slate-500">—</span>}
                              <button
                                onClick={() => handleRemover(f)}
                                disabled={removendoId === f.colaborador_id}
                                title="Remover do curso"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                              >
                                {removendoId === f.colaborador_id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Requisitos ── */}
      {tab === 'requisitos' && (
        <div className="space-y-5">
          <div className="flex gap-3 flex-wrap items-center">
            <select
              value={cursoSelecionado}
              onChange={e => setCursoSelecionado(Number(e.target.value))}
              className="flex-1 min-w-48 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {todosCursos.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Briefcase size={14} className="text-primary-500" />Requisitos por cargo / área</h3>
              <p className="text-xs text-slate-400 mt-0.5">Quando um colaborador mudar de cargo ou área, os cursos correspondentes serão atribuídos automaticamente.</p>
            </div>

            {loadingReq ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-4"><RefreshCw size={14} className="animate-spin" /> Carregando…</div>
            ) : (
              <>
                {/* Lista de requisitos */}
                {requisitos.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">Nenhum requisito definido para este curso</div>
                ) : (
                  <div className="space-y-2">
                    {requisitos.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex-1 min-w-0">
                          {r.cargo && <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md mr-2"><Briefcase size={10} />{r.cargo}</span>}
                          {r.area  && <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-md"><Target size={10} />{r.area}</span>}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.obrigatorio ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{r.obrigatorio ? 'Obrigatório' : 'Opcional'}</span>
                        <button onClick={() => setRequisitos(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400 transition-colors"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form adicionar requisito */}
                <div className="flex gap-2 flex-wrap items-end pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex-1 min-w-40">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Cargo</label>
                    <select value={novoReqCargo} onChange={e => setNovoReqCargo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-400">
                      <option value="">— Qualquer cargo —</option>
                      {cargosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-40">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Área</label>
                    <select value={novoReqArea} onChange={e => setNovoReqArea(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-400">
                      <option value="">— Qualquer área —</option>
                      {areasDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="shrink-0">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Tipo</label>
                    <select value={novoReqObrig ? 'obrig' : 'opt'} onChange={e => setNovoReqObrig(e.target.value === 'obrig')} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none">
                      <option value="obrig">Obrigatório</option>
                      <option value="opt">Opcional</option>
                    </select>
                  </div>
                  <button onClick={addRequisito} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shrink-0">
                    <Plus size={13} />Adicionar
                  </button>
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSaveRequisitos} disabled={savingReq} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                    {savingReq ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}Salvar requisitos
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Relatórios ── */}
      {tab === 'relatorio' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <select
              value={relCursoId}
              onChange={e => setRelCursoId(e.target.value ? Number(e.target.value) : '')}
              className="flex-1 min-w-48 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todos os cursos</option>
              {todosCursos.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
            </select>
            {relatorioRows.length > 0 && (
              <button
                onClick={() => downloadCSV(relatorioRows.map(r => ({
                  Colaborador: r.colaborador, Cargo: r.cargo, Área: r.area,
                  Curso: r.curso, Categoria: r.categoria, Instrutor: r.instrutor,
                  Obrigatório: r.obrigatorio ? 'Sim' : 'Não',
                  'Total módulos': r.total_modulos,
                  'Módulos concluídos': r.modulos_concluidos,
                  '% Conclusão': r.pct_conclusao ?? 0,
                  Status: r.status,
                  Validado: r.validado ? 'Sim' : 'Não',
                  'Data conclusão': r.data_conclusao ? new Date(r.data_conclusao).toLocaleDateString('pt-BR') : '',
                })), 'relatorio_treinamentos.csv')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
              >
                <Download size={13} />Exportar CSV
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loadingRel ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm"><RefreshCw size={14} className="animate-spin" /> Gerando relatório…</div>
            ) : relatorioRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-sm">
                <FileSpreadsheet size={24} className="opacity-30" />
                <p>Nenhum dado encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      {['Colaborador','Cargo','Área','Curso','Instrutor','Progresso','Status','Validado'].map(h => (
                        <th key={h} className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {relatorioRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">{r.colaborador}</td>
                        <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{r.cargo}</td>
                        <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{r.area}</td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200 max-w-48 truncate">{r.curso}</td>
                        <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{r.instrutor}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200 w-8">{r.pct_conclusao ?? 0}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${r.pct_conclusao >= 100 ? 'bg-emerald-400' : 'bg-primary-400'}`} style={{ width: `${r.pct_conclusao ?? 0}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.status === 'Concluído' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            r.status === 'Em andamento' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          }`}>{r.status}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {r.validado ? <BadgeCheck size={14} className="text-violet-500 mx-auto" /> : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Instrutores ── */}
      {tab === 'instrutores' && (
        <div className="space-y-4">
          {loadingInst ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm"><RefreshCw size={14} className="animate-spin" /> Carregando instrutores…</div>
          ) : instResumo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-sm">
              <GraduationCap size={28} className="opacity-30" />
              <p>Nenhum instrutor cadastrado nos cursos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Resumo cards */}
              <div className="space-y-2">
                {instResumo.map((inst: any) => (
                  <button
                    key={inst.instrutor}
                    onClick={() => setInstSelecionado(inst.instrutor)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      instSelecionado === inst.instrutor
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-sm">{inst.instrutor?.[0]?.toUpperCase() ?? '?'}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{inst.instrutor}</p>
                        <p className="text-[10px] text-slate-400">{inst.total_cursos} curso{inst.total_cursos !== 1 ? 's' : ''} · {inst.total_alunos} aluno{inst.total_alunos !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>% conclusão médio</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">{inst.pct_conclusao_medio ?? 0}%</span>
                        </div>
                        <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-400 rounded-full" style={{ width: `${inst.pct_conclusao_medio ?? 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Detalhe do instrutor */}
              <div className="md:col-span-2">
                {instSelecionado && (() => {
                  const cursosDaInst = instDetalhe.filter((d: any) => d.instrutor === instSelecionado)
                  const inst = instResumo.find((r: any) => r.instrutor === instSelecionado)
                  return (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                        <GraduationCap size={16} className="text-violet-500" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{instSelecionado}</p>
                          <p className="text-[10px] text-slate-400">{inst?.total_cursos} cursos · {inst?.total_alunos} alunos no total</p>
                        </div>
                        {cursosDaInst.length > 0 && (
                          <button
                            onClick={() => downloadCSV(cursosDaInst.map((d: any) => ({
                              Instrutor: d.instrutor, Curso: d.titulo, Categoria: d.categoria,
                              Obrigatório: d.obrigatorio ? 'Sim' : 'Não',
                              'Total alunos': d.total_alunos, Concluídos: d.concluidos,
                              'Em andamento': d.em_andamento, 'Não iniciados': d.nao_iniciados,
                              '% Conclusão': d.pct_conclusao,
                            })), `instrutor_${instSelecionado.replace(/\s/g,'_')}.csv`)}
                            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Download size={12} />CSV
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {cursosDaInst.map((d: any) => (
                          <div key={d.curso_id} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{d.titulo}</p>
                                <p className="text-[10px] text-slate-400">{d.categoria}{d.obrigatorio ? ' · Obrigatório' : ''}</p>
                              </div>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">{d.pct_conclusao}%</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                              {[
                                { label: 'Concluídos', value: d.concluidos, cls: 'text-emerald-600 dark:text-emerald-400' },
                                { label: 'Em andamento', value: d.em_andamento, cls: 'text-blue-600 dark:text-blue-400' },
                                { label: 'Não iniciados', value: d.nao_iniciados, cls: 'text-slate-400' },
                              ].map(s => (
                                <div key={s.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-2">
                                  <p className={`text-lg font-black tabular-nums ${s.cls}`}>{s.value}</p>
                                  <p className="text-[9px] text-slate-400">{s.label}</p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-400 rounded-full" style={{ width: `${d.pct_conclusao}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Certificado ─────────────────────────────────────────────────────────────

function CertificadoBtn({
  colaborador, cargo, curso, instrutor, dataValidacao, validadoPor,
}: {
  colaborador: string; cargo: string; curso: string; instrutor: string
  dataValidacao: string | null; validadoPor: string | null
}) {
  const [open, setOpen] = useState(false)

  const dataFmt = dataValidacao
    ? new Date(dataValidacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  function esc(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function imprimir() {
    const w = window.open('', '_blank', 'width=900,height=650')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Certificado</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
  .cert { width: 840px; min-height: 560px; border: 12px double #1e3a5f; padding: 48px 64px; position: relative; background: #fff; }
  .cert::before { content: ''; position: absolute; inset: 8px; border: 2px solid #c9a84c; pointer-events: none; }
  .logo { text-align: center; margin-bottom: 24px; }
  .logo-title { font-size: 22px; font-weight: bold; color: #1e3a5f; letter-spacing: 4px; text-transform: uppercase; }
  h1 { font-size: 42px; text-align: center; color: #1e3a5f; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .sub { text-align: center; color: #888; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 32px; }
  .body { text-align: center; font-size: 15px; color: #333; line-height: 1.9; }
  .name { font-size: 30px; color: #1e3a5f; font-weight: bold; font-style: italic; display: block; margin: 8px 0; }
  .course { font-size: 20px; color: #c9a84c; font-weight: bold; display: block; margin: 4px 0 8px; }
  .divider { width: 120px; height: 2px; background: #c9a84c; margin: 28px auto; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
  .sig { text-align: center; }
  .sig-line { width: 200px; border-bottom: 1px solid #333; margin-bottom: 6px; }
  .sig-name { font-size: 12px; color: #555; }
  .sig-role { font-size: 10px; color: #999; letter-spacing: 1px; text-transform: uppercase; }
  .date { text-align: right; font-size: 12px; color: #888; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="cert">
  <div class="logo"><span class="logo-title">RTT Shop</span></div>
  <h1>Certificado</h1>
  <p class="sub">de conclusão</p>
  <div class="body">
    <p>Certificamos que</p>
    <span class="name">${esc(colaborador)}</span>
    <p>concluiu com êxito o curso</p>
    <span class="course">${esc(curso)}</span>
    <p>${cargo ? `atuando como <strong>${esc(cargo)}</strong>` : ''}</p>
  </div>
  <div class="divider"></div>
  <div class="footer">
    <div class="sig">
      <div class="sig-line"></div>
      <p class="sig-name">${esc(instrutor || 'Instrutor')}</p>
      <p class="sig-role">Instrutor</p>
    </div>
    <div class="date">
      <p>${dataFmt}</p>
      ${validadoPor ? `<p style="font-size:10px;color:#aaa;margin-top:4px">Validado por ${validadoPor}</p>` : ''}
    </div>
    <div class="sig">
      <div class="sig-line"></div>
      <p class="sig-name">${esc(validadoPor || 'RH')}</p>
      <p class="sig-role">Recursos Humanos</p>
    </div>
  </div>
</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`)
    w.document.close()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
      >
        <Award size={11} />Certificado
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Award size={16} className="text-amber-500" />Certificado de Conclusão</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="border border-amber-200 dark:border-amber-800 rounded-xl p-5 bg-amber-50 dark:bg-amber-900/10 space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">Colaborador</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">{colaborador}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Curso</p>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{curso}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Data de conclusão</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{dataFmt}</p>
              {validadoPor && <p className="text-[11px] text-slate-400 mt-1">Validado por {validadoPor}</p>}
            </div>
            <button onClick={imprimir} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
              <Download size={14} />Imprimir / Salvar PDF
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── EnviarCursosModal ────────────────────────────────────────────────────────

function EnviarCursosModal({ todosCursos, onClose }: { todosCursos: Treinamento[]; onClose: () => void }) {
  const [cursoBusca, setCursoBusca] = useState('')
  const [cursoSelecionado, setCursoSelecionado] = useState<Treinamento | null>(null)
  const [inscritos, setInscritos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [todosColabs, setTodosColabs] = useState<any[]>([])
  const [colabsLoaded, setColabsLoaded] = useState(false)
  const [adicionando, setAdicionando] = useState<number[]>([])
  const [searchAdd, setSearchAdd] = useState('')
  const [saving, setSaving] = useState(false)

  async function selecionarCurso(curso: Treinamento) {
    setCursoSelecionado(curso)
    setShowAdd(false)
    setLoading(true)
    try {
      const res = await api.cursoAtribuicao.getForCurso(curso.id) as any
      setInscritos(res?.inscritos ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function openAdd() {
    setShowAdd(true)
    setAdicionando([])
    setSearchAdd('')
    if (!colabsLoaded) {
      const rows = await api.colaboradores.list() as any
      setTodosColabs((rows as any[]).filter((c: any) => c.ativo !== false))
      setColabsLoaded(true)
    }
  }

  async function confirmarAdd() {
    if (!cursoSelecionado || adicionando.length === 0) return
    setSaving(true)
    try {
      const novosIds = [...new Set([...inscritos.map((i: any) => i.colaborador_id), ...adicionando])]
      await api.cursoAtribuicao.setForCurso(cursoSelecionado.id, novosIds)
      const res = await api.cursoAtribuicao.getForCurso(cursoSelecionado.id) as any
      setInscritos(res?.inscritos ?? [])
      setShowAdd(false)
    } catch (err) {
      console.error('Erro ao adicionar colaborador:', err)
      alert('Erro ao adicionar colaborador. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function remover(colaboradorId: number) {
    if (!cursoSelecionado || saving) return
    setSaving(true)
    try {
      const novosIds = inscritos.filter((i: any) => i.colaborador_id !== colaboradorId).map((i: any) => i.colaborador_id)
      await api.cursoAtribuicao.setForCurso(cursoSelecionado.id, novosIds)
      setInscritos(prev => prev.filter((i: any) => i.colaborador_id !== colaboradorId))
    } finally {
      setSaving(false)
    }
  }

  const cursosFiltered = todosCursos.filter(c =>
    c.titulo.toLowerCase().includes(cursoBusca.toLowerCase())
  )

  const inscritosIds = new Set(inscritos.map((i: any) => i.colaborador_id))
  const disponiveis = todosColabs.filter(c =>
    !inscritosIds.has(c.id) &&
    (c.nome?.toLowerCase().includes(searchAdd.toLowerCase()) || c.cargo?.toLowerCase().includes(searchAdd.toLowerCase()))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: '800px', maxHeight: '88vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Send size={15} className="text-primary-500" /> Enviar Cursos
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Selecione um curso para ver quem tem acesso e gerenciar as inscrições</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── LEFT: course list ── */}
          <div className="w-60 border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Search size={12} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar curso..."
                  value={cursoBusca}
                  onChange={e => setCursoBusca(e.target.value)}
                  className="flex-1 text-xs bg-transparent text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 min-w-0"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {cursosFiltered.map(curso => {
                const ativo = cursoSelecionado?.id === curso.id
                return (
                  <button
                    key={curso.id}
                    onClick={() => selecionarCurso(curso)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-slate-50 dark:border-slate-800/60 ${ativo ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${curso.capa.from} ${curso.capa.to} flex items-center justify-center text-sm shrink-0`}>
                      {curso.icone}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${ativo ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>{curso.titulo}</p>
                      <p className="text-[10px] text-slate-400">{curso.categoria}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT: inscritos panel ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {!cursoSelecionado ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-300 dark:text-slate-600">
                <BookOpen size={36} />
                <p className="text-sm text-slate-400">Selecione um curso para gerenciar os acessos</p>
              </div>

            ) : loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>

            ) : showAdd ? (
              /* ── Add picker ── */
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Adicionar colaboradores</p>
                  <button onClick={() => setShowAdd(false)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={13} /> Cancelar
                  </button>
                </div>
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <Search size={12} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Buscar colaborador..."
                      value={searchAdd}
                      onChange={e => setSearchAdd(e.target.value)}
                      className="flex-1 text-xs bg-transparent text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 min-w-0"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {!colabsLoaded && (
                    <p className="text-xs text-slate-400 text-center py-8">Carregando colaboradores...</p>
                  )}
                  {colabsLoaded && disponiveis.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8">Todos os colaboradores já têm acesso a este curso</p>
                  )}
                  {disponiveis.map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800/60 select-none">
                      <input
                        type="checkbox"
                        checked={adicionando.includes(c.id)}
                        onChange={e => setAdicionando(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))}
                        className="rounded accent-primary-600 shrink-0"
                      />
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${cursoSelecionado.capa.from} ${cursoSelecionado.capa.to} flex items-center justify-center shrink-0`}>
                        <span className="text-[11px] font-bold text-white">{c.nome?.[0] ?? '?'}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{c.nome}</p>
                        <p className="text-[10px] text-slate-400 truncate">{c.cargo}{c.area ? ` · ${c.area}` : ''}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0 flex items-center justify-between">
                  <p className="text-xs text-slate-400">{adicionando.length} selecionado{adicionando.length !== 1 ? 's' : ''}</p>
                  <button
                    onClick={confirmarAdd}
                    disabled={adicionando.length === 0 || saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                  >
                    <Plus size={12} /> {saving ? 'Adicionando...' : `Adicionar${adicionando.length > 0 ? ` (${adicionando.length})` : ''}`}
                  </button>
                </div>
              </div>

            ) : (
              /* ── Inscritos list ── */
              <div className="flex flex-col h-full overflow-hidden">
                {/* Course gradient header with stats */}
                <div className={`px-5 py-4 bg-gradient-to-r ${cursoSelecionado.capa.from} ${cursoSelecionado.capa.to} shrink-0`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{cursoSelecionado.titulo}</p>
                      <p className="text-[11px] text-white/70 mt-0.5">{cursoSelecionado.categoria} · {cursoSelecionado.nivel} · {cursoSelecionado.modulos.length} módulo{cursoSelecionado.modulos.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-white leading-none">{inscritos.length}</p>
                      <p className="text-[10px] text-white/70">inscrito{inscritos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {inscritos.length > 0 && (() => {
                    const avg = Math.round(inscritos.reduce((a: number, i: any) =>
                      a + (i.total_modulos > 0 ? (i.modulos_concluidos / i.total_modulos) * 100 : 0), 0
                    ) / inscritos.length)
                    return (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-white/70">Progresso médio da turma</p>
                          <p className="text-[11px] text-white font-semibold">{avg}%</p>
                        </div>
                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white/80 rounded-full transition-all duration-500" style={{ width: `${avg}%` }} />
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Collaborator rows */}
                <div className="overflow-y-auto flex-1">
                  {inscritos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 py-12 text-slate-400">
                      <Users size={28} className="opacity-30" />
                      <p className="text-sm font-medium">Nenhum colaborador inscrito</p>
                      <p className="text-xs text-slate-400 text-center max-w-[220px]">Clique em "+ Adicionar colaboradores" para incluir profissionais neste curso</p>
                    </div>
                  ) : inscritos.map((i: any) => {
                    const pct = i.total_modulos > 0 ? Math.round((i.modulos_concluidos / i.total_modulos) * 100) : 0
                    const concluido = pct === 100
                    return (
                      <div key={i.colaborador_id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800/60 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${cursoSelecionado.capa.from} ${cursoSelecionado.capa.to} flex items-center justify-center shrink-0`}>
                          <span className="text-sm font-bold text-white">{i.nome?.[0] ?? '?'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{i.nome}</p>
                            <span className={`text-[11px] font-bold shrink-0 ${concluido ? 'text-emerald-500' : 'text-slate-400'}`}>
                              {concluido ? '✓ 100%' : `${pct}%`}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mb-1.5">{i.cargo}{i.area ? ` · ${i.area}` : ''}</p>
                          <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${concluido ? 'bg-emerald-400' : 'bg-primary-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{i.modulos_concluidos}/{i.total_modulos} módulos concluídos</p>
                        </div>
                        <button
                          onClick={() => remover(i.colaborador_id)}
                          disabled={saving}
                          title="Remover acesso"
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0 disabled:pointer-events-none"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Add button footer */}
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                  <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all w-full justify-center"
                  >
                    <Plus size={14} /> Adicionar colaboradores
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Área do Instrutor ────────────────────────────────────────────────────────

function InstrutorView({ user }: { user: any }) {
  const [cursos, setCursos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<any | null | 'new'>(null)
  const [saving, setSaving] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [deletando, setDeletando] = useState(false)

  // Form state
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('Geral')
  const [nivel, setNivel] = useState('Básico')
  const [duracao, setDuracao] = useState('')
  const [icone, setIcone] = useState('📚')
  const [capaFrom, setCapaFrom] = useState('from-slate-500')
  const [capaTo, setCapaTo] = useState('to-slate-600')
  const [modulos, setModulos] = useState<ModuloEdit[]>([])
  const [instrutores, setInstrutores] = useState<any[]>([])
  const [buscarUser, setBuscarUser] = useState('')
  const [usersDisponiveis, setUsersDisponiveis] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [adicionandoInst, setAdicionandoInst] = useState(false)

  // Requisitos
  const [requisitos, setRequisitos] = useState<{ cargo?: string; area?: string; obrigatorio: boolean }[]>([])
  const [novoReqCargo, setNovoReqCargo] = useState('')
  const [novoReqArea, setNovoReqArea] = useState('')
  const [novoReqObrig, setNovoReqObrig] = useState(true)
  const [savingReq, setSavingReq] = useState(false)
  const [cargosDisponiveis, setCargosDisponiveis] = useState<string[]>([])
  const [areasDisponiveis, setAreasDisponiveis] = useState<string[]>([])
  const [loadingReq, setLoadingReq] = useState(false)

  useEffect(() => {
    api.cursos.getMeusCursosInstrutor()
      .then(rows => setCursos(rows as any[]))
      .catch(() => setCursos([]))
      .finally(() => setLoading(false))
  }, [])

  function abrirCurso(curso: any) {
    setEditando(curso)
    setTitulo(curso.titulo ?? '')
    setDescricao(curso.descricao ?? '')
    setCategoria(curso.categoria ?? 'Geral')
    setNivel(curso.nivel ?? 'Básico')
    setDuracao(curso.duracao ?? '')
    setIcone(curso.icone ?? '📚')
    setCapaFrom(curso.capa_from ?? 'from-slate-500')
    setCapaTo(curso.capa_to ?? 'to-slate-600')
    setModulos((curso.modulos ?? []).map((m: any) => ({ ...m })))
    setInstrutores(curso.instrutores ?? [])
    setRequisitos([])

    if (!cargosDisponiveis.length) {
      api.colaboradores.list().then((cols: any[]) => {
        setCargosDisponiveis([...new Set(cols.map((c: any) => c.cargo).filter(Boolean))].sort())
        setAreasDisponiveis([...new Set(cols.map((c: any) => c.area).filter(Boolean))].sort())
      }).catch(() => {})
    }
    setLoadingReq(true)
    api.cursoRequisitos.list(curso.id)
      .then((rows: any[]) => setRequisitos(rows.map((r: any) => ({ cargo: r.cargo ?? undefined, area: r.area ?? undefined, obrigatorio: r.obrigatorio ?? true }))))
      .catch(() => setRequisitos([]))
      .finally(() => setLoadingReq(false))
  }

  function novoCurso() {
    setEditando('new')
    setTitulo(''); setDescricao(''); setCategoria('Geral'); setNivel('Básico')
    setDuracao(''); setIcone('📚'); setCapaFrom('from-slate-500'); setCapaTo('to-slate-600')
    setModulos([]); setInstrutores([])
  }

  function voltar() { setEditando(null); setBuscarUser('') }

  async function salvar() {
    if (!titulo.trim()) return
    setSaving(true)
    try {
      const payload = { titulo: titulo.trim(), descricao, categoria, nivel, duracao, icone, capa_from: capaFrom, capa_to: capaTo, modulos, instrutor: user?.name ?? '', ordem: 0, obrigatorio: false, avaliacao: 5.0, status: 'rascunho' }
      if (editando === 'new') {
        const novo = await api.cursos.create(payload) as any
        novo.instrutores = [{ user_id: user?.id, nome: user?.name }]
        setCursos(prev => [novo, ...prev])
        setEditando(novo)
        setInstrutores(novo.instrutores)
      } else {
        const atualizado = await api.cursos.update(editando.id, payload) as any
        atualizado.instrutores = instrutores
        setCursos(prev => prev.map(c => c.id === atualizado.id ? atualizado : c))
        setEditando(atualizado)
      }
    } catch { /* noop */ } finally { setSaving(false) }
  }

  async function publicar() {
    if (editando === 'new' || !editando) return
    setPublicando(true)
    try {
      const atualizado = await api.cursos.publicar(editando.id) as any
      atualizado.instrutores = instrutores
      setCursos(prev => prev.map(c => c.id === atualizado.id ? atualizado : c))
      setEditando(atualizado)
    } catch { /* noop */ } finally { setPublicando(false) }
  }

  async function excluir() {
    if (editando === 'new' || !editando) return
    if (!window.confirm(`Excluir "${editando.titulo}"?`)) return
    setDeletando(true)
    try {
      await api.cursos.delete(editando.id)
      setCursos(prev => prev.filter(c => c.id !== editando.id))
      voltar()
    } catch { /* noop */ } finally { setDeletando(false) }
  }

  async function buscarUsuarios(q: string) {
    setBuscarUser(q)
    if (q.length < 2) { setUsersDisponiveis([]); return }
    setLoadingUsers(true)
    try {
      const todos = await api.users.list() as any[]
      const jaSao = new Set(instrutores.map((i: any) => i.user_id))
      setUsersDisponiveis(
        todos.filter((u: any) => !jaSao.has(u.id) && u.name?.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
      )
    } catch { setUsersDisponiveis([]) } finally { setLoadingUsers(false) }
  }

  async function handleSaveRequisitos() {
    if (editando === 'new' || !editando) return
    setSavingReq(true)
    try {
      await api.cursoRequisitos.save(editando.id, requisitos)
    } catch { /* noop */ } finally { setSavingReq(false) }
  }

  function addRequisito() {
    if (!novoReqCargo && !novoReqArea) return
    setRequisitos(prev => [...prev, { cargo: novoReqCargo || undefined, area: novoReqArea || undefined, obrigatorio: novoReqObrig }])
    setNovoReqCargo(''); setNovoReqArea('')
  }

  async function adicionarInstrutor(u: any) {
    if (editando === 'new' || !editando) return
    setAdicionandoInst(true)
    try {
      await api.cursos.addInstrutor(editando.id, u.id, u.name)
      const novoInst = { user_id: u.id, nome: u.name }
      setInstrutores(prev => [...prev, novoInst])
      setCursos(prev => prev.map(c => c.id === editando.id ? { ...c, instrutores: [...(c.instrutores ?? []), novoInst] } : c))
      setBuscarUser(''); setUsersDisponiveis([])
    } catch { /* noop */ } finally { setAdicionandoInst(false) }
  }

  async function removerInstrutor(userId: number) {
    if (editando === 'new' || !editando) return
    if (userId === user?.id) { alert('Você não pode remover a si mesmo.'); return }
    try {
      await api.cursos.removeInstrutor(editando.id, userId)
      setInstrutores(prev => prev.filter((i: any) => i.user_id !== userId))
    } catch { /* noop */ }
  }

  function addModulo() {
    const maxId = modulos.length > 0 ? Math.max(...modulos.map(m => m.id)) : 0
    setModulos(prev => [...prev, { id: maxId + 1, titulo: '', tipo: 'video', duracao: '' }])
  }

  const CAPAS = [
    { from: 'from-slate-500',   to: 'to-slate-600' },
    { from: 'from-rose-500',    to: 'to-red-600' },
    { from: 'from-amber-500',   to: 'to-orange-600' },
    { from: 'from-emerald-500', to: 'to-teal-600' },
    { from: 'from-blue-500',    to: 'to-indigo-600' },
    { from: 'from-violet-500',  to: 'to-purple-600' },
    { from: 'from-pink-500',    to: 'to-rose-600' },
    { from: 'from-cyan-500',    to: 'to-blue-600' },
  ]

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500'

  // ── EDITOR VIEW ──
  if (editando !== null) {
    const isNew = editando === 'new'
    const isPublicado = !isNew && editando.status === 'publicado'
    const podPublicar = !isNew && !isPublicado

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={voltar} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <ArrowLeft size={15} />Meus cursos
          </button>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-xs">{isNew ? 'Novo curso' : (titulo || 'Sem título')}</span>
          {!isNew && (
            <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isPublicado ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
              {isPublicado ? 'Publicado' : 'Rascunho'}
            </span>
          )}
          <div className="flex-1" />
          {!isNew && !isPublicado && (
            <button onClick={excluir} disabled={deletando} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
              <Trash2 size={12} />Excluir
            </button>
          )}
          {podPublicar && (
            <button onClick={publicar} disabled={publicando} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60">
              {publicando ? <RefreshCw size={11} className="animate-spin" /> : <Globe size={12} />}Publicar
            </button>
          )}
          <button onClick={salvar} disabled={saving || !titulo.trim()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-60">
            {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={12} />}Salvar
          </button>
        </div>

        {/* Informações */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Informações</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Título *</label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Introdução à Segurança do Trabalho" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Descrição</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Descreva o objetivo e o conteúdo do curso..." className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inputCls}>
                {['Compliance', 'Segurança', 'Soft Skills', 'Liderança', 'Técnico', 'Operacional', 'Geral'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Nível</label>
              <select value={nivel} onChange={e => setNivel(e.target.value)} className={inputCls}>
                {['Básico', 'Intermediário', 'Avançado'].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Duração estimada</label>
              <input value={duracao} onChange={e => setDuracao(e.target.value)} placeholder="Ex: 2h30" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Ícone (emoji)</label>
              <input value={icone} onChange={e => setIcone(e.target.value)} placeholder="📚" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Cor da capa</label>
            <div className="flex gap-2 flex-wrap">
              {CAPAS.map(c => (
                <button key={c.from} onClick={() => { setCapaFrom(c.from); setCapaTo(c.to) }}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.from} ${c.to} transition-transform hover:scale-110 ${capaFrom === c.from ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''}`} />
              ))}
            </div>
          </div>
          <div className={`rounded-xl bg-gradient-to-br ${capaFrom} ${capaTo} p-4 text-white flex items-center gap-3`}>
            <span className="text-2xl">{icone || '📚'}</span>
            <div>
              <p className="font-semibold text-sm">{titulo || 'Título do curso'}</p>
              <p className="text-xs opacity-70">{categoria} · {nivel}{duracao ? ` · ${duracao}` : ''}</p>
            </div>
          </div>
        </div>

        {/* Módulos */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Módulos <span className="text-slate-400 font-normal">({modulos.length})</span></h3>
            <button onClick={addModulo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors">
              <Plus size={12} />Adicionar módulo
            </button>
          </div>
          {modulos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-300 dark:text-slate-600">
              <BookOpen size={28} className="opacity-50" />
              <p className="text-sm text-slate-400">Nenhum módulo ainda</p>
              <button onClick={addModulo} className="text-xs text-primary-500 hover:text-primary-600 font-medium">+ Adicionar primeiro módulo</button>
            </div>
          )}
          <div className="space-y-3">
            {modulos.map((m, idx) => (
              <ModuloEditorCard
                key={m.id}
                m={m}
                idx={idx}
                total={modulos.length}
                onChange={updated => setModulos(prev => prev.map((x, i) => i === idx ? updated : x))}
                onDelete={() => setModulos(prev => prev.filter((_, i) => i !== idx))}
                onMove={dir => setModulos(prev => {
                  const a = [...prev]
                  const t = idx + dir
                  if (t < 0 || t >= a.length) return a
                  ;[a[idx], a[t]] = [a[t], a[idx]]
                  return a
                })}
              />
            ))}
          </div>
        </div>

        {/* Requisitos */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Briefcase size={14} className="text-primary-500" />Requisitos por cargo / área</h3>
            <p className="text-xs text-slate-400 mt-0.5">Defina quais cargos e áreas receberão este curso automaticamente.</p>
          </div>
          {isNew ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
              <AlertTriangle size={14} />Salve o curso primeiro para configurar os requisitos.
            </div>
          ) : loadingReq ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4"><RefreshCw size={14} className="animate-spin" />Carregando…</div>
          ) : (
            <>
              {requisitos.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">Nenhum requisito definido — o curso não será atribuído automaticamente</div>
              ) : (
                <div className="space-y-2">
                  {requisitos.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                      <div className="flex-1 min-w-0 flex flex-wrap gap-1.5">
                        {r.cargo && <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md"><Briefcase size={10} />{r.cargo}</span>}
                        {r.area  && <span className="inline-flex items-center gap-1 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-md"><Target size={10} />{r.area}</span>}
                        {!r.cargo && !r.area && <span className="text-xs text-slate-400 italic">Todos os colaboradores</span>}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${r.obrigatorio ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{r.obrigatorio ? 'Obrigatório' : 'Opcional'}</span>
                      <button onClick={() => setRequisitos(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400 transition-colors shrink-0"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 flex-wrap items-end pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex-1 min-w-40">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Cargo</label>
                  <select value={novoReqCargo} onChange={e => setNovoReqCargo(e.target.value)} className={inputCls}>
                    <option value="">— Qualquer cargo —</option>
                    {cargosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-40">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Área</label>
                  <select value={novoReqArea} onChange={e => setNovoReqArea(e.target.value)} className={inputCls}>
                    <option value="">— Qualquer área —</option>
                    {areasDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="shrink-0">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Tipo</label>
                  <select value={novoReqObrig ? 'obrig' : 'opt'} onChange={e => setNovoReqObrig(e.target.value === 'obrig')} className={inputCls}>
                    <option value="obrig">Obrigatório</option>
                    <option value="opt">Opcional</option>
                  </select>
                </div>
                <button onClick={addRequisito} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shrink-0">
                  <Plus size={13} />Adicionar
                </button>
              </div>
              <div className="flex justify-end">
                <button onClick={handleSaveRequisitos} disabled={savingReq} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                  {savingReq ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}Salvar requisitos
                </button>
              </div>
            </>
          )}
        </div>

        {/* Instrutores */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2"><Users size={14} className="text-primary-500" />Instrutores</h3>
          {isNew ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
              <AlertTriangle size={14} />Salve o curso primeiro para poder adicionar co-instrutores.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {instrutores.map((inst: any) => (
                  <div key={inst.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm">
                      {(inst.nome || '?')[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{inst.nome}</span>
                    {inst.user_id === user?.id && <span className="text-[10px] text-slate-400">você</span>}
                    {inst.user_id !== user?.id && (
                      <button onClick={() => removerInstrutor(inst.user_id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Adicionar co-instrutor</p>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={buscarUser} onChange={e => buscarUsuarios(e.target.value)}
                    placeholder="Buscar por nome..." className={inputCls + ' pl-8'} />
                </div>
                {loadingUsers && <p className="text-xs text-slate-400 mt-2">Buscando...</p>}
                {usersDisponiveis.length > 0 && (
                  <div className="mt-2 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                    {usersDisponiveis.map((u: any) => (
                      <button key={u.id} onClick={() => adicionarInstrutor(u)} disabled={adicionandoInst}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-100 dark:border-slate-700 last:border-0 disabled:opacity-50">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold">
                          {(u.name || '?')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{u.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.role}</p>
                        </div>
                        <UserPlus size={13} className="text-primary-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── LISTA DE CURSOS ──
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Área do Instrutor</h3>
          <p className="text-xs text-slate-400 mt-0.5">Crie e gerencie os cursos que você ministra</p>
        </div>
        <button onClick={novoCurso} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors">
          <Plus size={13} />Novo curso
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-300 dark:text-slate-600">
          <RefreshCw size={24} className="animate-spin" />
        </div>
      )}

      {!loading && cursos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-300 dark:text-slate-600">
          <BookMarked size={40} className="opacity-50" />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-500">Nenhum curso ainda</p>
            <p className="text-xs mt-1">Clique em "Novo curso" para começar a criar</p>
          </div>
          <button onClick={novoCurso} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors">
            <Plus size={14} />Criar primeiro curso
          </button>
        </div>
      )}

      {!loading && cursos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cursos.map(curso => {
            const modCount = (curso.modulos ?? []).length
            const instCount = (curso.instrutores ?? []).length
            const isPublicado = curso.status === 'publicado'
            return (
              <button key={curso.id} onClick={() => abrirCurso(curso)}
                className="text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all group">
                <div className={`h-2 bg-gradient-to-r ${curso.capa_from ?? 'from-slate-500'} ${curso.capa_to ?? 'to-slate-600'}`} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-2 justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0">{curso.icone ?? '📚'}</span>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{curso.titulo}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${isPublicado ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {isPublicado ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                  {curso.descricao && <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-2">{curso.descricao}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><BookOpen size={10} />{modCount} módulo{modCount !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><Users size={10} />{instCount} instrutor{instCount !== 1 ? 'es' : ''}</span>
                    {curso.categoria && <span>{curso.categoria}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TreinamentosPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const podeGerenciar = isAdmin(user?.role) || isGestor(user?.role)
  const podeInstrutor = isAdmin(user?.role) || isInstrutor(user?.role, user?.roles)

  const [view, setView] = useState<'meus' | 'gestao' | 'instrutor'>('meus')
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'em-andamento' | 'concluidos' | 'nao-iniciados'>('todos')
  const [modalCurso, setModalCurso] = useState<Treinamento | null>(null)
  const [vistaLista, setVistaLista] = useState<'cursos' | 'trilhas'>('cursos')
  const [cursos, setCursos] = useState<Treinamento[]>([])
  const [moduloConfigs, setModuloConfigs] = useState<Record<string, string>>({})
  const [progressoSegsMap, setProgressoSegsMap] = useState<Record<string, number>>({})
  const [editCurso, setEditCurso] = useState<Treinamento | null | 'new'>(null)
  const [atribuidosIds, setAtribuidosIds] = useState<number[]>([])
  const [filtradoPorRequisitos, setFiltradoPorRequisitos] = useState(false)
  const [enviarCursos, setEnviarCursos] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.cursos.list().catch(() => []),
      api.treinamentoProgresso.list().catch(() => []),
      api.moduloConfig.list().catch(() => []),
      api.cursoAtribuicao.getMy().catch(() => ({ curso_ids: [] })),
    ]).then(([cursosDb, progressoRows, configRows, atribuicao]) => {
      const progressoMap: Record<string, boolean> = {}
      const segsMap: Record<string, number> = {}
      for (const r of progressoRows as { curso_id: number; modulo_id: number; concluido: boolean; segundos_assistidos: number }[]) {
        progressoMap[`${r.curso_id}_${r.modulo_id}`] = r.concluido
        if (r.segundos_assistidos > 0) segsMap[`${r.curso_id}_${r.modulo_id}`] = r.segundos_assistidos
      }

      const configMap: Record<string, string> = {}
      for (const r of configRows as { curso_id: number; modulo_id: number; video_url: string }[]) {
        if (r.video_url) configMap[`${r.curso_id}_${r.modulo_id}`] = r.video_url
      }

      setCursos((cursosDb as any[]).map(row => dbToTreinamento(row, progressoMap)))
      setModuloConfigs(configMap)
      setProgressoSegsMap(segsMap)
      setAtribuidosIds((atribuicao as any)?.curso_ids ?? [])
      setFiltradoPorRequisitos((atribuicao as any)?.filtrado_por_requisitos ?? false)
    }).finally(() => setLoading(false))
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

  // Admins veem tudo; non-admins veem só os atribuídos/requisitos
  // Se filtradoPorRequisitos=true o backend já retornou a lista correta (sem fallback de "mostrar tudo")
  const cursosVisiveis = isAdmin(user?.role)
    ? cursos
    : (filtradoPorRequisitos || atribuidosIds.length > 0)
      ? cursos.filter(c => atribuidosIds.includes(c.id))
      : cursos

  // Pending obligations are based only on enrolled courses — never on the full catalogue
  const cursosInscritos = cursos.filter(c => atribuidosIds.includes(c.id))
  const concluidos   = cursosInscritos.filter(t => getProgresso(t) === 100).length
  const emAndamento  = cursosInscritos.filter(t => { const p = getProgresso(t); return p > 0 && p < 100 }).length
  const obrigPend    = cursosInscritos.filter(t => t.obrigatorio && getProgresso(t) < 100).length
  const pctGeral     = cursosVisiveis.length === 0 ? 0 : Math.round(cursosVisiveis.reduce((a, t) => a + getProgresso(t), 0) / cursosVisiveis.length)

  const filtered = cursosVisiveis.filter(t => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
        <RefreshCw size={18} className="animate-spin" /><span className="text-sm">Carregando treinamentos...</span>
      </div>
    )
  }

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
            <>
              <button
                onClick={() => setEnviarCursos(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition-colors"
              >
                <Send size={13} />Enviar Cursos
              </button>
              <button
                onClick={() => setEditCurso('new')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                <Plus size={13} />Novo curso
              </button>
            </>
          )}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl text-sm">
            <button
              onClick={() => setView('meus')}
              className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${view === 'meus' ? 'bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Meus cursos
            </button>
            {podeInstrutor && (
              <button
                onClick={() => setView('instrutor')}
                className={`px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${view === 'instrutor' ? 'bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <FilePen size={13} />Instrutor
              </button>
            )}
            {podeGerenciar && (
              <button
                onClick={() => setView('gestao')}
                className={`px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${view === 'gestao' ? 'bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <BarChart2 size={14} />Gestão
                {obrigPend > 0 && view === 'meus' && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{obrigPend}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {view === 'instrutor' ? <InstrutorView user={user} /> : view === 'gestao' ? <RHView todosCursos={cursos} /> : (
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
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">{concluidos} de {cursosInscritos.length} cursos concluídos</p>
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
                      onClick={() => navigate(`/intranet/treinamentos/${t.id}`)}
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
                {filtered.map(t => <CourseCard key={t.id} t={t} onClick={() => navigate(`/intranet/treinamentos/${t.id}`)} canAdmin={isAdmin(user?.role)} onEdit={e => { e.stopPropagation(); setEditCurso(t) }} />)}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {/* Trilhas derivadas dos cursos reais que possuem trilha_id */}
              {Array.from(new Set(cursosVisiveis.filter(t => t.trilhaId).map(t => t.trilhaId!))).map(trilhaId => {
                const trilhaCursos = cursosVisiveis.filter(t => t.trilhaId === trilhaId && (categoria === 'Todos' || t.categoria === categoria))
                if (trilhaCursos.length === 0) return null
                const trilhaMock = TRILHAS.find(tr => tr.id === trilhaId)
                const trilha = trilhaMock ?? { id: trilhaId, titulo: `Trilha ${trilhaId}`, descricao: '', cor: '#6366f1', icone: '📚' }
                return (
                  <TrilhaCard
                    key={trilhaId}
                    trilha={trilha}
                    cursos={trilhaCursos}
                    onCursoClick={t => navigate(`/intranet/treinamentos/${t.id}`)}
                  />
                )
              })}
              {/* Cursos sem trilha */}
              {cursos.filter(t => !t.trilhaId && (categoria === 'Todos' || t.categoria === categoria)).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cursos avulsos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cursos.filter(t => !t.trilhaId && (categoria === 'Todos' || t.categoria === categoria)).map(t => (
                      <CourseCard key={t.id} t={t} onClick={() => navigate(`/intranet/treinamentos/${t.id}`)} />
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
          progressoSegsMap={progressoSegsMap}
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
      {enviarCursos && (
        <EnviarCursosModal
          todosCursos={cursos}
          onClose={() => setEnviarCursos(false)}
        />
      )}
    </div>
  )
}
