import { useState, type FormEvent } from 'react'
import { KeyRound, Eye, EyeOff, CheckCircle2, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function ChangePasswordPage() {
  const { user, logout, updateUser } = useAuth()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password)              { setError('Digite a nova senha'); return }
    if (password.length < 6)   { setError('A senha deve ter no mínimo 6 caracteres'); return }
    if (password !== confirm)  { setError('As senhas não coincidem'); return }

    try {
      setLoading(true)
      setError('')
      const res = await fetch('/.netlify/functions/first-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar senha')

      // Remove the flag from the user session — now they have full access
      updateUser({ mustChangePassword: false })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar senha')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (pwd: string) => {
    if (!pwd) return null
    if (pwd.length < 6) return { level: 1, label: 'Muito fraca', color: 'bg-red-500' }
    if (pwd.length < 8) return { level: 2, label: 'Fraca', color: 'bg-orange-400' }
    const score = [/[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^a-zA-Z0-9]/.test(pwd)].filter(Boolean).length
    if (score === 0) return { level: 2, label: 'Fraca', color: 'bg-orange-400' }
    if (score === 1) return { level: 3, label: 'Média', color: 'bg-yellow-400' }
    if (score === 2) return { level: 4, label: 'Forte', color: 'bg-emerald-500' }
    return { level: 4, label: 'Muito forte', color: 'bg-emerald-600' }
  }

  const strength = passwordStrength(password)

  return (
    <div className="min-h-screen w-full flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full bg-primary-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 px-12 pt-10">
          <div className="mb-10">
            <img
              src="/rema-logo.png"
              alt="Rema Tip Top"
              className="h-14 w-auto object-contain select-none brightness-0 invert"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>

          <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center mb-6 border border-primary-500/30">
            <ShieldCheck size={28} className="text-primary-400" />
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight">
            Bem-vindo,<br />
            <span className="text-primary-400">{user?.name?.split(' ')[0]}!</span>
          </h1>
          <p className="text-slate-400 mt-4 text-sm leading-relaxed max-w-sm">
            Por segurança, você precisa definir uma senha pessoal antes de acessar a plataforma. Isso garante que apenas você tenha acesso à sua conta.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Mínimo de 6 caracteres',
              'Use letras maiúsculas e números',
              'Evite senhas fáceis de adivinhar',
            ].map((tip) => (
              <div key={tip} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={12} className="text-primary-400" />
                </div>
                <p className="text-slate-400 text-sm">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-end justify-center flex-1 overflow-hidden">
          <img
            src="/rtt-hero.png"
            alt="RTT"
            className="w-full object-contain object-bottom drop-shadow-2xl select-none"
            style={{ maxHeight: '400px' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        <p className="text-slate-600 text-xs relative z-10 px-12 pb-6">
          © 2025 Rema Tip Top · Todos os direitos reservados
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <img src="/rema-logo.png" alt="Rema Tip Top" className="h-8 w-auto object-contain select-none"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <button onClick={logout} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
              <LogOut size={13} /> Sair
            </button>
          </div>

          <div className="card p-8">
            {/* Header */}
            <div className="mb-7">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 bg-primary-100 rounded-2xl flex items-center justify-center">
                  <KeyRound size={20} className="text-primary-600" />
                </div>
                {/* Desktop logout */}
                <button
                  onClick={logout}
                  className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <LogOut size={13} /> Sair
                </button>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Defina sua senha</h2>
              <p className="text-slate-500 text-sm mt-1">
                Este é seu primeiro acesso. Crie uma senha pessoal para continuar.
              </p>
            </div>

            {/* Logged in as */}
            <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 mb-5">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0 text-xs font-bold text-primary-600">
                {user?.name?.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New password */}
              <div>
                <label className="label">Nova senha</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {strength && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((l) => (
                        <div key={l} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${l <= strength.level ? strength.color : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${strength.level <= 2 ? 'text-red-500' : strength.level === 3 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label className="label">Confirmar senha</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showConf ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowConf((v) => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                )}
                {confirm && password === confirm && password.length >= 6 && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Senhas coincidem
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5 text-base mt-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={17} />
                    Definir senha e entrar
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
