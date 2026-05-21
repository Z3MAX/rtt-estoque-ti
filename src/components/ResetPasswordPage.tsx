import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Server, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [showConf, setShowConf]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password) { setError('Digite a nova senha'); return }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres'); return }
    if (password !== confirm) { setError('As senhas não coincidem'); return }

    try {
      setLoading(true)
      setError('')
      const res = await fetch('/.netlify/functions/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao redefinir senha')
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (pwd: string) => {
    if (!pwd) return null
    if (pwd.length < 6) return { level: 1, label: 'Muito fraca', color: 'bg-red-500' }
    if (pwd.length < 8) return { level: 2, label: 'Fraca', color: 'bg-orange-400' }
    const hasUpper = /[A-Z]/.test(pwd)
    const hasNum = /[0-9]/.test(pwd)
    const hasSymbol = /[^a-zA-Z0-9]/.test(pwd)
    const score = [hasUpper, hasNum, hasSymbol].filter(Boolean).length
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
            Crie uma<br />
            <span className="text-primary-400">nova senha segura</span>
          </h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-sm">
            Escolha uma senha forte para proteger sua conta. Use letras maiúsculas, números e símbolos para aumentar a segurança.
          </p>
        </div>

        <div className="relative z-10 flex items-end justify-center flex-1 overflow-hidden">
          <img
            src="/rtt-hero.png"
            alt="RTT"
            className="w-full object-contain object-bottom drop-shadow-2xl select-none"
            style={{ maxHeight: '520px' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

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

            {/* No token */}
            {!token && (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={26} className="text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Link inválido</h2>
                <p className="text-slate-500 text-sm mt-2">
                  Este link de redefinição é inválido ou está incompleto.
                </p>
                <Link to="/forgot-password" className="btn-primary mt-5 justify-center">
                  Solicitar novo link
                </Link>
              </div>
            )}

            {/* Success */}
            {token && success && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Senha redefinida!</h2>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  Sua senha foi atualizada com sucesso. Agora você pode entrar com a nova senha.
                </p>
                <Link to="/" className="btn-primary mt-6 justify-center inline-flex w-full">
                  Ir para o login
                </Link>
              </div>
            )}

            {/* Form */}
            {token && !success && (
              <>
                <div className="mb-7">
                  <div className="w-11 h-11 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                    <KeyRound size={20} className="text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Nova senha</h2>
                  <p className="text-slate-500 text-sm mt-1">Crie uma senha segura para sua conta.</p>
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
                    {/* Strength bar */}
                    {strength && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((l) => (
                            <div key={l} className={`h-1 flex-1 rounded-full transition-all ${l <= strength.level ? strength.color : 'bg-slate-200'}`} />
                          ))}
                        </div>
                        <p className={`text-xs font-medium ${strength.level <= 2 ? 'text-red-500' : strength.level === 3 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="label">Confirmar nova senha</label>
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
                    className="btn-primary w-full justify-center py-2.5 text-base mt-2"
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
                        <KeyRound size={17} />
                        Redefinir senha
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {token && !success && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <Link to="/" className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-primary-600 transition-colors font-medium">
                  <ArrowLeft size={15} />
                  Voltar para o login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
