import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { loginWithMicrosoft } from '../lib/msalConfig'
import { api } from '../lib/api'

export default function LoginPage() {
  const { login, loginWithToken } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [msLoading, setMsLoading] = useState(false)
  const [error, setError]       = useState(() => {
    // Show error from Microsoft redirect if any (e.g. e-mail not registered)
    const msErr = sessionStorage.getItem('ms_login_error')
    if (msErr) { sessionStorage.removeItem('ms_login_error'); return msErr }
    return ''
  })

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

  async function handleMicrosoftLogin() {
    try {
      setMsLoading(true)
      setError('')
      await loginWithMicrosoft() // Redirects the whole page — nothing after this runs
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar com Microsoft')
      setMsLoading(false)
    }
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
          {/* Logo */}
          <div className="mb-10">
            <img
              src="/rema-logo-rtt.png"
              alt="Rema Tip Top"
              className="h-14 w-auto object-contain select-none"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight">
            Gestão de talentos<br />
            <span className="text-primary-400">e avaliações</span>
          </h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-sm">
            Avalie e desenvolva seu time com <span className="text-white font-medium">visibilidade total</span> sobre desempenho, potencial e evolução de cada colaborador.
          </p>

        </div>

        {/* Hero image — fills remaining height */}
        <div className="relative z-10 flex items-end justify-center flex-1 overflow-hidden">
          <img
            src="/rtt-hero.png"
            alt="Rema Tip Top — Gestão de TI"
            className="w-full object-contain object-bottom drop-shadow-2xl select-none"
            style={{ maxHeight: '520px', transform: 'translateX(-10%)' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Bottom note */}
        <p className="text-slate-600 text-xs relative z-10 px-12 pb-6">
          © 2025 Rema Tip Top · Todos os direitos reservados
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/rema-logo-rtt.png" alt="Rema Tip Top" className="h-8 w-auto object-contain select-none"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
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

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  Esqueceu a senha?
                </Link>
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5 text-base"
                disabled={loading || msLoading}
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

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">ou</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Microsoft login */}
            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={loading || msLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
            >
              {msLoading ? (
                <svg className="animate-spin h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
              )}
              {msLoading ? 'Aguardando Microsoft...' : 'Entrar com Microsoft'}
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
