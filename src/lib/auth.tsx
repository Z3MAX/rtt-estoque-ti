import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const MOCK = import.meta.env.VITE_MOCK === 'true'

export interface User {
  id?: number
  name: string
  email: string
  role: string
  roles?: string[]
  area?: string | null
  mustChangePassword?: boolean
  photo_url?: string | null
}

export function isAdmin(role?: string) {
  return (
    role === 'Administrador de RH' ||
    role === 'Administrador de TI' ||
    role === 'Administrador Master' ||
    role === 'Administrador de RH / Gestor'
  )
}

export function isMaster(role?: string) {
  return role === 'Administrador Master'
}

export function isGestor(role?: string) {
  return role === 'Gestor' || role === 'Administrador de RH / Gestor'
}

export function isInstrutor(role?: string, roles?: string[]) {
  return role === 'Instrutor' || (roles?.includes('Instrutor') ?? false)
}

export interface MfaPending {
  mfaToken: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<MfaPending | void>
  loginWithToken: (token: string, user: User, deviceToken?: string | null) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Usuários de demonstração (apenas para modo VITE_MOCK=true em desenvolvimento local)
// Não contém credenciais de produção
const DEMO_USERS: Record<string, { name: string; role: string; id: number }> = {
  'demo@rtt.dev': { id: 1, name: 'Demo Admin', role: 'Administrador de TI' },
  'tecnico@rtt.dev': { id: 2, name: 'Demo Técnico', role: 'Técnico de TI' },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Tenta restaurar sessão via cookie httpOnly (seguro) — token nunca fica no localStorage
    fetch('/.netlify/functions/auth-me', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.token && data?.user) {
          setUser(data.user)
          setToken(data.token)
          localStorage.setItem('osiris_user', JSON.stringify(data.user))
        } else {
          // Cookie inválido ou expirado — limpeza defensiva
          setUser(null)
          setToken(null)
          localStorage.removeItem('osiris_user')
          localStorage.removeItem('osiris_token')
        }
      })
      .catch(() => {
        // Offline ou erro de rede: mantém o usuário em estado não autenticado
        setUser(null)
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    if (MOCK) {
      await new Promise((r) => setTimeout(r, 700))
      const found = DEMO_USERS[email.toLowerCase()]
      if (!found) throw new Error('E-mail ou senha incorretos')
      const u: User = { id: found.id, name: found.name, email: email.toLowerCase(), role: found.role }
      const mockToken = 'mock-token'
      setUser(u)
      setToken(mockToken)
      localStorage.setItem('osiris_user', JSON.stringify(u))
      localStorage.setItem('osiris_token', mockToken)
      localStorage.removeItem('rtt_portal')
      return
    }

    const deviceToken = localStorage.getItem('osiris_device') || undefined
    const res = await fetch('/.netlify/functions/auth-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, deviceToken }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao autenticar')

    if (data.status === 'mfa_required') {
      return { mfaToken: data.mfaToken, email: email.trim().toLowerCase(), name: '' } as MfaPending
    }

    setUser(data.user)
    setToken(data.token)
    localStorage.setItem('osiris_user', JSON.stringify(data.user))
    // Token NÃO é gravado em localStorage — protegido no cookie httpOnly definido pelo servidor
    localStorage.removeItem('osiris_token')
    localStorage.removeItem('rtt_portal')
  }

  function loginWithToken(t: string, u: User, deviceToken?: string | null) {
    setUser(u)
    setToken(t)
    localStorage.setItem('osiris_user', JSON.stringify(u))
    // Token NÃO é gravado em localStorage — protegido no cookie httpOnly definido pelo servidor
    localStorage.removeItem('osiris_token')
    localStorage.removeItem('rtt_portal')
    if (deviceToken) localStorage.setItem('osiris_device', deviceToken)
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('osiris_user')
    localStorage.removeItem('osiris_token')
    localStorage.removeItem('rtt_portal')
    // Apaga o cookie httpOnly server-side (best effort — não bloqueia o logout local)
    fetch('/.netlify/functions/auth-logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
    // Não remove osiris_device — o "lembrar dispositivo" deve persistir entre logouts
  }

  function updateUser(updates: Partial<User>) {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      localStorage.setItem('osiris_user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithToken, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
