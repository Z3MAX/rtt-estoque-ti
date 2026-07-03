import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, Layers, Users, Star, CheckCircle2, Play, Lock,
  FileText, HelpCircle, AlertTriangle, BookOpen, Award, Video,
  ChevronDown, ChevronUp, Send, Edit2, Save, Link, X,
} from 'lucide-react'
import { useAuth, isAdmin } from '../../../lib/auth'
import { api } from '../../../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseVideoUrl(url: string, startSec = 0) {
  if (!url) return { type: null as null, embedUrl: null as string | null }
  const start = Math.floor(startSec)
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return { type: 'youtube' as const, embedUrl: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0&enablejsapi=1${start > 0 ? `&start=${start}` : ''}` }
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return { type: 'vimeo' as const, embedUrl: `https://player.vimeo.com/video/${vi[1]}?autoplay=1&api=1${start > 0 ? `#t=${start}s` : ''}` }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { type: 'direct' as const, embedUrl: url }
  return { type: null as null, embedUrl: null as string | null }
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function getProgresso(modulos: Modulo[]) {
  if (!modulos.length) return 0
  return Math.round((modulos.filter(m => m.concluido).length / modulos.length) * 100)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Modulo {
  id: number
  titulo: string
  duracao: string
  tipo: 'video' | 'pdf' | 'quiz'
  concluido: boolean
}

interface Curso {
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
}

// ─── VideoPlayer ──────────────────────────────────────────────────────────────

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

  function persistSeconds() {
    const secs = watchedRef.current
    if (!isFinite(secs) || secs <= 0 || secs === lastSavedRef.current) return
    lastSavedRef.current = secs
    api.treinamentoProgresso.saveSeconds(cursoId, moduloId, Math.floor(secs)).catch(() => {})
  }

  useEffect(() => () => { persistSeconds() }, [])

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      watchedRef.current = Math.min(watchedRef.current + 1, durationRef.current || Infinity)
      setWatchedSec(watchedRef.current)
      if (!unlockedRef.current && durationRef.current > 0 && watchedRef.current >= durationRef.current * 0.95) {
        unlockedRef.current = true
        setUnlocked(true)
        if (!concluido) onMarcarConcluido()
      }
      if (Math.floor(watchedRef.current) % 10 === 0) persistSeconds()
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, concluido, onMarcarConcluido])

  useEffect(() => {
    if (type !== 'youtube' && type !== 'vimeo') return
    function handle(e: MessageEvent) {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (type === 'youtube') {
          if (d.event === 'infoDelivery' && d.info?.duration && durationRef.current === 0) {
            durationRef.current = d.info.duration
            setTotalDuration(d.info.duration)
          }
          if (d.event === 'onStateChange') {
            if (d.info === 1) setIsPlaying(true)
            if (d.info === 2 || d.info === 0) setIsPlaying(false)
          }
        }
        if (type === 'vimeo') {
          if (d.event === 'timeupdate' && d.data?.duration && durationRef.current === 0) {
            durationRef.current = d.data.duration
            setTotalDuration(d.data.duration)
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
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
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
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={onIframeLoad}
          />
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

      {showWarning && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-300">Avançar o vídeo não conta</p>
            <p className="text-[11px] text-amber-400/80 mt-0.5 leading-relaxed">
              O sistema mede o tempo real assistido.
              {hasDuration && remaining !== null && remaining > 0
                ? ` Faltam aprox. ${fmtTime(remaining)} para desbloquear.`
                : ' Continue assistindo sem pular.'}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-2 text-xs text-white/35 min-w-0">
          <span>{type === 'youtube' ? 'YouTube' : type === 'vimeo' ? 'Vimeo' : type === 'direct' ? 'Vídeo direto' : ''}</span>
          {hasDuration && !unlocked && watchedSec > 0 && (
            <span className="text-amber-400/80 font-medium tabular-nums">
              {fmtTime(watchedSec)} / {fmtTime(totalDuration)} assistido
            </span>
          )}
        </div>
        {concluido ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-xs text-emerald-400 font-semibold shrink-0">
            <CheckCircle2 size={13} /> Concluído
          </span>
        ) : unlocked ? (
          <button onClick={handleButtonClick} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shrink-0">
            <CheckCircle2 size={13} /> Marcar como concluído
          </button>
        ) : (
          <button onClick={handleButtonClick} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/30 text-white/50 hover:text-amber-300 text-xs font-medium transition-all shrink-0">
            <Lock size={12} />
            <span>Bloqueado</span>
            {hasDuration && progressPct > 0 && <span className="text-white/30 tabular-nums">· {progressPct}%</span>}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'} />
      ))}
      <span className="ml-1 text-xs text-slate-500 dark:text-slate-400 font-medium">{value.toFixed(1)}</span>
    </span>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

const TIPO_ICON: Record<string, React.ReactNode> = {
  video: <Video size={14} className="text-primary-500" />,
  pdf: <FileText size={14} className="text-amber-500" />,
  quiz: <HelpCircle size={14} className="text-violet-500" />,
}

const NIVEL_COLORS: Record<string, string> = {
  'Básico':         'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Intermediário':  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Avançado':       'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
}

// ─── CursoDetalhe ─────────────────────────────────────────────────────────────

function dbToCurso(row: any, progressoMap: Record<string, boolean> = {}): Curso {
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
  }
}

export default function CursoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canAdmin = isAdmin(user?.role)

  const [curso, setCurso] = useState<Curso | null>(null)
  const [loading, setLoading] = useState(true)
  const [moduloConfigs, setModuloConfigs] = useState<Record<string, string>>({})
  const [progressoSegsMap, setProgressoSegsMap] = useState<Record<string, number>>({})

  const [videoAberto, setVideoAberto] = useState<number | null>(null)
  const [modulosExpanded, setModulosExpanded] = useState(true)
  const [editando, setEditando] = useState<number | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)

  const [avaliacaoNota, setAvaliacaoNota] = useState<number | null>(null)
  const [avaliacaoComentario, setAvaliacaoComentario] = useState('')
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false)
  const [savingAvaliacao, setSavingAvaliacao] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)

    Promise.all([
      api.cursos.list(),
      api.moduloConfig.list().catch(() => []),
      api.treinamentoProgresso.list().catch(() => []),
    ]).then(([cursos, configs, progresso]) => {
      const row = cursos.find((c: any) => c.id === parseInt(id))
      if (!row) { setLoading(false); return }

      const progressoMap: Record<string, boolean> = {}
      const segsMap: Record<string, number> = {}
      for (const p of progresso) {
        progressoMap[`${p.curso_id}_${p.modulo_id}`] = p.concluido
        segsMap[`${p.curso_id}_${p.modulo_id}`] = p.segundos_assistidos ?? 0
      }
      const configMap: Record<string, string> = {}
      for (const c of configs) configMap[`${c.curso_id}_${c.modulo_id}`] = c.video_url

      setCurso(dbToCurso(row, progressoMap))
      setModuloConfigs(configMap)
      setProgressoSegsMap(segsMap)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!curso) return
    const pct = getProgresso(curso.modulos)
    if (pct < 100) return
    api.cursoAvaliacao.get(curso.id).then(r => {
      if (r) { setAvaliacaoNota(r.nota); setAvaliacaoComentario(r.comentario ?? ''); setAvaliacaoEnviada(true) }
    }).catch(() => {})
  }, [curso?.id, curso && getProgresso(curso.modulos)])

  function getVideoUrl(moduloId: number) {
    return curso ? (moduloConfigs[`${curso.id}_${moduloId}`] ?? '') : ''
  }

  async function handleToggle(cursoId: number, moduloId: number, done: boolean) {
    await api.treinamentoProgresso.mark(cursoId, moduloId, done).catch(() => {})
    setCurso(prev => {
      if (!prev) return prev
      return { ...prev, modulos: prev.modulos.map(m => m.id === moduloId ? { ...m, concluido: done } : m) }
    })
  }

  async function saveUrl(moduloId: number) {
    if (!curso) return
    setSavingUrl(true)
    const url = editUrl.trim() || null
    const key = `${curso.id}_${moduloId}`
    await api.moduloConfig.save(curso.id, moduloId, url).catch(() => {})
    setModuloConfigs(prev => url ? { ...prev, [key]: url } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)))
    setSavingUrl(false)
    setEditando(null)
  }

  async function handleEnviarAvaliacao() {
    if (!avaliacaoNota || !curso) return
    setSavingAvaliacao(true)
    await api.cursoAvaliacao.save(curso.id, avaliacaoNota, avaliacaoComentario || undefined).catch(() => {})
    setSavingAvaliacao(false)
    setAvaliacaoEnviada(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!curso) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-400">
        <BookOpen size={40} className="opacity-30" />
        <p className="text-sm">Curso não encontrado.</p>
        <button onClick={() => navigate('/intranet/treinamentos')} className="text-xs text-primary-500 hover:underline">
          Voltar para treinamentos
        </button>
      </div>
    )
  }

  const pct = getProgresso(curso.modulos)
  const concluidos = curso.modulos.filter(m => m.concluido).length

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 animate-fade-in">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className={`bg-gradient-to-br ${curso.capa.from} ${curso.capa.to} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-5 pb-10">
          {/* Breadcrumb / Back */}
          <button
            onClick={() => navigate('/intranet/treinamentos')}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium mb-6 transition-colors"
          >
            <ArrowLeft size={14} />
            Treinamentos
          </button>

          <div className="flex gap-6 items-end">
            <span className="text-[64px] leading-none drop-shadow-lg select-none hidden sm:block">{curso.icone}</span>
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {curso.obrigatorio && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-sm text-white tracking-wide uppercase">
                    Obrigatório
                  </span>
                )}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-sm text-white`}>
                  {curso.nivel}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-sm text-white">
                  {curso.categoria}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">{curso.titulo}</h1>
              <p className="text-white/70 text-sm mb-4 leading-relaxed max-w-2xl">{curso.descricao}</p>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 text-white/80 text-xs font-medium">
                <span className="flex items-center gap-1.5"><Clock size={13} />{curso.duracao} de conteúdo</span>
                <span className="flex items-center gap-1.5"><Layers size={13} />{curso.modulos.length} módulos</span>
                <span className="flex items-center gap-1.5"><Users size={13} />{curso.totalAlunos} alunos</span>
                <span className="flex items-center gap-1.5">
                  <Star size={13} className="fill-amber-300 text-amber-300" />
                  {curso.avaliacao.toFixed(1)}
                </span>
              </div>

              <p className="text-white/50 text-xs mt-3">Instrutor: <span className="text-white/80 font-semibold">{curso.instrutor}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Main (left) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Video player (when aberto) */}
          {videoAberto !== null && (() => {
            const m = curso.modulos.find(mod => mod.id === videoAberto)
            if (!m) return null
            const videoUrl = getVideoUrl(m.id)
            const segsKey = `${curso.id}_${m.id}`
            return (
              <VideoPlayer
                key={`${curso.id}_${m.id}`}
                url={videoUrl}
                titulo={m.titulo}
                concluido={m.concluido}
                onMarcarConcluido={() => handleToggle(curso.id, m.id, true)}
                onClose={() => setVideoAberto(null)}
                cursoId={curso.id}
                moduloId={m.id}
                segundosInicial={progressoSegsMap[segsKey] ?? 0}
              />
            )
          })()}

          {/* O que você vai aprender */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Award size={16} className="text-primary-500" />
              O que você vai aprender
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {curso.modulos.filter(m => m.tipo !== 'quiz').map(m => (
                <li key={m.id} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                  {m.titulo}
                </li>
              ))}
            </ul>
          </div>

          {/* Conteúdo do curso */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <button
              onClick={() => setModulosExpanded(v => !v)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-primary-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Conteúdo do curso</span>
                <span className="text-xs text-slate-400">· {curso.modulos.length} módulos</span>
              </div>
              {modulosExpanded
                ? <ChevronUp size={15} className="text-slate-400" />
                : <ChevronDown size={15} className="text-slate-400" />}
            </button>

            {modulosExpanded && (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {curso.modulos.map((m, idx) => {
                  const bloqueado = idx > 0 && !curso.modulos[idx - 1].concluido
                  const videoUrl = getVideoUrl(m.id)
                  const temVideo = !!videoUrl
                  const isEditando = editando === m.id
                  const isVideoAberto = videoAberto === m.id

                  return (
                    <div key={m.id}>
                      <div
                        onClick={() => {
                          if (bloqueado) return
                          if (m.tipo === 'video' && temVideo) {
                            setVideoAberto(isVideoAberto ? null : m.id)
                            return
                          }
                          if (m.tipo !== 'video') handleToggle(curso.id, m.id, !m.concluido)
                        }}
                        className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                          bloqueado
                            ? 'opacity-50 cursor-not-allowed'
                            : m.tipo === 'video' && !temVideo && !canAdmin
                            ? 'cursor-default'
                            : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {m.concluido
                            ? <CheckCircle2 size={16} className="text-emerald-500" />
                            : bloqueado
                            ? <Lock size={12} className="text-slate-400" />
                            : TIPO_ICON[m.tipo]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{m.titulo}</p>
                          <p className="text-xs text-slate-400 capitalize">{m.tipo} · {m.duracao}</p>
                        </div>

                        {/* Admin: URL do vídeo */}
                        {canAdmin && m.tipo === 'video' && !isEditando && (
                          <button
                            onClick={e => { e.stopPropagation(); setEditando(m.id); setEditUrl(videoUrl) }}
                            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                            title="Editar URL do vídeo"
                          >
                            <Edit2 size={11} />
                          </button>
                        )}

                        {!bloqueado && m.tipo === 'video' && (
                          temVideo
                            ? <Play size={13} className={`text-primary-500 shrink-0 ${isVideoAberto ? 'opacity-100' : 'opacity-60'}`} />
                            : !canAdmin && <span className="text-[10px] text-slate-300">Sem vídeo</span>
                        )}
                      </div>

                      {/* Admin: editar URL */}
                      {isEditando && (
                        <div className="px-5 pb-3 pt-0 flex gap-2" onClick={e => e.stopPropagation()}>
                          <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
                            <Link size={11} className="text-slate-400 shrink-0" />
                            <input
                              value={editUrl}
                              onChange={e => setEditUrl(e.target.value)}
                              placeholder="URL do YouTube, Vimeo ou .mp4"
                              className="flex-1 bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                              autoFocus
                            />
                            {editUrl && (
                              <button onClick={() => setEditUrl('')} className="text-slate-400 hover:text-slate-600">
                                <X size={11} />
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => saveUrl(m.id)}
                            disabled={savingUrl}
                            className="px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <Save size={11} />
                            {savingUrl ? 'Salvando…' : 'Salvar'}
                          </button>
                          <button onClick={() => setEditando(null)} className="px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 text-xs transition-colors">
                            <X size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Avaliação do curso */}
          {pct === 100 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                <Star size={15} className="text-amber-400" />
                {avaliacaoEnviada ? 'Sua avaliação' : 'Avaliar este curso'}
              </h2>
              {!avaliacaoEnviada && (
                <p className="text-xs text-slate-400 mb-4">Parabéns por concluir! Sua opinião ajuda outros colaboradores.</p>
              )}
              <div className="flex gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    disabled={avaliacaoEnviada}
                    onClick={() => setAvaliacaoNota(i)}
                    className="transition-transform hover:scale-110 disabled:cursor-default"
                  >
                    <Star
                      size={26}
                      className={i <= (avaliacaoNota ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}
                    />
                  </button>
                ))}
              </div>
              {!avaliacaoEnviada && (
                <textarea
                  value={avaliacaoComentario}
                  onChange={e => setAvaliacaoComentario(e.target.value)}
                  placeholder="Comentário opcional…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-primary-400 resize-none mb-3 transition-colors"
                />
              )}
              {avaliacaoEnviada ? (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 size={14} /> Avaliação enviada — obrigado!
                  {avaliacaoComentario && <span className="text-slate-400 font-normal ml-1">"{avaliacaoComentario}"</span>}
                </div>
              ) : (
                <button
                  onClick={handleEnviarAvaliacao}
                  disabled={!avaliacaoNota || savingAvaliacao}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={12} />
                  {savingAvaliacao ? 'Enviando…' : 'Enviar avaliação'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar (right) ── */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">

          {/* Progress card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Seu progresso</span>
              <span className={`text-2xl font-black tabular-nums ${pct === 100 ? 'text-emerald-600' : 'text-primary-600'}`}>{pct}%</span>
            </div>
            <ProgressBar pct={pct} />
            <p className="text-[11px] text-slate-400 mt-2">{concluidos} de {curso.modulos.length} módulos concluídos</p>

            {pct === 100 ? (
              <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                <Award size={16} className="text-emerald-500 shrink-0" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Curso concluído!</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  const proximo = curso.modulos.find(m => !m.concluido)
                  if (proximo) {
                    const videoUrl = getVideoUrl(proximo.id)
                    if (proximo.tipo === 'video' && videoUrl) {
                      setVideoAberto(proximo.id)
                      setModulosExpanded(true)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  }
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-all"
              >
                <Play size={14} />
                {concluidos === 0 ? 'Começar curso' : 'Continuar'}
              </button>
            )}
          </div>

          {/* Sobre o instrutor */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Instrutor</h3>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${curso.capa.from} ${curso.capa.to} flex items-center justify-center shrink-0`}>
                <span className="text-lg leading-none">{curso.icone}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{curso.instrutor}</p>
                <p className="text-xs text-slate-400">{curso.categoria}</p>
              </div>
            </div>
          </div>

          {/* Detalhes */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detalhes</h3>
            {[
              { label: 'Nível', value: curso.nivel, color: NIVEL_COLORS[curso.nivel] },
              { label: 'Categoria', value: curso.categoria },
              { label: 'Duração', value: curso.duracao },
              { label: 'Módulos', value: `${curso.modulos.length} módulos` },
              { label: 'Alunos', value: `${curso.totalAlunos}` },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{label}</span>
                {color
                  ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{value}</span>
                  : <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{value}</span>}
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">Avaliação</span>
              <Stars value={curso.avaliacao} size={11} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
