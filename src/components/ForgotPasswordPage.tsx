import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Informe seu e-mail'); return }

    try {
      setLoading(true)
      setError('')
      const res = await fetch('/.netlify/functions/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar e-mail')
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar e-mail')
    } finally {
      setLoading(false)
    }
  }

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

          <h1 className="text-4xl font-bold text-white leading-tight">
            Recuperar<br />
            <span className="text-primary-400">acesso à conta</span>
          </h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-sm">
            Sem problema! Informe seu e-mail e enviaremos um link seguro para você criar uma nova senha.
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
          © 2025 Rema Tip Top · Todos os direitos reservados
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/rema-logo.png" alt="Rema Tip Top" className="h-8 w-auto object-contain select-none"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>

          <div className="card p-8">
            {!sent ? (
              <>
                <div className="mb-7">
                  <div className="w-11 h-11 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                    <Mail size={20} className="text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Esqueceu a senha?</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Digite seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
                  </p>
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
                      autoFocus
                      disabled={loading}
                    />
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
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail size={17} />
                        Enviar link de redefinição
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">E-mail enviado!</h2>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  Se o e-mail <span className="font-medium text-slate-700">{email}</span> estiver cadastrado, você receberá as instruções para redefinir sua senha em instantes.
                </p>
                <p className="text-slate-400 text-xs mt-4">
                  Verifique também sua caixa de spam.
                </p>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-100">
              <Link
                to="/"
                className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-primary-600 transition-colors font-medium"
              >
                <ArrowLeft size={15} />
                Voltar para o login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
