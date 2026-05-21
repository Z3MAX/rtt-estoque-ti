import { useState, type FormEvent } from 'react'
import { Server, Monitor, Tag, MapPin, Eye, EyeOff, LogIn, Shield } from 'lucide-react'
import { useAuth } from '../lib/auth'

const DEMO_ACCOUNTS = [
  { email: 'admin@rtt.com', password: 'admin123', label: 'Administrador' },
  { email: 'ti@rtt.com',    password: 'ti1234',   label: 'Técnico de TI' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Preencha todos os campos'); return }
    try {
      setLoading(true)
      setError('')
      await login(email.trim(), password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(acc: typeof DEMO_ACCOUNTS[0]) {
    setEmail(acc.email)
    setPassword(acc.password)
    setError('')
  }

  return (
    <div className="min-h-screen w-full flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex-col justify-between relative overflow-hidden">

        {/* decorative blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full bg-primary-400/10 blur-3xl pointer-events-none" />

        {/* Top: logo + tagline */}
        <div className="relative z-10 px-12 pt-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Server size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">RTT</p>
              <p className="text-primary-300 text-xs">Controle de Estoque TI</p>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight">
            Gestão de ativos<br />
            <span className="text-primary-400">de TI simplificada</span>
          </h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-sm">
            A solução da <span className="text-white font-medium">RTT</span> para controlar todo o inventário
            de equipamentos em um só lugar.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              { icon: Monitor, text: 'Equipamentos' },
              { icon: Tag,     text: 'Categorias' },
              { icon: MapPin,  text: 'Locais' },
              { icon: Shield,  text: 'Histórico' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/10">
                <Icon size={12} className="text-primary-400" />
                <span className="text-slate-300 text-xs font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero image — fills remaining height */}
        <div className="relative z-10 flex items-end justify-center flex-1 overflow-hidden">
          <img
            src="/rtt-hero.png"
            alt="RTT — Gestão de TI"
            className="w-full object-contain object-bottom drop-shadow-2xl select-none"
            style={{ maxHeight: '520px' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Bottom note */}
        <p className="text-slate-600 text-xs relative z-10 px-12 pb-6">
          © 2025 RTT · Todos os direitos reservados
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
              <Server size={18} className="text-white" />
            </div>
            <p className="text-slate-900 font-bold text-lg">RTT</p>
          </div>

          <div className="card p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-900">Entrar</h2>
              <p className="text-slate-500 text-sm mt-1">Acesse sua conta para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">E-mail</label>
                <input
                  className="input"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5 text-base mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn size={17} />
                    Entrar
                  </>
                )}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contas de demonstração</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => fillDemo(acc)}
                    className="flex flex-col items-start px-3 py-2.5 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
                    disabled={loading}
                  >
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-primary-700">{acc.label}</span>
                    <span className="text-xs text-slate-400 mt-0.5 truncate w-full">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
