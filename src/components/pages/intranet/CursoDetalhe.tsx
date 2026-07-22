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
  const panda = url.match(/pandavideo\.com\.br\/(?:v\/|embed\/\?v=)([a-zA-Z0-9_-]+)/)
  if (panda) return { type: 'panda' as const, embedUrl: `https://player.pandavideo.com.br/embed/?v=${panda[1]}${start > 0 ? `&t=${start}` : ''}` }
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
  tipo: 'video' | 'pdf' | 'quiz' | 'texto' | 'link'
  concluido: boolean
  descricao?: string
  url?: string
  conteudo?: string
  quiz?: {
    aprovacao_minima: number
    embaralhar: boolean
    perguntas: Array<{
      id: number
      pergunta: string
      tipo: 'multipla_escolha' | 'verdadeiro_falso'
      opcoes: Array<{ id: number; texto: string }>
      correta: number
      explicacao?: string
    }>
  }
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
  capaUrl?: string
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
    if (type !== 'youtube' && type !== 'vimeo' && type !== 'panda') return
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
        if (type === 'panda') {
          if (d.message === 'panda_timeupdate' && d.duration && durationRef.current === 0) {
            durationRef.current = d.duration
            setTotalDuration(d.duration)
          }
          if (d.message === 'panda_play') setIsPlaying(true)
          if (d.message === 'panda_pause' || d.message === 'panda_ended') setIsPlaying(false)
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
          <span>{type === 'youtube' ? 'YouTube' : type === 'vimeo' ? 'Vimeo' : type === 'panda' ? 'Panda Video' : type === 'direct' ? 'Vídeo direto' : ''}</span>
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
  pdf:   <FileText size={14} className="text-amber-500" />,
  quiz:  <HelpCircle size={14} className="text-violet-500" />,
  texto: <BookOpen size={14} className="text-emerald-500" />,
  link:  <Link size={14} className="text-sky-500" />,
}

// ─── QuizPlayer ───────────────────────────────────────────────────────────────

type QuizPergunta = NonNullable<Modulo['quiz']>['perguntas'][number]

function QuizPlayer({ modulo, onConcluido }: {
  modulo: Modulo
  onConcluido: () => void
}) {
  const quiz = modulo.quiz!
  const [respostas, setRespostas] = useState<Record<number, number>>({})
  const [enviado, setEnviado] = useState(false)
  const [pontuacao, setPontuacao] = useState(0)

  const perguntas: QuizPergunta[] = quiz.embaralhar
    ? [...quiz.perguntas].sort(() => 0.5 - Math.random())
    : quiz.perguntas

  function responder(pidx: number, opcaoIdx: number) {
    if (enviado) return
    setRespostas(prev => ({ ...prev, [pidx]: opcaoIdx }))
  }

  function enviar() {
    const corretas = perguntas.filter((p, i) => respostas[i] === p.correta).length
    const pct = perguntas.length > 0 ? Math.round((corretas / perguntas.length) * 100) : 0
    setPontuacao(pct)
    setEnviado(true)
    if (pct >= (quiz.aprovacao_minima ?? 70)) onConcluido()
  }

  function refazer() {
    setRespostas({})
    setEnviado(false)
    setPontuacao(0)
  }

  const aprovado = pontuacao >= (quiz.aprovacao_minima ?? 70)
  const respondidas = Object.keys(respostas).length

  if (perguntas.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
        Este quiz ainda não possui perguntas.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-violet-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{modulo.titulo}</span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">Aprovação mínima: {quiz.aprovacao_minima ?? 70}%</span>
      </div>

      {/* Perguntas */}
      {perguntas.map((p, pidx) => {
        const resp = respostas[pidx]
        const acertou = enviado && resp === p.correta
        const errou = enviado && resp !== undefined && resp !== p.correta
        return (
          <div key={p.id} className={`rounded-xl border p-4 space-y-3 ${enviado ? (acertou ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10' : errou ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700') : 'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">
              <span className="text-slate-400 font-bold mr-2">{pidx + 1}.</span>{p.pergunta}
            </p>
            <div className="space-y-2">
              {p.opcoes.map((op, oidx) => {
                const isCorreta = oidx === p.correta
                const isEscolhida = resp === oidx
                let cls = 'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm cursor-pointer transition-all '
                if (!enviado) {
                  cls += isEscolhida
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-slate-200 dark:border-slate-600 hover:border-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 text-slate-600 dark:text-slate-300'
                } else {
                  if (isCorreta) cls += 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                  else if (isEscolhida) cls += 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  else cls += 'border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                }
                return (
                  <div key={op.id} className={cls} onClick={() => responder(pidx, oidx)}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${!enviado && isEscolhida ? 'border-primary-500 bg-primary-500' : enviado && isCorreta ? 'border-emerald-500 bg-emerald-500' : enviado && isEscolhida ? 'border-red-500 bg-red-500' : 'border-slate-300 dark:border-slate-500'}`}>
                      {(!enviado && isEscolhida) || (enviado && (isCorreta || isEscolhida)) ? <div className="w-2 h-2 rounded-full bg-white" /> : null}
                    </div>
                    <span className="leading-snug">{op.texto}</span>
                    {enviado && isCorreta && <CheckCircle2 size={14} className="text-emerald-500 ml-auto shrink-0" />}
                  </div>
                )
              })}
            </div>
            {enviado && p.explicacao && (
              <div className="flex gap-2 px-3 py-2 rounded-lg bg-slate-100/80 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-400">
                <BookOpen size={13} className="shrink-0 mt-0.5 text-slate-400" />
                <span>{p.explicacao}</span>
              </div>
            )}
          </div>
        )
      })}

      {/* Submit / Result */}
      {!enviado ? (
        <button
          disabled={respondidas < perguntas.length}
          onClick={enviar}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {respondidas < perguntas.length
            ? `Responda todas as perguntas (${respondidas}/${perguntas.length})`
            : 'Enviar respostas'}
        </button>
      ) : (
        <div className={`rounded-xl p-5 text-center space-y-3 ${aprovado ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
          <div className={`text-4xl font-black tabular-nums ${aprovado ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {pontuacao}%
          </div>
          <p className={`text-sm font-semibold ${aprovado ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
            {aprovado ? '🎉 Aprovado! Módulo concluído.' : `Não atingiu o mínimo de ${quiz.aprovacao_minima ?? 70}%.`}
          </p>
          {!aprovado && (
            <button onClick={refazer} className="px-5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors">
              Tentar novamente
            </button>
          )}
        </div>
      )}
    </div>
  )
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
    descricao: m.descricao,
    url: m.url,
    conteudo: m.conteudo,
    quiz: m.quiz,
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
  const [showCertModal, setShowCertModal] = useState(false)

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
      if (r?.nota) { setAvaliacaoNota(r.nota); setAvaliacaoComentario(r.comentario ?? ''); setAvaliacaoEnviada(true) }
    }).catch(() => {})
  }, [curso?.id, curso && getProgresso(curso.modulos)])

  function getVideoUrl(moduloId: number) {
    if (!curso) return ''
    const modulo = curso.modulos.find(m => m.id === moduloId)
    return modulo?.url || moduloConfigs[`${curso.id}_${moduloId}`] || ''
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
    const res = await api.cursoAvaliacao.save(curso.id, avaliacaoNota, avaliacaoComentario || undefined).catch(() => null)
    setSavingAvaliacao(false)
    if (res) setAvaliacaoEnviada(true)
  }

  function imprimirCertificado() {
    if (!curso || !user) return
    const dataFmt = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    function esc(s: string) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
    const w = window.open('', '_blank', 'width=900,height=650')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Certificado</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
  .cert { width: 840px; min-height: 560px; border: 12px double #1e3a5f; padding: 48px 64px; position: relative; background: #fff; }
  .cert::before { content: ''; position: absolute; inset: 8px; border: 2px solid #c9a84c; pointer-events: none; }
  .logo { text-align: center; margin-bottom: 24px; }
  .logo img { height: 70px; object-fit: contain; }
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
  <div class=\"logo\"><img src=\"data:image/png;base64,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\" style=\"height:70px;object-fit:contain;\" alt=\"Rema Tip Top\" /></div>
  <h1>Certificado</h1>
  <p class="sub">de conclusão</p>
  <div class="body">
    <p>Certificamos que</p>
    <span class="name">${esc(user.name)}</span>
    <p>concluiu com êxito o curso</p>
    <span class="course">${esc(curso.titulo)}</span>
    ${user.area ? `<p>atuando na área de <strong>${esc(user.area)}</strong></p>` : ''}
  </div>
  <div class="divider"></div>
  <div class="footer">
    <div class="sig">
      <div class="sig-line"></div>
      <p class="sig-name">${esc(curso.instrutor || 'Instrutor')}</p>
      <p class="sig-role">Instrutor</p>
    </div>
    <div class="date"><p>${dataFmt}</p></div>
    <div class="sig">
      <div class="sig-line"></div>
      <p class="sig-name">Recursos Humanos</p>
      <p class="sig-role">RH / Treinamentos</p>
    </div>
  </div>
</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`)
    w.document.close()
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
      <div
        className={`relative overflow-hidden ${!curso.capaUrl ? `bg-gradient-to-br ${curso.capa.from} ${curso.capa.to}` : 'bg-slate-900'}`}
        style={curso.capaUrl ? { backgroundImage: `url(${curso.capaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {curso.capaUrl && <div className="absolute inset-0 bg-black/60" />}
        {/* dot grid */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        {/* radial glow */}
        <div className="absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 100%, white, transparent)' }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-5 pb-12">
          <button
            onClick={() => navigate('/intranet/treinamentos')}
            className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium mb-8 transition-colors"
          >
            <ArrowLeft size={14} />
            Treinamentos
          </button>

          <div className="flex gap-7 items-start">
            {/* Emoji badge */}
            <div className="hidden sm:flex w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 items-center justify-center shrink-0 shadow-lg">
              <span className="text-[44px] leading-none select-none">{curso.icone}</span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {curso.obrigatorio && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/80 backdrop-blur-sm text-white tracking-wide uppercase">
                    Obrigatório
                  </span>
                )}
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white">
                  {curso.nivel}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white">
                  {curso.categoria}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-3 drop-shadow-sm">{curso.titulo}</h1>
              <p className="text-white/65 text-sm mb-5 leading-relaxed max-w-2xl">{curso.descricao}</p>

              {/* Stats chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { icon: <Clock size={12} />, text: `${curso.duracao}` },
                  { icon: <Layers size={12} />, text: `${curso.modulos.length} módulos` },
                  { icon: <Users size={12} />, text: `${curso.totalAlunos} alunos` },
                  { icon: <Star size={12} className="fill-amber-300 text-amber-300" />, text: curso.avaliacao.toFixed(1) },
                ].map(({ icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-medium border border-white/10">
                    {icon}{text}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${curso.capa.from} ${curso.capa.to} flex items-center justify-center border-2 border-white/30 text-sm`}>
                  {curso.icone}
                </div>
                <span className="text-white/50 text-xs">Instrutor: <span className="text-white/85 font-semibold">{curso.instrutor}</span></span>
              </div>
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
            if (!m || m.tipo !== 'video') return null
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
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
              <Award size={16} className="text-primary-500" />
              O que você vai aprender
            </h2>
            <p className="text-xs text-slate-400 mb-4">Conteúdo abordado neste curso</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {curso.modulos.filter(m => m.tipo !== 'quiz' && m.tipo !== 'link').map(m => (
                <li key={m.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                  <span className="mt-0.5 shrink-0">{TIPO_ICON[m.tipo]}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-200 leading-snug font-medium">{m.titulo}</span>
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
              <div className="flex items-center gap-2.5">
                <Layers size={15} className="text-primary-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Conteúdo do curso</span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{curso.modulos.length} módulos</span>
                {concluidos > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{concluidos} concluídos</span>
                )}
              </div>
              {modulosExpanded
                ? <ChevronUp size={15} className="text-slate-400" />
                : <ChevronDown size={15} className="text-slate-400" />}
            </button>
            {/* progress strip */}
            {pct > 0 && pct < 100 && (
              <div className="h-0.5 bg-slate-100 dark:bg-slate-800">
                <div className="h-full bg-primary-400 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            )}

            {modulosExpanded && (
              <div className="px-5 py-4 space-y-1">
                {curso.modulos.map((m, idx) => {
                  const bloqueado = idx > 0 && !curso.modulos[idx - 1].concluido
                  const videoUrl = getVideoUrl(m.id)
                  const temVideo = !!videoUrl
                  const isEditando = editando === m.id
                  const isExpandivel = m.tipo === 'quiz' || m.tipo === 'texto' || m.tipo === 'link' || (m.tipo === 'video' && temVideo)
                  const isAberto = videoAberto === m.id
                  const isUltimo = idx === curso.modulos.length - 1

                  const TIPO_LABEL: Record<string, string> = { video: 'Vídeo', pdf: 'PDF', quiz: 'Quiz', texto: 'Artigo', link: 'Link externo' }

                  const TIPO_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
                    video: { bg: 'bg-primary-100 dark:bg-primary-900/40', text: 'text-primary-600 dark:text-primary-400', icon: 'text-primary-500' },
                    pdf:   { bg: 'bg-amber-100 dark:bg-amber-900/40',   text: 'text-amber-600 dark:text-amber-400',   icon: 'text-amber-500' },
                    quiz:  { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-600 dark:text-violet-400', icon: 'text-violet-500' },
                    texto: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
                    link:  { bg: 'bg-sky-100 dark:bg-sky-900/40',       text: 'text-sky-600 dark:text-sky-400',       icon: 'text-sky-500' },
                  }
                  const tc = TIPO_COLORS[m.tipo] ?? TIPO_COLORS.link

                  return (
                    <div key={m.id} id={`modulo-${m.id}`} className="flex gap-3">

                      {/* ── Stepper column ── */}
                      <div className="flex flex-col items-center shrink-0 w-8">
                        {/* Circle */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border-2 transition-all ${
                          m.concluido
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900'
                            : bloqueado
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300'
                            : isAberto
                            ? 'bg-primary-500 border-primary-500 text-white shadow-sm shadow-primary-200 dark:shadow-primary-900'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                        }`}>
                          {m.concluido
                            ? <CheckCircle2 size={14} />
                            : bloqueado
                            ? <Lock size={10} />
                            : <span>{idx + 1}</span>}
                        </div>
                        {/* Connector line */}
                        {!isUltimo && (
                          <div className={`w-0.5 flex-1 min-h-[12px] my-1 rounded-full transition-colors ${
                            m.concluido ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-150 dark:bg-slate-700'
                          }`} />
                        )}
                      </div>

                      {/* ── Content column ── */}
                      <div className={`flex-1 min-w-0 mb-${isUltimo ? '0' : '1'}`}>
                        <div
                          onClick={() => {
                            if (bloqueado) return
                            if (m.tipo === 'video' && temVideo) { setVideoAberto(isAberto ? null : m.id); return }
                            if (m.tipo === 'pdf' && m.url) { window.open(m.url, '_blank'); return }
                            if (m.tipo === 'link' && m.url) { window.open(m.url, '_blank'); return }
                            if (m.tipo === 'quiz' || m.tipo === 'texto') { setVideoAberto(isAberto ? null : m.id); return }
                            if (m.tipo === 'pdf' && !m.url) handleToggle(curso.id, m.id, !m.concluido)
                          }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                            isAberto
                              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                              : m.concluido
                              ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
                              : bloqueado
                              ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-50'
                              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'
                          } ${
                            bloqueado ? 'cursor-not-allowed' :
                            m.tipo === 'video' && !temVideo && !canAdmin ? 'cursor-default' :
                            'cursor-pointer'
                          }`}
                        >
                          {/* Type icon */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            m.concluido ? 'bg-emerald-100 dark:bg-emerald-900/30' : tc.bg
                          }`}>
                            {m.concluido
                              ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                              : <span className={tc.icon}>{TIPO_ICON[m.tipo]}</span>}
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold leading-snug truncate ${
                              m.concluido
                                ? 'text-slate-400 dark:text-slate-500'
                                : 'text-slate-700 dark:text-slate-200'
                            }`}>
                              {m.titulo || TIPO_LABEL[m.tipo]}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] font-bold uppercase tracking-wide ${
                                m.concluido ? 'text-slate-300 dark:text-slate-600' : tc.text
                              }`}>{TIPO_LABEL[m.tipo]}</span>
                              {m.duracao && m.duracao !== '—' && (
                                <>
                                  <span className="text-slate-200 dark:text-slate-700">·</span>
                                  <span className="text-[11px] text-slate-400">{m.duracao}</span>
                                </>
                              )}
                            </div>
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

                          {!bloqueado && isExpandivel && (
                            isAberto
                              ? <ChevronUp size={13} className="text-slate-400 shrink-0" />
                              : <ChevronDown size={13} className="text-slate-400 shrink-0" />
                          )}
                          {!bloqueado && m.tipo === 'video' && !temVideo && !canAdmin && (
                            <span className="text-[10px] text-slate-300 shrink-0">Sem vídeo</span>
                          )}
                        </div>

                        {/* Admin: editar URL do vídeo */}
                        {isEditando && (
                          <div className="mt-2 flex gap-2" onClick={e => e.stopPropagation()}>
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

                        {/* Conteúdo expandido — quiz */}
                        {!bloqueado && isAberto && m.tipo === 'quiz' && m.quiz && (
                          <div className="mt-2">
                            <QuizPlayer
                              modulo={m}
                              onConcluido={() => handleToggle(curso.id, m.id, true)}
                            />
                          </div>
                        )}

                        {/* Conteúdo expandido — texto */}
                        {!bloqueado && isAberto && m.tipo === 'texto' && m.conteudo && (
                          <div className="mt-2">
                            <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                              {m.conteudo}
                            </div>
                            <button
                              onClick={() => handleToggle(curso.id, m.id, true)}
                              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                            >
                              <CheckCircle2 size={13} /> Marcar como lido
                            </button>
                          </div>
                        )}
                      </div>
                      {/* end content column */}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Avaliação do curso */}
          {pct === 100 && (
            <div className={`rounded-2xl shadow-sm border overflow-hidden ${avaliacaoEnviada ? 'border-amber-200 dark:border-amber-800/50' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
              {avaliacaoEnviada ? (
                /* ── Estado: avaliação enviada ── */
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <Award size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Avaliação enviada!</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Obrigado pela sua opinião</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={18} className={i <= (avaliacaoNota ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'} />
                      ))}
                    </div>
                    {avaliacaoComentario && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 italic ml-1">"{avaliacaoComentario}"</span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowCertModal(true)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors w-full justify-center shadow-sm shadow-amber-500/30"
                  >
                    <Award size={15} /> Gerar certificado
                  </button>
                </div>
              ) : (
                /* ── Estado: aguardando avaliação ── */
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Star size={15} className="text-amber-400 fill-amber-400" />
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Avaliar este curso</h2>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Parabéns por concluir! Sua opinião ajuda outros colaboradores.</p>
                  <div className="flex gap-1.5 mb-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <button
                        key={i}
                        onClick={() => setAvaliacaoNota(i)}
                        className="transition-transform hover:scale-115 active:scale-95"
                      >
                        <Star
                          size={30}
                          className={i <= (avaliacaoNota ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700 hover:text-amber-200'}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={avaliacaoComentario}
                    onChange={e => setAvaliacaoComentario(e.target.value)}
                    placeholder="Comentário opcional…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-primary-400 resize-none mb-3 transition-colors"
                  />
                  <button
                    onClick={handleEnviarAvaliacao}
                    disabled={!avaliacaoNota || savingAvaliacao}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full justify-center"
                  >
                    <Send size={12} />
                    {savingAvaliacao ? 'Enviando…' : 'Enviar avaliação'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar (right) ── */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">

          {/* Progress card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-4">Seu progresso</span>

            {/* Ring + bar */}
            <div className="flex items-center gap-4 mb-4">
              {/* SVG ring */}
              <div className="relative shrink-0 w-16 h-16">
                <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-100 dark:text-slate-800" />
                  <circle
                    cx="28" cy="28" r="22" fill="none" strokeWidth="5"
                    stroke={pct === 100 ? '#10b981' : '#6366f1'}
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-base font-black tabular-nums ${pct === 100 ? 'text-emerald-600' : 'text-primary-600'}`}>
                  {pct}%
                </span>
              </div>
              <div className="flex-1">
                <ProgressBar pct={pct} />
                <p className="text-[11px] text-slate-400 mt-1.5">{concluidos} de {curso.modulos.length} módulos concluídos</p>
              </div>
            </div>

            {pct === 100 ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                <Award size={16} className="text-emerald-500 shrink-0" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Curso concluído!</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  const proximo = curso.modulos.find(m => !m.concluido)
                  if (!proximo) return
                  setModulosExpanded(true)
                  const videoUrl = getVideoUrl(proximo.id)
                  if (proximo.tipo === 'video' && videoUrl) {
                    setVideoAberto(proximo.id)
                  } else if ((proximo.tipo === 'pdf' || proximo.tipo === 'link') && proximo.url) {
                    window.open(proximo.url, '_blank')
                  } else if (proximo.tipo === 'quiz' || proximo.tipo === 'texto') {
                    setVideoAberto(proximo.id)
                  }
                  setTimeout(() => {
                    document.getElementById(`modulo-${proximo.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }, 100)
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-all shadow-sm shadow-primary-500/20"
              >
                <Play size={14} />
                {concluidos === 0 ? 'Começar curso' : 'Continuar'}
              </button>
            )}
          </div>

          {/* Sobre o instrutor */}
          <div className={`rounded-2xl p-5 shadow-sm border border-white/10 bg-gradient-to-br ${curso.capa.from} ${curso.capa.to} relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
            <h3 className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-3 relative">Instrutor</h3>
            <div className="flex items-center gap-3 relative">
              <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border-2 border-white/30 text-xl">
                {curso.icone}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{curso.instrutor}</p>
                <p className="text-xs text-white/60">{curso.categoria}</p>
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

      {/* Modal certificado */}
      {showCertModal && curso && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCertModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Award size={16} className="text-amber-500" />Certificado de Conclusão
              </h3>
              <button onClick={() => setShowCertModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="border border-amber-200 dark:border-amber-800 rounded-xl p-5 bg-amber-50 dark:bg-amber-900/10 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Colaborador</p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-100">{user.name}</p>
              </div>
              {user.area && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Área</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{user.area}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Curso</p>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{curso.titulo}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Data de conclusão</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <button
              onClick={imprimirCertificado}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
            >
              <Award size={15} />Imprimir / Salvar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
