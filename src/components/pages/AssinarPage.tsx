import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, RotateCcw, Save } from 'lucide-react'

type Estado = 'carregando' | 'invalido' | 'pronto' | 'enviando' | 'sucesso'

export default function AssinarPage() {
  const { token } = useParams<{ token: string }>()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [temTraco, setTemTraco] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const desenhando = useRef(false)
  const ultimoPonto = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!token) { setEstado('invalido'); return }
    fetch(`/.netlify/functions/assinatura?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) { setNome(d.nome); setEstado('pronto') }
        else setEstado('invalido')
      })
      .catch(() => setEstado('invalido'))
  }, [token])

  useEffect(() => {
    if (estado !== 'pronto') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [estado])

  function coordenadas(e: MouseEvent | Touch, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: ('clientX' in e ? e.clientX : (e as Touch).clientX) - rect.left,
      y: ('clientY' in e ? e.clientY : (e as Touch).clientY) - rect.top,
    }
  }

  function iniciarTraco(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const raw = 'touches' in e ? e.touches[0] : e.nativeEvent as MouseEvent
    const pt = coordenadas(raw as MouseEvent | Touch, canvas)
    desenhando.current = true
    ultimoPonto.current = pt
    const ctx = canvas.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(pt.x, pt.y)
  }

  function desenhar(e: React.MouseEvent | React.TouchEvent) {
    if (!desenhando.current) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const raw = 'touches' in e ? e.touches[0] : e.nativeEvent as MouseEvent
    const pt = coordenadas(raw as MouseEvent | Touch, canvas)
    const ctx = canvas.getContext('2d')!
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    ultimoPonto.current = pt
    setTemTraco(true)
  }

  function pararTraco() {
    desenhando.current = false
    ultimoPonto.current = null
  }

  function limpar() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    setTemTraco(false)
  }

  async function salvar() {
    const canvas = canvasRef.current!
    const assinatura = canvas.toDataURL('image/png')
    setEstado('enviando')
    try {
      const res = await fetch(`/.netlify/functions/assinatura?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assinatura }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErro(d.error || 'Erro ao salvar.')
        setEstado('pronto')
      } else {
        setEstado('sucesso')
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setEstado('pronto')
    }
  }

  if (estado === 'carregando') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm">Verificando link…</p>
        </div>
      </div>
    )
  }

  if (estado === 'invalido') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">⏰</span>
          </div>
          <h1 className="text-lg font-bold text-slate-800">Link inválido ou expirado</h1>
          <p className="text-sm text-slate-500">Este link de assinatura expirou ou já foi utilizado. Solicite ao RH que envie um novo link.</p>
        </div>
      </div>
    )
  }

  if (estado === 'sucesso') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">Assinatura salva!</h1>
          <p className="text-sm text-slate-500">
            Sua assinatura foi cadastrada com sucesso e será utilizada nos certificados de conclusão dos seus cursos.
          </p>
          <p className="text-xs text-slate-400">Você já pode fechar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8e] px-6 py-5">
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-1">RTT Shop · Treinamentos</p>
          <h1 className="text-xl font-bold text-white">Assinatura Digital</h1>
          <p className="text-sm text-blue-200 mt-0.5">Olá, <strong className="text-white">{nome}</strong></p>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            Desenhe sua assinatura abaixo. Ela será usada nos certificados de conclusão
            emitidos para os colaboradores que concluírem seus cursos.
          </p>

          {/* Canvas area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sua assinatura</label>
              {temTraco && (
                <button
                  onClick={limpar}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <RotateCcw size={11} /> Limpar
                </button>
              )}
            </div>
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden relative">
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '160px', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
                onMouseDown={iniciarTraco}
                onMouseMove={desenhar}
                onMouseUp={pararTraco}
                onMouseLeave={pararTraco}
                onTouchStart={iniciarTraco}
                onTouchMove={desenhar}
                onTouchEnd={pararTraco}
              />
              {!temTraco && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-sm text-slate-300 select-none">Assine aqui…</p>
                </div>
              )}
            </div>
          </div>

          {erro && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
          )}

          <button
            onClick={salvar}
            disabled={!temTraco || estado === 'enviando'}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e3a5f] hover:bg-[#2d5a8e] text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {estado === 'enviando'
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Salvando…</>
              : <><Save size={15} />Salvar assinatura</>
            }
          </button>

          <p className="text-center text-xs text-slate-400">
            Ao salvar, sua assinatura fica armazenada de forma segura no sistema.
          </p>
        </div>
      </div>
    </div>
  )
}
