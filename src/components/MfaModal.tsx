import { useState, useEffect, useRef, type FormEvent } from 'react'
import { ShieldCheck, Mail, RefreshCw, AlertCircle } from 'lucide-react'
import { useAuth } from '../lib/auth'

interface Props {
  mfaToken: string
  email: string
  onCancel: () => void
}

export default function MfaModal({ mfaToken, email, onCancel }: Props) {
  const { loginWithToken } = useAuth()
  const [code, setCode]             = useState('')
  const [remember, setRemember]     = useState(false)
  const [sending, setSending]       = useState(true)
  const [verifying, setVerifying]   = useState(false)
  const [error, setError]           = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    sendCode()
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [])

  async function sendCode() {
    setSending(true)
    setError('')
    try {
      await fetch('/.netlify/functions/auth-mfa-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken }),
      })
    } catch {}
    setSending(false)
    inputRef.current?.focus()
    startCooldown(60)
  }

  function startCooldown(seconds: number) {
    setResendCooldown(seconds)
    cooldownRef.current = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(cooldownRef.current!); return 0 }
        return v - 1
      })
    }, 1000)
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    if (code.length < 6) { setError('Digite o código de 6 dígitos'); return }
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/.netlify/functions/auth-mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, code, rememberDevice: remember }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Código inválido')
        setCode('')
        inputRef.current?.focus()
        setVerifying(false)
        return
      }
      loginWithToken(data.token, data.user, data.deviceToken)
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setVerifying(false)
    }
  }

  const maskedEmail = email.replace(/(.{2})(.+)(@.+)/, (_, a, b, c) => a + b.replace(/./g, '*') + c)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/20 mb-4">
            <ShieldCheck size={32} className="text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verificação de dois fatores</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {sending ? (
              'Enviando código...'
            ) : (
              <>
                Enviamos um código de 6 dígitos para<br />
                <span className="font-medium text-slate-700 dark:text-slate-300">{maskedEmail}</span>
              </>
            )}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="px-8 pb-8 space-y-4">
          {/* Code input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Código de verificação
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="input pl-9 text-center text-2xl font-mono tracking-[0.4em] w-full"
                disabled={sending || verifying}
                autoComplete="one-time-code"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Remember device */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-primary-600 peer-checked:border-primary-600 transition-colors flex items-center justify-center">
                {remember && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Não pedir novamente neste dispositivo</span>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">O MFA não será solicitado pelos próximos 30 dias.</p>
            </div>
          </label>

          {/* Actions */}
          <button
            type="submit"
            disabled={code.length < 6 || sending || verifying}
            className="btn-primary w-full justify-center py-2.5 text-base"
          >
            {verifying ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Verificando...
              </>
            ) : (
              <>
                <ShieldCheck size={17} />
                Verificar e entrar
              </>
            )}
          </button>

          {/* Resend + cancel */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={sendCode}
              disabled={resendCooldown > 0 || sending || verifying}
              className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={13} className={sending ? 'animate-spin' : ''} />
              {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={verifying}
              className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
